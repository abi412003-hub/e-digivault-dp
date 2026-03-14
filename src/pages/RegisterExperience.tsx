import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { useRegistration, type ExperienceDetails } from '@/contexts/RegistrationContext';
import { createRecord } from '@/lib/api';
import { ArrowLeft, ArrowUpFromLine, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const underlineClass =
  "border-0 border-b border-input rounded-none h-12 px-0 focus-visible:ring-0 bg-transparent text-base focus:border-primary transition-colors";

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[14px] font-bold text-foreground">{children}</label>
);

const UnderlineField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <FieldLabel>{label}</FieldLabel>
    {children}
  </div>
);

/* ── File Upload Row ── */
const DOCUMENT_LABELS = [
  'Self Acknowledgement',
  'Upload - Personal Pan Card',
  'Upload - Adhar Card',
  'Upload - GST Document',
  'Upload - Passport size photo',
  'Upload - Firm Registration Details',
];

function FileUploadRow({
  label,
  file,
  onSelect,
}: {
  label: string;
  file: File | null;
  onSelect: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-between border-b border-input h-12 text-left transition-colors hover:border-primary"
      >
        <span className={`text-base ${file ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
          {file ? file.name : 'Upload File'}
        </span>
        <ArrowUpFromLine className="w-5 h-5 text-muted-foreground shrink-0" />
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.doc,.docx"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
        }}
      />
    </div>
  );
}

/* ── Page ── */
export default function RegisterExperience() {
  const navigate = useNavigate();
  const { phone, registration_type, login } = useDPAuth();
  const { data, setExperience } = useRegistration();

  const [form, setForm] = useState<ExperienceDetails>(data.experience);
  const [files, setFiles] = useState<Record<number, File>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof ExperienceDetails) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleFileSelect = (idx: number, file: File) => {
    setFiles((prev) => ({ ...prev, [idx]: file }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setExperience(form);

    const personal = data.personal;
    const org = data.org;

    try {
      // 1. Create DigiVault User
      const userRes = await createRecord('DigiVault User', {
        naming_series: 'DVU-.#####',
        full_name: personal.full_name,
        user_role: 'Delivery Partner',
        status: 'Pending Verification',
        mobile_number: phone,
        whatsapp_number: personal.whatsapp,
        email_address: personal.email,
        address_line: personal.address,
        state: 'Karnataka',
        district: personal.district,
        taluk: personal.taluk,
        city: personal.city,
        pincode: personal.pincode,
        aadhaar_number: personal.aadhar,
        pan_number: personal.pan,
        registration_type: registration_type,
        registration_date: new Date().toISOString().split('T')[0],
        language_preference: 'English',
      });

      const userId = userRes?.data?.name;

      if (!userId) {
        throw new Error('Failed to create user record');
      }

      // 2. Create DP Work Experience
      await createRecord('DP Work Experience', {
        naming_series: 'DPWE-.#####',
        linked_user: userId,
        years_of_experience: form.experience_years,
        primary_service_areas: form.primary_service_areas,
        incorporation_number: form.incorporation_number,
      });

      // 3. If Organization, create DigiVault Organisation
      if (registration_type === 'Organization') {
        await createRecord('DigiVault Organisation', {
          company_name: org.company_name,
          company_type: org.company_type,
          gstin_pan: org.gstin_pan,
          business_registration_number: org.business_reg_number,
          nature_of_business: org.nature_of_business,
          office_address: org.office_address,
          state: org.state,
          district: org.district,
          taluk: org.taluk,
          city: org.city,
          pincode: org.pincode,
          company_website: org.website,
          number_of_employees: org.num_employees,
          annual_revenue_range: org.annual_revenue,
          linked_user: userId,
        });
      }

      // 4. Update auth context
      login({
        dp_id: userId,
        dp_name: personal.full_name,
        phone: phone,
        status: 'Pending Verification',
        profile_photo: null,
        registration_type: registration_type,
        supabaseUserId: null,
      });

      // 5. Navigate
      navigate('/pending');
    } catch (err: any) {
      console.error('Registration error:', err);
      toast({
        title: 'Registration Failed',
        description: err?.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-svh bg-background px-6 pt-6 pb-10 flex flex-col">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="mb-6 self-start">
        <ArrowLeft className="w-6 h-6 text-foreground" />
      </button>

      {/* Header */}
      <h1 className="text-[20px] font-bold text-foreground tracking-tight text-center mb-6">
        Work Experience
      </h1>

      {/* Form */}
      <div className="space-y-5 flex-1">
        <UnderlineField label="Years of Experience in Real Estate">
          <Input
            type="text"
            inputMode="numeric"
            className={underlineClass}
            placeholder="6"
            value={form.experience_years}
            onChange={set('experience_years')}
          />
        </UnderlineField>

        <UnderlineField label="Primary Service Areas">
          <Input
            className={underlineClass}
            placeholder="Banglore"
            value={form.primary_service_areas}
            onChange={set('primary_service_areas')}
          />
        </UnderlineField>

        <UnderlineField label="Incorporation Number">
          <Input
            className={underlineClass}
            placeholder="U12345KA2020PTC123456"
            value={form.incorporation_number}
            onChange={set('incorporation_number')}
          />
        </UnderlineField>

        {/* Document uploads section */}
        <div className="pt-4">
          <p className="text-[16px] font-bold text-foreground mb-4">Upload Necessary Documents</p>
          <div className="space-y-5">
            {DOCUMENT_LABELS.map((label, idx) => (
              <FileUploadRow
                key={idx}
                label={label}
                file={files[idx] ?? null}
                onSelect={(f) => handleFileSelect(idx, f)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Next / Submit */}
      <div className="flex justify-end mt-8">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white rounded-lg px-8 h-10 font-medium"
        >
          {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Next'}
        </Button>
      </div>
    </div>
  );
}
