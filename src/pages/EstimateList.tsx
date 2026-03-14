import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { fetchList, getFileUrl } from '@/lib/api';
import { ArrowLeft, MessageSquare, Bell, User, Search, Plus, Building2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

type TabKey = 'Assigned' | 'Approved' | 'Rejected';
const TABS: TabKey[] = ['Approved', 'Assigned', 'Rejected'];

// estimate_status is the correct field name (not status)
const STATUS_FILTERS: Record<TabKey, string[]> = {
  Approved: ['Approved', 'Incharge Approved', 'RM Approved'],
  Assigned: ['Draft', 'Submitted', 'Not Started', 'Pending For Approval', 'On Going'],
  Rejected: ['Rejected'],
};
const EMPTY_MSG: Record<TabKey, string> = {
  Approved: 'No approved estimates yet',
  Assigned: 'No assigned estimates yet',
  Rejected: 'No rejected estimates',
};

function statusColor(status: string) {
  const s = (status ?? '').toLowerCase();
  if (s.includes('completed')) return 'text-green-600';
  if (s.includes('on going') || s.includes('ongoing')) return 'text-blue-600';
  if (s.includes('pending')) return 'text-orange-500';
  if (s.includes('not started')) return 'text-orange-600';
  if (s.includes('rejected')) return 'text-red-500';
  return 'text-foreground';
}

function EstimateCard({ est, clientId, navigate }: { est: any; clientId: string; navigate: ReturnType<typeof useNavigate> }) {
  const photoUrl = getFileUrl(est.property_photo ?? '');
  // use estimate_status (correct field name)
  const status = est.estimate_status ?? 'Not Started';

  const handleTap = () => {
    if (status === 'Not Started' || status === 'Draft') {
      navigate(`/estimate-builder?estimate=${est.name}&client=${clientId}`);
    } else {
      navigate(`/estimate-view?id=${est.name}`);
    }
  };

  return (
    <div onClick={handleTap} className="bg-background rounded-2xl border border-muted shadow-sm p-4 flex items-center gap-3 cursor-pointer active:bg-muted/30 transition-colors">
      <div className="w-[72px] h-[72px] rounded-full overflow-hidden shrink-0 bg-muted flex items-center justify-center border border-muted">
        {photoUrl ? <img src={photoUrl} alt="" className="w-full h-full object-cover" /> : <Building2 className="w-7 h-7 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-[16px] font-bold text-foreground truncate">{est.property_name || est.property || '—'}</p>
        <p className="text-[12px] text-muted-foreground">Property ID : {est.property || est.name}</p>
        <p className="text-[12px]">
          <span className="text-muted-foreground">Service: </span>
          <span className="text-[#3B82F6] font-medium">{est.service || '—'}</span>
        </p>
        <p className="text-[12px] text-muted-foreground">Date: {est.estimate_date ?? '—'}</p>
        <p className="text-[12px]">
          <span className="text-muted-foreground">Status : </span>
          <span className={`font-medium ${statusColor(status)}`}>{status}</span>
        </p>
      </div>
    </div>
  );
}

export default function EstimateList() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const clientId = params.get('client') ?? '';
  const { profile_photo } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');

  const [activeTab, setActiveTab] = useState<TabKey>('Assigned');
  const [estimates, setEstimates] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    // estimate_status is the correct field (not status)
    fetchList('DigiVault Estimate', ['name','property','property_name','service','estimate_status','estimate_date','assigned_dp','total_price'], [['client','=',clientId]], 100, 'creation desc')
      .then((d: any[]) => d && setEstimates(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  const filtered = estimates
    .filter((e) => STATUS_FILTERS[activeTab].some((s) => (e.estimate_status ?? '').toLowerCase() === s.toLowerCase()))
    .filter((e) => !search.trim() || (e.property_name ?? '').toLowerCase().includes(search.toLowerCase()) || (e.service ?? '').toLowerCase().includes(search.toLowerCase()) || (e.name ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-svh bg-background pb-20">
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/client-detail?id=${clientId}`)}><ArrowLeft className="w-6 h-6 text-foreground" /></button>
          <h1 className="text-[20px] font-bold text-foreground">Estimate</h1>
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
        <div className="flex gap-2 mt-4">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded-full text-[14px] font-medium transition-colors ${activeTab === tab ? 'bg-[#1A3C8E] text-white' : 'bg-background border border-[#1A3C8E] text-[#1A3C8E]'}`}>{tab}</button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Building2 className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">{EMPTY_MSG[activeTab]}</p>
            </div>
          ) : (
            filtered.map((est) => <EstimateCard key={est.name} est={est} clientId={clientId} navigate={navigate} />)
          )}
        </div>
      </div>
      <button onClick={() => navigate(`/estimate-builder?client=${clientId}&property=new`)} className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-[#3B82F6] text-white shadow-lg flex items-center justify-center z-30 active:scale-95 transition-transform">
        <Plus className="w-6 h-6" />
      </button>
      <BottomNav />
    </div>
  );
}
