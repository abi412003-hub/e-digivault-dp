import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { getFileUrl, fetchList } from '@/lib/api';
import { ArrowLeft, MessageSquare, Bell, User, Search } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

type TabKey = 'Approved' | 'Pending' | 'Rejected';
const TABS: TabKey[] = ['Approved', 'Pending', 'Rejected'];
const STATUS_MAP: Record<TabKey, string> = { Approved: 'Verified', Pending: 'Pending', Rejected: 'Rejected' };

function maskPhone(p: string) {
  if (!p || p.length < 4) return p ?? '—';
  return p.slice(0, 2) + 'XXXXXX' + p.slice(-2);
}

export default function LeadStatus() {
  const navigate = useNavigate();
  const { profile_photo, dp_id } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');

  const [activeTab, setActiveTab] = useState<TabKey>('Pending');
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dp_id) return;
    setLoading(true);
    fetchList(
      'DigiVault Lead',
      ['name', 'lead_name', 'phone', 'email', 'creation', 'photo', 'status'],
      [['assigned_to', '=', dp_id]],
      200,
      'creation desc'
    )
      .then((d: any[]) => d && setLeads(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dp_id]);

  const filtered = leads
    .filter((l) => l.status === STATUS_MAP[activeTab])
    .filter((l) =>
      search.trim()
        ? (l.lead_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (l.email ?? '').toLowerCase().includes(search.toLowerCase())
        : true
    );

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '—';

  return (
    <div className="min-h-svh bg-background pb-20">
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/leads')}><ArrowLeft className="w-6 h-6 text-foreground" /></button>
          <h1 className="text-[20px] font-bold text-foreground">Lead Status</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><MessageSquare className="w-5 h-5 text-muted-foreground" /></div>
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><Bell className="w-5 h-5 text-muted-foreground" /></div>
          <div className="w-9 h-9 rounded-full border border-border overflow-hidden flex items-center justify-center bg-muted">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-muted-foreground" />}
          </div>
        </div>
      </header>

      <div className="px-4">
        <div className="mt-3 flex items-center gap-3 bg-background border border-border rounded-xl shadow-sm px-4 py-3">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input type="text" placeholder="Search here" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none" />
        </div>

        <div className="flex gap-2 mt-3 bg-gray-100 rounded-full p-1">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded-full text-[13px] font-medium transition-colors ${activeTab === tab ? 'bg-white shadow text-foreground font-semibold' : 'text-muted-foreground'}`}>{tab}</button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-2">
              <User className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No {activeTab.toLowerCase()} leads found</p>
            </div>
          ) : (
            filtered.map((lead) => {
              const photoUrl = getFileUrl(lead.photo ?? '');
              return (
                <div key={lead.name} className="bg-background rounded-2xl border border-muted shadow-sm p-4 flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center border border-muted">
                    {photoUrl ? <img src={photoUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-7 h-7 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-[16px] font-bold text-foreground">{lead.name}</p>
                    <p className="text-[13px] text-gray-700">Phone No: {maskPhone(lead.phone ?? '')}</p>
                    <p className="text-[13px] text-[#1A3C8E]">{lead.email ?? '—'}</p>
                    <p className="text-[12px] text-muted-foreground">Date: {fmtDate(lead.creation)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
