
import { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { UsersManagement } from './UsersManagement';
import { RolesManagement } from './RolesManagement';

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  onBackToApp: () => void;
}

export function AdminDashboard({ user, onLogout, onBackToApp }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  return (
    <AdminLayout
      user={user}
      onLogout={onLogout}
      onBackToApp={onBackToApp}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      showBackButton={false} // Adminoknak nincs vissza gomb
    >
      {activeTab === 'users' && <UsersManagement />}
      {activeTab === 'roles' && <RolesManagement currentUser={user} />}
    </AdminLayout>
  );
}
