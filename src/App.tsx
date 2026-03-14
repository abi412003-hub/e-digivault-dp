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
import Properties from './pages/Properties';
import TaskDetails from './pages/TaskDetails';
import EstimateList from './pages/EstimateList';
import EstimateBuilder from './pages/EstimateBuilder';
import Leads from './pages/Leads';
import LeadStatus from './pages/LeadStatus';
import AddLead from './pages/AddLead';
import Transactions from './pages/Transactions';
import ExpenditureLog from './pages/ExpenditureLog';
import TransactionList from './pages/TransactionList';
import FundRequest from './pages/FundRequest';
import Settings from './pages/Settings';

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
              <Route path="/client-detail" element={<ClientDetail />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/task-details" element={<TaskDetails />} />
              <Route path="/estimate-list" element={<EstimateList />} />
              <Route path="/estimate-builder" element={<EstimateBuilder />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/leads-report" element={<LeadStatus />} />
              <Route path="/add-lead" element={<AddLead />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/expenditure-log" element={<ExpenditureLog />} />
              <Route path="/transaction-list" element={<TransactionList />} />
              <Route path="/fund-request" element={<FundRequest />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </BrowserRouter>
        </RegistrationProvider>
      </DPAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
