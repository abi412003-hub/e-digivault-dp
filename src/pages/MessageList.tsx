import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { fetchList, fetchOne } from '@/lib/api';
import { ArrowLeft, MessageSquare, Bell, User } from 'lucide-react';
import { getFileUrl } from '@/lib/api';
import BottomNav from '@/components/BottomNav';

interface ThreadSummary {
  taskId: string;
  taskName: string;
  clientName: string;
  serviceRequest: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
}

function formatTime(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  const now = new Date();
  const diff = now.getTime() - dt.getTime();
  if (diff < 86400000) {
    return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  if (diff < 604800000) {
    return dt.toLocaleDateString('en-IN', { weekday: 'short' });
  }
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function MessageList() {
  const navigate = useNavigate();
  const { dp_id, dp_name, profile_photo } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadThreads = useCallback(async () => {
    if (!dp_id) return;
    try {
      // Get DP's assigned tasks
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
        // Resolve service_request
        let srName = t.service || '';
        if (!srName) continue;

        // Fetch messages for this service request
        try {
          const msgs = await fetchList(
            'DigiVault Message',
            ['name', 'message_text', 'sender_name', 'sender_role', 'sender_id', 'creation'],
            [['service_request', '=', srName]],
            1,
            'creation desc'
          );

          const lastMsg = msgs?.[0];
          // Count unread (messages not from DP, after some threshold — simplified)
          let unread = 0;
          if (lastMsg && lastMsg.sender_id !== dp_id) {
            // Simple unread: count messages from others in last 24h
            const allRecent = await fetchList(
              'DigiVault Message',
              ['name', 'sender_id', 'creation'],
              [['service_request', '=', srName], ['sender_id', '!=', dp_id]],
              10,
              'creation desc'
            );
            unread = allRecent?.length ?? 0;
          }

          if (lastMsg || true) {
            // Get client name
            let clientName = t.client || '';
            if (clientName) {
              try {
                const c = await fetchOne('DigiVault Client', clientName);
                clientName = c?.client_name || clientName;
              } catch {}
            }

            summaries.push({
              taskId: t.name,
              taskName: t.task_name || t.name,
              clientName,
              serviceRequest: srName,
              lastMessage: lastMsg?.message_text || 'No messages yet',
              lastTime: lastMsg?.creation || '',
              unreadCount: unread,
            });
          }
        } catch {}
      }

      setThreads(summaries);
    } catch {}
    setLoading(false);
  }, [dp_id]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  // Poll every 10s
  useEffect(() => {
    const interval = setInterval(loadThreads, 10000);
    return () => clearInterval(interval);
  }, [loadThreads]);

  return (
    <div className="min-h-svh bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-[20px] font-bold text-foreground">Messages</h1>
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

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-7 h-7 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <MessageSquare className="w-12 h-12" />
          <p className="text-[14px] font-medium">No message threads</p>
          <p className="text-[12px]">Messages will appear here when tasks have conversations</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {threads.map((t) => (
            <button
              key={t.taskId}
              onClick={() => navigate(`/messages/${t.taskId}`)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-muted/50 transition-colors"
            >
              {/* Avatar circle */}
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-semibold text-foreground truncate pr-2">{t.taskName}</p>
                  <span className="text-[11px] text-muted-foreground shrink-0">{formatTime(t.lastTime)}</span>
                </div>
                <p className="text-[12px] text-muted-foreground">{t.clientName}</p>
                <p className="text-[13px] text-muted-foreground truncate mt-0.5">{t.lastMessage}</p>
              </div>

              {/* Unread badge */}
              {t.unreadCount > 0 && (
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {t.unreadCount > 9 ? '9+' : t.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
