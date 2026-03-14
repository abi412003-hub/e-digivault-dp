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
  company_name: string;
  company_type: string;
  gstin_pan: string;
  business_reg_number: string;
  nature_of_business: string;
  office_address: string;
  state: string;
  district: string;
  taluk: string;
  city: string;
  pincode: string;
  website: string;
  num_employees: string;
  annual_revenue: string;
}

export interface ExperienceDetails {
  experience_years: string;
  primary_service_areas: string;
  incorporation_number: string;
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
  company_name: '', company_type: '', gstin_pan: '', business_reg_number: '',
  nature_of_business: '', office_address: '', state: 'Karnataka', district: '',
  taluk: '', city: '', pincode: '', website: '', num_employees: '', annual_revenue: '',
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
