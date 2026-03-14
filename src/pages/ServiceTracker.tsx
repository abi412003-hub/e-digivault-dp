import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchList, fetchOne, getFileUrl } from '@/lib/api';
import { ArrowLeft, Check, Clock, MessageSquare, Phone, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ProcessStep {
  step_name: string;
  step_status: string;
  step_date: string;
  step_remark: string;
}

interface TaskWithSteps {
  name: string;
  task_name: string;
  task_status: string;
  steps: ProcessStep[];
}

interface SRData {
  name: string;
  client: string;
  project: string;
  property: string;
  request_status: string;
  main_service: string;
  sub_service: string;
  progress_steps_total: number;
  progress_steps_completed: number;
  progress_percentage: number;
  assigned_dp: string;
}

/* ── Progress Ring ── */
function ProgressRing({ pct }: { pct: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const color = pct >= 100 ? 'hsl(142 71% 45%)' : pct >= 50 ? 'hsl(217 91% 60%)' : 'hsl(38 92% 50%)';
  const track = pct >= 100 ? 'hsl(142 71% 45% / 0.15)' : 'hsl(217 91% 60% / 0.12)';

  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} fill="none" stroke={track} strokeWidth="10" />
      <circle
        cx="65" cy="65" r={r} fill="none"
        stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 65 65)"
        className="transition-all duration-1000"
      />
      <text x="65" y="60" textAnchor="middle" className="text-[28px] font-bold" fill="currentColor">
        {Math.round(pct)}%
      </text>
      <text x="65" y="80" textAnchor="middle" className="text-[11px]" fill="hsl(var(--muted-foreground))">
        complete
      </text>
    </svg>
  );
}

