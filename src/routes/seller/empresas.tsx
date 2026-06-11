import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/seller/empresas')({
  beforeLoad: () => {
    throw redirect({ to: '/seller/dashboard' });
  },
});
