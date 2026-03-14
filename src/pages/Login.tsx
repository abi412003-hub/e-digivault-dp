import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { fetchList } from '@/lib/api';
import { useDPAuth } from '@/contexts/DPAuthContext';
import { User, Eye, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const UnderlineInput = ({ icon: Icon, label, ...props }: any) => (
  <div className="w-full space-y-1">
    <label className="text-[14px] font-medium text-foreground">{label}</label>
    <div className="relative flex items-center border-b border-input focus-within:border-primary transition-colors">
      <Icon className="absolute left-0 w-5 h-5 text-muted-foreground" />
      <Input
        {...props}
        className="border-0 rounded-none pl-8 pr-0 h-12 focus-visible:ring-0 bg-transparent text-base"
      />
    </div>
  </div>
);

const OTP_FIELDS = ["name", "full_name", "mobile_number", "user_role", "status", "profile_photo", "registration_type"];

interface VerifyResult {
  authData: any;
  userStatus: string | null;
  isNewUser: boolean;
}

function useOtpFlow(onVerified: (result: VerifyResult) => void) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const { login, setPhone: setContextPhone } = useDPAuth();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const sendOtp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: `+91${phone}` });
    setLoading(false);
    if (!error) {
      setStep('otp');
      setCountdown(30);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;
    await supabase.auth.signInWithOtp({ phone: `+91${phone}` });
    setCountdown(30);
  };

  const verifyOtp = async (val: string) => {
    setOtp(val);
    if (val.length === 6) {
      setLoading(true);
      const { data } = await supabase.auth.verifyOtp({
        phone: `+91${phone}`,
        token: val,
        type: 'sms',
      });

      const users = await fetchList("DigiVault User", OTP_FIELDS, [["mobile_number", "=", phone]]);

      if (users && users.length > 0) {
        const user = users[0];
        const authData = {
          dp_id: user.name,
          dp_name: user.full_name,
          phone: user.mobile_number,
          status: user.status,
          profile_photo: user.profile_photo,
          registration_type: user.registration_type,
          supabaseUserId: data.user?.id ?? null,
        };
        login(authData);
        onVerified({ authData, userStatus: user.status, isNewUser: false });
      } else {
        setContextPhone(phone);
        onVerified({ authData: null, userStatus: null, isNewUser: true });
      }
      setLoading(false);
    }
  };

  return { phone, setPhone, otp, step, setStep, loading, countdown, sendOtp, resendOtp, verifyOtp };
}

/* ── T&C Bottom Sheet ── */
function TncSheet({ onContinue }: { onContinue: () => void }) {
  const [accepted, setAccepted] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-40"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl z-50 p-6 shadow-[0_-8px_30px_rgb(0,0,0,0.12)]"
      >
        <div className="w-full max-w-sm mx-auto space-y-5">
          <h2 className="text-[18px] font-bold text-foreground text-center">T&C</h2>

          <label className="flex items-start gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setAccepted(!accepted)}
              className={`mt-0.5 w-5 h-5 shrink-0 border-2 rounded transition-colors flex items-center justify-center ${
                accepted ? 'bg-primary border-primary' : 'border-muted-foreground'
              }`}
            >
              {accepted && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className="text-[14px] text-foreground">
              click here to accept Terms & Conditions & Privacy Policy
            </span>
          </label>

          <p className="text-[14px] text-muted-foreground leading-relaxed">
            By signing in, creating an account i am agreeing to DigiVault{' '}
            <a href="#" className="text-primary underline">Terms & Conditions</a>{' '}
            and to our{' '}
            <a href="#" className="text-primary underline">Privacy Policy</a>
          </p>

          <Button
            onClick={onContinue}
            disabled={!accepted}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-lg font-medium text-base disabled:opacity-50"
          >
            Continue
          </Button>
        </div>
      </motion.div>
    </>
  );
}

