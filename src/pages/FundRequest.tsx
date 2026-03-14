import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { getFileUrl, fetchList, createRecord } from '@/lib/api';
import { ArrowLeft, MessageSquare, Bell, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import BottomNav from '@/components/BottomNav';
import { toast } from '@/hooks/use-toast';

type TabKey = 'Request' | 'Pending' | 'Approved' | 'Rejected';
const TABS: TabKey[] = ['Request', 'Pending', 'Approved', 'Rejected'];
const STATUS_MAP: Record<TabKey, string> = { Request: '', Pending: 'Pending', Approved: 'Approved', Rejected: 'Rejected' };
const STATUS_COLOR: Record<string, string> = { Pending: 'text-orange-500', Approved: 'text-green-600', Rejected: 'text-red-500' };

export default function FundRequest() {
  const navigate = useNavigate();
  const { profile_photo, dp_id } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');

  const [activeTab, setActiveTab] = useState<TabKey>('Request');
  const [tasks, setTasks] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [clientId, setClientId] = useState('');
  const [jobId, setJobId] = useState('');
  const [project, setProject] = useState('');
  const [mainService, setMainService] = useState('');
  const [subService, setSubService] = useState('');
  const [service, setService] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!dp_id) return;
    fetchList('DigiVault Task', ['name', 'task_type', 'client'], [['assigned_dp', '=', dp_id], ['status', '!=', 'Completed']], 50)
      .then((d: any[]) => d && setTasks(d)).catch(() => {});
    fetchList('DigiVault Fund Request', ['name', 'linked_mra', 'linked_cd', 'progress_percentage', 'status', 'rejection_reason', 'request_photo'], [['requested_by', '=', dp_id]], 100, 'creation desc')
      .then((d: any[]) => d && setRequests(d)).catch(() => {});
  }, [dp_id]);

  const handleSubmit = async () => {
    if (!clientId.trim() || !amount.trim()) { toast({ title: 'Client ID and Amount are required', variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      await createRecord('DigiVault Fund Request', { client_id: clientId, job_id: jobId, project, main_service: mainService, sub_service: subService, service, task: selectedTask, amount: Number(amount), requested_by: dp_id, status: 'Pending' });
      toast({ title: 'Request submitted successfully' });
      setClientId(''); setJobId(''); setProject(''); setMainService(''); setSubService(''); setService(''); setSelectedTask(''); setAmount('');
      setActiveTab('Pending');
    } catch { toast({ title: 'Failed to submit request', variant: 'destructive' }); }
    finally { setSubmitting(false); }
  };

  const tabRequests = requests.filter((r) => r.status === STATUS_MAP[activeTab] || (activeTab !== 'Request' && r.status === STATUS_MAP[activeTab]));

  const inputClass = "border border-border rounded-lg px-4 py-3 h-auto text-base w-full";

  return (
    <div className="min-h-svh bg-background pb-20">
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/transactions')}><ArrowLeft className="w-6 h-6 text-foreground" /></button>
          <h1 className="text-[20px] font-bold text-foreground">Request</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><MessageSquare className="w-5 h-5 text-muted-foreground" /></div>
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><Bell className="w-5 h-5 text-muted-foreground" /></div>
          <div className="w-9 h-9 rounded-full border border-border overflow-hidden flex items-center justify-center bg-muted">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-muted-foreground" />}
          </div>
        </div>
      </header>

      <div className="px-4 pt-3">
        {/* 4 tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors ${activeTab === tab ? 'bg-[#1A3C8E] text-white' : 'bg-background border border-border text-muted-foreground'}`}>{tab}</button>
          ))}
        </div>

        {/* Request form */}
        {activeTab === 'Request' && (
          <div className="mt-4 bg-background border border-border rounded-2xl shadow-sm p-5 space-y-4">
            {[
              { label: 'Client ID', val: clientId, set: setClientId, placeholder: 'CI-541278' },
              { label: 'Job ID', val: jobId, set: setJobId, placeholder: 'JB-987654' },
              { label: 'Main Service', val: mainService, set: setMainService, placeholder: 'Gram Panchayat' },
              { label: 'Sub -Service', val: subService, set: setSubService, placeholder: 'E-Katha B' },
              { label: 'Service', val: service, set: setService, placeholder: 'E-Katha 11b' },
            ].map(({ label, val, set, placeholder }) => (
              <div key={label}>
                <label className="text-[14px] font-medium text-foreground block mb-1.5">{label}</label>
                <Input className={inputClass} placeholder={placeholder} value={val} onChange={(e) => set(e.target.value)} />
              </div>
            ))}
            <div>
              <label className="text-[14px] font-medium text-foreground block mb-1.5">Project</label>
              <div className="relative">
                <select value={project} onChange={(e) => setProject(e.target.value)} className={`${inputClass} appearance-none pr-8`}>
                  <option value="">E-katha</option>
                  {tasks.map((t) => <option key={t.name} value={t.name}>{t.task_type || t.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[14px] font-medium text-foreground block mb-1.5">Task</label>
              <div className="relative">
                <select value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)} className={`${inputClass} appearance-none pr-8`}>
                  <option value="">Select your Task</option>
                  {tasks.map((t) => <option key={t.name} value={t.name}>{t.task_type || t.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[14px] font-medium text-foreground block mb-1.5">Amount</label>
              <Input className={inputClass} type="number" placeholder="250" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#1A3C8E] text-white rounded-xl h-13 text-[16px] font-bold mt-2 py-3.5 disabled:opacity-60">
              {submitting ? 'Submitting...' : 'Request'}
            </button>
          </div>
        )}

        {/* Status list */}
        {activeTab !== 'Request' && (
          <div className="mt-4 space-y-3">
            {requests.filter(r => r.status === STATUS_MAP[activeTab]).length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-2">
                <User className="w-12 h-12 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">No {activeTab.toLowerCase()} requests</p>
              </div>
            ) : (
              requests.filter(r => r.status === STATUS_MAP[activeTab]).map((req) => {
                const photoUrl = getFileUrl(req.request_photo ?? '');
                const displayId = req.linked_mra || req.linked_cd || req.name;
                const progress = req.progress_percentage ?? 70;
                const statusColor = STATUS_COLOR[req.status] ?? 'text-muted-foreground';
                return (
                  <div key={req.name} className="bg-background rounded-2xl border border-muted shadow-sm p-4 flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center border border-muted">
                      {photoUrl ? <img src={photoUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-7 h-7 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-[16px] font-bold text-foreground">{displayId}</p>
                      <p className="text-[13px]"><span className="text-muted-foreground">Progress: </span><span className="text-green-600 font-semibold">{progress}%</span></p>
                      <p className="text-[13px]"><span className="text-muted-foreground">Status : </span><span className={`font-semibold ${statusColor}`}>{req.status === 'Approved' ? 'Approved' : req.status === 'Rejected' ? 'Rejected' : 'Pending for Approval'}</span></p>
                      {req.rejection_reason && <p className="text-[12px] text-muted-foreground italic">{req.rejection_reason}</p>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
