import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { fetchList, createRecord, getFileUrl } from '@/lib/api';
import { ArrowLeft, Camera, RotateCcw, RotateCw, Crop, RefreshCw, Check, X, ScanLine, ChevronDown, Paperclip } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const BASE_URL = 'https://xorgsduvbpaokegawhbd.supabase.co/functions/v1/erpnext-proxy';

const DOC_TYPES = [
  'Sale Deed',
  'Encumbrance Certificate',
  'Khata',
  'NOC',
  'Authority Letter',
  'Property Tax Receipt',
  'Other',
];

interface TaskOption {
  name: string;
  task_name: string;
  client: string;
  project: string;
}

/* ── Crop overlay ── */
function CropOverlay({
  imgWidth,
  imgHeight,
  crop,
  onCropChange,
}: {
  imgWidth: number;
  imgHeight: number;
  crop: { x: number; y: number; w: number; h: number };
  onCropChange: (c: { x: number; y: number; w: number; h: number }) => void;
}) {
  const dragRef = useRef<{ corner: string; startX: number; startY: number; startCrop: typeof crop } | null>(null);

  const handlePointerDown = (corner: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = { corner, startX: e.clientX, startY: e.clientY, startCrop: { ...crop } };
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const sc = dragRef.current.startCrop;
      const next = { ...sc };

      if (corner === 'tl') { next.x = Math.max(0, sc.x + dx); next.y = Math.max(0, sc.y + dy); next.w = sc.w - dx; next.h = sc.h - dy; }
      else if (corner === 'tr') { next.w = sc.w + dx; next.y = Math.max(0, sc.y + dy); next.h = sc.h - dy; }
      else if (corner === 'bl') { next.x = Math.max(0, sc.x + dx); next.w = sc.w - dx; next.h = sc.h + dy; }
      else if (corner === 'br') { next.w = sc.w + dx; next.h = sc.h + dy; }
      else if (corner === 'move') { next.x = Math.max(0, Math.min(imgWidth - sc.w, sc.x + dx)); next.y = Math.max(0, Math.min(imgHeight - sc.h, sc.y + dy)); }

      next.w = Math.max(40, Math.min(imgWidth - next.x, next.w));
      next.h = Math.max(40, Math.min(imgHeight - next.y, next.h));
      onCropChange(next);
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const cornerSize = 20;
  const cornerStyle = 'absolute w-5 h-5 border-2 border-primary z-10 touch-none';

  return (
    <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
      {/* Dimmed areas */}
      <div className="absolute inset-0 bg-black/40" style={{ clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${crop.x}px ${crop.y}px, ${crop.x}px ${crop.y + crop.h}px, ${crop.x + crop.w}px ${crop.y + crop.h}px, ${crop.x + crop.w}px ${crop.y}px, ${crop.x}px ${crop.y}px)` }} />
      {/* Crop border */}
      <div
        className="absolute border-2 border-primary touch-none"
        style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h, pointerEvents: 'auto', cursor: 'move' }}
        onPointerDown={handlePointerDown('move')}
      />
      {/* Corners */}
      <div className={cornerStyle + ' border-t-0 border-r-0 rounded-br-sm'} style={{ left: crop.x - 2, top: crop.y - 2, pointerEvents: 'auto', cursor: 'nw-resize' }} onPointerDown={handlePointerDown('tl')} />
      <div className={cornerStyle + ' border-t-0 border-l-0 rounded-bl-sm'} style={{ left: crop.x + crop.w - cornerSize + 2, top: crop.y - 2, pointerEvents: 'auto', cursor: 'ne-resize' }} onPointerDown={handlePointerDown('tr')} />
      <div className={cornerStyle + ' border-b-0 border-r-0 rounded-tr-sm'} style={{ left: crop.x - 2, top: crop.y + crop.h - cornerSize + 2, pointerEvents: 'auto', cursor: 'sw-resize' }} onPointerDown={handlePointerDown('bl')} />
      <div className={cornerStyle + ' border-b-0 border-l-0 rounded-tl-sm'} style={{ left: crop.x + crop.w - cornerSize + 2, top: crop.y + crop.h - cornerSize + 2, pointerEvents: 'auto', cursor: 'se-resize' }} onPointerDown={handlePointerDown('br')} />
    </div>
  );
}

export default function ScanDocument() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectedTask = params.get('task') ?? '';
  const { dp_id } = useDPAuth();

  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [phase, setPhase] = useState<'capture' | 'preview' | 'success'>('capture');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [cropping, setCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 20, y: 20, w: 200, h: 260 });
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [recentScans, setRecentScans] = useState<any[]>([]);

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch tasks
  useEffect(() => {
    if (!dp_id) return;
    fetchList('DigiVault Task', ['name', 'task_name', 'client', 'project', 'task_status', 'assigned_to'], [['assigned_to', '=', dp_id], ['task_status', 'in', ['Not Started', 'On Going']]], 50, 'creation desc')
      .then((t: any[]) => {
        if (!t) return;
        setTasks(t.map((x: any) => ({ name: x.name, task_name: x.task_name || x.name, client: x.client || '', project: x.project || '' })));
        if (preselectedTask) setSelectedTask(preselectedTask);
        else if (t.length > 0) setSelectedTask(t[0].name);
      })
      .catch(() => {});
  }, [dp_id, preselectedTask]);

  // Fetch recent scans
  const loadRecent = useCallback(() => {
    fetchList('DigiVault Client Document', ['name', 'document_title', 'document_file', 'creation', 'document_status'], [], 5, 'creation desc')
      .then((docs: any[]) => { if (docs) setRecentScans(docs); })
      .catch(() => {});
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const currentTask = tasks.find((t) => t.name === selectedTask);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageSrc(ev.target?.result as string);
      setRotation(0);
      setCropping(false);
      setPhase('preview');
    };
    reader.readAsDataURL(file);
  };

  const onImgLoad = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current.getBoundingClientRect();
      setImgDims({ w: width, h: height });
      setCrop({ x: 10, y: 10, w: width - 20, h: height - 20 });
    }
  };

  const getProcessedImage = (): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current!;
      const img = new Image();
      img.onload = () => {
        const rad = (rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(rad));
        const cos = Math.abs(Math.cos(rad));

        // If cropping, use crop area relative to displayed image
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (cropping && imgDims.w > 0) {
          const scaleX = img.width / imgDims.w;
          const scaleY = img.height / imgDims.h;
          sx = crop.x * scaleX;
          sy = crop.y * scaleY;
          sw = crop.w * scaleX;
          sh = crop.h * scaleY;
        }

        const cw = sw * cos + sh * sin;
        const ch = sw * sin + sh * cos;
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d')!;
        ctx.translate(cw / 2, ch / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = imageSrc!;
    });
  };

  const handleUpload = async () => {
    if (!selectedTask || !imageSrc) { toast({ title: 'Select a task first' }); return; }
    setUploading(true);
    try {
      const dataUrl = await getProcessedImage();
      const base64 = dataUrl.split(',')[1];
      const filename = `${docType.replace(/\s+/g, '_')}_${selectedTask}_${Date.now()}.jpg`;

      // 1. Upload file
      const uploadRes = await fetch(BASE_URL + '?path=' + encodeURIComponent('/api/method/upload_file'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, filedata: base64, is_private: 0 }),
      });
      const uploadData = await uploadRes.json();
      const fileUrl = uploadData?.message?.file_url ?? '';

      // 2. Create Client Document
      await createRecord('DigiVault Client Document', {
        document_title: docType,
        client: currentTask?.client ?? '',
        project: currentTask?.project ?? '',
        document_status: 'Uploaded',
        document_file: fileUrl,
      });

      setUploadedUrl(fileUrl);
      setPhase('success');
      loadRecent();
      toast({ title: 'Document uploaded successfully' });
    } catch (err) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const resetScanner = () => {
    setImageSrc(null);
    setRotation(0);
    setCropping(false);
    setPhase('capture');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-svh bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background border-b border-border h-14 flex items-center gap-3 px-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <ScanLine className="w-5 h-5 text-primary" />
        <h1 className="text-[20px] font-bold text-foreground">Scan Document</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 pb-6">
        {/* Context selectors */}
        <div className="space-y-2.5">
          <div>
            <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Task</label>
            <div className="relative">
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-[14px] text-foreground appearance-none pr-8"
              >
                <option value="">Select task…</option>
                {tasks.map((t) => (
                  <option key={t.name} value={t.name}>{t.task_name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Document Type</label>
            <div className="relative">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-[14px] text-foreground appearance-none pr-8"
              >
                {DOC_TYPES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {currentTask && (
            <div className="flex gap-3 text-[12px] text-muted-foreground">
              <span>Client: <b className="text-foreground">{currentTask.client || '—'}</b></span>
              <span>Project: <b className="text-foreground">{currentTask.project || '—'}</b></span>
            </div>
          )}
        </div>

        {/* Canvas (hidden) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* CAPTURE PHASE */}
        {phase === 'capture' && (
          <div className="space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-primary/40 rounded-2xl flex flex-col items-center justify-center gap-3 py-16 bg-primary/5 cursor-pointer active:bg-primary/10 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <p className="text-[14px] font-medium text-foreground">Tap to capture document</p>
              <p className="text-[12px] text-muted-foreground">Use your camera or select from gallery</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCapture}
            />
          </div>
        )}

        {/* PREVIEW PHASE */}
        {phase === 'preview' && imageSrc && (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/30">
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Captured"
                className="w-full object-contain max-h-[50vh]"
                style={{ transform: `rotate(${rotation}deg)` }}
                onLoad={onImgLoad}
              />
              {cropping && imgDims.w > 0 && (
                <CropOverlay imgWidth={imgDims.w} imgHeight={imgDims.h} crop={crop} onCropChange={setCrop} />
              )}
            </div>

            {/* Edit tools */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setRotation((r) => r - 90)}
                className="w-11 h-11 rounded-xl border border-border flex items-center justify-center active:bg-muted"
              >
                <RotateCcw className="w-5 h-5 text-foreground" />
              </button>
              <button
                onClick={() => setRotation((r) => r + 90)}
                className="w-11 h-11 rounded-xl border border-border flex items-center justify-center active:bg-muted"
              >
                <RotateCw className="w-5 h-5 text-foreground" />
              </button>
              <button
                onClick={() => setCropping(!cropping)}
                className={`w-11 h-11 rounded-xl border flex items-center justify-center active:bg-muted ${cropping ? 'border-primary bg-primary/10' : 'border-border'}`}
              >
                <Crop className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={resetScanner}
                className="flex-1 border border-border text-foreground rounded-xl h-12 text-[14px] font-medium flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" /> Retake
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 bg-primary text-primary-foreground rounded-xl h-12 text-[14px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {uploading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {uploading ? 'Uploading…' : 'Use Photo'}
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS PHASE */}
        {phase === 'success' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-[16px] font-bold text-foreground">Document Uploaded!</p>
            <p className="text-[13px] text-muted-foreground text-center">{docType} uploaded for task {currentTask?.task_name}</p>
            {uploadedUrl && (
              <img src={getFileUrl(uploadedUrl)} alt="Uploaded" className="w-32 h-40 object-cover rounded-xl border border-border" />
            )}
            <div className="flex gap-3 w-full">
              <button onClick={resetScanner} className="flex-1 bg-primary text-primary-foreground rounded-xl h-12 text-[14px] font-bold">
                Scan Another
              </button>
              <button onClick={() => navigate(-1)} className="flex-1 border border-border text-foreground rounded-xl h-12 text-[14px] font-medium">
                Done
              </button>
            </div>
          </div>
        )}

        {/* Recent Scans */}
        {recentScans.length > 0 && phase === 'capture' && (
          <div>
            <h3 className="text-[14px] font-bold text-foreground mb-2 flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-muted-foreground" /> Recent Scans
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentScans.map((doc) => (
                <div key={doc.name} className="shrink-0 w-20">
                  <div className="w-20 h-24 rounded-lg border border-border overflow-hidden bg-muted/30">
                    {doc.document_file ? (
                      <img src={getFileUrl(doc.document_file)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ScanLine className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">{doc.document_title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
