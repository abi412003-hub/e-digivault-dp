import React, { createContext, useContext, useState } from 'react';

export interface PersonalDetails {
  full_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  state: string;
  district: string;
  taluk: string;
  city: string;
  pincode: string;
  aadhar: string;
  pan: string;
}

export interface OrgDetails {
  org_name: string;
  org_type: string;
  org_address: string;
  org_state: string;
  org_district: string;
  org_city: string;
  org_pincode: string;
  gst: string;
}

export interface ExperienceDetails {
  experience_years: string;
  specialization: string;
  license_number: string;
}

interface RegistrationState {
  personal: PersonalDetails;
  org: OrgDetails;
  experience: ExperienceDetails;
}

interface RegistrationContextType {
  data: RegistrationState;
  setPersonal: (d: PersonalDetails) => void;
  setOrg: (d: OrgDetails) => void;
  setExperience: (d: ExperienceDetails) => void;
}

const emptyPersonal: PersonalDetails = {
  full_name: '', email: '', phone: '', whatsapp: '', address: '',
  state: 'Karnataka', district: '', taluk: '', city: '', pincode: '', aadhar: '', pan: '',
};

const emptyOrg: OrgDetails = {
  org_name: '', org_type: '', org_address: '', org_state: 'Karnataka',
  org_district: '', org_city: '', org_pincode: '', gst: '',
};

const emptyExperience: ExperienceDetails = {
  experience_years: '', specialization: '', license_number: '',
};

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

export const RegistrationProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState<RegistrationState>({
    personal: emptyPersonal,
    org: emptyOrg,
    experience: emptyExperience,
  });

  const setPersonal = (d: PersonalDetails) => setData(s => ({ ...s, personal: d }));
  const setOrg = (d: OrgDetails) => setData(s => ({ ...s, org: d }));
  const setExperience = (d: ExperienceDetails) => setData(s => ({ ...s, experience: d }));

  return (
    <RegistrationContext.Provider value={{ data, setPersonal, setOrg, setExperience }}>
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistration = () => {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error("useRegistration must be used within RegistrationProvider");
  return ctx;
};
