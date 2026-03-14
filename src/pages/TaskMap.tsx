import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { fetchList, fetchOne } from '@/lib/api';
import { ArrowLeft, MessageSquare, Bell, User, Map, List, Navigation, Play, MapPin, Clock } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TaskPin {
  taskName: string;
  taskId: string;
  taskStatus: string;
  propertyName: string;
  address: string;
  lat: number;
  lng: number;
  creation: string;
}

const BENGALURU: [number, number] = [12.9716, 77.5946];

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function totalRoute(pins: TaskPin[]) {
  let d = 0;
  for (let i = 1; i < pins.length; i++) d += haversine(pins[i - 1].lat, pins[i - 1].lng, pins[i].lat, pins[i].lng);
  return d;
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? '';
  let cls = 'bg-muted text-muted-foreground';
  if (s.includes('completed') || s === 'verified') cls = 'bg-green-100 text-green-700';
  else if (s.includes('on going') || s.includes('ongoing')) cls = 'bg-blue-100 text-blue-700';
  else if (s.includes('not started') || s.includes('pending')) cls = 'bg-orange-100 text-orange-700';
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>{status}</span>;
}

function pinColor(status: string) {
  const s = status?.toLowerCase() ?? '';
  if (s.includes('completed')) return '#22c55e';
  if (s.includes('on going') || s.includes('ongoing')) return '#3b82f6';
  return '#ef4444'; // Not Started
}

function makeIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

