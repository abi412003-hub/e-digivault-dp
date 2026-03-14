import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegistration, type OrgDetails } from '@/contexts/RegistrationContext';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { allDistricts, taluksByDistrict, citiesByDistrict } from '@/lib/karnataka-data';

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[14px] font-bold text-foreground">{children}</label>
);

const underlineClass =
  "border-0 border-b border-input rounded-none h-12 px-0 focus-visible:ring-0 bg-transparent text-base focus:border-primary transition-colors";

const UnderlineField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <FieldLabel>{label}</FieldLabel>
    {children}
  </div>
);

const SelectField = ({
  label, value, onChange, options, placeholder, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string; disabled?: boolean;
}) => (
  <UnderlineField label={label}>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${underlineClass} w-full appearance-none pr-8 ${disabled ? 'text-muted-foreground' : 'text-foreground'}`}
      >
        <option value="">{placeholder ?? 'Select'}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
    </div>
  </UnderlineField>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-3 pt-2">
    <span className="text-[16px] font-semibold text-primary whitespace-nowrap">{children}</span>
    <div className="h-px bg-border flex-1" />
  </div>
);

const companyTypes = ['Pvt.Ltd', 'LLP', 'Partnership', 'Proprietorship', 'Trust', 'Society', 'Other'];
const revenueRanges = ['Below 10L', '10L-50L', '50L-1Cr', '1Cr-5Cr', '5Cr-10Cr', 'Above 10Cr'];

export default function RegisterOrg() {
  const navigate = useNavigate();
  const { data, setOrg } = useRegistration();
  const [form, setForm] = useState<OrgDetails>(data.org);

  const set = (key: keyof OrgDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const setVal = (key: keyof OrgDetails, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const taluks = useMemo(() => (form.district ? taluksByDistrict[form.district] ?? [] : []), [form.district]);
  const cities = useMemo(() => (form.district ? citiesByDistrict[form.district] ?? [] : []), [form.district]);

  const handleDistrictChange = (v: string) => {
    setForm((f) => ({ ...f, district: v, taluk: '', city: '' }));
  };

  const handleNext = () => {
    setOrg(form);
    navigate('/register-experience');
  };

  const isValid = form.company_name.trim().length > 0;

  return (
    <div className="min-h-svh bg-background px-6 pt-6 pb-10 flex flex-col">
      <button onClick={() => navigate(-1)} className="mb-6 self-start">
        <ArrowLeft className="w-6 h-6 text-foreground" />
      </button>

      <div className="text-center space-y-2 mb-6">
        <h1 className="text-[24px] font-bold text-foreground tracking-tight">Welcome to e-DigiVault</h1>
        <p className="text-[14px] text-muted-foreground">Secure Access to Documents</p>
      </div>

      <SectionLabel>Company Details</SectionLabel>

      <div className="mt-6 space-y-5 flex-1">
        <UnderlineField label="Company Name">
          <Input className={underlineClass} placeholder="Citrine Solutions Pvt. Ltd" value={form.company_name} onChange={set('company_name')} />
        </UnderlineField>

        <SelectField label="Company Type" value={form.company_type} onChange={(v) => setVal('company_type', v)} options={companyTypes} placeholder="Select Type" />

        <UnderlineField label="GSTIN / PAN">
          <Input className={underlineClass} placeholder="29AACCC1234F1Z5" value={form.gstin_pan} onChange={set('gstin_pan')} />
        </UnderlineField>

        <UnderlineField label="Business Registration Number">
          <Input className={underlineClass} placeholder="+91 8544 8138 02" value={form.business_reg_number} onChange={set('business_reg_number')} />
        </UnderlineField>

        <UnderlineField label="Nature of Business">
          <Input className={underlineClass} placeholder="Construction" value={form.nature_of_business} onChange={set('nature_of_business')} />
        </UnderlineField>

        <div className="space-y-1">
          <FieldLabel>Office Address</FieldLabel>
          <Textarea
            rows={3}
            className="rounded-md border border-input bg-transparent text-base px-3 py-2 focus-visible:ring-1 focus-visible:ring-primary resize-none"
            placeholder="34, TechPark Lane, Koramangala, Bangalore, Karnataka - 560034"
            value={form.office_address}
            onChange={set('office_address')}
          />
        </div>

        <SectionLabel>Office Address</SectionLabel>

        <SelectField label="State" value={form.state} onChange={(v) => setVal('state', v)} options={['Karnataka']} disabled />

        <SelectField label="District" value={form.district} onChange={handleDistrictChange} options={allDistricts} placeholder="Select District" />

        <SelectField label="Taluk" value={form.taluk} onChange={(v) => setVal('taluk', v)} options={taluks} placeholder="Select Taluk" disabled={!form.district} />

        {cities.length > 0 ? (
          <SelectField label="City" value={form.city} onChange={(v) => setVal('city', v)} options={cities} placeholder="Select City" />
        ) : (
          <UnderlineField label="City">
            <Input className={underlineClass} placeholder="Bengaluru" value={form.city} onChange={set('city')} />
          </UnderlineField>
        )}

        <UnderlineField label="Pincode">
          <Input type="text" inputMode="numeric" maxLength={6} className={underlineClass} placeholder="560034" value={form.pincode} onChange={set('pincode')} />
        </UnderlineField>

        <UnderlineField label="Company Website">
          <Input type="url" className={underlineClass} placeholder="citrineconstruction.com" value={form.website} onChange={set('website')} />
        </UnderlineField>

        <UnderlineField label="Number of Employees">
          <Input type="text" inputMode="numeric" className={underlineClass} placeholder="45" value={form.num_employees} onChange={set('num_employees')} />
        </UnderlineField>

        <SelectField label="Annual Revenue Range" value={form.annual_revenue} onChange={(v) => setVal('annual_revenue', v)} options={revenueRanges} placeholder="Select Range" />
      </div>

      <div className="flex justify-end mt-8">
        <Button onClick={handleNext} disabled={!isValid} className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white rounded-lg px-8 h-10 font-medium">
          Next
        </Button>
      </div>
    </div>
  );
}
