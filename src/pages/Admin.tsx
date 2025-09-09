import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminPinEntry } from '@/components/admin/AdminPinEntry';

export default function Admin() {
  const { user, userRole, loading } = useAuth();
  const [pinVerified, setPinVerified] = useState(false);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole !== 'super_admin' && userRole !== 'admin' && userRole !== 'premium_teacher' && userRole !== 'free_teacher') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this area.</p>
        </div>
      </div>
    );
  }

  if (!pinVerified) {
    return <AdminPinEntry onPinVerified={() => setPinVerified(true)} />;
  }

  return <AdminDashboard />;
}