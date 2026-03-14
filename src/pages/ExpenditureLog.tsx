import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { getFileUrl, fetchList, createRecord } from '@/lib/api';
import { ArrowLeft, MessageSquare, Bell, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import BottomNav from '@/components/BottomNav';
import { toast } from '@/hooks/use-toast';

// DigiVault Transaction fields:
// client_id_ref (Data), job_id (Data), service_name (Data), step_no (Data),
// amount (Currency), transaction_type (Select: Received/Expenditure/Request), transaction_date (Date)

type ExpType = 'Received' | 'Expenditure' | 'Request';

const TYPE_CONFIG: Record<ExpType, { color: string; bg: string; border: string; desc: string }> = {
  Received:    { color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-400',  desc: 'Money received from client or office' },
  Expenditure: { color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-400',    desc: 'Money spent at government office' },
  Request:     { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-400', desc: 'Fund request submitted to MRA' },
};

export default function ExpenditureLog() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const taskId = params.get('task') ?? '';
  const { profile_photo, dp_id } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');

  const [expType, setExpType] = useState<ExpType | null>(null);
  const [amount, setAmount] = useState('');
  const [clientIdRef, setClientIdRef] = useState('');
  const [jobId, setJobId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [stepNo, setStepNo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from task if provided
  useEffect(() => {
    if (!taskId) return;
    fetchList('DigiVault Task', ['name','task_name','client','service'], [['name','=',taskId]], 1)
      .then((d: any[]) => {
        if (d && d[0]) {
          setClientIdRef(d[0].client ?? '');
          setJobId(d[0].name ?? '');
          setServiceName(d[0].task_name ?? '');
        }
      }).catch(() => {});
  }, [taskId]);

  const handleSubmit = async () => {
    if (!expType) { toast({ title: 'Select a transaction type', variant: 'destructive' }); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { toast({ title: 'Enter a valid amount', variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      await createRecord('DigiVault Transaction', {
        client_id_ref: clientIdRef,
        job_id: jobId,
        service_name: serviceName,
        step_no: stepNo,
        amount: Number(amount),
        transaction_type: expType,
        transaction_date: new Date().toISOString().split('T')[0],
      });
      toast({ title: 'Transaction logged successfully' });
      navigate('/transactions');
    } catch (e: any) {
      toast({ title: 'Failed to log transaction', description: e?.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "border-0 border-b border-input rounded-none h-12 px-0 focus-visible:ring-0 bg-transparent text-base";

  return (
    <div className="min-h-svh bg-background pb-24">
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6 text-foreground" /></button>
          <h1 className="text-[20px] font-bold text-foreground">Log Transaction</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><MessageSquare className="w-5 h-5 text-muted-foreground" /></div>
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><Bell className="w-5 h-5 text-muted-foreground" /></div>
          <div className="w-9 h-9 rounded-full border border-border overflow-hidden flex items-center justify-center bg-muted">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-muted-foreground" />}
          </div>
        </div>
      </header>

      <div className="px-5 pt-5 space-y-6">

        {/* Transaction Type */}
        <div>
          <p className="text-[14px] font-bold text-foreground mb-3">Transaction Type <span className="text-red-500">*</span></p>
          <div className="space-y-3">
            {(Object.keys(TYPE_CONFIG) as ExpType[]).map((t) => {
              const cfg = TYPE_CONFIG[t];
              const active = expType === t;
              return (
                <button key={t} onClick={() => setExpType(t)}
                  className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${active ? `${cfg.bg} ${cfg.border}` : 'bg-background border-border'}`}>
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${active ? cfg.border : 'border-gray-300'}`}>
                    {active && <div className={`w-2.5 h-2.5 rounded-full ${cfg.bg.replace('bg-','bg-').replace('-50','-500')}`} />}
                  </div>
                  <div>
                    <p className={`text-[15px] font-bold ${active ? cfg.color : 'text-foreground'}`}>{t}</p>
                    <p className="text-[12px] text-muted-foreground">{cfg.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <label className="text-[14px] font-bold text-foreground">Amount (₹) <span className="text-red-500">*</span></label>
          <div className="relative flex items-center border-b border-input">
            <span className="text-[20px] text-muted-foreground mr-2">₹</span>
            <input type="number" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="flex-1 h-12 bg-transparent text-[20px] font-medium outline-none placeholder:text-muted-foreground/50" />
          </div>
        </div>

        {/* Reference fields */}
        <div className="space-y-4">
          <p className="text-[14px] font-bold text-foreground">Reference Details</p>
          {[
            { label: 'Client ID', val: clientIdRef, set: setClientIdRef, placeholder: 'CL-00011' },
            { label: 'Job ID / Task', val: jobId, set: setJobId, placeholder: 'DVU-XXXXX' },
            { label: 'Service Name', val: serviceName, set: setServiceName, placeholder: 'E-Khatha' },
            { label: 'Step No', val: stepNo, set: setStepNo, placeholder: 'Step 2' },
          ].map(({ label, val, set, placeholder }) => (
            <div key={label} className="space-y-1">
              <label className="text-[13px] text-muted-foreground">{label}</label>
              <Input className={inputClass} placeholder={placeholder} value={val} onChange={(e) => set(e.target.value)} />
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-[14px] font-bold text-foreground">Notes (optional)</label>
          <Textarea rows={3} className="rounded-xl border border-input bg-transparent text-base px-3 py-2 resize-none"
            placeholder="Describe the transaction..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting || !expType || !amount}
          className="w-full bg-[#1A3C8E] text-white rounded-xl py-4 text-[16px] font-bold disabled:opacity-50 mt-2">
          {submitting ? 'Logging...' : 'Log Transaction'}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
