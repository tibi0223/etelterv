import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, Shield, ShieldCheck, Calendar, Heart, Settings2, Trash2 } from 'lucide-react';
import { fetchAllUsers, searchUsers, getUserDetails, deleteUser, AdminUserOverview } from '@/services/adminQueries';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function UsersManagement() {
  const [users, setUsers] = useState<AdminUserOverview[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUserOverview[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [allIngredients, setAllIngredients] = useState<Array<{category: string, ingredient: string}>>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
    loadAllIngredients();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      handleSearch();
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await fetchAllUsers();
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a felhasználókat.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAllIngredients = async () => {
    try {
      const { data, error } = await supabase
        .from('Ételkategóriák_Új')
        .select('*');
      
      if (error) {
        console.error('Ingrediensek betöltési hiba:', error);
        return;
      }

      const categoryNames = [
        'Húsfélék',
        'Halak', 
        'Zöldségek / Vegetáriánus',
        'Tejtermékek',
        'Gyümölcsök',
        'Gabonák és Tészták',
        'Olajok és Magvak'
      ];

      const ingredients: Array<{category: string, ingredient: string}> = [];
      
      categoryNames.forEach(categoryName => {
        if (data) {
          data.forEach(row => {
            const categoryValue = row[categoryName];
            if (categoryValue && typeof categoryValue === 'string' && categoryValue.trim() !== '' && categoryValue !== 'EMPTY') {
              const ingredient = categoryValue.trim();
              if (!ingredients.find(item => item.category === categoryName && item.ingredient === ingredient)) {
                ingredients.push({ category: categoryName, ingredient });
              }
            }
          });
        }
      });

      setAllIngredients(ingredients);
    } catch (error) {
      console.error('Ingrediensek betöltési hiba:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    try {
      const searchResults = await searchUsers(searchTerm);
      setFilteredUsers(searchResults);
    } catch (error) {
      toast({
        title: "Keresési hiba",
        description: "Nem sikerült végrehajtani a keresést.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Biztosan törölni szeretnéd ezt a felhasználót: ${userName}?\n\nEz a művelet visszavonhatatlan és minden adatát törli!`)) {
      return;
    }

    try {
      setDeleteLoading(userId);
      const success = await deleteUser(userId);
      
      if (success) {
        toast({
          title: "Siker",
          description: "Felhasználó sikeresen törölve.",
        });
        // Frissítjük a felhasználók listáját
        loadUsers();
      } else {
        throw new Error('A törlés nem sikerült');
      }
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült törölni a felhasználót.",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(null);
    }
  };

  const viewUserDetails = async (userId: string) => {
    try {
      const userDetails = await getUserDetails(userId);
      
      // Betöltjük a felhasználó tényleges preferenciáit
      const { data: userPreferences, error: preferencesError } = await supabase
        .from('Ételpreferenciák')
        .select('*')
        .eq('user_id', userId);

      if (preferencesError) {
        console.error('Preferenciák betöltési hiba:', preferencesError);
      }

      // Összes lehetséges ingrediens kombinálása a felhasználó preferenciáival
      const completePreferences = allIngredients.map(ingredient => {
        const userPref = userPreferences?.find(
          pref => pref.category === ingredient.category && pref.ingredient === ingredient.ingredient
        );
        
        return {
          id: userPref?.id || `${ingredient.category}-${ingredient.ingredient}`,
          category: ingredient.category,
          ingredient: ingredient.ingredient,
          preference: userPref?.preference || 'neutral',
          created_at: userPref?.created_at || null
        };
      });

      // Preferenciák átalakítása a megfelelő formátumra
      const formattedPreferences = completePreferences.map(pref => ({
        ...pref,
        preference: pref.preference === 'like' ? 'szeretem' : 
                   pref.preference === 'dislike' ? 'nem_szeretem' : 'semleges'
      }));

      // Hozzáadjuk a preferenciákat a felhasználó adataihoz
      const userWithPreferences = {
        ...userDetails,
        preferences: formattedPreferences
      };

      console.log('Betöltött teljes preferenciák:', formattedPreferences.length, 'db');
      console.log('Preferenciák megoszlása:', {
        szeretem: formattedPreferences.filter(p => p.preference === 'szeretem').length,
        nem_szeretem: formattedPreferences.filter(p => p.preference === 'nem_szeretem').length,
        semleges: formattedPreferences.filter(p => p.preference === 'semleges').length
      });

      setSelectedUser(userWithPreferences);
      setShowUserModal(true);
    } catch (error) {
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a felhasználó adatait.",
        variant: "destructive"
      });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('hu-HU');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Felhasználók betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header és keresés */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Felhasználók kezelése</h2>
          <p className="text-white/70 text-sm sm:text-base">Összes felhasználó: {users.length}</p>
        </div>
        
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Keresés email vagy név alapján..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
        </div>
      </div>

      {/* Statisztikák */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-white/10 border-white/20 text-white">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-white/70">Összes felhasználó</p>
                <p className="text-lg sm:text-2xl font-bold">{users.length}</p>
              </div>
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20 text-white">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-white/70">Adminok</p>
                <p className="text-lg sm:text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
              </div>
              <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20 text-white">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-white/70">Aktív felhasználók</p>
                <p className="text-lg sm:text-2xl font-bold">{users.filter(u => u.preferences_count > 0).length}</p>
              </div>
              <Settings2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20 text-white">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-white/70">Kedvencekkel</p>
                <p className="text-lg sm:text-2xl font-bold">{users.filter(u => u.favorites_count > 0).length}</p>
              </div>
              <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Felhasználók táblázat - mobil optimalizált */}
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-lg sm:text-xl">Felhasználók listája</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Mobil nézet */}
          <div className="block sm:hidden">
            {filteredUsers.map((user) => (
              <div key={user.id} className="border-b border-white/20 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border border-white/30">
                    <AvatarImage src={user.avatar_url || undefined} alt="Avatar" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-bold">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{user.full_name || 'Nincs név'}</p>
                    <p className="text-white/60 text-sm truncate">{user.email}</p>
                  </div>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className={
                    user.role === 'admin' 
                      ? 'bg-purple-600 text-white text-xs' 
                      : 'bg-gray-600 text-white text-xs'
                  }>
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-xs text-white/70">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(user.user_created_at)}
                  </div>
                  <div className="text-right">
                    <p>🍽️ {user.preferences_count} preferencia</p>
                    <p>❤️ {user.favorites_count} kedvenc</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => viewUserDetails(user.id)}
                    size="sm"
                    variant="outline"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white border border-purple-500 text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Részletek
                  </Button>
                  <Button
                    onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                    size="sm"
                    variant="outline"
                    disabled={deleteLoading === user.id}
                    className="bg-red-600 hover:bg-red-700 text-white border border-red-500 text-xs px-3"
                  >
                    {deleteLoading === user.id ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Asztali nézet */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/20">
                  <TableHead className="text-white/70">Felhasználó</TableHead>
                  <TableHead className="text-white/70">Szerepkör</TableHead>
                  <TableHead className="text-white/70">Regisztráció</TableHead>
                  <TableHead className="text-white/70">Aktivitás</TableHead>
                  <TableHead className="text-white/70">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-white/20 hover:bg-white/5">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 border border-white/30">
                          <AvatarImage src={user.avatar_url || undefined} alt="Avatar" />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-bold">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-white font-medium">{user.full_name || 'Nincs név'}</p>
                          <p className="text-white/60 text-sm">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className={
                        user.role === 'admin' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-600 text-white'
                      }>
                        {user.role === 'admin' ? 'Admin' : 'Felhasználó'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/70">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(user.user_created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-white/70 text-sm">
                        <p>🍽️ {user.preferences_count} preferencia</p>
                        <p>❤️ {user.favorites_count} kedvenc</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => viewUserDetails(user.id)}
                          size="sm"
                          variant="outline"
                          className="bg-purple-600 hover:bg-purple-700 text-white border border-purple-500"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Részletek
                        </Button>
                        <Button
                          onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                          size="sm"
                          variant="outline"
                          disabled={deleteLoading === user.id}
                          className="bg-red-600 hover:bg-red-700 text-white border border-red-500"
                        >
                          {deleteLoading === user.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-white/70">
              {searchTerm ? 'Nincs találat a keresésre.' : 'Nincsenek felhasználók.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Felhasználó részletek modal - mobil optimalizált */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/20 text-white m-2 sm:m-4">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Felhasználó részletei</DialogTitle>
            <DialogDescription className="text-white/70">
              Teljes profil és aktivitás áttekintése
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4 sm:space-y-6">
              {/* Alapadatok */}
              <Card className="bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                    Profil információk
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-white/70">Név</p>
                      <p className="text-white text-sm sm:text-base">{selectedUser.user.full_name || 'Nincs megadva'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-white/70">Email</p>
                      <p className="text-white text-sm sm:text-base break-all">{selectedUser.user.email}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-white/70">Kor</p>
                      <p className="text-white text-sm sm:text-base">{selectedUser.user.age || 'Nincs megadva'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-white/70">Súly</p>
                      <p className="text-white text-sm sm:text-base">{selectedUser.user.weight ? `${selectedUser.user.weight} kg` : 'Nincs megadva'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-white/70">Magasság</p>
                      <p className="text-white text-sm sm:text-base">{selectedUser.user.height ? `${selectedUser.user.height} cm` : 'Nincs megadva'}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-white/70">Aktivitási szint</p>
                      <p className="text-white text-sm sm:text-base">{selectedUser.user.activity_level || 'Nincs megadva'}</p>
                    </div>
                  </div>
                  
                  {selectedUser.user.dietary_preferences && selectedUser.user.dietary_preferences.length > 0 && (
                    <div>
                      <p className="text-xs sm:text-sm text-white/70 mb-2">Étkezési preferenciák</p>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {selectedUser.user.dietary_preferences.map((pref: string, index: number) => (
                          <Badge key={index} variant="outline" className="border-white/30 text-white text-xs">
                            {pref}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedUser.user.allergies && selectedUser.user.allergies.length > 0 && (
                    <div>
                      <p className="text-xs sm:text-sm text-white/70 mb-2">Allergiák</p>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {selectedUser.user.allergies.map((allergy: string, index: number) => (
                          <Badge key={index} variant="destructive" className="bg-red-600 text-xs">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Kedvencek */}
              {selectedUser.favorites.length > 0 && (
                <Card className="bg-white/10 border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                      <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                      Kedvenc receptek ({selectedUser.favorites.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-32 sm:max-h-48 overflow-y-auto">
                      {selectedUser.favorites.map((favorite: any) => (
                        <div key={favorite.id} className="flex justify-between items-center p-2 bg-white/5 rounded text-sm">
                          <span className="text-white truncate flex-1 mr-2">{favorite.recipe_name}</span>
                          <span className="text-white/60 text-xs whitespace-nowrap">{formatDate(favorite.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Preferenciák */}
              {selectedUser.preferences.length > 0 && (
                <Card className="bg-white/10 border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                      <Settings2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                      Étel preferenciák (összes: {selectedUser.preferences.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 sm:space-y-4">
                      {/* Preferenciák statisztikái */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-4">
                        <div className="text-center p-2 sm:p-3 bg-green-600/20 rounded">
                          <p className="text-green-400 font-bold text-sm sm:text-lg">
                            {selectedUser.preferences.filter((p: any) => p.preference === 'szeretem').length}
                          </p>
                          <p className="text-white/70 text-xs sm:text-sm">Szeretem</p>
                        </div>
                        <div className="text-center p-2 sm:p-3 bg-red-600/20 rounded">
                          <p className="text-red-400 font-bold text-sm sm:text-lg">
                            {selectedUser.preferences.filter((p: any) => p.preference === 'nem_szeretem').length}
                          </p>
                          <p className="text-white/70 text-xs sm:text-sm">Nem szeretem</p>
                        </div>
                        <div className="text-center p-2 sm:p-3 bg-gray-600/20 rounded">
                          <p className="text-gray-400 font-bold text-sm sm:text-lg">
                            {selectedUser.preferences.filter((p: any) => p.preference === 'semleges').length}
                          </p>
                          <p className="text-white/70 text-xs sm:text-sm">Semleges</p>
                        </div>
                      </div>
                      
                      {/* Preferenciák listája */}
                      <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                        {selectedUser.preferences.map((preference: any, index: number) => (
                          <div key={`${preference.category}-${preference.ingredient}-${index}`} className="flex justify-between items-center p-2 bg-white/5 rounded text-sm">
                            <div className="text-white flex-1 min-w-0 mr-2">
                              <span className="font-medium truncate block">{preference.ingredient}</span>
                              <span className="text-white/60 text-xs truncate block">({preference.category})</span>
                            </div>
                            <Badge 
                              variant={preference.preference === 'szeretem' ? 'default' : preference.preference === 'nem_szeretem' ? 'destructive' : 'secondary'}
                              className={`text-xs whitespace-nowrap ${
                                preference.preference === 'szeretem' ? 'bg-green-600' :
                                preference.preference === 'nem_szeretem' ? 'bg-red-600' : 'bg-gray-600'
                              }`}
                            >
                              {preference.preference === 'szeretem' ? '❤️' : 
                               preference.preference === 'nem_szeretem' ? '❌' : '😐'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
