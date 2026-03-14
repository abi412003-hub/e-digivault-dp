import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { ArrowLeft, User, Building2 } from 'lucide-react';

type RegType = 'Individual' | 'Organization' | null;

export default function RegisterType() {
  const [selected, setSelected] = useState<RegType>(null);
  const { setRegistrationType } = useDPAuth();
  const navigate = useNavigate();

  const handleSelect = (type: RegType) => {
    setSelected(type);
    if (type) {
      setRegistrationType(type);
      navigate('/register-personal');
    }
  };

  return (
    <div className="min-h-svh bg-background px-6 pt-6 pb-10 flex flex-col">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="mb-6 self-start">
        <ArrowLeft className="w-6 h-6 text-foreground" />
      </button>

      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-[24px] font-bold text-foreground tracking-tight">Welcome to e-DigiVault</h1>
        <p className="text-[14px] text-muted-foreground">Secure Access to Documents</p>
      </div>

      {/* Prompt */}
      <p className="text-[16px] text-foreground mb-6">Please choose how you'd like to Register</p>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 mb-auto">
        <button
          onClick={() => handleSelect('Individual')}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl h-[130px] transition-all ${
            selected === 'Individual'
              ? 'bg-[#EEF2FF] border-2 border-[#1E3A8A]'
              : 'bg-[#EEF2FF] border-2 border-transparent'
          }`}
        >
          <User className="w-10 h-10 text-[#1E3A8A]" />
          <span className="text-[14px] font-medium text-[#1E3A8A]">Individual</span>
        </button>

        <button
          onClick={() => handleSelect('Organization')}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl h-[130px] transition-all ${
            selected === 'Organization'
              ? 'bg-[#EEF2FF] border-2 border-[#1E3A8A]'
              : 'bg-[#EEF2FF] border-2 border-transparent'
          }`}
        >
          <Building2 className="w-10 h-10 text-[#1E3A8A]" />
          <span className="text-[14px] font-medium text-[#1E3A8A]">Organization</span>
        </button>
      </div>

      {/* Notes */}
      <div className="mt-8 space-y-1.5">
        <p className="text-[14px] text-foreground font-bold">Note:</p>
        <p className="text-[14px] text-muted-foreground">Register as an Individual for Personal use.</p>
        <p className="text-[14px] text-muted-foreground">Register as a Business or Organization.</p>
        <p className="text-[14px] text-muted-foreground">Register as a Land Aggregator.</p>
      </div>
    </div>
  );
}
