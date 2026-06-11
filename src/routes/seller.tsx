import { createFileRoute, Outlet, Navigate } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/dashboard/Sidebar';

export const Route = createFileRoute('/seller')({
  component: SellerLayout,
});

function SellerLayout() {
  const { user, profile, loading } = useAuth();

  if (loading) return null;
  if (!user || profile?.role !== 'seller') {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
      <Sidebar role="seller" name={profile.name} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in md:ml-16 transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
}
