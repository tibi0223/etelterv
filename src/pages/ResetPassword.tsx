
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Lock, ChefHat } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      console.log('🔍 ResetPassword oldal betöltődött');
      
      // Ellenőrizzük az URL paramétereket
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');

      console.log('🔍 URL paraméterek:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });

      // Ha vannak URL paraméterek, állítsuk be a session-t
      if (accessToken && refreshToken && type === 'recovery') {
        console.log('🔑 Token paraméterek találhatók, session beállítása...');
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('❌ Session beállítási hiba:', error);
            toast({
              title: "Érvénytelen link",
              description: "A jelszó visszaállítási link érvénytelen vagy lejárt.",
              variant: "destructive",
            });
            navigate('/');
            return;
          }

          console.log('✅ Session sikeresen beállítva URL paraméterekből');
          setIsValidSession(true);
        } catch (error) {
          console.error('❌ Session beállítási hiba:', error);
          toast({
            title: "Hiba",
            description: "Hiba történt a session beállításakor.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }
      } else {
        // Ha nincsenek URL paraméterek, ellenőrizzük a meglévő session-t
        console.log('🔍 URL paraméterek hiányoznak, meglévő session ellenőrzése...');
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error || !session) {
            console.log('❌ Nincs érvényes session');
            toast({
              title: "Érvénytelen link",
              description: "A jelszó visszaállítási link érvénytelen vagy lejárt.",
              variant: "destructive",
            });
            navigate('/');
            return;
          }

          console.log('✅ Érvényes session találva');
          setIsValidSession(true);
        } catch (error) {
          console.error('❌ Session ellenőrzési hiba:', error);
          toast({
            title: "Hiba",
            description: "Hiba történt a session ellenőrzésekor.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }
      }
    };

    checkSession();
  }, [searchParams, navigate, toast]);

  const handleResetPassword = async () => {
    if (password !== confirmPassword) {
      toast({
        title: "Jelszó hiba",
        description: "A két jelszó nem egyezik meg!",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Jelszó hiba",
        description: "A jelszónak legalább 6 karakter hosszúnak kell lennie!",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔄 Jelszó frissítése...');
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('❌ Jelszó frissítési hiba:', error);
        toast({
          title: "Hiba",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('✅ Jelszó sikeresen frissítve');
        toast({
          title: "Sikeres jelszó változtatás! 🎉",
          description: "A jelszavad sikeresen megváltozott. Most már bejelentkezhetsz az új jelszóval.",
        });
        // Redirect to main page
        navigate('/');
      }
    } catch (error) {
      console.error("❌ Jelszó változtatási hiba:", error);
      toast({
        title: "Hiba",
        description: "Váratlan hiba történt. Kérlek próbáld újra!",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Ha még nem ellenőriztük a session-t, loading képernyő
  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-green-500 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Jelszó visszaállítás ellenőrzése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-green-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Új jelszó beállítása
            </CardTitle>
            <CardDescription className="text-gray-600 text-lg">
              Add meg az új jelszavadat
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium text-gray-700">
                  Új jelszó (min. 6 karakter)
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password" className="text-sm font-medium text-gray-700">
                  Jelszó megerősítése
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirm-new-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-red-500">A jelszavak nem egyeznek meg</p>
                )}
              </div>
            </div>

            <Button
              onClick={handleResetPassword}
              disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              {isLoading ? "Jelszó változtatása..." : "Jelszó megváltoztatása"}
            </Button>

            <div className="text-center">
              <button
                onClick={() => navigate('/')}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Vissza a bejelentkezéshez
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
