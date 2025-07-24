
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Save, Edit3, ExternalLink, ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { fetchUserProfile, updateUserProfile, UserProfile } from "@/services/profileQueries";
import { AvatarUpload } from "./AvatarUpload";
import { supabase } from "@/integrations/supabase/client";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  onOpenFullProfile?: () => void;
}

export function UserProfileModal({ isOpen, onClose, user, onOpenFullProfile }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen, user.id]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const profileData = await fetchUserProfile(user.id);
      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Profil betöltési hiba:', error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült betölteni a profil adatokat.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    // Jelszó validáció ha meg van adva
    if (currentPassword || newPassword || confirmPassword) {
      // Ha bármelyik jelszó mező ki van töltve, akkor mindegyiknek kitöltöttnek kell lennie
      if (!currentPassword) {
        toast({
          title: "Jelszó hiba",
          description: "Add meg a jelenlegi jelszavadat!",
          variant: "destructive"
        });
        return;
      }

      if (!newPassword) {
        toast({
          title: "Jelszó hiba",
          description: "Add meg az új jelszót!",
          variant: "destructive"
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        toast({
          title: "Jelszó hiba",
          description: "A két új jelszó nem egyezik meg!",
          variant: "destructive"
        });
        return;
      }

      if (newPassword.length < 6) {
        toast({
          title: "Jelszó hiba",
          description: "Az új jelszónak legalább 6 karakter hosszúnak kell lennie!",
          variant: "destructive"
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      // Profil adatok frissítése
      await updateUserProfile(user.id, {
        full_name: profile.full_name,
        age: profile.age,
        weight: profile.weight
      });

      // Jelszó frissítése ha meg van adva
      if (currentPassword && newPassword) {
        // Először ellenőrizzük a jelenlegi jelszót egy újra bejelentkezéssel
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword
        });

        if (signInError) {
          toast({
            title: "Jelszó hiba",
            description: "A jelenlegi jelszó helytelen!",
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }

        // Ha a jelenlegi jelszó helyes, frissítjük az újra
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (passwordError) {
          console.error('Jelszó frissítési hiba:', passwordError);
          toast({
            title: "Jelszó frissítési hiba",
            description: passwordError.message,
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }

        toast({
          title: "Jelszó frissítve! 🔒",
          description: "A jelszavad sikeresen megváltozott.",
        });
      }
      
      setIsEditing(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Profil mentve! ✅",
        description: "Az alapadatok sikeresen frissítve lettek.",
      });
    } catch (error) {
      console.error('Profil mentési hiba:', error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült menteni a profil adatokat.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    if (profile) {
      const updatedProfile = { ...profile, avatar_url: newAvatarUrl };
      setProfile(updatedProfile);
      
      try {
        await updateUserProfile(user.id, { avatar_url: newAvatarUrl });
      } catch (error) {
        console.error('Avatar URL mentési hiba:', error);
      }
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string | number | null) => {
    if (profile) {
      setProfile(prev => prev ? {
        ...prev,
        [field]: value
      } : null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    loadProfile(); // Visszaállítjuk az eredeti adatokat
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-auto bg-white rounded-xl shadow-2xl border-0 max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Betöltés...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-md mx-auto bg-white rounded-xl shadow-2xl border-0 max-h-[95vh] overflow-hidden flex flex-col p-0 [&>button]:hidden">
        {/* Fixed Header */}
        <DialogHeader className="shrink-0 px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-center relative">
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 p-2 h-8 w-8 absolute left-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <DialogTitle className="text-xl font-bold text-gray-800">
              Felhasználói Profil
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Profilkép */}
            <div className="flex justify-center">
              <AvatarUpload
                currentAvatarUrl={profile?.avatar_url}
                userId={user.id}
                onAvatarUpdate={handleAvatarUpdate}
                userName={profile?.full_name || user.fullName}
              />
            </div>

            {/* Teljes Név */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                Teljes Név
              </Label>
              <Input
                id="fullName"
                value={profile?.full_name || ''}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                disabled={!isEditing}
                className={`transition-all duration-200 ${
                  isEditing 
                    ? 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              />
            </div>

            {/* Email cím (nem szerkeszthető) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email cím
              </Label>
              <Input
                id="email"
                value={user.email}
                disabled={true}
                className="bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500">Az email cím nem módosítható</p>
            </div>

            {/* Jelszó változtatás - csak szerkesztés módban */}
            {isEditing && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">
                    Jelenlegi jelszó
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Jelenlegi jelszavad"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pl-10 pr-10 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                    Új jelszó (min. 6 karakter)
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Új jelszó"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                    Új jelszó megerősítése
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Új jelszó megerősítése"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-sm text-red-500">A jelszavak nem egyeznek meg</p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    💡 <strong>Jelszó változtatás:</strong> Ha meg szeretnéd változtatni a jelszavad, töltsd ki mindhárom mezőt. Ha nem szeretnéd változtatni, hagyd őket üresen.
                  </p>
                </div>
              </>
            )}

            {/* Kor */}
            <div className="space-y-2">
              <Label htmlFor="age" className="text-sm font-medium text-gray-700">
                Kor (év)
              </Label>
              <Input
                id="age"
                type="number"
                value={profile?.age || ''}
                onChange={(e) => handleInputChange('age', parseInt(e.target.value) || null)}
                disabled={!isEditing}
                placeholder="Például: 25"
                className={`transition-all duration-200 ${
                  isEditing 
                    ? 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              />
            </div>

            {/* Súly */}
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-sm font-medium text-gray-700">
                Súly (kg)
              </Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={profile?.weight || ''}
                onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || null)}
                disabled={!isEditing}
                placeholder="Például: 70"
                className={`transition-all duration-200 ${
                  isEditing 
                    ? 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white space-y-3">
          {/* Részletes profil gomb */}
          {onOpenFullProfile && (
            <Button
              onClick={() => {
                onOpenFullProfile();
                onClose();
              }}
              variant="outline"
              className="w-full flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 h-10"
            >
              <ExternalLink className="w-4 h-4" />
              Részletes profil megnyitása
            </Button>
          )}

          {/* Szerkesztés/Mentés gombok */}
          <div className="flex justify-center gap-3">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 h-10"
              >
                <Edit3 className="w-4 h-4" />
                Szerkesztés
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="px-6 py-2 rounded-lg font-medium border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200 h-10"
                >
                  Mégse
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed h-10"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Mentés...' : 'Mentés'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
