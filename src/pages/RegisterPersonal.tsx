import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { useRegistration, type PersonalDetails } from '@/contexts/RegistrationContext';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  districtsByDivision,
  taluksByDistrict,
  citiesByDistrict,
  allDistricts,
} from '@/lib/karnataka-data';

/* ── Shared field components ── */

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[14px] font-bold text-foreground">{children}</label>
);

const UnderlineField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <FieldLabel>{label}</FieldLabel>
    {children}
  </div>
);

const underlineClass =
  "border-0 border-b border-input rounded-none h-12 px-0 focus-visible:ring-0 bg-transparent text-base focus:border-primary transition-colors";

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-3 pt-2">
    <span className="text-[16px] font-semibold text-primary whitespace-nowrap">{children}</span>
    <div className="h-px bg-border flex-1" />
  </div>
);

const SelectField = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) => (
  <UnderlineField label={label}>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${underlineClass} w-full appearance-none pr-8 ${
          disabled ? 'text-muted-foreground' : 'text-foreground'
        }`}
      >
        <option value="">{placeholder ?? 'Select'}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
    </div>
  </UnderlineField>
);

/* ── Page ── */

export default function RegisterPersonal() {
  const navigate = useNavigate();
  const { phone, registration_type } = useDPAuth();
  const { data, setPersonal } = useRegistration();

  const [form, setForm] = useState<PersonalDetails>({
    ...data.personal,
    phone: phone ?? data.personal.phone,
  });

  // keep phone synced
  useEffect(() => {
    if (phone) setForm((f) => ({ ...f, phone }));
  }, [phone]);

  const set = (key: keyof PersonalDetails) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const setVal = (key: keyof PersonalDetails, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  // Cascading: districts for Karnataka
  const districts = useMemo(() => allDistricts, []);

  const taluks = useMemo(
    () => (form.district ? taluksByDistrict[form.district] ?? [] : []),
    [form.district]
  );

  const cities = useMemo(
    () => (form.district ? citiesByDistrict[form.district] ?? [] : []),
    [form.district]
  );

  // Reset dependent when parent changes
  const handleDistrictChange = (v: string) => {
    setForm((f) => ({ ...f, district: v, taluk: '', city: '' }));
  };

  const handleNext = () => {
    setPersonal(form);
    if (registration_type === 'Organization') {
      navigate('/register-org');
    } else {
      navigate('/register-experience');
    }
  };

  const isValid = 
    form.full_name.trim().length > 0 &&
    form.phone.trim().length >= 10 &&
    form.email.trim().length > 0 &&
    form.aadhaar.trim().replace(/\s/g, '').length === 12 &&
    form.pan.trim().length === 10 &&
    form.door_no.trim().length > 0 &&
    form.district.trim().length > 0 &&
    form.taluk.trim().length > 0 &&
    form.pincode.trim().length === 6;

  return (
    <div className="min-h-svh bg-background px-6 pt-6 pb-10 flex flex-col">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="mb-6 self-start">
        <ArrowLeft className="w-6 h-6 text-foreground" />
      </button>

      {/* Header */}
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-[24px] font-bold text-foreground tracking-tight">
          Welcome to e-DigiVault
        </h1>
        <p className="text-[14px] text-muted-foreground">Secure Access to Documents</p>
      </div>

      {/* Section label */}
      <SectionLabel>Personal Details</SectionLabel>

      {/* Form */}
      <div className="mt-6 space-y-5 flex-1">
        {/* Full Name */}
        <UnderlineField label="Full Name *">
          <Input
            className={underlineClass}
            placeholder="Kavya"
            value={form.full_name}
            onChange={set('full_name')}
          />
        </UnderlineField>

        {/* Email */}
        <UnderlineField label="Email">
          <Input
            type="email"
            className={underlineClass}
            placeholder="kavya123@gmail.com"
            value={form.email}
            onChange={set('email')}
          />
        </UnderlineField>

        {/* Phone */}
        <UnderlineField label="Phone No">
          <Input
            className={`${underlineClass} text-muted-foreground`}
            value={form.phone}
            readOnly
            placeholder="9298486678"
          />
        </UnderlineField>

        {/* WhatsApp */}
        <UnderlineField label="WhatsApp No">
          <Input
            type="tel"
            className={underlineClass}
            placeholder="9480258902"
            value={form.whatsapp}
            onChange={set('whatsapp')}
          />
        </UnderlineField>

        {/* Address */}
        <div className="space-y-1">
          <FieldLabel>Address</FieldLabel>
          <Textarea
            rows={3}
            className="rounded-md border border-input bg-transparent text-base px-3 py-2 focus-visible:ring-1 focus-visible:ring-primary resize-none"
            placeholder="34, Park Lane, Koramangala, Bangalore, Karnataka - 560034"
            value={form.address}
            onChange={set('address')}
          />
        </div>

        {/* State */}
        <SelectField
          label="State"
          value={form.state}
          onChange={(v) => setVal('state', v)}
          options={['Karnataka']}
          disabled
        />

        {/* District */}
        <SelectField
          label="District"
          value={form.district}
          onChange={handleDistrictChange}
          options={districts}
          placeholder="Select District"
        />

        {/* Taluk */}
        <SelectField
          label="Taluk"
          value={form.taluk}
          onChange={(v) => setVal('taluk', v)}
          options={taluks}
          placeholder="Select Taluk"
          disabled={!form.district}
        />

        {/* City */}
        {cities.length > 0 ? (
          <SelectField
            label="City"
            value={form.city}
            onChange={(v) => setVal('city', v)}
            options={cities}
            placeholder="Select City"
          />
        ) : (
          <UnderlineField label="City">
            <Input
              className={underlineClass}
              placeholder="Bengaluru"
              value={form.city}
              onChange={set('city')}
            />
          </UnderlineField>
        )}

        {/* Pincode */}
        <UnderlineField label="Pincode">
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            className={underlineClass}
            placeholder="560034"
            value={form.pincode}
            onChange={set('pincode')}
          />
        </UnderlineField>

        {/* Aadhar */}
        <UnderlineField label="Aadhar No">
          <Input
            className={underlineClass}
            placeholder="9400 8123 3432"
            maxLength={14}
            value={form.aadhar}
            onChange={set('aadhar')}
          />
        </UnderlineField>

        {/* PAN */}
        <UnderlineField label="Pan No">
          <Input
            className={`${underlineClass} uppercase`}
            placeholder="OHAPS0023"
            maxLength={10}
            value={form.pan}
            onChange={(e) => setVal('pan', e.target.value.toUpperCase())}
          />
        </UnderlineField>
      </div>

      {/* Next button */}
      <div className="flex justify-end mt-8">
        <Button
          onClick={handleNext}
          disabled={!isValid}
          className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white rounded-lg px-8 h-10 font-medium"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
