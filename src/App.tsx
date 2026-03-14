import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DPAuthProvider } from './contexts/DPAuthContext';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import Login from './pages/Login';
import Placeholder from './pages/Placeholder';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DPAuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register-type" element={<Placeholder />} />
            <Route path="/register-personal" element={<Placeholder />} />
            <Route path="/register-org" element={<Placeholder />} />
            <Route path="/register-experience" element={<Placeholder />} />
            <Route path="/pending" element={<Placeholder />} />
            <Route path="/dashboard" element={<Placeholder />} />
            <Route path="/clients" element={<Placeholder />} />
            <Route path="/leads" element={<Placeholder />} />
            <Route path="/transactions" element={<Placeholder />} />
            <Route path="/settings" element={<Placeholder />} />
          </Routes>
        </BrowserRouter>
      </DPAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
