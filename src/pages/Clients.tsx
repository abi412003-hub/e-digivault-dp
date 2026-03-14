import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { fetchList, getFileUrl } from '@/lib/api';
import { ArrowLeft, MessageSquare, Home, User, Search } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

function ClientCard({ client, onClick }: { client: any; onClick: () => void }) {
  const photoUrl = getFileUrl(client.client_photo ?? '');
  const status = client.client_status ?? 'Active';
  const isActive = status.toLowerCase() === 'active';

  return (
    <div onClick={onClick} className="bg-background rounded-xl border border-border p-4 flex items-center gap-4 cursor-pointer active:bg-muted/30 transition-colors">
      {/* Photo */}
      <div className="w-20 h-20 rounded-full border-2 border-muted overflow-hidden shrink-0 flex items-center justify-center bg-muted">
        {photoUrl ? (
          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <User className="w-8 h-8 text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-[14px]">
          <span className="text-muted-foreground">Client ID : </span>
          <span className="font-bold text-foreground">{client.name}</span>
        </p>
        <p className="text-[13px]">
          <span className="text-muted-foreground">In-Charge : </span>
          <span className="text-foreground">—</span>
        </p>
        <p className="text-[13px]">
          <span className="text-muted-foreground">Progress: </span>
          <span className="text-[#22C55E] font-bold">70%</span>
        </p>
        <p className="text-[13px] flex items-center gap-1.5">
          <span className="text-muted-foreground">Status:</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              isActive
                ? 'border-green-500 text-green-500'
                : 'border-orange-500 text-orange-500'
            }`}
          >
            {status}
          </span>
        </p>
      </div>
    </div>
  );
}

export default function Clients() {
  const navigate = useNavigate();
  const { profile_photo } = useDPAuth();
  const photoUrl = getFileUrl(profile_photo ?? '');

  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchList(
      'DigiVault Client',
      ['name', 'client_name', 'client_photo', 'client_status', 'client_type'],
      [],
      50,
      'creation desc'
    )
      .then((data: any[]) => {
        if (data) setClients(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? clients.filter(
        (c) =>
          (c.client_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (c.name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  return (
    <div className="min-h-svh bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-[18px] font-bold text-foreground">Clients</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 border border-border rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="w-9 h-9 border border-border rounded-lg flex items-center justify-center">
            <Home className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="w-9 h-9 rounded-full border border-border overflow-hidden flex items-center justify-center bg-muted">
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="mx-4 mt-3">
        <div className="flex items-center gap-2 bg-muted rounded-full h-11 px-4">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search here"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Client list */}
      <div className="mx-4 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <User className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">No clients found</p>
          </div>
        ) : (
          filtered.map((c) => (
            <ClientCard
              key={c.name}
              client={c}
              onClick={() => navigate(`/client-detail?id=${c.name}`)}
            />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
