import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { fetchList, fetchOne, getFileUrl } from '@/lib/api';
import { ArrowLeft, MessageSquare, Bell, User } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface ThreadSummary {
  threadId: string; // taskId for DP, serviceRequestId for BD
  title: string;
  subtitle: string;
  lastMessage: string;
  lastSenderRole: string;
  lastTime: string;
  unreadCount: number;
  hasClientMessages: boolean;
  hasDPMessages: boolean;
}

type TabFilter = 'all' | 'clients' | 'dps';

function formatTime(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  const now = new Date();
  const diff = now.getTime() - dt.getTime();
  if (diff < 86400000) return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diff < 604800000) return dt.toLocaleDateString('en-IN', { weekday: 'short' });
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function roleBadgeSmall(role: string) {
  const r = (role ?? '').toLowerCase();
  if (r.includes('client') || r.includes('customer')) return { cls: 'bg-purple-100 text-purple-700', label: 'Client' };
  if (r.includes('delivery') || r.includes('dp')) return { cls: 'bg-orange-100 text-orange-700', label: 'DP' };
  if (r.includes('bd') || r.includes('business')) return { cls: 'bg-teal-100 text-teal-700', label: 'BD' };
  return { cls: 'bg-muted text-muted-foreground', label: role };
}

export default function MessageList() {
  const navigate = useNavigate();
  const { dp_id, dp_name, profile_photo, user_role } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');
  const isBD = (user_role ?? '').toLowerCase().includes('business') || (user_role ?? '').toLowerCase() === 'bd';

  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const loadThreadsBD = useCallback(async () => {
    try {
      // Fetch all messages, group by service_request
      const allMsgs = await fetchList(
        'DigiVault Message',
        ['name', 'service_request', 'client', 'message_text', 'sender_name', 'sender_role', 'sender_id', 'is_read', 'creation'],
        [],
        500,
        'creation desc'
      );
      if (!allMsgs || allMsgs.length === 0) { setThreads([]); setLoading(false); return; }

      // Group by service_request
      const grouped: Record<string, any[]> = {};
      allMsgs.forEach((m: any) => {
        const sr = m.service_request || 'unknown';
        if (!grouped[sr]) grouped[sr] = [];
        grouped[sr].push(m);
      });

      const summaries: ThreadSummary[] = [];
      // Resolve client names
      const clientCache: Record<string, string> = {};

      for (const [sr, msgs] of Object.entries(grouped)) {
        const latest = msgs[0]; // already sorted desc
        const clientId = latest.client || '';
        
        // Resolve client name
        if (clientId && !clientCache[clientId]) {
          try {
            const c = await fetchOne('DigiVault Client', clientId);
            clientCache[clientId] = c?.client_name || clientId;
          } catch { clientCache[clientId] = clientId; }
        }

        const unread = msgs.filter((m: any) => {
          const role = (m.sender_role ?? '').toLowerCase();
          return !role.includes('business') && !role.includes('bd') && m.is_read === 0;
        }).length;

        const hasClient = msgs.some((m: any) => {
          const r = (m.sender_role ?? '').toLowerCase();
          return r.includes('client') || r.includes('customer');
        });
        const hasDP = msgs.some((m: any) => {
          const r = (m.sender_role ?? '').toLowerCase();
          return r.includes('delivery') || r.includes('dp');
        });

        summaries.push({
          threadId: sr,
          title: sr,
          subtitle: clientCache[clientId] || clientId,
          lastMessage: latest.message_text || (latest.attachment ? '📎 Attachment' : 'No messages'),
          lastSenderRole: latest.sender_role || '',
          lastTime: latest.creation || '',
          unreadCount: unread,
          hasClientMessages: hasClient,
          hasDPMessages: hasDP,
        });
      }

      // Sort by latest message time desc (already sorted by first msg)
      setThreads(summaries);
    } catch {}
    setLoading(false);
  }, []);

  const loadThreadsDP = useCallback(async () => {
    if (!dp_id) return;
    try {
      const tasks = await fetchList(
        'DigiVault Task',
        ['name', 'task_name', 'client', 'service', 'task_status', 'assigned_to'],
        [['assigned_to', '=', dp_id]],
        50,
        'creation desc'
      );
      if (!tasks || tasks.length === 0) { setThreads([]); setLoading(false); return; }

      const summaries: ThreadSummary[] = [];
      for (const t of tasks) {
        const srName = t.service || '';
        if (!srName) continue;

        try {
          const msgs = await fetchList(
            'DigiVault Message',
            ['name', 'message_text', 'sender_name', 'sender_role', 'sender_id', 'creation'],
            [['service_request', '=', srName]],
            1,
            'creation desc'
          );
          const lastMsg = msgs?.[0];
          let unread = 0;
          if (lastMsg && lastMsg.sender_id !== dp_id) {
            const allRecent = await fetchList(
              'DigiVault Message',
              ['name', 'sender_id'],
              [['service_request', '=', srName], ['sender_id', '!=', dp_id]],
              10,
              'creation desc'
            );
            unread = allRecent?.length ?? 0;
          }

          let clientName = t.client || '';
          if (clientName) {
            try {
              const c = await fetchOne('DigiVault Client', clientName);
              clientName = c?.client_name || clientName;
            } catch {}
          }

          summaries.push({
            threadId: t.name,
            title: t.task_name || t.name,
            subtitle: clientName,
            lastMessage: lastMsg?.message_text || 'No messages yet',
            lastSenderRole: lastMsg?.sender_role || '',
            lastTime: lastMsg?.creation || '',
            unreadCount: unread,
            hasClientMessages: false,
            hasDPMessages: false,
          });
        } catch {}
      }
      setThreads(summaries);
    } catch {}
    setLoading(false);
  }, [dp_id]);

  const loadThreads = isBD ? loadThreadsBD : loadThreadsDP;

  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => {
    const interval = setInterval(loadThreads, 10000);
    return () => clearInterval(interval);
  }, [loadThreads]);

  // Filter threads by tab (BD only)
  const filteredThreads = isBD
    ? threads.filter((t) => {
        if (activeTab === 'clients') return t.hasClientMessages;
        if (activeTab === 'dps') return t.hasDPMessages;
        return true;
      })
    : threads;

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  return (
    <div className="min-h-svh bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-[20px] font-bold text-foreground">Messages</h1>
          {totalUnread > 0 && (
            <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
              {totalUnread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="w-9 h-9 rounded-full border border-border overflow-hidden flex items-center justify-center bg-muted">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-muted-foreground" />}
          </div>
        </div>
      </header>

      {/* BD Tabs */}
      {isBD && (
        <div className="flex border-b border-border px-4">
          {(['all', 'clients', 'dps'] as TabFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-[14px] font-medium text-center border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground'
              }`}
            >
              {tab === 'all' ? 'All' : tab === 'clients' ? 'Clients' : 'DPs'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-7 h-7 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <MessageSquare className="w-12 h-12" />
          <p className="text-[14px] font-medium">No message threads</p>
          <p className="text-[12px]">Messages will appear here when conversations start</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filteredThreads.map((t) => {
            const badge = roleBadgeSmall(t.lastSenderRole);
            return (
              <button
                key={t.threadId}
                onClick={() => navigate(`/messages/${t.threadId}`)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-muted/50 transition-colors"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-semibold text-foreground truncate pr-2">{t.title}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0">{formatTime(t.lastTime)}</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground">{t.subtitle}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {t.lastSenderRole && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                    <p className="text-[13px] text-muted-foreground truncate">
                      {t.lastMessage.length > 50 ? t.lastMessage.substring(0, 50) + '…' : t.lastMessage}
                    </p>
                  </div>
                </div>
                {t.unreadCount > 0 && (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {t.unreadCount > 9 ? '9+' : t.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
