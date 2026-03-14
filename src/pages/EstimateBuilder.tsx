import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { getFileUrl, createRecord, updateRecord, fetchOne } from '@/lib/api';
import {
  ArrowLeft,
  MessageSquare,
  Bell,
  User,
  FileText,
  Plus,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

type TabKey = 'Required Document' | 'Process Flow' | 'Report';
const TABS: TabKey[] = ['Required Document', 'Process Flow', 'Report'];

export interface EstimateStep {
  step_number: number;
  step_title: string;
  description: string;
  department: string;
  estimated_days: number;
  cost: number;
}

export default function EstimateBuilder() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const clientId = params.get('client') ?? '';
  const estimateId = params.get('estimate') ?? '';
  const { profile_photo } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');

  const [activeTab, setActiveTab] = useState<TabKey>('Process Flow');
  const [steps, setSteps] = useState<EstimateStep[]>([]);
  const [draftId, setDraftId] = useState(estimateId);

  // Load existing estimate if editing
  useEffect(() => {
    if (estimateId && estimateId !== 'new') {
      fetchOne('DigiVault Estimate', estimateId)
        .then((d: any) => {
          if (d?.steps && Array.isArray(d.steps)) {
            setSteps(d.steps);
          }
        })
        .catch(() => {});
    }
  }, [estimateId]);

  // Auto-create draft on mount if no estimate id
  useEffect(() => {
    if (!draftId && clientId) {
      createRecord('DigiVault Estimate', {
        client: clientId,
        status: 'Draft',
        steps: [],
      })
        .then((res: any) => {
          if (res?.data?.name) setDraftId(res.data.name);
        })
        .catch(() => {});
    }
  }, [clientId, draftId]);

  const addStep = () => {
    const newStep: EstimateStep = {
      step_number: steps.length + 1,
      step_title: `Step ${steps.length + 1}`,
      description: '',
      department: '',
      estimated_days: 0,
      cost: 0,
    };
    const updated = [...steps, newStep];
    setSteps(updated);

    // Auto-save
    if (draftId) {
      updateRecord('DigiVault Estimate', draftId, { steps: updated }).catch(() => {});
    }
  };

  return (
    <div className="min-h-svh bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/estimate-list?client=${clientId}`)}>
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-[20px] font-bold text-foreground">Estimate</h1>
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
        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-background border-2 border-[#3B82F6] text-[#3B82F6]'
                  : 'bg-background border border-border text-muted-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {/* ── Required Document ── */}
          {activeTab === 'Required Document' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <FileText className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No required documents added yet</p>
            </div>
          )}

          {/* ── Process Flow ── */}
          {activeTab === 'Process Flow' && (
            <div className="relative pl-7">
              {/* Vertical line */}
              {steps.length > 0 && (
                <div
                  className="absolute left-[7px] top-2 w-0.5 bg-[#3B82F6]"
                  style={{ height: `${steps.length * 72 + 20}px` }}
                />
              )}

              {/* Existing steps */}
              {steps.map((step, idx) => (
                <div key={idx} className="relative flex items-center gap-3 mb-4">
                  {/* Circle */}
                  <div className="absolute -left-7 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#3B82F6] z-10" />

                  {/* Step card */}
                  <div className="flex-1 bg-background border border-border rounded-xl p-3">
                    <p className="text-[14px] font-bold text-foreground">{step.step_title}</p>
                    {step.description && (
                      <p className="text-[12px] text-muted-foreground mt-0.5">{step.description}</p>
                    )}
                    {step.department && (
                      <p className="text-[12px] text-muted-foreground">Dept: {step.department}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Add next step button */}
              <div className="relative flex items-center gap-3">
                {/* Circle */}
                <div className="absolute -left-7 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#3B82F6] z-10" />

                <button
                  onClick={addStep}
                  className="flex-1 bg-[#1A3C8E] text-white rounded-full h-12 text-[15px] font-bold flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Step {steps.length + 1}
                </button>
              </div>
            </div>
          )}

          {/* ── Report ── */}
          {activeTab === 'Report' && (
            <div>
              {steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <FileText className="w-12 h-12 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">Add steps to generate report</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-[16px] font-bold text-foreground">Estimate Summary</h3>
                  <div className="border border-border rounded-xl overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[40px_1fr_80px_80px] bg-muted/50 px-3 py-2">
                      <span className="text-[12px] font-medium text-muted-foreground">#</span>
                      <span className="text-[12px] font-medium text-muted-foreground">Step</span>
                      <span className="text-[12px] font-medium text-muted-foreground text-right">Days</span>
                      <span className="text-[12px] font-medium text-muted-foreground text-right">Cost</span>
                    </div>
                    {steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[40px_1fr_80px_80px] px-3 py-2.5 border-t border-muted/40"
                      >
                        <span className="text-[13px] text-muted-foreground">{idx + 1}</span>
                        <span className="text-[13px] text-foreground">{step.step_title}</span>
                        <span className="text-[13px] text-foreground text-right">
                          {step.estimated_days || '—'}
                        </span>
                        <span className="text-[13px] text-foreground text-right">
                          {step.cost ? `₹${step.cost}` : '—'}
                        </span>
                      </div>
                    ))}
                    {/* Total */}
                    <div className="grid grid-cols-[40px_1fr_80px_80px] px-3 py-2.5 border-t border-border bg-muted/30">
                      <span />
                      <span className="text-[13px] font-bold text-foreground">Total</span>
                      <span className="text-[13px] font-bold text-foreground text-right">
                        {steps.reduce((a, s) => a + (s.estimated_days || 0), 0)}
                      </span>
                      <span className="text-[13px] font-bold text-foreground text-right">
                        ₹{steps.reduce((a, s) => a + (s.cost || 0), 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
