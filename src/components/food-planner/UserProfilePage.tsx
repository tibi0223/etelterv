import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Edit, User, Heart, Utensils, Settings, Star, Save, X, Shield, Calendar, ArrowLeft, Eye, EyeOff, Lock, Target } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { fetchUserPreferences, FoodPreference } from "@/services/foodPreferencesQueries";
import { updateUserProfile } from "@/services/profileQueries";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { AvatarUpload } from "./AvatarUpload";
import { Recipe } from "@/types/recipe";
import { convertToStandardRecipe } from "@/utils/recipeConverter";

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface UserProfilePageProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
}

interface StarRating {
  recipe_name: string;
  rating: number;
  date: string;
  recipe_data?: Recipe;
}

export function UserProfilePage({ user, onClose, onLogout }: UserProfilePageProps) {
  const [profileData, setProfileData] = useState<any>(null);
  const [editableProfile, setEditableProfile] = useState<any>(null);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [preferencesData, setPreferencesData] = useState<FoodPreference[]>([]);
  const [totalIngredientsCount, setTotalIngredientsCount] = useState(0);
  const [starRatings, setStarRatings] = useState<StarRating[]>([]);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAllRatings, setShowAllRatings] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { toast } = useToast();

  const categoryNames = [
    'Húsfélék',
    'Halak', 
    'Zöldségek / Vegetáriánus',
    'Tejtermékek',
    'Gyümölcsök',
    'Gabonák és Tészták',
    'Olajok és Magvak'
  ];

  useEffect(() => {
    loadProfileData();
  }, [user.id]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Profil adatok betöltése
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profil betöltési hiba:', profileError);
      } else {
        setProfileData(profile);
        setEditableProfile(profile);
      }

      // Kedvencek számának betöltése
      const { data: favorites, error: favoritesError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id);

      if (favoritesError) {
        console.error('Kedvencek betöltési hiba:', favoritesError);
      } else {
        setFavoritesCount(favorites?.length || 0);
      }

      // Preferenciák betöltése
      const preferences = await fetchUserPreferences(user.id);
      setPreferencesData(preferences);

      // Kategóriás statisztikák betöltése
      await loadCategoryStats(preferences);

      // Csillagos értékelések betöltése - CSAK A JELENLEGI FELHASZNÁLÓ ÉRTÉKELÉSEI
      await loadStarRatingsWithRecipes();

      // Összes alapanyag számának meghatározása
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('Ételkategóriák_Új')
        .select('*');

      if (!categoriesError && categoriesData) {
        let totalIngredients = 0;
        categoryNames.forEach(categoryName => {
          categoriesData.forEach(row => {
            const categoryValue = row[categoryName];
            if (categoryValue && typeof categoryValue === 'string' && categoryValue.trim() !== '' && categoryValue !== 'EMPTY') {
              totalIngredients++;
            }
          });
        });

        setTotalIngredientsCount(totalIngredients);
      }
      
    } catch (error) {
      console.error('Adatok betöltési hiba:', error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült betölteni a profil adatokat.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryStats = async (preferences: FoodPreference[]) => {
    try {
      const { data: categoriesData, error } = await supabase
        .from('Ételkategóriák_Új')
        .select('*');

      if (error || !categoriesData) return;

      const stats = categoryNames.map(categoryName => {
        // Kategóriához tartozó összes alapanyag
        const categoryIngredients: string[] = [];
        categoriesData.forEach(row => {
          const categoryValue = row[categoryName];
          if (categoryValue && typeof categoryValue === 'string' && categoryValue.trim() !== '' && categoryValue !== 'EMPTY') {
            categoryIngredients.push(categoryValue.trim());
          }
        });

        // Preferenciák számolása erre a kategóriára
        const categoryPrefs = preferences.filter(p => p.category === categoryName);
        const liked = categoryPrefs.filter(p => p.preference === 'like').length;
        const disliked = categoryPrefs.filter(p => p.preference === 'dislike').length;
        const neutral = categoryIngredients.length - liked - disliked;

        return {
          category: categoryName,
          Kedvelem: liked,
          'Nem szeretem': disliked,
          Semleges: neutral,
          total: categoryIngredients.length
        };
      });

      setCategoryStats(stats);
    } catch (error) {
      console.error('Kategória statisztikák betöltési hiba:', error);
    }
  };

  const loadStarRatingsWithRecipes = async () => {
    try {
      // EGYSZERŰSÍTETT MEGOLDÁS: Értékelések betöltése CSAK a jelenlegi felhasználótól
      const { data: ratings, error } = await supabase
        .from('Értékelések')
        .select('*')
        .eq('user_id', user.id) // FONTOS: csak a jelenlegi felhasználó értékelései
        .order('Dátum', { ascending: false });

      if (error) {
        console.error('Értékelések betöltési hiba:', error);
        return;
      }

      // Receptek betöltése az Adatbázis táblából
      const { data: allRecipes, error: recipesError } = await supabase
        .from('Adatbázis')
        .select('*');

      if (recipesError) {
        console.error('Receptek betöltési hiba:', recipesError);
      }

      // Az értékelések formázása recept adatokkal együtt
      const formattedRatings: StarRating[] = (ratings || []).map(rating => {
        const recipeName = rating['Recept neve'] || 'Ismeretlen recept';
        
        // Recept keresése az Adatbázis táblában
        let recipeData: Recipe | undefined = undefined;
        if (allRecipes) {
          const foundRecipe = allRecipes.find(recipe => recipe.Recept_Neve === recipeName);
          if (foundRecipe) {
            recipeData = convertToStandardRecipe(foundRecipe);
          }
        }
        
        return {
          recipe_name: recipeName,
          rating: parseInt(rating['Értékelés']) || 0,
          date: new Date(rating['Dátum']).toLocaleDateString('hu-HU') || 'Ismeretlen dátum',
          recipe_data: recipeData
        };
      }).filter(rating => rating.rating > 0);

      setStarRatings(formattedRatings);
    } catch (error) {
      console.error('Csillagos értékelések betöltési hiba:', error);
    }
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditableProfile(profileData);
    // Reset password fields
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSaveProfile = async () => {
    // Password validation if any password field is filled
    if (currentPassword || newPassword || confirmPassword) {
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

    try {
      setIsSaving(true);
      
      // Profile data update
      await updateUserProfile(user.id, {
        full_name: editableProfile?.full_name || '',
        age: editableProfile?.age || null,
        weight: editableProfile?.weight || null,
        height: editableProfile?.height || null,
        activity_level: editableProfile?.activity_level || null
        // Makró célok ideiglenesen eltávolítva, amíg az adatbázis nem frissül
        // target_protein: editableProfile?.target_protein || null,
        // target_carbs: editableProfile?.target_carbs || null,
        // target_fat: editableProfile?.target_fat || null,
        // target_calories: editableProfile?.target_calories || null
      });

      // Password update if provided
      if (currentPassword && newPassword) {
        // First verify current password by re-authenticating
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

        // If current password is correct, update to new password
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

      setProfileData(editableProfile);
      setIsEditing(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      toast({
        title: "Profil mentve! ✅",
        description: "Az adatok sikeresen frissítve lettek.",
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

  const handleInputChange = (field: string, value: string | number) => {
    setEditableProfile(prev => ({
      ...prev,
      [field]: value === '' ? null : value
    }));
  };

  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    try {
      await updateUserProfile(user.id, { avatar_url: newAvatarUrl });
      
      const updatedProfile = { ...profileData, avatar_url: newAvatarUrl };
      setProfileData(updatedProfile);
      setEditableProfile(updatedProfile);
      
      toast({
        title: "Profilkép frissítve! ✅",
        description: "A profilkép sikeresen megváltozott.",
      });
    } catch (error) {
      console.error('Profilkép frissítési hiba:', error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült frissíteni a profilképet.",
        variant: "destructive"
      });
    }
  };

  const handleShowFavorites = () => {
    onClose();
    window.dispatchEvent(new CustomEvent('navigate-to-favorites'));
  };

  const handleShowPreferences = () => {
    onClose();
    window.dispatchEvent(new CustomEvent('navigate-to-preferences'));
  };

  const openRecipeModal = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  const closeRecipeModal = () => {
    setSelectedRecipe(null);
  };

  const getPreferenceStats = () => {
    const liked = preferencesData.filter(p => p.preference === 'like').length;
    const disliked = preferencesData.filter(p => p.preference === 'dislike').length;
    const neutral = totalIngredientsCount - liked - disliked;
    
    return { 
      liked, 
      disliked, 
      neutral, 
      total: totalIngredientsCount,
      storedPreferences: preferencesData.length 
    };
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('hu-HU');
  };

  const preferenceStats = getPreferenceStats();

  // Chart colors
  const COLORS = ['#10B981', '#EF4444', '#6B7280']; // green, red, gray

  const chartConfig = {
    Kedvelem: {
      label: "Kedvelem",
      color: "#10B981",
    },
    'Nem szeretem': {
      label: "Nem szeretem", 
      color: "#EF4444",
    },
    Semleges: {
      label: "Semleges",
      color: "#6B7280",
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Betöltés...</p>
        </div>
      </div>
    );
  }

  const displayedRatings = showAllRatings ? starRatings : starRatings.slice(0, 9);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-2 sm:px-6 py-2 sm:py-8 space-y-2 sm:space-y-6 profile-portrait-container">
          {/* Statisztikák */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-2 sm:mb-6">
            <Card className="bg-white/10 border-white/20 text-white">
              <CardContent className="p-2 sm:p-4 profile-mobile-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-white/70 profile-portrait-stats">Regisztráció</p>
                    <p className="text-sm sm:text-2xl font-bold profile-portrait-number">{formatDate(profileData?.created_at || new Date().toISOString())}</p>
                  </div>
                  <Calendar className="w-4 h-4 sm:w-8 sm:h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 border-white/20 text-white">
              <CardContent className="p-2 sm:p-4 profile-mobile-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-white/70 profile-portrait-stats">Kedvencek</p>
                    <p className="text-sm sm:text-2xl font-bold profile-portrait-number">{favoritesCount}</p>
                  </div>
                  <Heart className="w-4 h-4 sm:w-8 sm:h-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 border-white/20 text-white">
              <CardContent className="p-2 sm:p-4 profile-mobile-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-white/70 profile-portrait-stats">Preferenciák</p>
                    <p className="text-sm sm:text-2xl font-bold profile-portrait-number">{preferenceStats.storedPreferences}</p>
                  </div>
                  <Utensils className="w-4 h-4 sm:w-8 sm:h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 border-white/20 text-white">
              <CardContent className="p-2 sm:p-4 profile-mobile-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-white/70 profile-portrait-stats">Értékelések</p>
                    <p className="text-sm sm:text-2xl font-bold profile-portrait-number">{starRatings.length}</p>
                  </div>
                  <Star className="w-4 h-4 sm:w-8 sm:h-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profil információk */}
          <Card className="bg-white/10 border-white/20 mb-2 sm:mb-6">
            <CardHeader className="p-2 sm:p-6">
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Shield className="w-3 h-3 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-lg profile-portrait-card-title">Profil információk</span>
                </div>
                {!isEditing ? (
                  <Button
                    onClick={handleEditProfile}
                    variant="outline"
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white border border-purple-500 text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 profile-mobile-button"
                  >
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Szerkesztés
                  </Button>
                ) : (
                  <div className="flex gap-1 sm:gap-2">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 profile-mobile-button"
                    >
                      <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      {isSaving ? 'Mentés...' : 'Mentés'}
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                      className="border-white/30 text-white hover:bg-white/10 text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 profile-mobile-button"
                    >
                      <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Mégse
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-6 p-2 sm:p-6">
              <div className="flex items-start gap-2 sm:gap-6">
                <div className="flex flex-col items-center gap-2 sm:gap-4">
                  <AvatarUpload
                    currentAvatarUrl={profileData?.avatar_url}
                    userId={user.id}
                    onAvatarUpdate={handleAvatarUpdate}
                    userName={profileData?.full_name || user.fullName}
                  />
                </div>
                
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-2 sm:space-y-4">
                      <div>
                        <Label htmlFor="fullName" className="text-xs sm:text-sm font-medium text-white/70 mb-1 block profile-mobile-text">
                          Teljes név
                        </Label>
                        <Input
                          id="fullName"
                          value={editableProfile?.full_name || ''}
                          onChange={(e) => handleInputChange('full_name', e.target.value)}
                          className="max-w-sm bg-white/10 border-white/20 text-white placeholder:text-white/50 text-xs sm:text-sm profile-mobile-input"
                        />
                      </div>
                      
                      {/* Email field (readonly) */}
                      <div>
                        <Label className="text-xs sm:text-sm font-medium text-white/70 mb-1 block profile-mobile-text">
                          Email cím
                        </Label>
                        <Input
                          value={user.email}
                          disabled={true}
                          className="max-w-sm bg-white/5 border-white/10 text-white/50 cursor-not-allowed text-xs sm:text-sm profile-mobile-input"
                        />
                        <p className="text-xs text-white/50 mt-1">Az email cím nem módosítható</p>
                      </div>

                      {/* Password change section */}
                      <div className="space-y-2 sm:space-y-4 border-t border-white/10 pt-2 sm:pt-4">
                        <h4 className="text-sm sm:text-lg font-medium text-white profile-portrait-card-title">Jelszó megváltoztatása</h4>
                        
                        <div>
                          <Label htmlFor="currentPassword" className="text-xs sm:text-sm font-medium text-white/70 mb-1 block profile-mobile-text">
                            Jelenlegi jelszó
                          </Label>
                          <div className="relative max-w-sm">
                            <Lock className="absolute left-3 top-3 h-3 w-3 sm:h-4 sm:w-4 text-white/50" />
                            <Input
                              id="currentPassword"
                              type={showCurrentPassword ? "text" : "password"}
                              placeholder="Jelenlegi jelszavad"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="pl-8 sm:pl-10 pr-8 sm:pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-xs sm:text-sm profile-mobile-input"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-3 h-3 w-3 sm:h-4 sm:w-4 text-white/50 hover:text-white/70"
                            >
                              {showCurrentPassword ? <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Eye className="h-3 w-3 sm:h-4 sm:w-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="newPassword" className="text-xs sm:text-sm font-medium text-white/70 mb-1 block profile-mobile-text">
                            Új jelszó (min. 6 karakter)
                          </Label>
                          <div className="relative max-w-sm">
                            <Lock className="absolute left-3 top-3 h-3 w-3 sm:h-4 sm:w-4 text-white/50" />
                            <Input
                              id="newPassword"
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Új jelszó"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="pl-8 sm:pl-10 pr-8 sm:pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-xs sm:text-sm profile-mobile-input"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-3 h-3 w-3 sm:h-4 sm:w-4 text-white/50 hover:text-white/70"
                            >
                              {showNewPassword ? <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Eye className="h-3 w-3 sm:h-4 sm:w-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="confirmPassword" className="text-xs sm:text-sm font-medium text-white/70 mb-1 block profile-mobile-text">
                            Új jelszó megerősítése
                          </Label>
                          <div className="relative max-w-sm">
                            <Lock className="absolute left-3 top-3 h-3 w-3 sm:h-4 sm:w-4 text-white/50" />
                            <Input
                              id="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Új jelszó megerősítése"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="pl-8 sm:pl-10 pr-8 sm:pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-xs sm:text-sm profile-mobile-input"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-3 h-3 w-3 sm:h-4 sm:w-4 text-white/50 hover:text-white/70"
                            >
                              {showConfirmPassword ? <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Eye className="h-3 w-3 sm:h-4 sm:w-4" />}
                            </button>
                          </div>
                          {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-xs text-red-400 mt-1">A jelszavak nem egyeznek meg</p>
                          )}
                        </div>

                        <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-2 sm:p-3 max-w-md">
                          <p className="text-xs sm:text-sm text-blue-300">
                            💡 <strong>Jelszó változtatás:</strong> Ha meg szeretnéd változtatni a jelszavad, töltsd ki mindhárom mezőt. Ha nem szeretnéd változtatni, hagyd őket üresen.
                          </p>
                        </div>
                      </div>

                      {/* Makró célok szekció */}
                      <div className="space-y-2 sm:space-y-4 border-t border-white/10 pt-2 sm:pt-4">
                        <h4 className="text-sm sm:text-lg font-medium text-white profile-portrait-card-title flex items-center gap-2">
                          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                          Napi Makró Célok
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-2 sm:gap-4">
                          <div>
                            <Label htmlFor="targetProtein" className="text-xs sm:text-sm font-medium text-white/70 mb-1 block profile-mobile-text">
                              Fehérje (g)
                            </Label>
                            <Input
                              id="targetProtein"
                              type="number"
                              value={editableProfile?.target_protein || ''}
                              onChange={(e) => handleInputChange('target_protein', parseInt(e.target.value) || '')}
                              placeholder="120"
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-xs sm:text-sm profile-mobile-input"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="targetCarbs" className="text-xs sm:text-sm font-medium text-white/70 mb-1 block profile-mobile-text">
                              Szénhidrát (g)
                            </Label>
                            <Input
                              id="targetCarbs"
                              type="number"
                              value={editableProfile?.target_carbs || ''}
                              onChange={(e) => handleInputChange('target_carbs', parseInt(e.target.value) || '')}
                              placeholder="160"
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-xs sm:text-sm profile-mobile-input"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="targetFat" className="text-xs sm:text-sm font-medium text-white/70 mb-1 block profile-mobile-text">
                              Zsír (g)
                            </Label>
                            <Input
                              id="targetFat"
                              type="number"
                              value={editableProfile?.target_fat || ''}
                              onChange={(e) => handleInputChange('target_fat', parseInt(e.target.value) || '')}
                              placeholder="50"
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-xs sm:text-sm profile-mobile-input"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="targetCalories" className="text-xs sm:text-sm font-medium text-white/70 mb-1 block profile-mobile-text">
                              Kalória (kcal)
                            </Label>
                            <Input
                              id="targetCalories"
                              type="number"
                              value={editableProfile?.target_calories || ''}
                              onChange={(e) => handleInputChange('target_calories', parseInt(e.target.value) || '')}
                              placeholder="1700"
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-xs sm:text-sm profile-mobile-input"
                            />
                          </div>
                        </div>
                        
                        <div className="bg-purple-500/10 border border-purple-400/20 rounded-lg p-2 sm:p-3 max-w-md">
                          <p className="text-xs sm:text-sm text-purple-300">
                            💡 <strong>Makró célok:</strong> Ezek az értékek lesznek használva az étrend tervezésnél. A makró skálázó automatikusan betölti ezeket az értékeket.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                        <div>
                          <Label htmlFor="age" className="text-xs sm:text-sm font-medium text-white/70 mb-1 block profile-mobile-text">
                            Életkor (év)
                          </Label>
                          <Input
                            id="age"
                            type="number"
                            value={editableProfile?.age || ''}
                            onChange={(e) => handleInputChange('age', parseInt(e.target.value) || '')}
                            placeholder="30"
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-xs sm:text-sm profile-mobile-input"
                          />
                        </div>
                        <div>
                          <Label htmlFor="weight" className="text-xs sm:text-sm font-medium text-white/70 mb-1 block profile-mobile-text">
                            Testsúly (kg)
                          </Label>
                          <Input
                            id="weight"
                            type="number"
                            step="0.1"
                            value={editableProfile?.weight || ''}
                            onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || '')}
                            placeholder="70"
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-xs sm:text-sm profile-mobile-input"
                          />
                        </div>
                        <div>
                          <Label htmlFor="height" className="text-xs sm:text-sm font-medium text-white/70 mb-1 block profile-mobile-text">
                            Magasság (cm)
                          </Label>
                          <Input
                            id="height"
                            type="number"
                            value={editableProfile?.height || ''}
                            onChange={(e) => handleInputChange('height', parseInt(e.target.value) || '')}
                            placeholder="175"
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-xs sm:text-sm profile-mobile-input"
                          />
                        </div>
                        <div>
                          <Label htmlFor="activity" className="text-xs sm:text-sm font-medium text-white/70 mb-1 block profile-mobile-text">
                            Aktivitási szint
                          </Label>
                          <select
                            id="activity"
                            value={editableProfile?.activity_level || ''}
                            onChange={(e) => handleInputChange('activity_level', e.target.value)}
                            className="w-full px-3 py-2 border border-white/20 bg-white/10 text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">Válassz...</option>
                            <option value="sedentary">Ülő munkás</option>
                            <option value="lightly_active">Könnyű aktivitás</option>
                            <option value="moderately_active">Közepes aktivitás</option>
                            <option value="very_active">Nagyon aktív</option>
                            <option value="extra_active">Rendkívül aktív</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg sm:text-2xl font-bold text-white mb-1 profile-portrait-card-title">{editableProfile?.full_name || user.fullName}</h2>
                      <p className="text-white/60 mb-2 sm:mb-4 text-xs sm:text-base profile-portrait-text">{user.email}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                        {editableProfile?.age && (
                          <div className="text-center p-2 sm:p-3 bg-blue-600/20 rounded-lg">
                            <p className="text-xs sm:text-sm text-white/70 profile-portrait-stats">Életkor</p>
                            <p className="text-sm sm:text-lg font-semibold text-blue-400 profile-portrait-number">{editableProfile.age} év</p>
                          </div>
                        )}
                        {editableProfile?.weight && (
                          <div className="text-center p-2 sm:p-3 bg-green-600/20 rounded-lg">
                            <p className="text-xs sm:text-sm text-white/70 profile-portrait-stats">Testsúly</p>
                            <p className="text-sm sm:text-lg font-semibold text-green-400 profile-portrait-number">{editableProfile.weight} kg</p>
                          </div>
                        )}
                        {editableProfile?.height && (
                          <div className="text-center p-2 sm:p-3 bg-purple-600/20 rounded-lg">
                            <p className="text-xs sm:text-sm text-white/70 profile-portrait-stats">Magasság</p>
                            <p className="text-sm sm:text-lg font-semibold text-purple-400 profile-portrait-number">{editableProfile.height} cm</p>
                          </div>
                        )}
                        {editableProfile?.activity_level && (
                          <div className="text-center p-2 sm:p-3 bg-orange-600/20 rounded-lg">
                            <p className="text-xs sm:text-sm text-white/70 profile-portrait-stats">Aktivitási szint</p>
                            <p className="text-sm sm:text-lg font-semibold text-orange-400">
                              {editableProfile.activity_level === 'sedentary' && 'Ülő munkás'}
                              {editableProfile.activity_level === 'lightly_active' && 'Könnyű aktivitás'}
                              {editableProfile.activity_level === 'moderately_active' && 'Közepes aktivitás'}
                              {editableProfile.activity_level === 'very_active' && 'Nagyon aktív'}
                              {editableProfile.activity_level === 'extra_active' && 'Rendkívül aktív'}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gyorsnavigáció */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-white/10 border-white/20 text-white">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-400" />
                  Kedvenc receptek
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Mentett receptek</span>
                    <Badge className="bg-red-600/20 text-red-400 border-red-400/50">
                      {favoritesCount} db
                    </Badge>
                  </div>
                  <Button
                    onClick={handleShowFavorites}
                    variant="outline"
                    size="sm"
                    className="w-full bg-red-600/20 border-red-400/50 text-red-400 hover:bg-red-600/30"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Kedvencek megtekintése
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 text-white">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-green-400" />
                  Ételpreferenciák
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Kedvelem</span>
                      <Badge className="bg-green-600/20 text-green-400 border-green-400/50">
                        {preferenceStats.liked} db
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Nem szeretem</span>
                      <Badge className="bg-red-600/20 text-red-400 border-red-400/50">
                        {preferenceStats.disliked} db
                      </Badge>
                    </div>
                  </div>
                  <Button
                    onClick={handleShowPreferences}
                    variant="outline"
                    size="sm"
                    className="w-full bg-green-600/20 border-green-400/50 text-green-400 hover:bg-green-600/30"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Preferenciák kezelése
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preferenciák diagram kategóriánként - TELJES SZÉLESSÉGŰ */}
          {categoryStats.length > 0 && (
            <Card className="bg-white/10 border-white/20 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Utensils className="w-6 h-6 text-green-400" />
                  Ételpreferenciák kategóriánként
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full">
                  <ChartContainer config={chartConfig} className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <XAxis 
                          dataKey="category" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          fontSize={12}
                          stroke="#ffffff"
                          tick={{ fill: '#ffffff' }}
                        />
                        <YAxis stroke="#ffffff" tick={{ fill: '#ffffff' }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="Kedvelem" fill="#10B981" />
                        <Bar dataKey="Nem szeretem" fill="#EF4444" />
                        <Bar dataKey="Semleges" fill="#6B7280" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Csillagos értékelések - MINDEN KÁRTYÁRA KATTINTHATÓ */}
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-400" />
                Receptértékeléseim
              </CardTitle>
            </CardHeader>
            <CardContent>
              {starRatings.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedRatings.map((rating, index) => (
                      <div 
                        key={index} 
                        className="p-4 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                        onClick={() => rating.recipe_data && openRecipeModal(rating.recipe_data)}
                      >
                        <h4 className="font-medium text-white mb-2 truncate">{rating.recipe_name}</h4>
                        <div className="flex items-center gap-2 mb-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= rating.rating 
                                  ? 'text-yellow-400 fill-current' 
                                  : 'text-white/30'
                              }`}
                            />
                          ))}
                          <span className="text-sm text-white/60">({rating.rating}/5)</span>
                        </div>
                        <p className="text-xs text-white/50">{rating.date}</p>
                        <p className="text-xs text-blue-400 mt-1">
                          {rating.recipe_data ? 'Kattints a részletekhez' : 'Recept adatok nem elérhetők'}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  {starRatings.length > 9 && (
                    <div className="text-center pt-4">
                      {!showAllRatings ? (
                        <Button
                          onClick={() => setShowAllRatings(true)}
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                        >
                          És még {starRatings.length - 9} értékelés...
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setShowAllRatings(false)}
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                        >
                          Kevesebb mutatása
                        </Button>
                      )}
                    </div>
                  )}
                  
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Saját értékeléseim:</span>
                      <span className="font-semibold text-yellow-400">{starRatings.length} db</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Átlagos értékelésem:</span>
                      <span className="font-semibold text-yellow-400">
                        {starRatings.length > 0 
                          ? (starRatings.reduce((sum, r) => sum + r.rating, 0) / starRatings.length).toFixed(1)
                          : '0'
                        } ⭐
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/60">Még nem értékeltél egyetlen receptet sem.</p>
                  <p className="text-sm text-white/50 mt-2">
                    Az értékeléseid itt fognak megjelenni, miután csillagokkal értékelsz recepteket.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Teljes képernyős recept modal */}
      {selectedRecipe && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={closeRecipeModal}
        >
          <div className="relative max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto animate-scale-in">
            <button
              onClick={closeRecipeModal}
              className="absolute -top-8 sm:-top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
            >
              <X className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
            
            <div className="bg-gradient-to-br from-indigo-600/90 to-purple-700/90 backdrop-blur-sm rounded-2xl p-4 sm:p-8 text-white shadow-2xl border border-white/20">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 sm:mb-6 px-2">🍽️ {selectedRecipe.név}</h2>
                
                {selectedRecipe.képUrl && (
                  <div className="mb-6 sm:mb-8">
                    <img 
                      src={selectedRecipe.képUrl} 
                      alt={selectedRecipe.név}
                      className="max-w-full max-h-60 sm:max-h-80 mx-auto rounded-2xl shadow-2xl border-4 border-white/30"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20">
                  <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                    📝 Hozzávalók ({selectedRecipe.hozzávalók?.length || 0} db)
                  </h3>
                  <ul className="text-white/90 space-y-2 sm:space-y-3">
                    {selectedRecipe.hozzávalók?.map((ingredient, index) => (
                      <li key={index} className="flex items-start bg-white/5 p-2 sm:p-3 rounded-lg">
                        <span className="text-green-400 mr-2 sm:mr-3 font-bold text-base sm:text-lg">•</span>
                        <span className="text-sm sm:text-lg">{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20">
                  <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                    👨‍🍳 Elkészítés
                  </h3>
                  <div 
                    className="text-white/90 leading-relaxed text-sm sm:text-lg"
                    dangerouslySetInnerHTML={{ 
                      __html: selectedRecipe.elkészítés?.replace(/(\d+\.\s)/g, '<br><strong class="text-yellow-300">$1</strong>') || '' 
                    }}
                  />
                </div>
              </div>

              {(selectedRecipe.elkészítésiIdő || selectedRecipe.fehérje || selectedRecipe.szénhidrát || selectedRecipe.zsír) && (
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">📊 Tápértékek</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
                    {selectedRecipe.elkészítésiIdő && (
                      <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center border border-blue-300/30">
                        <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">⏱️</div>
                        <div className="text-white font-semibold text-sm sm:text-lg">{selectedRecipe.elkészítésiIdő}</div>
                      </div>
                    )}
                    {selectedRecipe.fehérje && (
                      <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center border border-red-300/30">
                        <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">🥩</div>
                        <div className="text-white font-semibold text-sm sm:text-lg">{selectedRecipe.fehérje}g fehérje</div>
                      </div>
                    )}
                    {selectedRecipe.szénhidrát && (
                      <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center border border-yellow-300/30">
                        <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">🍞</div>
                        <div className="text-white font-semibold text-sm sm:text-lg">{selectedRecipe.szénhidrát}g szénhidrát</div>
                      </div>
                    )}
                    {selectedRecipe.zsír && (
                      <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-xl p-4 sm:p-6 text-center border border-green-300/30">
                        <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">🥑</div>
                        <div className="text-white font-semibold text-sm sm:text-lg">{selectedRecipe.zsír}g zsír</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="text-center mt-6 sm:mt-8">
                <p className="text-white/70 text-sm sm:text-lg">Kattints bárhova a bezáráshoz</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
