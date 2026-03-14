import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { getFileUrl, createRecord } from '@/lib/api';
import { ArrowLeft, MessageSquare, Bell, User, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import BottomNav from '@/components/BottomNav';

type LeadType = 'Personal' | 'Organization' | 'Service';

export default function AddLead() {
  const navigate = useNavigate();
  const { profile_photo, dp_id } = useDPAuth();
  const avatarUrl = getFileUrl(profile_photo ?? '');

  const [leadType, setLeadType] = useState<LeadType>('Organization');
  const [photo, setPhoto] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Organization fields
  const [orgName, setOrgName] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [dateEstablished, setDateEstablished] = useState('');
  const [orgType, setOrgType] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownershipStatus, setOwnershipStatus] = useState('');

  // Personal fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [aadhar, setAadhar] = useState('');
  const [pan, setPan] = useState('');
  const [address, setAddress] = useState('');

  // Service fields
  const [serviceType, setServiceType] = useState('');
  const [propertyLocation, setPropertyLocation] = useState('');
  const [notes, setNotes] = useState('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const body: any = {
        lead_type: leadType,
        assigned_to: dp_id,
        status: 'Pending',
      };
      if (leadType === 'Organization') {
        if (!orgName.trim()) { toast({ title: 'Organisation Name is required', variant: 'destructive' }); return; }
        Object.assign(body, { organisation_name: orgName, registered_address: regAddress, date_of_establishment: dateEstablished, organisation_type: orgType, owner_name: ownerName, ownership_status: ownershipStatus });
      } else if (leadType === 'Personal') {
        if (!fullName.trim()) { toast({ title: 'Full Name is required', variant: 'destructive' }); return; }
        Object.assign(body, { lead_name: fullName, phone, email, date_of_birth: dob, aadhar_number: aadhar, pan_number: pan, address });
      } else {
        Object.assign(body, { service_type: serviceType, property_location: propertyLocation, notes });
      }
      await createRecord('DigiVault Lead', body);
      toast({ title: 'Lead added successfully' });
      navigate('/leads');
    } catch {
      toast({ title: 'Failed to add lead', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const underlineClass = "border-0 border-b border-border rounded-none h-12 px-0 focus-visible:ring-0 bg-transparent text-base";

  return (
    <div className="min-h-svh bg-background pb-24">
      <header className="sticky top-0 z-20 bg-background border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/leads')}><ArrowLeft className="w-6 h-6 text-foreground" /></button>
          <h1 className="text-[20px] font-bold text-foreground">Lead</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><MessageSquare className="w-5 h-5 text-muted-foreground" /></div>
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><Bell className="w-5 h-5 text-muted-foreground" /></div>
          <div className="w-9 h-9 rounded-full border border-border overflow-hidden flex items-center justify-center bg-muted">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-muted-foreground" />}
          </div>
        </div>
      </header>

      <div className="px-5 pt-4">
        <p className="text-[16px] text-muted-foreground text-center mb-4">Add New Lead</p>

        {/* Avatar upload */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-muted overflow-hidden flex items-center justify-center border-2 border-border">
              {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <User className="w-9 h-9 text-muted-foreground" />}
            </div>
            <label className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer">
              <Camera className="w-3.5 h-3.5 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </div>
          <span className="text-[14px] text-muted-foreground mt-2">Upload Photo</span>
        </div>

        {/* Lead type radio */}
        <div className="flex justify-center gap-6 mb-5">
          {(['Personal', 'Organization', 'Service'] as LeadType[]).map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <div onClick={() => setLeadType(t)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${leadType === t ? 'border-blue-600' : 'border-gray-300'}`}>
                {leadType === t && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
              </div>
              <span className={`text-[14px] font-medium ${leadType === t ? 'text-foreground' : 'text-muted-foreground'}`}>{t}</span>
            </label>
          ))}
        </div>

        {/* Section divider */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[14px] text-muted-foreground whitespace-nowrap">
            {leadType === 'Organization' ? 'Organization Details' : leadType === 'Personal' ? 'Personal Details' : 'Service Details'}
          </span>
          <div className="h-px bg-border flex-1" />
        </div>

        {/* Organization form */}
        {leadType === 'Organization' && (
          <div className="space-y-5">
            {[
              { label: 'Organisation Name', val: orgName, set: setOrgName, placeholder: 'Citrine Solutions Pvt. Ltd' },
              { label: 'Type of Organisation', val: orgType, set: setOrgType, placeholder: 'Private Limited Company' },
              { label: 'Name of the Owner', val: ownerName, set: setOwnerName, placeholder: 'Rajesh Kumar' },
              { label: 'Ownership Status', val: ownershipStatus, set: setOwnershipStatus, placeholder: 'Individual Business' },
            ].map(({ label, val, set, placeholder }) => (
              <div key={label} className="space-y-1">
                <label className="text-[14px] font-medium text-foreground">{label}</label>
                <Input className={underlineClass} placeholder={placeholder} value={val} onChange={(e) => set(e.target.value)} />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-[14px] font-medium text-foreground">Registered Office Address</label>
              <Textarea rows={2} className="rounded-md border border-input bg-transparent text-base px-3 py-2 resize-none" placeholder="34, TechPark Lane, Koramangala, Bangalore, Karnataka - 560034" value={regAddress} onChange={(e) => setRegAddress(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[14px] font-medium text-foreground">Date of Establishment</label>
              <Input type="date" className={underlineClass} value={dateEstablished} onChange={(e) => setDateEstablished(e.target.value)} />
            </div>
          </div>
        )}

        {/* Personal form */}
        {leadType === 'Personal' && (
          <div className="space-y-5">
            {[
              { label: 'Full Name', val: fullName, set: setFullName, placeholder: 'Rajesh Kumar' },
              { label: 'Phone Number', val: phone, set: setPhone, placeholder: '9876543210', type: 'tel' },
              { label: 'Email Address', val: email, set: setEmail, placeholder: 'rajesh@gmail.com', type: 'email' },
              { label: 'Aadhaar Number', val: aadhar, set: setAadhar, placeholder: '9400 8123 3432' },
              { label: 'PAN Number', val: pan, set: (v: string) => setPan(v.toUpperCase()), placeholder: 'ABCDE1234F' },
            ].map(({ label, val, set, placeholder, type }) => (
              <div key={label} className="space-y-1">
                <label className="text-[14px] font-medium text-foreground">{label}</label>
                <Input className={underlineClass} placeholder={placeholder} value={val} onChange={(e) => set(e.target.value)} type={type ?? 'text'} />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-[14px] font-medium text-foreground">Date of Birth</label>
              <Input type="date" className={underlineClass} value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[14px] font-medium text-foreground">Address</label>
              <Textarea rows={2} className="rounded-md border border-input bg-transparent text-base px-3 py-2 resize-none" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
        )}

        {/* Service form */}
        {leadType === 'Service' && (
          <div className="space-y-5">
            {[
              { label: 'Service Type', val: serviceType, set: setServiceType, placeholder: 'E-Khatha' },
              { label: 'Property Location', val: propertyLocation, set: setPropertyLocation, placeholder: 'Koramangala, Bengaluru' },
            ].map(({ label, val, set, placeholder }) => (
              <div key={label} className="space-y-1">
                <label className="text-[14px] font-medium text-foreground">{label}</label>
                <Input className={underlineClass} placeholder={placeholder} value={val} onChange={(e) => set(e.target.value)} />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-[14px] font-medium text-foreground">Client Notes</label>
              <Textarea rows={3} className="rounded-md border border-input bg-transparent text-base px-3 py-2 resize-none" placeholder="Any notes about the client or service requirement..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 mt-8">
          <Button onClick={() => navigate('/leads')} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white rounded-xl h-13 text-[16px] font-bold">Skip</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white rounded-xl h-13 text-[16px] font-bold">
            {submitting ? 'Adding...' : 'Next'}
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
