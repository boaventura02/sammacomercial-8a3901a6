import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (profile?.role === 'admin') {
    return <Navigate to="/admin/dashboard" />;
  }

  return <Navigate to="/seller/dashboard" />;
}
