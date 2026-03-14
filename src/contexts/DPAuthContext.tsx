import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchList } from '@/lib/api';

interface DPAuthState {
  dp_id: string | null;
  dp_name: string | null;
  phone: string | null;
  status: string | null;
  profile_photo: string | null;
  registration_type: string | null;
  supabaseUserId: string | null;
}

interface DPAuthContextType extends DPAuthState {
  isLoggedIn: boolean;
  isLoading: boolean;
  setPhone: (phone: string) => void;
  setRegistrationType: (type: string) => void;
  login: (data: DPAuthState) => void;
  logout: () => void;
}

const emptyState: DPAuthState = {
  dp_id: null,
  dp_name: null,
  phone: null,
  status: null,
  profile_photo: null,
  registration_type: null,
  supabaseUserId: null,
};

const DPAuthContext = createContext<DPAuthContextType | undefined>(undefined);

export const DPAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<DPAuthState>(() => {
    const saved = localStorage.getItem("edigivault_dp");
    return saved ? JSON.parse(saved) : emptyState;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const phone = session.user.phone?.replace('+91', '');
        if (phone) {
          const users = await fetchList("DigiVault User",
            ["name", "full_name", "mobile_number", "user_role", "status", "profile_photo", "registration_type", "registration_date"],
            [["mobile_number", "=", phone]]
          );
          if (users && users.length > 0) {
            const user = users[0];
            const newState: DPAuthState = {
              dp_id: user.name,
              dp_name: user.full_name,
              phone: user.mobile_number,
              status: user.status,
              profile_photo: user.profile_photo,
              registration_type: user.registration_type,
              supabaseUserId: session.user.id,
            };
            setState(newState);
            localStorage.setItem("edigivault_dp", JSON.stringify(newState));
          }
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = (userData: DPAuthState) => {
    setState(userData);
    localStorage.setItem("edigivault_dp", JSON.stringify(userData));
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("edigivault_dp");
    setState(emptyState);
  };

  const setPhone = (p: string) => setState((s) => ({ ...s, phone: p }));
  const setRegistrationType = (type: string) => {
    setState((s) => {
      const next = { ...s, registration_type: type };
      localStorage.setItem("edigivault_dp", JSON.stringify(next));
      return next;
    });
  };

  return (
    <DPAuthContext.Provider value={{ ...state, isLoggedIn: !!state.dp_id, isLoading, setPhone, setRegistrationType, login, logout }}>
      {children}
    </DPAuthContext.Provider>
  );
};

export const useDPAuth = () => {
  const context = useContext(DPAuthContext);
  if (!context) throw new Error("useDPAuth must be used within DPAuthProvider");
  return context;
};
