import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { getFileUrl, fetchList } from '@/lib/api';
import {
  ArrowLeft, MessageSquare, Bell, User, Plus, Wallet,
  ChevronDown, ChevronUp, Building2, AlertTriangle, Zap,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface Tx {
  name: string; client_id_ref: string; job_id: string;
  service_name: string; step_no: string; amount: number;
  transaction_type: string; transaction_date: string;
}

type Filter = 'All' | 'Received' | 'Expenditure' | 'Request' | 'This Month';
const FILTERS: Filter[] = ['All', 'Received', 'Expenditure', 'Request', 'This Month'];

const STYLES: Record<string, { bg: string; text: string; Icon: any }> = {
  Received:    { bg: 'bg-green-100',  text: 'text-green-600',  Icon: Building2 },
  Expenditure: { bg: 'bg-red-100',    text: 'text-red-600',    Icon: AlertTriangle },
  Request:     { bg: 'bg-purple-100', text: 'text-purple-600', Icon: Zap },
};

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '';
}

function grouped(items: Tx[]): [string, Tx[]][] {
  const map = new Map<string, Tx[]>();
  items.forEach(item => {
    const key = fmtDate(item.transaction_date) || 'Unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });
  return Array.from(map.entries());
}

export default function TransactionList() {
  const navigate = useNavigate();
  const { profile_photo } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');

  const [data, setData] = useState<Tx[]>([]);
  const [filter, setFilter] = useState<Filter>('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchList('DigiVault Transaction',
      ['name','client_id_ref','job_id','service_name','step_no','amount','transaction_type','transaction_date'],
      [], 100, 'transaction_date desc')
      .then((d: any[]) => d && setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const filtered = data.filter(t => {
    if (filter === 'All') return true;
    if (filter === 'This Month') {
      const d = new Date(t.transaction_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return t.transaction_type === filter;
  });

  const groups = grouped(filtered);

  return (
    <div className="min-h-svh bg-background pb-20">
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/transactions')}><ArrowLeft className="w-6 h-6 text-foreground" /></button>
          <h1 className="text-[20px] font-bold text-foreground">All Transactions</h1>
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
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors ${filter === f ? 'bg-[#1A3C8E] text-white' : 'bg-background border border-border text-muted-foreground'}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-1">
          {loading ? (
            [1,2,3,4].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse mb-2" />)
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Wallet className="w-14 h-14 text-muted-foreground" />
              <p className="text-muted-foreground text-[15px] font-medium">No transactions yet</p>
              <button onClick={() => navigate('/expenditure-log')}
                className="bg-[#1A3C8E] text-white rounded-xl px-6 py-2.5 text-[14px] font-bold mt-2">
                Log First Transaction
              </button>
            </div>
          ) : groups.map(([date, items]) => (
            <div key={date}>
              <div className="sticky top-14 z-10 bg-muted/60 backdrop-blur-sm px-4 py-1.5 -mx-4 mb-2">
                <span className="text-[12px] text-muted-foreground font-medium">{date}</span>
              </div>
              <div className="space-y-2">
                {items.map(tx => {
                  const style = STYLES[tx.transaction_type] ?? STYLES.Received;
                  const { Icon } = style;
                  const isOpen = expanded === tx.name;
                  return (
                    <div key={tx.name} className="bg-background border border-border rounded-xl shadow-sm overflow-hidden">
                      <button onClick={() => setExpanded(isOpen ? null : tx.name)}
                        className="w-full flex items-center gap-3 p-3.5 text-left">
                        <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 ${style.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-bold text-foreground truncate">{tx.service_name || tx.transaction_type || '—'}</p>
                          <p className="text-[12px] text-muted-foreground truncate">{tx.client_id_ref || tx.job_id || '—'}</p>
                          {tx.step_no && <span className="inline-block text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded mt-0.5">{tx.step_no}</span>}
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                          <span className={`text-[15px] font-bold ${style.text}`}>₹ {(tx.amount||0).toLocaleString('en-IN')}</span>
                          <span className="text-[11px] text-muted-foreground">{tx.transaction_type}</span>
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="border-t border-border px-4 py-3 space-y-1.5 bg-muted/20">
                          {tx.job_id && <p className="text-[13px] text-foreground">Job: {tx.job_id}</p>}
                          {tx.client_id_ref && <p className="text-[13px] text-foreground">Client: {tx.client_id_ref}</p>}
                          {tx.step_no && <p className="text-[13px] text-foreground">Step: {tx.step_no}</p>}
                          <p className="text-[12px] text-muted-foreground">Date: {fmtDate(tx.transaction_date)}</p>
                          {tx.job_id && (
                            <button onClick={() => navigate(`/task-details?id=${tx.job_id}`)}
                              className="text-[13px] text-[#1A3C8E] font-medium">View Task →</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => navigate('/expenditure-log')}
        className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-[#1A3C8E] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform">
        <Plus className="w-7 h-7" />
      </button>
      <BottomNav />
    </div>
  );
}
