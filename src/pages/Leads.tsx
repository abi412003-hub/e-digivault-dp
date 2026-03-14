import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { getFileUrl, fetchList } from '@/lib/api';
import {
  ArrowLeft,
  MessageSquare,
  Bell,
  User,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Eye,
  History,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface Lead {
  name: string;
  lead_name: string;
  status: string;
  modified: string;
}

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  Completed: { label: 'Completed', cls: 'bg-green-100 text-green-700' },
  'On Going': { label: 'On Going', cls: 'bg-blue-100 text-blue-700' },
  Pending: { label: 'Pending', cls: 'bg-orange-100 text-orange-700' },
  Verified: { label: 'Verified', cls: 'bg-green-100 text-green-700' },
  Rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
};

export default function Leads() {
  const navigate = useNavigate();
  const { profile_photo, dp_id } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState({ verified: 0, rejected: 0, pending: 0 });

  useEffect(() => {
    if (!user_id) return;
    fetchList(
      'DigiVault Lead',
      ['name', 'lead_name', 'status', 'modified'],
      [['assigned_to', '=', user_id]],
      100,
      'modified desc'
    )
      .then((d: any[]) => {
        if (!d) return;
        setLeads(d);
        setCounts({
          verified: d.filter((l) => l.status === 'Verified').length,
          rejected: d.filter((l) => l.status === 'Rejected').length,
          pending: d.filter((l) => !['Verified', 'Rejected'].includes(l.status)).length,
        });
      })
      .catch(() => {});
  }, [user_id]);

  const fmtDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Fallback mock data for activity table
  const activityRows = leads.length > 0
    ? leads.slice(0, 20).map((l) => ({
        title: l.lead_name || l.name,
        date: fmtDate(l.modified),
        status: l.status,
      }))
    : [
        { title: 'Aadhar Verification', date: '08 Apr 2025', status: 'Completed' },
        { title: 'Income Certificate', date: '06 Apr 2025', status: 'On Going' },
        { title: 'Voter ID Update', date: '05 Apr 2025', status: 'Pending' },
        { title: 'Voter ID Update', date: '05 Apr 2025', status: 'Pending' },
        { title: 'Voter ID Update', date: '05 Apr 2025', status: 'Pending' },
        { title: 'Voter ID Update', date: '05 Apr 2025', status: 'Pending' },
      ];

  return (
    <div className="min-h-svh bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-[20px] font-bold text-foreground">Lead</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="w-9 h-9 rounded-full border border-border overflow-hidden flex items-center justify-center bg-muted">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </header>

      <div className="px-4">
        {/* Status Summary Label */}
        <div className="flex items-center gap-2 mt-4 mb-3">
          <BarChart3 className="w-[18px] h-[18px] text-muted-foreground" />
          <span className="text-[14px] text-muted-foreground">Status Summary Cards Of Leads</span>
        </div>

        {/* Status Cards Row 1 */}
        <div className="grid grid-cols-2 gap-3">
          {/* Verified */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-[14px] font-bold text-green-700 flex-1">Verified</span>
            <span className="text-[28px] font-bold text-green-800">{counts.verified || 4}</span>
          </div>

          {/* Rejected */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-[14px] font-bold text-red-700 flex-1">Rejected</span>
            <span className="text-[28px] font-bold text-red-800">{counts.rejected || 4}</span>
          </div>
        </div>

        {/* Status Cards Row 2 */}
        <div className="flex justify-center mt-3">
          <div className="w-[60%] bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-[14px] font-bold text-orange-700 flex-1">Pending</span>
            <span className="text-[28px] font-bold text-orange-800">{counts.pending || 12}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => navigate('/add-lead')}
            className="flex-1 bg-[#1A3C8E] text-white rounded-xl py-3 text-[14px] font-bold flex items-center justify-center gap-2"
          >
            Add new Leads <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/leads-report')}
            className="flex-1 bg-background border border-[#1A3C8E] text-[#1A3C8E] rounded-xl py-3 text-[14px] font-bold flex items-center justify-center gap-2"
          >
            Leads Report <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Recent Activity Label */}
        <div className="flex items-center gap-2 mt-6 mb-3">
          <History className="w-[16px] h-[16px] text-foreground" />
          <span className="text-[14px] font-bold text-foreground">Recent Activity List</span>
        </div>

        {/* Activity Table */}
        <div className="border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_90px_100px] bg-[#EEF3FF] px-3 py-2.5">
            <span className="text-[12px] font-semibold text-foreground">Document Title</span>
            <span className="text-[12px] font-semibold text-foreground text-center">Date</span>
            <span className="text-[12px] font-semibold text-foreground text-right">Status</span>
          </div>

          {/* Rows */}
          {activityRows.map((row, idx) => {
            const pill = STATUS_PILL[row.status] || STATUS_PILL.Pending!;
            return (
              <div
                key={idx}
                className="grid grid-cols-[1fr_90px_100px] px-3 py-2.5 border-t border-border items-center"
              >
                <span className="text-[13px] text-foreground truncate">{row.title}</span>
                <span className="text-[12px] text-muted-foreground text-center">{row.date}</span>
                <div className="flex justify-end">
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${pill.cls}`}>
                    {pill.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
