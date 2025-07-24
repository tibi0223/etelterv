

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FoodPlannerApp } from "@/components/food-planner/FoodPlannerApp";
import { ModernAuthForm } from "@/components/auth/ModernAuthForm";
import { PersonalInfoSetup } from "@/components/food-planner/PersonalInfoSetup";
import { HealthConditionsSetup } from "@/components/food-planner/HealthConditionsSetup";
import { PreferenceSetup } from "@/components/food-planner/PreferenceSetup";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserProfile } from "@/services/profileQueries";
import { checkUserHasPreferences } from "@/services/foodPreferencesQueries";
import type { User, Session } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentSetupStep, setCurrentSetupStep] = useState<'personal-info' | 'health-conditions' | 'preferences' | 'complete'>('complete');
  const [checkingSetupStatus, setCheckingSetupStatus] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [preferencesJustCompleted, setPreferencesJustCompleted] = useState(false);
  const [setupSkipped, setSetupSkipped] = useState(false); // Új state: jelzi, hogy a setup be lett fejezve

  useEffect(() => {
    console.log('🔄 Index komponens betöltődött');

    // Ellenőrizzük, hogy ez egy jelszó visszaállítási link-e
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');

    if (accessToken && refreshToken && type === 'recovery') {
      console.log('🔑 Jelszó visszaállítási link észlelve, átirányítás...');
      navigate('/reset-password?' + searchParams.toString());
      return;
    }

    // Auth változások figyelése ELSŐ
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth változás:', event, session?.user?.email || 'nincs');
      
      // Ha kijelentkezés vagy nincs session, alaphelyzetbe állítjuk mindent
      if (event === 'SIGNED_OUT' || !session) {
        console.log('🚪 Nincs érvényes session, visszaállítás auth formra');
        setSession(null);
        setUser(null);
        setSetupCompleted(false);
        setCurrentSetupStep('complete');
        setPreferencesJustCompleted(false);
        setSetupSkipped(false); // Reset setup skipped flag
        setLoading(false);
        return;
      }

      // Ha van érvényes session
      setSession(session);
      setUser(session.user);
      setLoading(false);
    });

    // Kezdeti session ellenőrzés
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session hiba:', error);
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        console.log('📋 Kezdeti session:', session?.user?.email || 'nincs');
        
        if (!session) {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session.user);
        setLoading(false);
      } catch (error) {
        console.error('❌ Session lekérési hiba:', error);
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    };

    getInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams, navigate]);

  // Ellenőrizzük a felhasználó beállítási állapotát amikor bejelentkezik
  useEffect(() => {
    // CSAK akkor ellenőrizzük, ha van érvényes session ÉS user ÉS még nem fejezte be vagy hagyta ki a setupot
    if (session && user && !checkingSetupStatus && !setupCompleted && !preferencesJustCompleted && !setupSkipped) {
      checkUserSetupStatus();
    }
  }, [session, user, setupCompleted, preferencesJustCompleted, setupSkipped]);

  const checkUserSetupStatus = async () => {
    if (!session || !user) {
      console.log('❌ Nincs érvényes session vagy user, kihagyás');
      return;
    }
    
    setCheckingSetupStatus(true);
    try {
      console.log('🔍 Felhasználó beállítási állapot ellenőrzése...');
      
      // 1. Ellenőrizzük a személyes adatokat
      const profile = await fetchUserProfile(user.id);
      console.log('👤 Profil adatok:', profile);
      
      if (!profile || !profile.age || !profile.weight || !profile.height || !profile.activity_level) {
        console.log('❌ Hiányos személyes adatok, személyes info beállítás szükséges');
        setCurrentSetupStep('personal-info');
        return;
      }

      // Ha személyes adatok megvannak, akkor a setup alapvetően kész
      // Nem ellenőrizzük kötelezően a preferenciákat, csak ajánljuk
      console.log('✅ Személyes adatok megvannak, setup befejezve');
      setCurrentSetupStep('complete');
      setSetupCompleted(true);
      
    } catch (error) {
      console.error('❌ Beállítási állapot ellenőrzési hiba:', error);
      // Ha hiba van, kezdjük az elejéről
      setCurrentSetupStep('personal-info');
    } finally {
      setCheckingSetupStatus(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Kijelentkezés...');
      await supabase.auth.signOut();
      // Reset setup state kijelentkezéskor
      setSetupCompleted(false);
      setCurrentSetupStep('complete');
      setPreferencesJustCompleted(false);
      setSetupSkipped(false);
    } catch (error) {
      console.error('❌ Kijelentkezési hiba:', error);
    }
  };

  const handlePersonalInfoComplete = () => {
    console.log('✅ Személyes adatok befejezve, tovább az egészségügyi állapotokhoz');
    setCurrentSetupStep('health-conditions');
  };

  const handleHealthConditionsComplete = () => {
    console.log('✅ Egészségügyi állapotok befejezve, tovább a preferenciákhoz');
    setCurrentSetupStep('preferences');
  };

  const handlePreferencesComplete = () => {
    console.log('✅ Preferenciák befejezve, tovább az apphoz');
    setCurrentSetupStep('complete');
    setSetupCompleted(true);
    setPreferencesJustCompleted(true);
    setSetupSkipped(true); // Jelöljük, hogy a setup befejezve
  };

  // Loading state
  if (loading || checkingSetupStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-green-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Betöltés...</p>
          <p className="text-white text-sm mt-2">
            {checkingSetupStatus ? 'Beállítási állapot ellenőrzése...' : 'Session ellenőrzés...'}
          </p>
        </div>
      </div>
    );
  }

  // KRITIKUS: Csak akkor lépjünk tovább, ha van érvényes session ÉS user
  if (!session || !user) {
    console.log('🔐 Nincs érvényes session, auth form megjelenítése');
    return <ModernAuthForm onSuccess={() => {}} />;
  }

  const userProfile = {
    id: user.id,
    email: user.email || '',
    fullName: user.user_metadata?.full_name || user.email || 'Felhasználó'
  };

  // Beállítási lépések kezelése
  if (currentSetupStep === 'personal-info') {
    return (
      <PersonalInfoSetup
        user={userProfile}
        onComplete={handlePersonalInfoComplete}
      />
    );
  }

  if (currentSetupStep === 'health-conditions') {
    return (
      <HealthConditionsSetup
        user={userProfile}
        onComplete={handleHealthConditionsComplete}
        onBack={() => setCurrentSetupStep('personal-info')}
      />
    );
  }

  if (currentSetupStep === 'preferences') {
    return (
      <PreferenceSetup
        user={userProfile}
        onComplete={handlePreferencesComplete}
      />
    );
  }

  // Bejelentkezett felhasználó - teljes app megjelenítés
  return (
    <FoodPlannerApp
      user={userProfile}
      onLogout={handleLogout}
    />
  );
};

export default Index;

