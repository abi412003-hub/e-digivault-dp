import { useEffect, useState } from 'react';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { fetchList } from '@/lib/api';
import { getFileUrl } from '@/lib/api';
import { MessageSquare, Home, User, RefreshCw, MapPin, ScanLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';

/* ── Donut Ring ── */
function DonutRing({
  value,
  total,
  label,
  stroke,
  track,
}: {
  value: number;
  total: number;
  label: string;
  stroke: string;
  track: string;
}) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? value / total : 0;
  const offset = circ * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke={track} strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 40 40)"
          className="transition-all duration-700"
        />
        <text x="40" y="44" textAnchor="middle" className="text-[13px] font-bold fill-foreground">
          {value}/{total}
        </text>
      </svg>
      <span className="text-[12px] text-muted-foreground">{label}</span>
    </div>
  );
}

/* ── Progress Bar ── */
function ProgressBar({
  label,
  value,
  total,
  fill,
  bg,
}: {
  label: string;
  value: number;
  total: number;
  fill: string;
  bg: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[14px] text-foreground w-[70px] shrink-0">{label}</span>
      <div className="flex-1 h-3 rounded-full" style={{ backgroundColor: bg }}>
        <div
          className="h-3 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: fill }}
        />
      </div>
      <span className="text-[14px] text-foreground w-[50px] text-right shrink-0">
        {value}/{total}
      </span>
    </div>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? '';
  let cls = 'bg-muted text-muted-foreground';
  if (s.includes('completed') || s === 'verified') cls = 'bg-green-100 text-green-700';
  else if (s.includes('on going') || s.includes('ongoing') || s === 'in progress') cls = 'bg-blue-100 text-blue-700';
  else if (s.includes('pending') || s.includes('uploaded')) cls = 'bg-orange-100 text-orange-700';
  else if (s.includes('rejected')) cls = 'bg-red-100 text-red-700';

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${cls}`}>
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

/* ── Dashboard ── */
export default function Dashboard() {
  const { profile_photo, dp_id } = useDPAuth();
  const navigate = useNavigate();
  const photoUrl = getFileUrl(profile_photo ?? '');

  const [docCounts, setDocCounts] = useState({ completed: 0, pending: 0, rejected: 0, total: 0 });
  const [srCounts, setSrCounts] = useState({ verified: 0, pending: 0, rejected: 0, total: 0 });
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Fetch client documents
    fetchList('DigiVault Client Document', ['name', 'document_status'], [])
      .then((docs: any[]) => {
        if (!docs) return;
        let completed = 0, pending = 0, rejected = 0;
        docs.forEach((d) => {
          const s = (d.document_status ?? '').toLowerCase();
          if (s === 'completed' || s === 'verified') completed++;
          else if (s === 'rejected') rejected++;
          else pending++;
        });
        const total = completed + pending + rejected;
        setDocCounts({ completed, pending, rejected, total });
      })
      .catch(() => {});

    // Fetch service requests
    fetchList('DigiVault Service Request', ['name', 'request_status'], [])
      .then((srs: any[]) => {
        if (!srs) return;
        let verified = 0, pending = 0, rejected = 0;
        srs.forEach((s) => {
          const st = (s.request_status ?? '').toLowerCase();
          if (st === 'completed' || st === 'verified') verified++;
          else if (st === 'rejected') rejected++;
          else pending++;
        });
        const total = verified + pending + rejected;
        setSrCounts({ verified, pending, rejected, total });
      })
      .catch(() => {});

    // Fetch recent docs
    fetchList(
      'DigiVault Client Document',
      ['name', 'document_title', 'document_status', 'creation'],
      [],
      10,
      'creation desc'
    )
      .then((docs: any[]) => {
        if (docs) setRecentDocs(docs);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-svh bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <h1 className="text-[20px] font-bold text-foreground">Dashboard</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/task-map')} className="w-9 h-9 border border-border rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-muted-foreground" />
          </button>
          <button onClick={() => navigate('/messages')} className="w-9 h-9 border border-border rounded-lg flex items-center justify-center relative">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button className="w-9 h-9 border border-border rounded-lg flex items-center justify-center">
            <Home className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="w-9 h-9 rounded-full border border-border overflow-hidden flex items-center justify-center bg-muted">
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </header>

      {/* Card 1: Clients Documents */}
      <div className="mx-4 mt-4 bg-background border border-border rounded-xl p-4">
        <h2 className="text-[16px] font-bold text-foreground mb-4">Clients Documents</h2>
        <div className="flex justify-around">
          <DonutRing value={docCounts.completed} total={docCounts.total} label="Completed" stroke="#22C55E" track="#DCFCE7" />
          <DonutRing value={docCounts.pending} total={docCounts.total} label="Pending" stroke="#F59E0B" track="#FEF3C7" />
          <DonutRing value={docCounts.rejected} total={docCounts.total} label="Rejected" stroke="#EF4444" track="#FEE2E2" />
        </div>
      </div>

      {/* Card 2: Estimation */}
      <div className="mx-4 mt-4 bg-background border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-[16px] font-bold text-foreground">Estimation</h2>
        <ProgressBar label="Verified" value={srCounts.verified} total={srCounts.total} fill="#22C55E" bg="#DCFCE7" />
        <ProgressBar label="Pending" value={srCounts.pending} total={srCounts.total} fill="#F59E0B" bg="#FEF3C7" />
        <ProgressBar label="Rejected" value={srCounts.rejected} total={srCounts.total} fill="#EF4444" bg="#FEE2E2" />
      </div>

      {/* Card 3: Recent Activity */}
      <div className="mx-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-5 h-5 text-[#3B82F6]" />
          <h2 className="text-[16px] font-bold text-foreground">Recent Activity List</h2>
        </div>

        <div className="rounded-xl overflow-hidden border border-border">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_90px_100px] bg-[#FEF3C7] px-3 py-2">
            <span className="text-[12px] font-bold text-muted-foreground">Document Title</span>
            <span className="text-[12px] font-bold text-muted-foreground">Date</span>
            <span className="text-[12px] font-bold text-muted-foreground text-right">Status</span>
          </div>

          {/* Table Rows */}
          {recentDocs.length === 0 ? (
            <div className="px-3 py-4 text-center text-[14px] text-muted-foreground">
              No recent activity
            </div>
          ) : (
            recentDocs.map((doc, i) => (
              <div
                key={doc.name}
                className={`grid grid-cols-[1fr_90px_100px] items-center px-3 py-2.5 ${
                  i % 2 === 1 ? 'bg-muted/30' : 'bg-background'
                }`}
              >
                <span className="text-[14px] text-foreground truncate pr-2">
                  {doc.document_title || doc.name}
                </span>
                <span className="text-[14px] text-muted-foreground">
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

      {/* Scan FAB */}
      <button
        onClick={() => navigate('/scan')}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-20"
      >
        <ScanLine className="w-6 h-6" />
      </button>

      <BottomNav />
    </div>
  );
}
