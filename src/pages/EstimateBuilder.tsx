import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { getFileUrl, createRecord, updateRecord, fetchOne } from '@/lib/api';
import { ArrowLeft, MessageSquare, Bell, User, FileText, Plus, Pencil, Clock, Diamond, CheckCircle } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import AddStepModal, { type StepFormData } from '@/components/AddStepModal';
import { useToast } from '@/hooks/use-toast';

type TabKey = 'Required Document' | 'Process Flow' | 'Report';
const TABS: TabKey[] = ['Required Document', 'Process Flow', 'Report'];

function getStepDays(s: StepFormData) {
  if (!s.date_from || !s.date_to) return 0;
  const diff = Math.ceil((new Date(s.date_to).getTime() - new Date(s.date_from).getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

export default function EstimateBuilder() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const clientId = params.get('client') ?? '';
  const estimateParam = params.get('estimate') ?? '';
  const { profile_photo } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');

  const [activeTab, setActiveTab] = useState<TabKey>('Process Flow');
  const [steps, setSteps] = useState<StepFormData[]>([]);
  const [draftId, setDraftId] = useState(estimateParam);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  // Load existing estimate steps from parent record (child table embedded)
  useEffect(() => {
    if (estimateParam && estimateParam !== 'new') {
      fetchOne('DigiVault Estimate', estimateParam)
        .then((est: any) => {
          if (!est) return;
          // estimate_steps is the Table field containing child rows
          const childSteps = est.estimate_steps ?? [];
          if (childSteps.length > 0) {
            setSteps(childSteps.map((s: any) => ({
              id: s.name,
              step_number: s.step_number ?? 1,
              process: s.process_name ?? '',
              date_from: s.date_from ?? '',
              date_to: s.date_to ?? '',
              expense_real: 0,
              expense_bribe: 0,
              expense_mind: 0,
              description: s.description ?? '',
              contact_name: '',
              contact_number: '',
              contact_department: '',
            })));
          }
        })
        .catch(() => {});
    }
  }, [estimateParam]);

  // Auto-create draft
  useEffect(() => {
    if (!draftId && clientId) {
      createRecord('DigiVault Estimate', { client: clientId, estimate_status: 'Draft' })
        .then((res: any) => { if (res?.data?.name) setDraftId(res.data.name); })
        .catch(() => {});
    }
  }, [clientId, draftId]);

  const handleSaveStep = async (data: StepFormData) => {
    let newSteps: StepFormData[];
    if (editingIdx !== null) {
      newSteps = steps.map((s, i) => (i === editingIdx ? { ...data, id: s.id } : s));
    } else {
      newSteps = [...steps, data];
    }
    setSteps(newSteps);

    // Save all steps as child table via parent estimate update
    if (draftId) {
      try {
        await updateRecord('DigiVault Estimate', draftId, {
          estimate_steps: newSteps.map((s) => ({
            ...(s.id ? { name: s.id } : {}),
            step_number: s.step_number,
            process_name: s.process,
            date_from: s.date_from,
            date_to: s.date_to,
            duration_days: getStepDays(s),
            description: s.description,
          })),
        });
      } catch { /* silent — local state still updated */ }
    }
    setModalOpen(false);
    setEditingIdx(null);
  };

  const totalCost = steps.reduce((a, s) => a + (s.expense_real || 0) + (s.expense_bribe || 0) + (s.expense_mind || 0), 0);
  const totalDays = steps.reduce((a, s) => a + getStepDays(s), 0);

  const handleSendForApproval = async () => {
    if (!draftId || submitting) return;
    setSubmitting(true);
    try {
      await updateRecord('DigiVault Estimate', draftId, {
        estimate_status: 'Submitted', // correct field name
        total_time_days: totalDays,
        total_price: totalCost,
      });
      toast({ title: 'Estimate sent for approval' });
      navigate(`/estimate-list?client=${clientId}`);
    } catch {
      toast({ title: 'Failed to submit', variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-svh bg-background pb-40">
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/estimate-list?client=${clientId}`)}><ArrowLeft className="w-6 h-6 text-foreground" /></button>
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
        <div className="flex gap-2 mt-4">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${activeTab === tab ? 'bg-background border-2 border-[#3B82F6] text-[#3B82F6]' : 'bg-background border border-border text-muted-foreground'}`}>{tab}</button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === 'Required Document' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <FileText className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No required documents added yet</p>
            </div>
          )}

          {activeTab === 'Process Flow' && (
            <div className="relative pl-7">
              {steps.length > 0 && <div className="absolute left-[7px] top-2 w-0.5 bg-[#3B82F6]" style={{ height: 'calc(100% - 8px)' }} />}
              {steps.map((step, idx) => {
                const days = getStepDays(step);
                return (
                  <div key={idx} className="relative flex items-start gap-3 mb-4">
                    <div className="absolute -left-7 top-4 w-4 h-4 rounded-full bg-[#3B82F6] z-10" />
                    <div className="flex-1 bg-background border border-border rounded-2xl shadow-sm p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[16px] font-bold text-foreground">Step {step.step_number}</p>
                        <div className="flex items-center gap-3">
                          <button onClick={() => { setEditingIdx(idx); setModalOpen(true); }} className="text-[#3B82F6] text-[12px] font-medium flex items-center gap-1">
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          {days > 0 && <span className="text-[#3B82F6] text-[12px] font-medium flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {days}D</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {[{ label: 'Real', val: step.expense_real }, { label: 'Bribe', val: step.expense_bribe }, { label: 'Mind', val: step.expense_mind }].map((e) => (
                          <div key={e.label} className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 flex items-center gap-2">
                            <Diamond className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-foreground leading-tight">{e.val || 0}</p>
                              <p className="text-[11px] text-muted-foreground leading-tight">{e.label}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {step.description && <p className="text-[12px] text-muted-foreground mt-3 line-clamp-2">{step.description}</p>}
                    </div>
                  </div>
                );
              })}
              <div className="relative flex items-center gap-3">
                <div className="absolute -left-7 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#3B82F6] z-10" />
                <button onClick={() => { setEditingIdx(null); setModalOpen(true); }} className="flex-1 bg-[#1A3C8E] text-white rounded-full h-12 text-[15px] font-bold flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" /> Add Step {steps.length + 1}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'Report' && (
            steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <FileText className="w-12 h-12 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">Add steps to generate report</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-[16px] font-bold text-foreground">Estimate Summary</h3>
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[40px_1fr_60px_80px] bg-muted/50 px-3 py-2">
                    <span className="text-[12px] font-medium text-muted-foreground">#</span>
                    <span className="text-[12px] font-medium text-muted-foreground">Step</span>
                    <span className="text-[12px] font-medium text-muted-foreground text-right">Days</span>
                    <span className="text-[12px] font-medium text-muted-foreground text-right">Cost</span>
                  </div>
                  {steps.map((step, idx) => {
                    const days = getStepDays(step);
                    const cost = (step.expense_real || 0) + (step.expense_bribe || 0) + (step.expense_mind || 0);
                    return (
                      <div key={idx} className="grid grid-cols-[40px_1fr_60px_80px] px-3 py-2.5 border-t border-muted/40">
                        <span className="text-[13px] text-muted-foreground">{idx + 1}</span>
                        <span className="text-[13px] text-foreground truncate">{step.process}</span>
                        <span className="text-[13px] text-foreground text-right">{days || '—'}</span>
                        <span className="text-[13px] text-foreground text-right">{cost ? `₹${cost}` : '—'}</span>
                      </div>
                    );
                  })}
                  <div className="grid grid-cols-[40px_1fr_60px_80px] px-3 py-2.5 border-t border-border bg-muted/30">
                    <span />
                    <span className="text-[13px] font-bold text-foreground">Total</span>
                    <span className="text-[13px] font-bold text-foreground text-right">{totalDays}</span>
                    <span className="text-[13px] font-bold text-foreground text-right">₹{totalCost}</span>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {steps.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 bg-background border-t border-border px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[13px] text-muted-foreground">Total Time: <span className="font-bold text-[#3B82F6]">{totalDays} Days</span></p>
            <p className="text-[13px] text-muted-foreground">Total Price: <span className="font-bold text-[#3B82F6]">{totalCost}rs</span></p>
          </div>
          <button onClick={handleSendForApproval} disabled={submitting} className="bg-[#16a34a] text-white rounded-xl px-5 py-2.5 text-[14px] font-bold flex items-center gap-2 disabled:opacity-60">
            <CheckCircle className="w-4 h-4" />{submitting ? 'Sending…' : 'Send For Approval'}
          </button>
        </div>
      )}

      <AddStepModal
        open={modalOpen}
        stepNumber={editingIdx !== null ? steps[editingIdx].step_number : steps.length + 1}
        initial={editingIdx !== null ? steps[editingIdx] : undefined}
        onSave={handleSaveStep}
        onClose={() => { setModalOpen(false); setEditingIdx(null); }}
      />
      <BottomNav />
    </div>
  );
}