export default function TaskMap() {
  const navigate = useNavigate();
  const { dp_id, profile_photo } = useDPAuth();
  const [view, setView] = useState<'map' | 'list'>('map');
  const [pins, setPins] = useState<TaskPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // GPS
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLoc([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true }
    );
  }, []);

  // Fetch tasks → resolve property coords
  useEffect(() => {
    if (!dp_id) return;
    (async () => {
      setLoading(true);
      try {
        const tasks = await fetchList(
          'DigiVault Task',
          ['name', 'task_name', 'client', 'project', 'service', 'task_status', 'assigned_to', 'creation'],
          [['assigned_to', '=', dp_id], ['task_status', 'in', ['Not Started', 'On Going']]],
          100,
          'creation asc'
        );
        if (!tasks || tasks.length === 0) { setPins([]); setLoading(false); return; }

        const resolved: TaskPin[] = [];
        const propertyCache: Record<string, any> = {};

        for (const t of tasks) {
          try {
            let propertyName = '';
            // Try to get property from project or service request
            if (t.project) {
              // project links to service request which links to property
              try {
                const sr = await fetchOne('DigiVault Service Request', t.project);
                if (sr?.property) {
                  propertyName = sr.property;
                }
              } catch {}
            }
            if (!propertyName && t.service) {
              try {
                const sr = await fetchOne('DigiVault Service Request', t.service);
                if (sr?.property) {
                  propertyName = sr.property;
                }
              } catch {}
            }
            if (!propertyName) continue;

            let prop = propertyCache[propertyName];
            if (!prop) {
              prop = await fetchOne('DigiVault Property', propertyName);
              if (prop) propertyCache[propertyName] = prop;
            }
            if (!prop?.property_latitude || !prop?.property_longitude) continue;

            resolved.push({
              taskName: t.task_name || t.name,
              taskId: t.name,
              taskStatus: t.task_status,
              propertyName: prop.property_name || propertyName,
              address: prop.property_address || prop.property_district || '',
              lat: parseFloat(prop.property_latitude),
              lng: parseFloat(prop.property_longitude),
              creation: t.creation,
            });
          } catch {}
        }
        setPins(resolved);
      } catch {
        setPins([]);
      }
      setLoading(false);
    })();
  }, [dp_id]);

  // Leaflet map
  useEffect(() => {
    if (view !== 'map' || !mapRef.current) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }

    const center = userLoc || BENGALURU;
    const map = L.map(mapRef.current, { zoomControl: false }).setView(center, 12);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    // User location
    if (userLoc) {
      L.circleMarker(userLoc, { radius: 8, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }).addTo(map).bindPopup('You are here');
    }

    // Task pins
    const nonCompleted = pins.filter((p) => !p.taskStatus.toLowerCase().includes('completed'));
    nonCompleted.forEach((p) => {
      const marker = L.marker([p.lat, p.lng], { icon: makeIcon(pinColor(p.taskStatus)) }).addTo(map);
      marker.bindPopup(`
        <div style="min-width:180px">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${p.taskName}</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:2px">${p.propertyName}</div>
          <div style="font-size:11px;color:#9ca3af;margin-bottom:8px">${p.address}</div>
          <div style="display:flex;gap:6px">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" style="background:#3b82f6;color:white;padding:4px 10px;border-radius:6px;font-size:12px;text-decoration:none">Navigate</a>
          </div>
        </div>
      `);
    });

    // Route polyline
    if (nonCompleted.length > 1) {
      const coords: [number, number][] = nonCompleted.map((p) => [p.lat, p.lng]);
      L.polyline(coords, { color: '#3b82f6', weight: 3, dashArray: '8 6', opacity: 0.7 }).addTo(map);
    }

    // Fit bounds
    if (nonCompleted.length > 0) {
      const bounds = L.latLngBounds(nonCompleted.map((p) => [p.lat, p.lng] as [number, number]));
      if (userLoc) bounds.extend(userLoc);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [view, pins, userLoc]);

  const nonCompleted = pins.filter((p) => !p.taskStatus.toLowerCase().includes('completed'));
  const routeDistance = totalRoute(nonCompleted);

  const openGoogleRoute = () => {
    if (nonCompleted.length === 0) return;
    const origin = userLoc ? `${userLoc[0]},${userLoc[1]}` : `${nonCompleted[0].lat},${nonCompleted[0].lng}`;
    const dest = nonCompleted[nonCompleted.length - 1];
    const waypoints = nonCompleted.slice(0, -1).map((p) => `${p.lat},${p.lng}`).join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest.lat},${dest.lng}${waypoints ? `&waypoints=${waypoints}` : ''}`;
    window.open(url, '_blank');
  };

  // Sort list by distance from user
  const sortedByDistance = [...nonCompleted].sort((a, b) => {
    if (!userLoc) return 0;
    return haversine(userLoc[0], userLoc[1], a.lat, a.lng) - haversine(userLoc[0], userLoc[1], b.lat, b.lng);
  });

  return (
    <div className="min-h-svh bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="w-9 h-9 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-[20px] font-bold text-foreground">Today's Tasks</h1>
          {!loading && (
            <span className="bg-primary text-primary-foreground text-[11px] font-bold rounded-full px-2 py-0.5">
              {nonCompleted.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle */}
          <button
            onClick={() => setView(view === 'map' ? 'list' : 'map')}
            className="w-9 h-9 border border-border rounded-lg flex items-center justify-center"
          >
            {view === 'map' ? <List className="w-5 h-5 text-muted-foreground" /> : <Map className="w-5 h-5 text-muted-foreground" />}
          </button>
          <button className="w-9 h-9 border border-border rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="w-9 h-9 border border-border rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="w-9 h-9 rounded-full border border-border overflow-hidden flex items-center justify-center bg-muted">
            {profile_photo ? (
              <img src={profile_photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : nonCompleted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <MapPin className="w-12 h-12" />
            <p className="text-[14px] font-medium">No tasks assigned today</p>
          </div>
        ) : view === 'map' ? (
          <>
            <div ref={mapRef} className="w-full" style={{ height: 'calc(100svh - 56px - 64px - 56px)' }} />
            {/* Start Route button */}
            <button
              onClick={openGoogleRoute}
              className="absolute bottom-4 left-4 right-4 bg-primary text-primary-foreground font-bold text-[14px] rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg z-[1000]"
            >
              <Navigation className="w-4 h-4" />
              Start Route ({nonCompleted.length} stops)
            </button>
          </>
        ) : (
          <div className="px-4 py-3 space-y-2 pb-20 overflow-y-auto" style={{ maxHeight: 'calc(100svh - 56px - 64px - 56px)' }}>
            {sortedByDistance.map((p) => (
              <div
                key={p.taskId}
                onClick={() => navigate(`/task-details?task=${p.taskId}`)}
                className="bg-background border border-border rounded-xl p-3.5 flex items-start gap-3 active:bg-muted/50 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: pinColor(p.taskStatus) + '20' }}
                >
                  <MapPin className="w-5 h-5" style={{ color: pinColor(p.taskStatus) }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-foreground truncate">{p.taskName}</p>
                  <p className="text-[12px] text-muted-foreground truncate mt-0.5">{p.address || p.propertyName}</p>
                  {userLoc && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      ~{haversine(userLoc[0], userLoc[1], p.lat, p.lng).toFixed(1)} km away
                    </p>
                  )}
                </div>
                <StatusBadge status={p.taskStatus} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom stats */}
      {!loading && nonCompleted.length > 0 && (
        <div className="bg-background border-t border-border px-4 py-2.5 flex items-center justify-between z-20">
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-medium">{nonCompleted.length} tasks remaining</span>
          </div>
          <div className="text-[12px] text-muted-foreground font-medium">
            Total: ~{routeDistance.toFixed(1)} km
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
