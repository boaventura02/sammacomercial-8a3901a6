import { createFileRoute } from '@tanstack/react-router';
import { Route as DashboardRoute } from './dashboard';

export const Route = createFileRoute('/seller/empresas')({
  component: DashboardRoute.options.component,
});
