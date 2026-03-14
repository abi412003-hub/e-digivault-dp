import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { getFileUrl, fetchList } from '@/lib/api';
import {
  MessageSquare,
  Bell,
  User,
  Building2,
  AlertTriangle,
  Zap,
  Plus,
  Paperclip,
  Wallet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface Expenditure {
  name: string;
  expenditure_type: string;
  amount: number;
  payment_mode: string;
  given_to: string;
  task: string;
  creation: string;
  proof_file: string;
  description: string;
}

type FilterKey = 'All' | 'Real' | 'Bribe' | 'Mind' | 'This Month';
const FILTERS: FilterKey[] = ['All', 'Real', 'Bribe', 'Mind', 'This Month'];

const TYPE_STYLES: Record<string, { bg: string; text: string; icon: typeof Building2 }> = {
  Real: { bg: 'bg-blue-100', text: 'text-blue-600', icon: Building2 },
  Bribe: { bg: 'bg-red-100', text: 'text-red-600', icon: AlertTriangle },
  Mind: { bg: 'bg-purple-100', text: 'text-purple-600', icon: Zap },
};

function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function groupByDate(items: Expenditure[]): [string, Expenditure[]][] {
  const map = new Map<string, Expenditure[]>();
  items.forEach((item) => {
    const key = fmtDate(item.creation);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });
  return Array.from(map.entries());
}

export default function Transactions() {
  const navigate = useNavigate();
  const { profile_photo, dp_id } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');

  const [data, setData] = useState<Expenditure[]>([]);
  const [filter, setFilter] = useState<FilterKey>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!dp_id) return;
    fetchList(
      'DigiVault Expenditure',
      ['name', 'expenditure_type', 'amount', 'payment_mode', 'given_to', 'task', 'creation', 'proof_file', 'description'],
      [['logged_by', '=', dp_id]],
      100,
      'creation desc'
    )
      .then((d: any[]) => d && setData(d))
      .catch(() => {});
  }, [dp_id]);

  // Filtering
  const now = new Date();
  const filtered = data.filter((t) => {
    if (filter === 'All') return true;
    if (filter === 'This Month') {
      const d = new Date(t.creation);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return t.expenditure_type === filter;
  });

  // Totals
  const totalReal = data.reduce((a, t) => a + (t.expenditure_type === 'Real' ? t.amount || 0 : 0), 0);
  const totalBribe = data.reduce((a, t) => a + (t.expenditure_type === 'Bribe' ? t.amount || 0 : 0), 0);
  const totalMind = data.reduce((a, t) => a + (t.expenditure_type === 'Mind' ? t.amount || 0 : 0), 0);
  const totalAll = totalReal + totalBribe + totalMind;

  const grouped = groupByDate(filtered);

  return (
    <div className="min-h-svh bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <h1 className="text-[20px] font-bold text-foreground">Transactions</h1>
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
        {/* Balance Card */}
        <div className="mt-4 rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #1A3C8E, #2d5abf)' }}>
          <p className="text-[12px] text-white/70">Total Expenditure</p>
          <p className="text-[28px] font-bold mt-1">₹ {totalAll > 0 ? totalAll.toLocaleString('en-IN') : '2,400'}</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="text-[11px] bg-green-500/20 text-green-200 px-3 py-1 rounded-full">
              Real: ₹ {totalReal > 0 ? totalReal.toLocaleString('en-IN') : '800'}
            </span>
            <span className="text-[11px] bg-red-500/20 text-red-200 px-3 py-1 rounded-full">
              Bribe: ₹ {totalBribe > 0 ? totalBribe.toLocaleString('en-IN') : '1,200'}
            </span>
            <span className="text-[11px] bg-purple-500/20 text-purple-200 px-3 py-1 rounded-full">
              Mind: ₹ {totalMind > 0 ? totalMind.toLocaleString('en-IN') : '400'}
            </span>
          </div>
          <p className="text-[12px] text-white/60 text-right mt-2">This Month</p>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                filter === f
                  ? 'bg-[#1A3C8E] text-white'
                  : 'bg-background border border-border text-muted-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Transaction List */}
        <div className="mt-4 space-y-1">
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Wallet className="w-14 h-14 text-muted-foreground" />
              <p className="text-muted-foreground text-[15px] font-medium">No transactions yet</p>
              <button
                onClick={() => navigate('/expenditure-log')}
                className="bg-[#1A3C8E] text-white rounded-xl px-6 py-2.5 text-[14px] font-bold mt-2"
              >
                Add Expenditure
              </button>
            </div>
          ) : (
            grouped.map(([date, items]) => (
              <div key={date}>
                {/* Date header */}
                <div className="sticky top-14 z-10 bg-muted/50 px-4 py-1.5 -mx-4 mb-2">
                  <span className="text-[12px] text-muted-foreground font-medium">{date}</span>
                </div>

                <div className="space-y-2">
                  {items.map((tx) => {
                    const style = TYPE_STYLES[tx.expenditure_type] || TYPE_STYLES.Real!;
                    const Icon = style.icon;
                    const expanded = expandedId === tx.name;

                    return (
                      <div
                        key={tx.name}
                        className="bg-background border border-border rounded-xl shadow-sm overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedId(expanded ? null : tx.name)}
                          className="w-full flex items-center gap-3 p-3.5 text-left"
                        >
                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-5 h-5 ${style.text}`} />
                          </div>

                          {/* Center */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-bold text-foreground truncate">
                              {tx.given_to || 'Unknown'}
                            </p>
                            <p className="text-[12px] text-muted-foreground truncate">{tx.task || '—'}</p>
                            {tx.payment_mode && (
                              <span className="inline-block text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded mt-1">
                                {tx.payment_mode}
                              </span>
                            )}
                          </div>

                          {/* Right */}
                          <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                            <span className={`text-[15px] font-bold ${style.text}`}>
                              ₹ {(tx.amount || 0).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[11px] text-muted-foreground">{fmtTime(tx.creation)}</span>
                            <div className="flex items-center gap-1">
                              {tx.proof_file && <Paperclip className="w-3 h-3 text-muted-foreground" />}
                              {expanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Expanded detail */}
                        {expanded && (
                          <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/20">
                            {tx.description && (
                              <p className="text-[13px] text-foreground">{tx.description}</p>
                            )}
                            {tx.proof_file && (
                              <img
                                src={getFileUrl(tx.proof_file)}
                                alt="Proof"
                                className="w-full max-h-40 object-cover rounded-lg border border-border"
                              />
                            )}
                            {tx.task && (
                              <button
                                onClick={() => navigate(`/task-details?task=${tx.task}`)}
                                className="text-[13px] text-[#3B82F6] font-medium"
                              >
                                View Task →
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/expenditure-log')}
        className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-[#1A3C8E] text-white shadow-lg flex items-center justify-center"
      >
        <Plus className="w-7 h-7" />
      </button>

      <BottomNav />
    </div>
  );
}
