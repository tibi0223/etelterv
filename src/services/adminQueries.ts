import { supabase } from '@/integrations/supabase/client';

export interface AdminUserOverview {
  id: string;
  email: string;
  user_created_at: string;
  full_name: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  activity_level: string | null;
  dietary_preferences: string[] | null;
  allergies: string[] | null;
  avatar_url: string | null;
  role: 'admin' | 'user' | null;
  favorites_count: number;
  preferences_count: number;
  ratings_count: number;
}

export const checkIsAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_admin', { user_id: userId });
    
    if (error) {
      console.error('Admin ellenőrzési hiba:', error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error('Admin ellenőrzési hiba:', error);
    return false;
  }
};

export const fetchAllUsers = async (): Promise<AdminUserOverview[]> => {
  try {
    // Először ellenőrizzük, hogy a felhasználó admin-e
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Nincs bejelentkezett felhasználó');
    }

    const isAdmin = await checkIsAdmin(user.id);
    if (!isAdmin) {
      throw new Error('Nincs admin jogosultság');
    }

    const { data, error } = await supabase
      .from('admin_user_overview')
      .select('*')
      .order('user_created_at', { ascending: false });

    if (error) {
      console.error('Felhasználók betöltési hiba:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Felhasználók betöltési hiba:', error);
    throw error;
  }
};

export const searchUsers = async (searchTerm: string): Promise<AdminUserOverview[]> => {
  try {
    // Először ellenőrizzük, hogy a felhasználó admin-e
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Nincs bejelentkezett felhasználó');
    }

    const isAdmin = await checkIsAdmin(user.id);
    if (!isAdmin) {
      throw new Error('Nincs admin jogosultság');
    }

    const { data, error } = await supabase
      .from('admin_user_overview')
      .select('*')
      .or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
      .order('user_created_at', { ascending: false });

    if (error) {
      console.error('Felhasználók keresési hiba:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Felhasználók keresési hiba:', error);
    throw error;
  }
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    // Először ellenőrizzük, hogy a felhasználó admin-e
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Nincs bejelentkezett felhasználó');
    }

    const isAdmin = await checkIsAdmin(user.id);
    if (!isAdmin) {
      throw new Error('Nincs admin jogosultság');
    }

    const { data, error } = await supabase.rpc('delete_user_completely', {
      target_user_id: userId
    });

    if (error) {
      console.error('Felhasználó törlési hiba:', error);
      throw error;
    }

    return data || false;
  } catch (error) {
    console.error('Felhasználó törlési hiba:', error);
    throw error;
  }
};

export const assignAdminRole = async (email: string, assignedBy: string) => {
  try {
    // Először ellenőrizzük, hogy a felhasználó admin-e
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Nincs bejelentkezett felhasználó');
    }

    const isAdmin = await checkIsAdmin(user.id);
    if (!isAdmin) {
      throw new Error('Nincs admin jogosultság');
    }

    // Megkeressük a felhasználót email alapján
    const { data: userData, error: userError } = await supabase
      .from('admin_user_overview')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      throw new Error('Nem található felhasználó ezzel az email címmel');
    }

    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userData.id,
        role: 'admin',
        assigned_by: assignedBy
      });

    if (error) {
      if (error.code === '23505') { // unique constraint violation
        throw new Error('Ez a felhasználó már admin jogosultsággal rendelkezik');
      }
      console.error('Admin szerepkör kiosztási hiba:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Admin szerepkör kiosztási hiba:', error);
    throw error;
  }
};

export const removeAdminRole = async (userId: string) => {
  try {
    // Először ellenőrizzük, hogy a felhasználó admin-e
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Nincs bejelentkezett felhasználó');
    }

    const isAdmin = await checkIsAdmin(user.id);
    if (!isAdmin) {
      throw new Error('Nincs admin jogosultság');
    }

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', 'admin');

    if (error) {
      console.error('Admin szerepkör eltávolítási hiba:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Admin szerepkör eltávolítási hiba:', error);
    throw error;
  }
};

export const getUserDetails = async (userId: string) => {
  try {
    // Először ellenőrizzük, hogy a felhasználó admin-e
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Nincs bejelentkezett felhasználó');
    }

    const isAdmin = await checkIsAdmin(user.id);
    if (!isAdmin) {
      throw new Error('Nincs admin jogosultság');
    }

    // Felhasználó alapadatai
    const { data: userDetail, error: userError } = await supabase
      .from('admin_user_overview')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Felhasználó adatok betöltési hiba:', userError);
      throw userError;
    }

    // Kedvencek
    const { data: favorites, error: favError } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Preferenciák
    const { data: preferences, error: prefError } = await supabase
      .from('Ételpreferenciák')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return {
      user: userDetail,
      favorites: favorites || [],
      preferences: preferences || [],
      favoritesError: favError,
      preferencesError: prefError
    };
  } catch (error) {
    console.error('Felhasználó részletek betöltési hiba:', error);
    throw error;
  }
};
