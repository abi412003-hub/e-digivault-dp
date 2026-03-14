import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { fetchOne, fetchList, getFileUrl, updateRecord } from '@/lib/api';
import {
  ArrowLeft, MessageSquare, Bell, User,
  IdCard, Phone, Mail, MapPin, Eye, Plus, Upload, CheckCircle2, ScanLine,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { toast } from '@/hooks/use-toast';

function Badge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase();
  const isCompleted = s.includes('completed');
  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${
      isCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
    }`}>
      {status}
    </span>
  );
}

function maskPhone(p: string) {
  if (!p || p.length < 4) return p ?? '—';
  return p.slice(0, 2) + '******' + p.slice(-2);
}
function maskEmail(e: string) {
  if (!e) return '—';
  const [local, domain] = e.split('@');
  if (!domain) return e;
  return local[0] + '*****@' + domain;
}

export default function TaskDetails() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const taskId = params.get('id') ?? '';
  const { profile_photo } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');

  const [task, setTask] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!taskId) return;

    // Fetch task — process_steps child table is embedded in the parent record
    fetchOne('DigiVault Task', taskId)
      .then((t) => {
        if (!t) return;
        setTask(t);

        // Child table rows are in t.process_steps (Table field)
        const childRows = t.process_steps ?? [];
        if (childRows.length > 0) {
          setSteps(childRows.map((s: any) => ({
            name: s.name,
            step_number: s.step_number ?? 1,
            step_label: s.step_name ?? `Step ${s.step_number}`,
            description: s.description ?? '',
            status: s.step_status ?? '',
          })));
        } else {
          // Fallback mock steps if no data
          setSteps([
            { name: 's1', step_number: 1, step_label: 'Step 1', description: 'Online Application', status: 'Completed' },
            { name: 's2', step_number: 2, step_label: 'Step 2', description: 'BBMP ARO Office', status: 'Completed' },
            { name: 's3', step_number: 3, step_label: 'Step 3', description: 'RI', status: 'Completed' },
            { name: 's4', step_number: 4, step_label: 'Step 4', description: 'Case Worker', status: t?.task_status?.toLowerCase().includes('completed') ? 'Completed' : '' },
          ]);
        }

        if (t?.client) {
          fetchOne('DigiVault Client', t.client)
            .then((c) => c && setClient(c))
            .catch(() => {});
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [taskId]);

  const isCompleted = (task?.task_status ?? '').toLowerCase().includes('completed');
  // task_name is the correct field (was task_type)
  const docTitle = task?.task_name ?? 'Task Details';
  const docImage = task?.document_preview ? getFileUrl(task.document_preview) : '';

  const firstIncompleteIdx = steps.findIndex(
    (s) => !(s.status ?? '').toLowerCase().includes('completed')
  );
  const allStepsDone = firstIncompleteIdx === -1;

  const handleUpdateStep = async (step: any) => {
    // Steps are child table rows — update via parent task
    try {
      const updatedSteps = steps.map((s) =>
        s.name === step.name ? { ...s, status: 'Completed', step_status: 'Completed' } : s
      );
      await updateRecord('DigiVault Task', taskId, {
        process_steps: updatedSteps.map((s) => ({
          name: s.name,
          step_number: s.step_number,
          step_name: s.step_label,
          description: s.description,
          step_status: s.status === 'Completed' ? 'Completed' : s.status,
        })),
      });
      setSteps(updatedSteps);
      toast({ title: 'Step updated' });
    } catch {
      toast({ title: 'Failed to update step', variant: 'destructive' });
    }
  };

  const handleSendForApproval = async () => {
    if (!allStepsDone) { toast({ title: 'Complete all steps first' }); return; }
    setSending(true);
    try {
      await updateRecord('DigiVault Task', taskId, { task_status: 'Pending For Approval' });
      toast({ title: 'Sent for approval' });
      setTask((t: any) => ({ ...t, task_status: 'Pending For Approval' }));
    } catch {
      toast({ title: 'Failed', variant: 'destructive' });
    } finally { setSending(false); }
  };

  const handleSave = async () => {
    try {
      await updateRecord('DigiVault Task', taskId, {});
      toast({ title: 'Saved' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-svh bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background pb-20">
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6 text-foreground" /></button>
          <h1 className="text-[18px] font-bold text-foreground">Task&nbsp; Details</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/messages/${taskId}`)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><MessageSquare className="w-5 h-5 text-primary" /></button>
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><Bell className="w-5 h-5 text-muted-foreground" /></div>
          <div className="w-9 h-9 rounded-full border border-border overflow-hidden flex items-center justify-center bg-muted">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-muted-foreground" />}
          </div>
        </div>
      </header>

      <div className="px-4">
        {/* Client info */}
        <div className="py-4 space-y-2">
          <div className="flex items-center gap-2">
            <IdCard className="w-4 h-4 text-[#3B82F6] shrink-0" />
            <span className="text-[13px] text-muted-foreground">Client ID: {client?.name ?? task?.client ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#3B82F6] shrink-0" />
            <span className="text-[13px] text-muted-foreground">{maskPhone(client?.phone_no ?? '')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#3B82F6] shrink-0" />
            <span className="text-[13px] text-muted-foreground">{maskEmail(client?.email ?? '')}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#3B82F6] shrink-0" />
            <span className="text-[13px] text-muted-foreground">
              {client?.address_line ? `${client.address_line} ${client?.city ?? ''} Pincode - ${client?.client_pincode ?? ''}` : '—'}
            </span>
          </div>
        </div>

        {/* Service label + status */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold text-foreground">{docTitle}</h2>
          <Badge status={task?.task_status ?? 'On Going'} />
        </div>

        {/* Document preview */}
        <div className="rounded-2xl border border-border bg-muted/30 p-4 flex items-center justify-center min-h-[200px] mb-6">
          {isCompleted && docImage ? (
            <img src={docImage} alt="Completed document" className="max-h-[280px] object-contain rounded-lg" />
          ) : (
            <div className="w-20 h-24 rounded-lg border-2 border-red-400 bg-white flex flex-col items-center justify-center">
              <span className="text-red-500 font-bold text-[11px]">PDF</span>
              <div className="w-8 h-0.5 bg-red-400 mt-1" />
              <div className="w-6 h-0.5 bg-red-300 mt-1" />
              <div className="w-7 h-0.5 bg-red-300 mt-1" />
            </div>
          )}
        </div>

        {/* Step Timeline */}
        <div className="relative pl-6 mb-6">
          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-[#3B82F6]" />
          <div className="space-y-5">
            {steps.map((step, idx) => {
              const isUpdateTarget = !isCompleted && idx === firstIncompleteIdx;
              return (
                <div key={step.name} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-[#3B82F6] border-2 border-[#3B82F6] z-10" />
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-bold text-green-600">{step.step_label ?? `Step ${step.step_number ?? idx + 1}`}</p>
                      <p className="text-[12px] text-muted-foreground">{step.description ?? '—'}</p>
                    </div>
                    {isUpdateTarget ? (
                      <button onClick={() => handleUpdateStep(step)} className="flex items-center gap-1 bg-[#1A3C8E] text-white text-[13px] font-medium px-4 py-1.5 rounded-lg shrink-0">
                        Update <Plus className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button className="flex items-center gap-1 border border-border text-foreground text-[13px] font-medium px-4 py-1.5 rounded-lg shrink-0">
                        View <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom action buttons */}
        {isCompleted ? (
          <button className="w-full border border-[#3B82F6] text-[#3B82F6] rounded-xl h-12 text-[15px] font-medium">View Remark</button>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3">
              <button onClick={() => navigate(`/scan?task=${taskId}`)} className="flex-1 border border-primary text-primary rounded-xl h-12 text-[15px] font-medium flex items-center justify-center gap-1.5">
                <ScanLine className="w-4 h-4" /> Scan
              </button>
              <button onClick={() => navigate(`/document-upload?task=${taskId}`)} className="flex-1 border border-primary text-primary rounded-xl h-12 text-[15px] font-medium flex items-center justify-center gap-1.5">
                <Upload className="w-4 h-4" /> Upload
              </button>
              <button onClick={handleSendForApproval} disabled={!allStepsDone || sending} className="flex-1 bg-[#3B82F6] text-white rounded-xl h-12 text-[15px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-50">
                <CheckCircle2 className="w-4 h-4" /> Send For Approval
              </button>
            </div>
            <button onClick={handleSave} className="w-full bg-[#1A3C8E] text-white rounded-xl h-12 text-[15px] font-bold">Save</button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