/* ── Main Login Page ── */
export default function Login() {
  const navigate = useNavigate();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [pendingNav, setPendingNav] = useState<{ userStatus: string | null; isNewUser: boolean } | null>(null);

  const handleVerified = useCallback((result: VerifyResult) => {
    setPendingNav({ userStatus: result.userStatus, isNewUser: result.isNewUser });
  }, []);

  const handleTncContinue = () => {
    if (!pendingNav) return;
    setPendingNav(null);
    if (pendingNav.isNewUser) {
      navigate('/register-type');
    } else if (pendingNav.userStatus === "Active") {
      navigate('/dashboard');
    } else if (pendingNav.userStatus === "Pending Verification") {
      navigate('/pending');
    }
  };

  const flow = useOtpFlow(handleVerified);

  return (
    <div className="min-h-svh bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-[24px] font-bold text-foreground tracking-tight">Welcome to e-DigiVault</h1>
          <p className="text-[14px] text-muted-foreground">Secure Access to Documents</p>
        </div>

        <div className="space-y-6">
          <UnderlineInput
            label="Enter Your Mobile Number"
            icon={User}
            placeholder="9812546586"
            value={flow.phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => flow.setPhone(e.target.value)}
            disabled={flow.step === 'otp'}
          />

          <AnimatePresence>
            {flow.step === 'otp' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <UnderlineInput
                  label="Enter OTP"
                  icon={Eye}
                  type="password"
                  maxLength={6}
                  value={flow.otp}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => flow.verifyOtp(e.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    onClick={flow.resendOtp}
                    className="text-[13px] text-primary font-medium disabled:opacity-50"
                    disabled={flow.countdown > 0}
                  >
                    Resend Code {flow.countdown > 0 ? `(${flow.countdown}s)` : ''}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {flow.step === 'phone' && (
            <Button
              onClick={flow.sendOtp}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-lg font-medium text-base shadow-sm"
              disabled={flow.loading || flow.phone.length < 10}
            >
              {flow.loading ? <Loader2 className="animate-spin" /> : "Login"}
            </Button>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="text-primary underline font-medium"
            >
              Register
            </button>
          </p>
        </div>
      </div>

      {/* Register Bottom Sheet */}
      <AnimatePresence>
        {isRegisterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRegisterOpen(false)}
              className="absolute inset-0 bg-black/40 z-40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-background rounded-t-[20px] z-50 px-6 pt-8 pb-10 shadow-[0_-8px_30px_rgb(0,0,0,0.12)]"
            >
              <RegisterSheet onClose={() => setIsRegisterOpen(false)} onVerified={handleVerified} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* T&C Sheet */}
      <AnimatePresence>
        {pendingNav && <TncSheet onContinue={handleTncContinue} />}
      </AnimatePresence>
    </div>
  );
}

/* ── Register Sheet ── */
function RegisterSheet({ onClose, onVerified }: { onClose: () => void; onVerified: (r: VerifyResult) => void }) {
  const flow = useOtpFlow(onVerified);

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <h2 className="text-[18px] font-semibold text-primary text-center">Register</h2>

      <UnderlineInput
        label="Enter Your Mobile Number"
        icon={User}
        placeholder="9812546586"
        value={flow.phone}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => flow.setPhone(e.target.value)}
        disabled={flow.step === 'otp'}
      />

      <AnimatePresence>
        {flow.step === 'otp' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <UnderlineInput
              label="Enter OTP"
              icon={Eye}
              type="password"
              maxLength={6}
              value={flow.otp}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => flow.verifyOtp(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                onClick={flow.resendOtp}
                className="text-[13px] text-primary font-medium disabled:opacity-50"
                disabled={flow.countdown > 0}
              >
                Resend Code {flow.countdown > 0 ? `(${flow.countdown}s)` : ''}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {flow.step === 'phone' && (
        <Button
          onClick={flow.sendOtp}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-lg font-medium"
          disabled={flow.loading || flow.phone.length < 10}
        >
          {flow.loading ? <Loader2 className="animate-spin" /> : "Send OTP"}
        </Button>
      )}

      <div className="text-center">
        <button onClick={onClose} className="text-sm text-muted-foreground">
          Already have an account? <span className="text-primary underline">Login</span>
        </button>
      </div>
    </div>
  );
}
