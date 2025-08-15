import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SingleRecipeApp } from "./SingleRecipeApp";
import { DailyMealPlanner } from "./DailyMealPlanner";
import { UserProfilePage } from "./UserProfilePage";
import { UserProfileModal } from "./UserProfileModal";
import { FavoritesPage } from "./FavoritesPage";
import { PreferenceSetup } from "./PreferenceSetup";
import { PreferencesPage } from "./PreferencesPage";
import { AdminDashboard } from "../admin/AdminDashboard";
import { User, Settings, Shield, Star, ChefHat, Calendar, Menu, X, Save } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchUserProfile } from "@/services/profileQueries";
import { checkUserHasPreferences } from "@/services/foodPreferencesQueries";
import { checkIsAdmin } from "@/services/adminQueries";
import { getFavorites } from "@/services/favoritesQueries";
import { HealthConditionsSetup } from "./HealthConditionsSetup";
import { SavedMealPlansPage } from "./SavedMealPlansPage";

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface FoodPlannerAppProps {
  user: User;
  onLogout: () => void;
  showPreferenceSetup?: boolean;
  onPreferenceSetupComplete?: () => void;
}

export function FoodPlannerApp({ user, onLogout, showPreferenceSetup = false, onPreferenceSetupComplete }: FoodPlannerAppProps) {
  const [currentView, setCurrentView] = useState<'single' | 'daily' | 'profile' | 'favorites' | 'preference-setup' | 'health-conditions' | 'preferences' | 'admin' | 'saved-meal-plans'>('single');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [hasPreferences, setHasPreferences] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [preferencesCompleted, setPreferencesCompleted] = useState(false); // Új flag a preferenciák befejezéséhez

  useEffect(() => {
    if (showPreferenceSetup) {
      setCurrentView('preference-setup');
    }
  }, [showPreferenceSetup]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [profile, preferencesExist, adminStatus, favorites] = await Promise.all([
          fetchUserProfile(user.id),
          checkUserHasPreferences(user.id),
          checkIsAdmin(user.id),
          getFavorites(user.id)
        ]);
        
        setUserProfile(profile);
        setHasPreferences(preferencesExist);
        setIsAdmin(adminStatus);
        setFavoritesCount(favorites?.length || 0);
        
        // Csak akkor menjen a preference-setup-ra, ha nincs preferencia ÉS még nem fejezte be
        if (!preferencesExist && !showPreferenceSetup && !preferencesCompleted) {
          setCurrentView('preference-setup');
        }
        
      } catch (error) {
        console.error('Felhasználó adatok betöltési hiba:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user.id, showPreferenceSetup, preferencesCompleted]);

  useEffect(() => {
    const updateFavoritesCount = async () => {
      if (currentView === 'favorites') {
        try {
          const favorites = await getFavorites(user.id);
          setFavoritesCount(favorites?.length || 0);
        } catch (error) {
          console.error('Kedvencek számának frissítési hiba:', error);
        }
      }
    };

    updateFavoritesCount();
  }, [currentView, user.id]);

  useEffect(() => {
    const handleNavigateToFavorites = () => {
      setCurrentView('favorites');
    };

    const handleNavigateToPreferences = () => {
      setCurrentView('preferences');
    };

    const handleNavigateToProfile = () => {
      setCurrentView('profile');
    };

    // Event listener-ek hozzáadása
    window.addEventListener('navigateToFavorites', handleNavigateToFavorites);
    window.addEventListener('navigateToPreferences', handleNavigateToPreferences);
    window.addEventListener('navigateToProfile', handleNavigateToProfile);

    // Cleanup
    return () => {
      window.removeEventListener('navigateToFavorites', handleNavigateToFavorites);
      window.removeEventListener('navigateToPreferences', handleNavigateToPreferences);
      window.removeEventListener('navigateToProfile', handleNavigateToProfile);
    };
  }, []);

  const handlePreferenceSetupComplete = () => {
    setPreferencesCompleted(true);
    setCurrentView('single');
    if (onPreferenceSetupComplete) {
      onPreferenceSetupComplete();
    }
  };

  const handleHealthConditionsComplete = () => {
    setCurrentView('single');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Betöltés...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'preference-setup') {
    return (
      <PreferenceSetup
        user={user}
        onComplete={handlePreferenceSetupComplete}
      />
    );
  }

  if (currentView === 'health-conditions') {
    return (
      <HealthConditionsSetup
        user={user}
        onComplete={handleHealthConditionsComplete}
        onBack={() => setCurrentView('single')}
      />
    );
  }

  const getPageTitle = () => {
    switch (currentView) {
      case 'favorites':
        return {
          icon: <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 fill-current" />,
          title: "Kedvencek",
          subtitle: `${favoritesCount} recept`
        };
      case 'preferences':
        return {
          icon: <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />,
          title: "Preferenciák",
          subtitle: "Ételpreferenciák"
        };
      case 'profile':
        return {
          icon: <User className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />,
          title: "Profil",
          subtitle: "Beállítások"
        };
      case 'saved-meal-plans':
        return {
          icon: <Save className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />,
          title: "Mentett Étrendek",
          subtitle: "Skálázott étrendek"
        };
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'single':
        return (
          <SingleRecipeApp
            user={user}
            onToggleDailyPlanner={() => setCurrentView('daily')}
          />
        );
      case 'daily':
        return (
          <DailyMealPlanner
            user={user}
            onToggleSingleRecipe={() => setCurrentView('single')}
          />
        );
      case 'profile':
        return (
          <div className="max-w-6xl mx-auto profile-mobile-container sm:p-6">
            <UserProfilePage
              user={user}
              onClose={() => setCurrentView('single')}
              onLogout={onLogout}
            />
          </div>
        );
      case 'favorites':
        return (
          <div className="max-w-6xl mx-auto p-3 sm:p-6">
            <FavoritesPage
              user={user}
              onClose={() => setCurrentView('single')}
            />
          </div>
        );
      case 'preferences':
        return (
          <div className="max-w-6xl mx-auto p-3 sm:p-6">
            <PreferencesPage
              user={user}
              onClose={() => setCurrentView('single')}
            />
          </div>
        );
      case 'saved-meal-plans':
        return (
          <div className="max-w-6xl mx-auto p-3 sm:p-6">
            <SavedMealPlansPage
              user={user}
              onBack={() => setCurrentView('single')}
            />
          </div>
        );
      case 'admin':
        return (
          <AdminDashboard
            user={user}
            onLogout={onLogout}
            onBackToApp={() => setCurrentView('single')}
          />
        );
      default:
        return (
          <SingleRecipeApp
            user={user}
            onToggleDailyPlanner={() => setCurrentView('daily')}
          />
        );
    }
  };

  const navItems = [
    { key: 'single', icon: ChefHat, label: 'Receptek', isActive: currentView === 'single' || currentView === 'daily' },
    { key: 'favorites', icon: Star, label: 'Kedvencek', isActive: currentView === 'favorites' },
    { key: 'saved-meal-plans', icon: Save, label: 'Mentett Étrendek', isActive: currentView === 'saved-meal-plans' },
    { key: 'preferences', icon: Settings, label: 'Preferenciák', isActive: currentView === 'preferences' },
    { key: 'profile', icon: User, label: 'Profil', isActive: currentView === 'profile' },
    ...(isAdmin ? [{ key: 'admin', icon: Shield, label: 'Admin', isActive: currentView === 'admin' }] : [])
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
      {/* Simplified Header - Always use hamburger menu on mobile and landscape */}
      <div className="sticky top-0 z-50 bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
          {/* Header Layout */}
          <div className="flex justify-between items-center">
            {/* Brand */}
            <div className="text-white flex-1 min-w-0">
              <h1 className="text-base sm:text-xl md:text-2xl font-bold flex items-center gap-1 sm:gap-2 truncate">
                🍽️ <span className="hidden xs:inline">Ételtervező</span><span className="xs:hidden">Étel</span>
              </h1>
            </div>
            
            {/* User Info */}
            <div className="flex items-center gap-1 sm:gap-3">
              <div className="hidden lg:block text-right text-white/90">
                <div className="font-medium text-sm">{user.fullName}</div>
              </div>
              
              <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-white/30">
                <AvatarImage src={userProfile?.avatar_url || undefined} alt="Profilkép" />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-xs sm:text-sm">
                  {getInitials(userProfile?.full_name || user.fullName)}
                </AvatarFallback>
              </Avatar>
              
              {/* Hamburger Menu Toggle - Show on mobile and landscape */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-white/70 hover:text-white"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              
              {/* Desktop Logout - Only on large screens */}
              <Button
                onClick={onLogout}
                variant="ghost"
                size="sm"
                className="hidden lg:flex bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-200 hover:bg-red-500/30 hover:text-white transition-all duration-200 px-2 sm:px-3 py-2 text-xs sm:text-sm"
              >
                Kilépés
              </Button>
            </div>
          </div>

          {/* Mobile/Landscape Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-3 bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-2 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setCurrentView(item.key as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-md font-medium transition-all duration-200 text-sm
                    ${item.isActive
                      ? 'bg-white/20 text-white shadow-lg border border-white/20' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
              <div className="border-t border-white/10 mt-2 pt-2">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md font-medium transition-all duration-200 text-sm bg-red-500/20 text-red-200 hover:bg-red-500/30 hover:text-white"
                >
                  Kijelentkezés
                </button>
              </div>
            </div>
          )}

          {/* Desktop Tab Navigation - Only on large screens */}
          <div className="hidden lg:flex items-center mt-4">
            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-1 flex space-x-1 overflow-x-auto">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setCurrentView(item.key as any)}
                  className={`
                    flex items-center gap-2 px-3 md:px-4 py-2 rounded-md font-medium transition-all duration-200 text-sm whitespace-nowrap
                    ${item.isActive
                      ? 'bg-white/20 text-white shadow-lg border border-white/20' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Page-specific header - Only show on larger screens or compact on mobile */}
          {getPageTitle() && (
            <div className="mt-3 sm:mt-6 flex justify-between items-center">
              <div className="text-white flex items-center gap-2">
                {getPageTitle()?.icon}
                <div>
                  <h2 className="text-lg sm:text-xl font-bold profile-portrait-header">{getPageTitle()?.title}</h2>
                  <p className="text-xs sm:text-sm text-white/70 profile-portrait-text">{getPageTitle()?.subtitle}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="py-4 sm:py-6 md:py-8 profile-portrait-spacing profile-landscape-container">
        {renderContent()}
      </div>
    </div>
  );
}
