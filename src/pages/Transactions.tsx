import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { getFileUrl, fetchList } from '@/lib/api';
import { MessageSquare, Bell, User, Building2, AlertTriangle, Zap, Plus, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface Transaction {
  name: string;
  client_id_ref: string;
  job_id: string;
  service_name: string;
  step_no: string;
  amount: number;
  transaction_type: string;  // correct field (was expenditure_type)
  transaction_date: string;
}

type FilterKey = 'All' | 'Received' | 'Expenditure' | 'Request' | 'This Month';
const FILTERS: FilterKey[] = ['All', 'Received', 'Expenditure', 'Request', 'This Month'];

const TYPE_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  Received:    { bg: 'bg-green-100',  text: 'text-green-600',  icon: Building2 },
  Expenditure: { bg: 'bg-red-100',    text: 'text-red-600',    icon: AlertTriangle },
  Request:     { bg: 'bg-purple-100', text: 'text-purple-600', icon: Zap },
};

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : ''; }

function groupByDate(items: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>();
  items.forEach((item) => {
    const key = fmtDate(item.transaction_date || item.name);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });
  return Array.from(map.entries());
}

export default function Transactions() {
  const navigate = useNavigate();
  const { profile_photo } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');

  const [data, setData] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<FilterKey>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // DigiVault Transaction fields: client_id_ref, job_id, service_name, step_no, amount, transaction_type, transaction_date
    fetchList('DigiVault Transaction', ['name','client_id_ref','job_id','service_name','step_no','amount','transaction_type','transaction_date'], [], 100, 'transaction_date desc')
      .then((d: any[]) => d && setData(d))
      .catch(() => {});
  }, []);

  const now = new Date();
  const filtered = data.filter((t) => {
    if (filter === 'All') return true;
    if (filter === 'This Month') { const d = new Date(t.transaction_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }
    return t.transaction_type === filter;
  });

  const totalReceived    = data.reduce((a, t) => a + (t.transaction_type === 'Received'    ? t.amount || 0 : 0), 0);
  const totalExpenditure = data.reduce((a, t) => a + (t.transaction_type === 'Expenditure' ? t.amount || 0 : 0), 0);
  const totalRequest     = data.reduce((a, t) => a + (t.transaction_type === 'Request'     ? t.amount || 0 : 0), 0);
  const totalAll = totalReceived + totalExpenditure + totalRequest;

  const grouped = groupByDate(filtered);

  return (
    <div className="min-h-svh bg-background pb-20">
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <h1 className="text-[20px] font-bold text-foreground">Payments</h1>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><MessageSquare className="w-5 h-5 text-muted-foreground" /></div>
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><Bell className="w-5 h-5 text-muted-foreground" /></div>
          <div className="w-9 h-9 rounded-full border border-border overflow-hidden flex items-center justify-center bg-muted">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-muted-foreground" />}
          </div>
        </div>
      </header>

      <div className="px-4">
        {/* Balance Card */}
        <div className="mt-4 rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #1A3C8E, #2d5abf)' }}>
          <p className="text-[12px] text-white/70">Total</p>
          <p className="text-[28px] font-bold mt-1">{totalAll > 0 ? totalAll.toLocaleString('en-IN') : '200'}A</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="text-[11px] bg-green-500/20 text-green-200 px-3 py-1 rounded-full">Received: {totalReceived > 0 ? totalReceived : '100'}A</span>
            <span className="text-[11px] bg-red-500/20 text-red-200 px-3 py-1 rounded-full">Expenditure: {totalExpenditure > 0 ? totalExpenditure : '150'}A</span>
            <span className="text-[11px] bg-yellow-500/20 text-yellow-200 px-3 py-1 rounded-full">Request: {totalRequest > 0 ? totalRequest : '50'}A</span>
          </div>
        </div>

        {/* 3 shortcuts */}
        <div className="flex justify-around border-t border-b border-border py-4 mt-4">
          {[{ label: 'Request', path: '/fund-request' }, { label: 'Expenditure', path: '/expenditure-log' }, { label: 'Transaction', path: '/transaction-list' }].map((item) => (
            <button key={item.label} onClick={() => navigate(item.path)} className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-blue-50 border-2 border-[#1A3C8E] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#1A3C8E]" />
              </div>
              <span className="text-[13px] text-gray-700 font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Recent Transactions label */}
        <div className="flex items-center gap-2 mt-4 mb-3">
          <span className="text-[18px] font-bold text-foreground">Recent Transactions</span>
        </div>

        {/* Table */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-5 bg-blue-50 px-2 py-2.5">
            {['Client ID','Job ID','Service','Step No','Amount'].map((h) => (
              <span key={h} className="text-[11px] font-bold text-gray-700 text-center">{h}</span>
            ))}
          </div>
          {data.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <Wallet className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No transactions yet</p>
            </div>
          ) : (
            data.slice(0, 10).map((tx, i) => (
              <div key={tx.name} className={`grid grid-cols-5 px-2 py-2.5 border-t border-border ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                <span className="text-[11px] text-center text-foreground truncate">{tx.client_id_ref || '—'}</span>
                <span className="text-[11px] text-center text-foreground truncate">{tx.job_id || '—'}</span>
                <span className="text-[11px] text-center text-foreground truncate">{tx.service_name || '—'}</span>
                <span className="text-[11px] text-center text-foreground">{tx.step_no || '—'}</span>
                <span className="text-[11px] text-center font-bold text-[#1A3C8E]">{tx.amount || '—'}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <button onClick={() => navigate('/fund-request')} className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-[#1A3C8E] text-white shadow-lg flex items-center justify-center">
        <Plus className="w-7 h-7" />
      </button>
      <BottomNav />
    </div>
  );
}
