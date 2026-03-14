import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { fetchOne, fetchList, getFileUrl } from '@/lib/api';
import {
  ArrowLeft,
  MessageSquare,
  Bell,
  User,
  CheckCircle2,
  Hourglass,
  Clock,
  Building2,
  RefreshCw,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

/* ── Status Badge ── */
function StatusBadge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase();
  let cls = 'bg-muted text-muted-foreground';
  if (s.includes('completed') || s === 'verified') cls = 'bg-green-100 text-green-700';
  else if (s.includes('on going') || s.includes('ongoing') || s === 'in progress') cls = 'bg-blue-100 text-blue-700';
  else if (s.includes('pending') || s.includes('uploaded')) cls = 'bg-orange-100 text-orange-700';
  else if (s.includes('rejected')) cls = 'bg-red-100 text-red-700';

  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-medium whitespace-nowrap ${cls}`}>
      {status}
    </span>
  );
}

function formatDate(d: string) {
  if (!d) return '—';
  const dt = new Date(d);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(dt.getDate()).padStart(2, '0')} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
}

export default function ClientDetail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const clientId = params.get('id') ?? '';
  const { profile_photo } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');

  const [client, setClient] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [propertyCount, setPropertyCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    if (!clientId) return;

    fetchOne('DigiVault Client', clientId).then((d) => d && setClient(d)).catch(() => {});

    fetchList(
      'DigiVault Client Document',
      ['name', 'document_title', 'document_status', 'creation'],
      [['client', '=', clientId]],
      20,
      'creation desc'
    )
      .then((d: any[]) => d && setDocs(d))
      .catch(() => {});

    fetchList('DigiVault Property', ['name'], [['client', '=', clientId]])
      .then((d: any[]) => d && setPropertyCount(d.length))
      .catch(() => {});

    fetchList('DigiVault Task', ['name'], [['client', '=', clientId]])
      .then((d: any[]) => d && setTaskCount(d.length))
      .catch(() => {});
  }, [clientId]);

  // Stat counts
  const completed = docs.filter((d) => (d.document_status ?? '').toLowerCase().includes('completed')).length;
  const ongoing = docs.filter((d) => {
    const s = (d.document_status ?? '').toLowerCase();
    return s.includes('on going') || s.includes('ongoing') || s === 'in progress';
  }).length;
  const pending = docs.filter((d) => {
    const s = (d.document_status ?? '').toLowerCase();
    return s.includes('pending') || s.includes('uploaded');
  }).length;

  const clientName = client?.client_name ?? clientId;

  return (
    <div className="min-h-svh bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/clients')}>
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-[18px] font-bold text-foreground truncate">{clientId}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 border border-border rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="w-9 h-9 border border-border rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>
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
        {/* Documents label */}
        <p className="text-[14px] text-muted-foreground mt-3 mb-2">Documents</p>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-2">
          {/* Completed */}
          <div className="bg-[#f0fdf4] border border-green-200 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-[24px] font-bold text-green-600 leading-none">{completed}</span>
            </div>
            <span className="text-[12px] text-green-600">Completed</span>
          </div>
          {/* Ongoing */}
          <div className="bg-[#f0fdfa] border border-teal-200 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Hourglass className="w-5 h-5 text-teal-600" />
              <span className="text-[24px] font-bold text-teal-600 leading-none">{ongoing}</span>
            </div>
            <span className="text-[12px] text-teal-600">Ongoing</span>
          </div>
          {/* Pending */}
          <div className="bg-[#fff7ed] border border-orange-200 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-[24px] font-bold text-orange-500 leading-none">{pending}</span>
            </div>
            <span className="text-[12px] text-orange-500">Pending</span>
          </div>
        </div>

        {/* Properties + Tasks strip */}
        <div className="mt-3 bg-[#f5f3ff] border border-border rounded-xl px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#3B82F6]" />
            <span className="text-[14px] font-bold text-[#3B82F6]">{propertyCount} Properties</span>
          </div>
          <span className="text-[14px] font-bold text-[#3B82F6]">{taskCount} Tasks</span>
        </div>

        {/* Estimate button */}
        <button
          onClick={() => navigate(`/estimate-list?client=${clientId}`)}
          className="mt-3 w-full bg-[#1A3C8E] text-white rounded-xl h-12 text-[16px] font-bold"
        >
          Estimate
        </button>

        {/* Recent Activity */}
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-5 h-5 text-[#3B82F6]" />
            <h2 className="text-[14px] font-bold text-foreground">
              Recent Activity List Of {clientName}
            </h2>
          </div>

          {/* Table */}
          <div className="w-full">
            {/* Header */}
            <div className="grid grid-cols-[1fr_85px_95px] bg-[#EEF3FF] px-3 py-2 rounded-t-lg">
              <span className="text-[12px] font-medium text-muted-foreground">Document Title</span>
              <span className="text-[12px] font-medium text-muted-foreground">Date</span>
              <span className="text-[12px] font-medium text-muted-foreground text-right">Status</span>
            </div>

            {/* Rows */}
            {docs.length === 0 ? (
              <div className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                No documents found
              </div>
            ) : (
              docs.map((doc) => (
                <div
                  key={doc.name}
                  className="grid grid-cols-[1fr_85px_95px] items-center px-3 py-2.5 border-b border-muted/40"
                >
                  <span className="text-[12px] text-foreground truncate pr-2">
                    {doc.document_title || doc.name}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    {formatDate(doc.creation)}
                  </span>
                  <div className="flex justify-end">
                    <StatusBadge status={doc.document_status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