/* ── Step status helpers ── */
function stepIcon(status: string) {
  const s = (status ?? '').toLowerCase();
  if (s === 'completed' || s === 'done') {
    return (
      <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0 z-10">
        <Check className="w-4 h-4" />
      </div>
    );
  }
  if (s === 'in progress' || s === 'on going' || s === 'ongoing') {
    return (
      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 z-10 animate-pulse">
        <Clock className="w-4 h-4" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-muted border-2 border-border flex items-center justify-center shrink-0 z-10">
      <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />
    </div>
  );
}

function stepStatusBadge(status: string) {
  const s = (status ?? '').toLowerCase();
  if (s === 'completed' || s === 'done') return <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Completed</span>;
  if (s === 'in progress' || s === 'on going' || s === 'ongoing') return <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">In Progress</span>;
  return <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Pending</span>;
}

function formatDate(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isCompleted(status: string) {
  const s = (status ?? '').toLowerCase();
  return s === 'completed' || s === 'done';
}

function isInProgress(status: string) {
  const s = (status ?? '').toLowerCase();
  return s === 'in progress' || s === 'on going' || s === 'ongoing';
}

export default function ServiceTracker() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [sr, setSr] = useState<SRData | null>(null);
  const [tasks, setTasks] = useState<TaskWithSteps[]>([]);
  const [dpName, setDpName] = useState('');
  const [dpPhone, setDpPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [propertyCoords, setPropertyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      // Fetch SR
      const srData = await fetchOne('DigiVault Service Request', id);
      if (!srData) { setLoading(false); return; }
      setSr(srData);

      // Fetch DP info, client name, property coords in parallel
      const promises: Promise<void>[] = [];

      if (srData.assigned_dp) {
        promises.push(
          fetchOne('DigiVault User', srData.assigned_dp)
            .then((u: any) => {
              if (u) { setDpName(u.full_name || u.name); setDpPhone(u.mobile_number || ''); }
            })
            .catch(() => {})
        );
      }

      if (srData.client) {
        promises.push(
          fetchOne('DigiVault Client', srData.client)
            .then((c: any) => { if (c?.client_name) setClientName(c.client_name); })
            .catch(() => {})
        );
      }

      if (srData.property) {
        promises.push(
          fetchOne('DigiVault Property', srData.property)
            .then((p: any) => {
              if (p?.property_latitude && p?.property_longitude && p.property_latitude !== 0) {
                setPropertyCoords({ lat: p.property_latitude, lng: p.property_longitude });
              }
            })
            .catch(() => {})
        );
      }

      // Fetch tasks with process_steps
      promises.push(
        fetchList('DigiVault Task', ['name', 'task_name', 'task_status', 'assigned_to'], [['service', '=', id]], 50, 'creation asc')
          .then(async (taskList: any[]) => {
            if (!taskList) return;
            const tasksWithSteps: TaskWithSteps[] = [];
            for (const t of taskList) {
              try {
                const full = await fetchOne('DigiVault Task', t.name);
                tasksWithSteps.push({
                  name: t.name,
                  task_name: t.task_name || t.name,
                  task_status: t.task_status,
                  steps: full?.process_steps || [],
                });
              } catch {
                tasksWithSteps.push({
                  name: t.name,
                  task_name: t.task_name || t.name,
                  task_status: t.task_status,
                  steps: [],
                });
              }
            }
            setTasks(tasksWithSteps);
          })
          .catch(() => {})
      );

      await Promise.all(promises);
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Map setup
  useEffect(() => {
    if (!propertyCoords) return;
    const mapEl = document.getElementById('tracker-map');
    if (!mapEl || (mapEl as any)._leaflet_id) return;

    const map = L.map(mapEl).setView([propertyCoords.lat, propertyCoords.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    L.marker([propertyCoords.lat, propertyCoords.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;background:#3B82F6;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    }).addTo(map);

    return () => { map.remove(); };
  }, [propertyCoords]);

  // Flatten all steps for the timeline
  const allSteps: (ProcessStep & { taskName: string })[] = [];
  tasks.forEach((t) => {
    if (t.steps.length > 0) {
      t.steps.forEach((s) => allSteps.push({ ...s, taskName: t.task_name }));
    } else {
      // If no child steps, use task itself as a step
      allSteps.push({
        step_name: t.task_name,
        step_status: t.task_status === 'Completed' ? 'Completed' : t.task_status === 'On Going' ? 'In Progress' : 'Pending',
        step_date: '',
        step_remark: '',
        taskName: t.task_name,
      });
    }
  });

  // Find latest step date
  const latestDate = allSteps
    .filter((s) => s.step_date)
    .sort((a, b) => new Date(b.step_date).getTime() - new Date(a.step_date).getTime())[0]?.step_date;

  const pct = sr?.progress_percentage ?? 0;

  if (loading) {
    return (
      <div className="min-h-svh bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!sr) {
    return (
      <div className="min-h-svh bg-background flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <p className="text-[16px] font-medium">Service request not found</p>
        <button onClick={() => navigate(-1)} className="text-primary text-[14px]">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center gap-3 px-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[17px] font-bold text-foreground">Track Service</h1>
          <p className="text-[11px] text-muted-foreground">{sr.name}</p>
        </div>
      </header>

      {/* Progress Ring + Service Info */}
      <div className="flex flex-col items-center pt-6 pb-4 px-4">
        <ProgressRing pct={pct} />
        <h2 className="text-[16px] font-bold text-foreground mt-3">
          {sr.main_service || sr.sub_service || 'Service'}
        </h2>
        {sr.sub_service && sr.main_service && (
          <p className="text-[13px] text-muted-foreground">{sr.sub_service}</p>
        )}
        {dpName && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[13px] text-muted-foreground">Assigned to:</span>
            <span className="text-[13px] font-medium text-foreground">{dpName}</span>
            {dpPhone && (
              <a href={`tel:${dpPhone}`} className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center">
                <Phone className="w-3.5 h-3.5 text-green-600" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Step Timeline */}
      <div className="mx-4 mb-4">
        <h3 className="text-[14px] font-bold text-foreground mb-4">Progress Timeline</h3>

        {allSteps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-[14px]">No steps available yet</p>
          </div>
        ) : (
          <div className="relative">
            {allSteps.map((step, i) => {
              const completed = isCompleted(step.step_status);
              const inProgress = isInProgress(step.step_status);
              const isLast = i === allSteps.length - 1;

              return (
                <div key={i} className="flex gap-3 relative">
                  {/* Vertical line */}
                  {!isLast && (
                    <div
                      className="absolute left-[15px] top-8 w-0.5 bottom-0"
                      style={{
                        backgroundColor: completed ? 'hsl(142 71% 45%)' : 'hsl(var(--border))',
                      }}
                    />
                  )}

                  {/* Icon */}
                  {stepIcon(step.step_status)}

                  {/* Content */}
                  <div className="flex-1 pb-6 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-[14px] font-medium ${completed ? 'text-foreground' : inProgress ? 'text-primary' : 'text-muted-foreground'}`}>
                          {step.step_name}
                        </p>
                        {step.step_date && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(step.step_date)}</p>
                        )}
                        {step.step_remark && (
                          <p className="text-[12px] text-muted-foreground mt-1 italic">{step.step_remark}</p>
                        )}
                      </div>
                      {stepStatusBadge(step.step_status)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Property Map */}
      {propertyCoords && (
        <div className="mx-4 mb-4">
          <h3 className="text-[14px] font-bold text-foreground mb-2 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary" /> Property Location
          </h3>
          <div id="tracker-map" className="h-[180px] rounded-xl border border-border overflow-hidden" />
        </div>
      )}

      {/* Bottom Card */}
      <div className="mx-4 bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted-foreground">Status</span>
          <span className="text-[13px] font-medium text-foreground">{sr.request_status}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted-foreground">Steps completed</span>
          <span className="text-[13px] font-medium text-foreground">
            {sr.progress_steps_completed ?? 0} / {sr.progress_steps_total ?? 0}
          </span>
        </div>
        {latestDate && (
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">Last updated</span>
            <span className="text-[13px] font-medium text-foreground">{formatDate(latestDate)}</span>
          </div>
        )}

        <button
          onClick={() => navigate('/messages')}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-[14px] font-medium"
        >
          <MessageSquare className="w-4 h-4" /> Contact BD
        </button>
      </div>
    </div>
  );
}
