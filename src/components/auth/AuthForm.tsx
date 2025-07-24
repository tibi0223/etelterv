
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const SUPABASE_URL = 'https://hhjucbkqyamutshfspyf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoanVjYmtxeWFtdXRzaGZzcHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3Mzc5OTgsImV4cCI6MjA2NTMxMzk5OH0.ZQmD-ELWa0-M_8qNv5drxm0C7tTp44wzRKWl5RPjzx0';

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface Session {
  sessionId: string;
  userId: string;
  user: User;
}

interface AuthFormProps {
  onLoginSuccess: (session: Session) => void;
}

export function AuthForm({ onLoginSuccess }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '', rememberMe: false });
  const [registerData, setRegisterData] = useState({ fullName: '', email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log('🔑 Attempting login for:', loginData.email);
      
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error('Hibás email vagy jelszó!');
      }

      if (!data.access_token || !data.user) {
        throw new Error('Érvénytelen authentikációs válasz');
      }

      console.log('✅ Login successful for:', data.user.email);

      // Create session data similar to your Apps Script
      const sessionData: Session = {
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: data.user.id,
        user: {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.user_metadata?.full_name || data.user.email
        }
      };

      onLoginSuccess(sessionData);
      
    } catch (error) {
      console.error('❌ Login error:', error);
      toast({
        title: "Bejelentkezési hiba",
        description: error instanceof Error ? error.message : "Ismeretlen hiba történt",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log('📝 Attempting registration for:', registerData.email);
      
      if (registerData.password.length < 6) {
        throw new Error('A jelszónak legalább 6 karakter hosszúnak kell lennie!');
      }

      const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: registerData.email,
          password: registerData.password,
          data: {
            full_name: registerData.fullName,
            display_name: registerData.fullName
          }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        let errorMessage = 'Hiba történt a regisztráció során!';
        if (data.msg && data.msg.includes('already registered')) {
          errorMessage = 'Ez az email cím már regisztrálva van!';
        } else if (data.error_description) {
          errorMessage = data.error_description;
        }
        throw new Error(errorMessage);
      }

      console.log('✅ Registration successful for:', registerData.email);
      
      toast({
        title: "Sikeres regisztráció!",
        description: data.user && !data.user.email_confirmed_at 
          ? "Ellenőrizd az email fiókod a megerősítéshez."
          : "Most már bejelentkezhetsz.",
      });

      // Clear form
      setRegisterData({ fullName: '', email: '', password: '' });
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      toast({
        title: "Regisztrációs hiba",
        description: error instanceof Error ? error.message : "Ismeretlen hiba történt",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: forgotEmail
        })
      });

      toast({
        title: "Email elküldve",
        description: "Ha a megadott email cím regisztrálva van, küldtünk egy jelszó visszaállító linket.",
      });

      setForgotEmail('');
      
    } catch (error) {
      console.error('❌ Password reset error:', error);
      toast({
        title: "Email elküldve",
        description: "Ha a megadott email cím regisztrálva van, küldtünk egy jelszó visszaállító linket.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-700">Ételtervező</CardTitle>
          <CardDescription>Jelentkezz be vagy regisztrálj a folytatáshoz</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Bejelentkezés</TabsTrigger>
              <TabsTrigger value="register">Regisztráció</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email cím</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Jelszó</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={loginData.rememberMe}
                    onChange={(e) => setLoginData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                    disabled={loading}
                  />
                  <Label htmlFor="remember-me" className="text-sm">Emlékezz rám</Label>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Bejelentkezés
                </Button>
              </form>
              
              <div className="text-center">
                <Tabs defaultValue="" className="w-full">
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="forgot">Elfelejtett jelszó</TabsTrigger>
                  </TabsList>
                  <TabsContent value="forgot" className="space-y-4">
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="forgot-email">Email cím</Label>
                        <Input
                          id="forgot-email"
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Jelszó visszaállítása
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Teljes név</Label>
                  <Input
                    id="register-name"
                    type="text"
                    value={registerData.fullName}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email cím</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Jelszó (min. 6 karakter)</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Regisztráció
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
