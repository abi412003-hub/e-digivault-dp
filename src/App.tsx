import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DPAuthProvider } from './contexts/DPAuthContext';
import { RegistrationProvider } from './contexts/RegistrationContext';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import Login from './pages/Login';
import RegisterType from './pages/RegisterType';
import RegisterPersonal from './pages/RegisterPersonal';
import RegisterOrg from './pages/RegisterOrg';
import RegisterExperience from './pages/RegisterExperience';
import Pending from './pages/Pending';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Placeholder from './pages/Placeholder';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DPAuthProvider>
        <RegistrationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register-type" element={<RegisterType />} />
              <Route path="/register-personal" element={<RegisterPersonal />} />
              <Route path="/register-org" element={<RegisterOrg />} />
              <Route path="/register-experience" element={<RegisterExperience />} />
              <Route path="/pending" element={<Pending />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/leads" element={<Placeholder />} />
              <Route path="/transactions" element={<Placeholder />} />
              <Route path="/settings" element={<Placeholder />} />
            </Routes>
          </BrowserRouter>
        </RegistrationProvider>
      </DPAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
