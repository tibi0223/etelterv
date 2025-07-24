
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { UserPlus, Shield, ShieldCheck, Trash2, Mail, UserCheck, UserX } from 'lucide-react';
import { fetchAllUsers, assignAdminRole, removeAdminRole, AdminUserOverview } from '@/services/adminQueries';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface RolesManagementProps {
  currentUser: User;
}

export function RolesManagement({ currentUser }: RolesManagementProps) {
  const [users, setUsers] = useState<AdminUserOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [emailToAssign, setEmailToAssign] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [togglingUsers, setTogglingUsers] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await fetchAllUsers();
      setUsers(usersData);
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

  const handleAssignAdmin = async () => {
    if (!emailToAssign.trim()) {
      toast({
        title: "Hiba",
        description: "Kérlek add meg az email címet.",
        variant: "destructive"
      });
      return;
    }

    try {
      setAssigning(true);
      await assignAdminRole(emailToAssign, currentUser.id);
      
      toast({
        title: "Siker",
        description: `Admin jogosultság sikeresen kiosztva: ${emailToAssign}`,
      });
      
      setEmailToAssign('');
      setAssignModalOpen(false);
      await loadUsers();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült kiosztani az admin jogosultságot.",
        variant: "destructive"
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAdmin = async (userId: string, userName: string) => {
    if (userId === currentUser.id) {
      toast({
        title: "Hiba",
        description: "Nem vonhatod meg a saját admin jogosultságodat.",
        variant: "destructive"
      });
      return;
    }

    try {
      await removeAdminRole(userId);
      
      toast({
        title: "Siker",
        description: `Admin jogosultság sikeresen megvonva: ${userName}`,
      });
      
      await loadUsers();
    } catch (error) {
      toast({
        title: "Hiba",
        description: "Nem sikerült megvonni az admin jogosultságot.",
        variant: "destructive"
      });
    }
  };

  const handleToggleAdminRole = async (user: AdminUserOverview) => {
    if (user.id === currentUser.id) {
      toast({
        title: "Hiba",
        description: "Nem változtathatod meg a saját admin jogosultságodat.",
        variant: "destructive"
      });
      return;
    }

    setTogglingUsers(prev => new Set(prev).add(user.id));

    try {
      if (user.role === 'admin') {
        await removeAdminRole(user.id);
        toast({
          title: "Siker",
          description: `Admin jogosultság megvonva: ${user.full_name || user.email}`,
        });
      } else {
        await assignAdminRole(user.email, currentUser.id);
        toast({
          title: "Siker",
          description: `Admin jogosultság kiosztva: ${user.full_name || user.email}`,
        });
      }
      await loadUsers();
    } catch (error: any) {
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült változtatni a jogosultságon.",
        variant: "destructive"
      });
    } finally {
      setTogglingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.id);
        return newSet;
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

  const adminUsers = users.filter(user => user.role === 'admin');
  const regularUsers = users.filter(user => user.role !== 'admin');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Szerepkörök betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Szerepkörök kezelése</h2>
          <p className="text-white/70">Admin jogosultságok kiosztása és kezelése</p>
        </div>
        
        <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white border border-purple-500">
              <UserPlus className="w-4 h-4 mr-2" />
              Admin kinevezése
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Admin jogosultság kiosztása</DialogTitle>
              <DialogDescription className="text-white/70">
                Add meg annak a felhasználónak az email címét, akinek admin jogosultságot szeretnél adni.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/70 block mb-2">Email cím</label>
                <Input
                  type="email"
                  placeholder="felhasznalo@example.com"
                  value={emailToAssign}
                  onChange={(e) => setEmailToAssign(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAssignModalOpen(false)}
                className="border-white/50 text-white bg-gray-600/80 hover:bg-gray-700/80"
              >
                Mégse
              </Button>
              <Button
                onClick={handleAssignAdmin}
                disabled={assigning}
                className="bg-purple-600 hover:bg-purple-700 text-white border border-purple-500"
              >
                {assigning ? 'Kiosztás...' : 'Admin kinevezése'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statisztikák */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/10 border-white/20 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Összes felhasználó</p>
                <p className="text-2xl font-bold text-white">{users.length}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Adminisztrátorok</p>
                <p className="text-2xl font-bold text-white">{adminUsers.length}</p>
              </div>
              <ShieldCheck className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Sima felhasználók</p>
                <p className="text-2xl font-bold text-white">{regularUsers.length}</p>
              </div>
              <Shield className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Összes felhasználó egy táblában */}
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Összes felhasználó ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-white/70">Felhasználó</TableHead>
                    <TableHead className="text-white/70">Email</TableHead>
                    <TableHead className="text-white/70">Szerepkör</TableHead>
                    <TableHead className="text-white/70">Regisztráció</TableHead>
                    <TableHead className="text-white/70">Aktivitás</TableHead>
                    <TableHead className="text-white/70">Admin jogosultság</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-white/20 hover:bg-white/5">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 border border-white/30">
                            <AvatarImage src={user.avatar_url || undefined} alt="Avatar" />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white text-xs font-bold">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-white font-medium">{user.full_name || 'Nincs név'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-white/70">
                          <Mail className="w-4 h-4" />
                          <span className="text-white">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <Badge className="bg-purple-600 text-white text-xs">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Administrator
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-600 text-white text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Felhasználó
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-white">
                        {formatDate(user.user_created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="text-white text-sm">
                          <p>🍽️ {user.preferences_count} preferencia</p>
                          <p>❤️ {user.favorites_count} kedvenc</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.id !== currentUser.id ? (
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={user.role === 'admin'}
                              onCheckedChange={() => handleToggleAdminRole(user)}
                              disabled={togglingUsers.has(user.id)}
                              className="data-[state=checked]:bg-purple-600"
                            />
                            <span className="text-white/70 text-sm">
                              {togglingUsers.has(user.id) ? 'Módosítás...' : 
                               user.role === 'admin' ? 'Admin' : 'Felhasználó'}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="border-green-400/30 text-green-400">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Te vagy
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-white/70">
              Nincsenek felhasználók.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
