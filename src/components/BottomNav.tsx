import { useLocation, useNavigate } from 'react-router-dom';
import { Home, User, UserPlus, CircleDollarSign, Settings } from 'lucide-react';

const tabs = [
  { label: 'Home', icon: Home, path: '/dashboard' },
  { label: 'Client', icon: User, path: '/clients' },
  { label: 'Leads', icon: UserPlus, path: '/leads' },
  { label: 'Transactions', icon: CircleDollarSign, path: '/transactions' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border h-16 flex items-center justify-around z-30">
      {tabs.map((tab) => {
        const active = pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
          >
            <tab.icon
              className={`w-[22px] h-[22px] ${active ? 'text-[#3B82F6]' : 'text-[#9CA3AF]'}`}
            />
            <span
              className={`text-[11px] ${active ? 'text-[#3B82F6] font-medium' : 'text-[#9CA3AF]'}`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
