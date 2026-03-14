import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { fetchList, fetchOne, createRecord, updateRecord, getFileUrl } from '@/lib/api';
import { ArrowLeft, Send, Camera, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Message {
  name: string;
  message_text: string;
  sender_name: string;
  sender_role: string;
  sender_id: string;
  attachment: string;
  is_read: number;
  creation: string;
}

function roleBadgeClass(role: string) {
  const r = (role ?? '').toLowerCase();
  if (r.includes('delivery') || r.includes('dp')) return 'bg-orange-100 text-orange-700';
  if (r.includes('client') || r.includes('customer')) return 'bg-purple-100 text-purple-700';
  if (r.includes('bd') || r.includes('business')) return 'bg-teal-100 text-teal-700';
  if (r.includes('system')) return 'bg-muted text-muted-foreground';
  return 'bg-blue-100 text-blue-700';
}

function roleBadgeLabel(role: string) {
  const r = (role ?? '').toLowerCase();
  if (r.includes('delivery') || r.includes('dp')) return 'DP';
  if (r.includes('client') || r.includes('customer')) return 'Client';
  if (r.includes('bd') || r.includes('business')) return 'BD';
  return role;
}

function bubbleClass(role: string, isSelf: boolean) {
  if (isSelf) {
    // BD = teal, DP = coral
    const r = (role ?? '').toLowerCase();
    if (r.includes('bd') || r.includes('business')) return 'bg-[#E1F5EE] text-foreground ml-auto';
    return 'bg-[#FAECE7] text-foreground ml-auto';
  }
  const r = (role ?? '').toLowerCase();
  if (r.includes('client') || r.includes('customer')) return 'bg-[#EEEDFE] text-foreground mr-auto';
  if (r.includes('delivery') || r.includes('dp')) return 'bg-[#FAECE7] text-foreground mr-auto';
  if (r.includes('system')) return 'bg-muted text-muted-foreground mx-auto text-center';
  return 'bg-muted text-foreground mr-auto';
}

function formatTime(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateHeader(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - dt.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MessageThread() {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>(); // generic param — taskId for DP, serviceRequestId for BD
  const { dp_id, dp_name, user_role } = useDPAuth();
  const isBD = (user_role ?? '').toLowerCase().includes('business') || (user_role ?? '').toLowerCase() === 'bd';

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceRequest, setServiceRequest] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState('');
  const [headerTitle, setHeaderTitle] = useState('Messages');
  const [participantRoles, setParticipantRoles] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolve context based on role
  useEffect(() => {
    if (!taskId) return;

    if (isBD) {
      // taskId param IS the serviceRequestId for BD
      setServiceRequest(taskId);
      setHeaderTitle(taskId);
      // Fetch service request to get client
      fetchOne('DigiVault Service Request', taskId)
        .then((sr) => {
          if (sr?.client) {
            setClientId(sr.client);
            fetchOne('DigiVault Client', sr.client)
              .then((c) => { if (c?.client_name) setClientName(c.client_name); })
              .catch(() => {});
          }
        })
        .catch(() => {});
    } else {
      // DP: taskId is actual task ID
      fetchOne('DigiVault Task', taskId)
        .then((t) => {
          if (!t) return;
          const sr = t.service || '';
          setServiceRequest(sr);
          setHeaderTitle(t.task_name || t.name);
          setClientId(t.client || '');
          if (t.client) {
            fetchOne('DigiVault Client', t.client)
              .then((c) => { if (c?.client_name) setClientName(c.client_name); })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [taskId, isBD]);

  // Fetch messages
  const loadMessages = useCallback(async () => {
    if (!serviceRequest) return;
    try {
      const msgs = await fetchList(
        'DigiVault Message',
        ['name', 'message_text', 'sender_name', 'sender_role', 'sender_id', 'attachment', 'is_read', 'creation'],
        [['service_request', '=', serviceRequest]],
        100,
        'creation asc'
      );
      if (msgs) {
        setMessages(msgs);
        // Extract unique participant roles
        const roles = [...new Set(msgs.map((m: any) => m.sender_role).filter(Boolean))];
        setParticipantRoles(roles as string[]);
      }
    } catch {}
    setLoading(false);
  }, [serviceRequest]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => {
    if (!serviceRequest) return;
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [serviceRequest, loadMessages]);

  // Mark as read on open (BD marks non-BD messages, DP marks non-DP messages)
  useEffect(() => {
    if (!serviceRequest || !dp_id) return;
    const markRead = async () => {
      try {
        const myRole = isBD ? 'BD' : 'Delivery Partner';
        // Fetch unread messages from others
        const unreadMsgs = await fetchList(
          'DigiVault Message',
          ['name', 'sender_role', 'is_read'],
          [['service_request', '=', serviceRequest], ['is_read', '=', 0], ['sender_id', '!=', dp_id]],
          50
        );
        if (unreadMsgs && unreadMsgs.length > 0) {
          for (const m of unreadMsgs) {
            try {
              await updateRecord('DigiVault Message', m.name, { is_read: 1 });
            } catch {}
          }
        }
      } catch {}
    };
    const timeout = setTimeout(markRead, 1000); // Delay slightly
    return () => clearTimeout(timeout);
  }, [serviceRequest, dp_id, isBD]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !serviceRequest) return;
    setSending(true);
    try {
      await createRecord('DigiVault Message', {
        service_request: serviceRequest,
        client: clientId,
        sender_role: isBD ? 'BD' : 'Delivery Partner',
        sender_name: dp_name || (isBD ? 'BD' : 'DP'),
        sender_id: dp_id,
        message_text: trimmed,
      });
      setText('');
      await loadMessages();
    } catch {
      toast({ title: 'Failed to send', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !serviceRequest) return;
    setSending(true);
    try {
      const reader = new FileReader();
      const base64: string = await new Promise((resolve) => {
        reader.onload = (ev) => resolve((ev.target?.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const BASE_URL = 'https://xorgsduvbpaokegawhbd.supabase.co/functions/v1/erpnext-proxy';
      const uploadRes = await fetch(BASE_URL + '?path=' + encodeURIComponent('/api/method/upload_file'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, filedata: base64, is_private: 0 }),
      });
      const uploadData = await uploadRes.json();
      const fileUrl = uploadData?.message?.file_url ?? '';

      await createRecord('DigiVault Message', {
        service_request: serviceRequest,
        client: clientId,
        sender_role: isBD ? 'BD' : 'Delivery Partner',
        sender_name: dp_name || (isBD ? 'BD' : 'DP'),
        sender_id: dp_id,
        message_text: '',
        attachment: fileUrl,
      });
      await loadMessages();
    } catch {
      toast({ title: 'Failed to send attachment', variant: 'destructive' });
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  messages.forEach((m) => {
    const dateKey = m.creation?.substring(0, 10) ?? '';
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === dateKey) {
      last.msgs.push(m);
    } else {
      groupedMessages.push({ date: dateKey, msgs: [m] });
    }
  });

  const participantBadge = (role: string) => {
    const r = (role ?? '').toLowerCase();
    if (r.includes('client') || r.includes('customer')) return { cls: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Client' };
    if (r.includes('delivery') || r.includes('dp')) return { cls: 'bg-orange-100 text-orange-700 border-orange-200', label: 'DP' };
    if (r.includes('bd') || r.includes('business')) return { cls: 'bg-teal-100 text-teal-700 border-teal-200', label: 'BD' };
    return { cls: 'bg-muted text-muted-foreground border-border', label: role };
  };

  return (
    <div className="min-h-svh bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/messages')}>
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold text-foreground truncate">
              {clientName || headerTitle}
            </h1>
            <p className="text-[12px] text-muted-foreground truncate">
              {serviceRequest}
            </p>
          </div>
        </div>

        {/* Participant badges (BD view) */}
        {isBD && participantRoles.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {participantRoles.map((role) => {
              const badge = participantBadge(role);
              return (
                <span key={role} className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${badge.cls}`}>
                  {badge.label}
                </span>
              );
            })}
          </div>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" style={{ paddingBottom: '80px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-7 h-7 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <p className="text-[14px]">No messages yet</p>
            <p className="text-[12px]">Start the conversation</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex justify-center my-3">
                <span className="bg-muted text-muted-foreground text-[11px] px-3 py-1 rounded-full">
                  {formatDateHeader(group.date)}
                </span>
              </div>

              {group.msgs.map((m) => {
                const isSystem = (m.sender_role ?? '').toLowerCase().includes('system');
                const isSelf = m.sender_id === dp_id;

                if (isSystem) {
                  return (
                    <div key={m.name} className="flex justify-center my-2">
                      <span className="bg-muted text-muted-foreground text-[11px] px-3 py-1 rounded-lg max-w-[80%] text-center">
                        {m.message_text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={m.name} className={`flex ${isSelf ? 'justify-end' : 'justify-start'} mb-2`}>
                    <div className={`rounded-2xl px-3.5 py-2.5 max-w-[78%] ${bubbleClass(m.sender_role, isSelf)}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] font-semibold">{m.sender_name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${roleBadgeClass(m.sender_role)}`}>
                          {roleBadgeLabel(m.sender_role)}
                        </span>
                      </div>

                      {m.attachment && (
                        <button onClick={() => setFullscreenImg(getFileUrl(m.attachment))} className="mb-1.5 block">
                          <img src={getFileUrl(m.attachment)} alt="Attachment" className="rounded-lg max-h-40 object-cover border border-border" />
                        </button>
                      )}

                      {m.message_text && (
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.message_text}</p>
                      )}

                      <p className="text-[10px] text-muted-foreground mt-1 text-right">{formatTime(m.creation)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-3 py-2.5 z-30 flex items-center gap-2">
        <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Camera className="w-5 h-5 text-muted-foreground" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAttachment} />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Type a message…"
          className="flex-1 bg-muted rounded-full px-4 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Fullscreen image viewer */}
      {fullscreenImg && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setFullscreenImg('')}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setFullscreenImg('')}>
            <X className="w-7 h-7" />
          </button>
          <img src={fullscreenImg} alt="Full" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
