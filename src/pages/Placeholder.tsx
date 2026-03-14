import { useLocation } from 'react-router-dom';

const routeNames: Record<string, string> = {
  '/register-type': 'Register Type',
  '/register-personal': 'Personal Info',
  '/register-org': 'Org Info',
  '/register-experience': 'Experience',
  '/pending': 'Pending Verification',
  '/dashboard': 'Dashboard',
  '/clients': 'Clients',
  '/leads': 'Leads',
  '/transactions': 'Transactions',
  '/settings': 'Settings',
};

export default function Placeholder() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-svh flex items-center justify-center bg-background">
      <p className="text-lg font-medium text-foreground">{routeNames[pathname] ?? 'Page'}</p>
    </div>
  );
}
