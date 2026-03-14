import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { fetchOne } from '@/lib/api';
import { Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function Pending() {
  const navigate = useNavigate();
  const { dp_id, dp_name, phone, registration_type, logout } = useDPAuth();
  const [checking, setChecking] = useState(false);

  const today = new Date();
  const regDate = `${String(today.getDate()).padStart(2,'0')}-${String(today.getMonth()+1).padStart(2,'0')}-${today.getFullYear()}`;

  const rows = [
    { label: 'Registration ID',       value: dp_id ?? '—' },
    { label: 'Date of Registration',  value: regDate },
    { label: 'Channel Delivery Name', value: dp_name ?? '—' },
    { label: 'Company Name',          value: registration_type === 'Organization' ? 'Organization' : 'Individual' },
    { label: 'Contact Number',        value: phone ?? '—' },
  ];

  const handleCheckStatus = async () => {
    if (!dp_id) return;
    setChecking(true);
    try {
      const user = await fetchOne('DigiVault User', dp_id);
      const status = user?.status ?? '';

      if (status === 'Active') {
        // Normal flow — fully verified
        navigate('/dashboard');
      } else if (status === 'Pending Verification') {
        // ── TESTING MODE ──
        // Allow bypass to dashboard even if not yet verified by admin
        toast({ title: 'Testing mode — bypassing verification', description: 'Status is still Pending Verification' });
        navigate('/dashboard');
      } else {
        toast({ title: 'Still pending', description: `Current status: ${status || 'Unknown'}. Our team is reviewing your details.` });
      }
    } catch {
      toast({ title: 'Error', description: 'Could not check status. Try again.', variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-svh bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center space-y-6">
        {/* Heading */}
        <div className="text-center space-y-1">
          <h1 className="text-[18px] font-bold text-foreground">You will be notified!</h1>
          <p className="text-[14px] text-muted-foreground">Once our team verifies your details.</p>
        </div>

        {/* Info card */}
        <div className="w-full max-w-[300px] border border-[#E5E7EB] rounded-lg border-l-[3px] border-l-[#3B82F6] p-4 space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="flex text-[14px]">
              <span className="text-[#3B82F6] whitespace-nowrap">{r.label}</span>
              <span className="text-[#3B82F6] mx-1">:</span>
              <span className="text-foreground">{r.value}</span>
            </div>
          ))}
        </div>

        {/* Gear animation */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          <Settings className="w-12 h-12 text-[#3B82F6] absolute -left-1 -top-1 animate-spin" style={{ animationDuration: '4s' }} />
          <Settings className="w-10 h-10 text-[#3B82F6]/70 absolute right-0 bottom-0 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
        </div>

        <p className="text-[14px] text-muted-foreground text-center">Thank you for your patience</p>

        {/* Testing mode badge */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-center">
          <p className="text-[12px] text-yellow-700 font-medium">🧪 Testing Mode</p>
          <p className="text-[11px] text-yellow-600">Check Status bypasses admin verification</p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <Button
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-[200px] bg-primary hover:bg-primary/90 text-primary-foreground h-10 rounded-lg font-medium"
          >
            {checking ? <Loader2 className="animate-spin w-5 h-5" /> : 'Check Status →'}
          </Button>
          <button onClick={handleLogout} className="text-destructive underline text-sm font-medium">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
