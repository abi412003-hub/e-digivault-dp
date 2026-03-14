import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { getFileUrl } from '@/lib/api';
import { MessageSquare, Bell, User, ChevronRight, FileText, HelpCircle, Phone, Globe, LogOut } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { toast } from '@/hooks/use-toast';

export default function Settings() {
  const navigate = useNavigate();
  const { dp_id, dp_name, phone, registration_type, profile_photo, logout } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');
  const [loggingOut, setLoggingOut] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login');
  };

  const sections = [
    {
      title: 'My Profile',
      items: [
        { icon: User, label: 'Personal Information', color: 'bg-blue-50 text-blue-600', onClick: () => navigate('/register-personal') },
        ...(registration_type === 'Organization' ? [{ icon: FileText, label: 'Organisation Details', color: 'bg-indigo-50 text-indigo-600', onClick: () => navigate('/register-org') }] : []),
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: Phone, label: 'Change Mobile Number', color: 'bg-green-50 text-green-600', onClick: () => toast({ title: 'Contact support to change mobile number' }) },
        { icon: Globe, label: 'Language Preference', color: 'bg-orange-50 text-orange-600', onClick: () => toast({ title: 'English (default)' }) },
        { icon: Bell, label: 'Notification Preferences', color: 'bg-yellow-50 text-yellow-600', onClick: () => toast({ title: 'Notifications enabled' }) },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & FAQ', color: 'bg-purple-50 text-purple-600', onClick: () => toast({ title: 'Coming soon' }) },
        { icon: MessageSquare, label: 'Contact Support', color: 'bg-pink-50 text-pink-600', onClick: () => toast({ title: 'Contact support@edigivault.com' }) },
      ],
    },
  ];

  return (
    <div className="min-h-svh bg-background pb-20">
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <h1 className="text-[20px] font-bold text-foreground">Profile & Settings</h1>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><MessageSquare className="w-5 h-5 text-muted-foreground" /></div>
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><Bell className="w-5 h-5 text-muted-foreground" /></div>
        </div>
      </header>

      {/* Profile header card */}
      <div className="mx-4 mt-4 rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #1A3C8E, #2d5abf)' }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-white overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-white" />}
          </div>
          <div>
            <p className="text-[20px] font-bold text-white">{dp_name ?? '—'}</p>
            <p className="text-[14px] font-semibold" style={{ color: '#C8A951' }}>{dp_id ?? '—'}</p>
            <div className="flex gap-2 mt-1">
              <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-full">{registration_type ?? 'Individual'}</span>
              <span className="text-[11px] bg-green-500/20 text-green-200 px-2 py-0.5 rounded-full">Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{section.title}</p>
            <div className="bg-background border border-border rounded-xl overflow-hidden">
              {section.items.map((item, idx) => (
                <button key={item.label} onClick={item.onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-muted/30 transition-colors ${idx > 0 ? 'border-t border-border' : ''}`}>
                  <div className={`w-9 h-9 rounded-full ${item.color} flex items-center justify-center shrink-0`}>
                    <item.icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="flex-1 text-[14px] font-medium text-foreground">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ))}

        <p className="text-center text-[12px] text-muted-foreground py-2">e-DigiVault DP App v1.0.0</p>

        <button onClick={() => setShowConfirm(true)} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-xl py-3.5 text-[15px] font-bold">
          <LogOut className="w-4.5 h-4.5" /> Sign Out
        </button>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="bg-background rounded-t-2xl w-full p-6 space-y-4">
            <h3 className="text-[18px] font-bold text-foreground text-center">Sign Out?</h3>
            <p className="text-[14px] text-muted-foreground text-center">Are you sure you want to sign out?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 bg-muted text-foreground rounded-xl py-3 text-[15px] font-medium">Cancel</button>
              <button onClick={handleLogout} disabled={loggingOut} className="flex-1 bg-red-500 text-white rounded-xl py-3 text-[15px] font-bold disabled:opacity-60">
                {loggingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
