import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { fetchList, getFileUrl } from '@/lib/api';
import {
  ArrowLeft,
  MessageSquare,
  Bell,
  User,
  Search,
  Building2,
  MapPin,
  Camera,
  Info,
  Wrench,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

function PropertyCard({
  property,
  clientId,
  navigate,
}: {
  property: any;
  clientId: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const actions = [
    {
      icon: MapPin,
      label: 'Locate',
      onClick: () => {
        const lat = property.latitude;
        const lng = property.longitude;
        if (lat && lng) {
          window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
        }
      },
    },
    {
      icon: Camera,
      label: 'Photos',
      onClick: () => navigate(`/property-photos?id=${property.name}`),
    },
    {
      icon: Info,
      label: 'Details',
      onClick: () => navigate(`/property-details?id=${property.name}`),
    },
    {
      icon: Wrench,
      label: 'Task',
      onClick: () => navigate(`/task-details?property=${property.name}&client=${clientId}`),
    },
  ];

  return (
    <div className="bg-background rounded-2xl border border-muted shadow-sm overflow-hidden">
      {/* Top section */}
      <div className="bg-[#f0f4ff] px-4 py-5 flex flex-col items-center gap-1">
        <span className="text-[48px] leading-none">🏢</span>
        <h3 className="text-[18px] font-bold text-foreground mt-1">
          {property.property_name || property.name}
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Project ID - {property.project_id || property.name}
        </p>
      </div>

      {/* Action row */}
      <div className="grid grid-cols-4 border-t border-muted">
        {actions.map((action, i) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`flex flex-col items-center justify-center gap-1 py-3 ${
              i < 3 ? 'border-r border-muted' : ''
            } active:bg-muted/30 transition-colors`}
          >
            <action.icon className="w-[22px] h-[22px] text-[#3B82F6]" />
            <span className="text-[12px] text-[#3B82F6]">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-background rounded-2xl border border-muted shadow-sm overflow-hidden animate-pulse">
      <div className="bg-[#f0f4ff] px-4 py-5 flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-muted" />
        <div className="h-5 w-32 bg-muted rounded" />
        <div className="h-3 w-24 bg-muted rounded" />
      </div>
      <div className="h-14 border-t border-muted" />
    </div>
  );
}

export default function Properties() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const clientId = params.get('client') ?? '';
  const { profile_photo } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');

  const [properties, setProperties] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    fetchList(
      'DigiVault Property',
      ['name', 'property_name', 'project_id', 'latitude', 'longitude', 'property_photo'],
      [['client', '=', clientId]],
      50,
      'creation desc'
    )
      .then((d: any[]) => d && setProperties(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  const filtered = search.trim()
    ? properties.filter(
        (p) =>
          (p.property_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (p.name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : properties;

  return (
    <div className="min-h-svh bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/client-detail?id=${clientId}`)}>
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-[20px] font-bold text-foreground">Properties</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="w-9 h-9 rounded-full border border-border overflow-hidden flex items-center justify-center bg-muted">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </header>

      <div className="px-4">
        {/* Search */}
        <div className="mt-3 flex items-center gap-3 bg-background border border-border rounded-xl shadow-sm px-4 py-3">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search here"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>

        {/* Property count */}
        <div className="flex items-center gap-2 mt-4 mb-3">
          <Building2 className="w-5 h-5 text-[#3B82F6]" />
          <span className="text-[18px] font-bold text-foreground">
            {filtered.length} Properties
          </span>
        </div>

        {/* Property cards */}
        <div className="space-y-3">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Building2 className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No properties found for this client</p>
            </div>
          ) : (
            filtered.map((p) => (
              <PropertyCard key={p.name} property={p} clientId={clientId} navigate={navigate} />
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
