import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Building, Shield, CheckCircle2, AlertTriangle, ArrowRight, Eye, EyeOff, Loader2, User, Mail, Clock, Lock, Sparkles, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logoImg from '../assets/logo.png';
import sideImg from '../assets/side_img.png';

interface InvitePreview {
  id: string;
  email: string;
  role: string;
  property_id: string;
  property_address: string;
  inviter_name: string;
  expires_at: string;
}

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '';

export function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { refreshContext } = useAuth();

  // Invite preview state
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState('');

  // Auth state
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Signup form state (for new users)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Accept action state
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');
  const [accepted, setAccepted] = useState(false);

  // ─── Load session ───────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── Load invite preview via edge function ──────────────────
  useEffect(() => {
    if (!token) {
      setPreviewError('No invitation token found in the URL. Please check your email link.');
      setPreviewLoading(false);
      return;
    }

    const fetchPreview = async () => {
      try {
        const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/accept-team-invite?token=${token}`, {
          headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '' }
        });
        const data = await res.json();

        if (!res.ok || data.error) {
          setPreviewError(data.error || 'Could not load invitation details. The link may have expired or already been used.');
        } else {
          setInvite(data);
        }
      } catch (err) {
        setPreviewError('Could not connect to the server. Please check your internet connection and try again.');
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchPreview();
  }, [token]);

  // ─── Accept for existing user ───────────────────────────────
  const handleAcceptExisting = async () => {
    if (!session || !token) return;
    setAccepting(true);
    setAcceptError('');

    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/accept-team-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAcceptError(data.error || 'Failed to accept the invitation. Please try again.');
        return;
      }

      setAccepted(true);
      localStorage.removeItem('pendingInviteToken');
      await refreshContext();

      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (err) {
      setAcceptError('An unexpected error occurred. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  // ─── Sign up + Accept for new users ────────────────────────
  const handleSignupAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite || !token) return;

    if (password !== confirmPassword) {
      setAcceptError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setAcceptError('Password must be at least 8 characters.');
      return;
    }

    setAccepting(true);
    setAcceptError('');

    try {
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName} ${lastName}`.trim(),
            mobile: mobile.trim(),
            role: invite.role,
          }
        }
      });

      if (signupError) {
        setAcceptError(signupError.message);
        return;
      }

      if (!signupData.session) {
        localStorage.setItem('pendingInviteToken', token);
        setAcceptError('Please check your email to confirm your account, then return to this page to complete accepting the invitation.');
        return;
      }

      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/accept-team-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${signupData.session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAcceptError(data.error || 'Account created, but failed to link the invitation. Please contact support.');
        return;
      }

      setAccepted(true);
      localStorage.removeItem('pendingInviteToken');
      await refreshContext();

      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (err: any) {
      setAcceptError(err.message || 'An unexpected error occurred.');
    } finally {
      setAccepting(false);
    }
  };

  // ─── Render: Accepted success screen ───────────────────────
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] p-4 font-sans">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md bg-white/70 backdrop-blur-3xl p-12 rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-white"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-28 h-28 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-8 border-8 border-white shadow-xl"
          >
            <CheckCircle2 className="w-14 h-14 text-emerald-500" />
          </motion.div>
          <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">You're in!</h1>
          <p className="text-slate-500 font-medium mb-1 text-lg">
            You now have access to <span className="text-slate-800 font-bold">{invite?.property_address}</span>
          </p>
          <p className="text-slate-400 text-sm mt-6 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Redirecting to dashboard...
          </p>
        </motion.div>
      </div>
    );
  }

  // ─── Render: Loading ────────────────────────────────────────
  if (previewLoading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-bold text-slate-800">Securing connection...</h2>
        </div>
      </div>
    );
  }

  // ─── Render: Error (invalid / expired token) ────────────────
  if (previewError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md bg-white/70 backdrop-blur-3xl rounded-[40px] border border-white p-12 shadow-[0_20px_60px_rgba(0,0,0,0.05)]"
        >
          <div className="w-24 h-24 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-8 border-8 border-white shadow-xl">
            <AlertTriangle className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Invalid Invitation</h1>
          <p className="text-slate-500 font-medium mb-10 text-base leading-relaxed">{previewError}</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-full font-bold hover:scale-105 transition-transform shadow-lg">
            Return Home <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  const emailMismatch = session && invite && session.user?.email?.toLowerCase() !== invite.email.toLowerCase();

  return (
    <div className="min-h-screen w-full relative bg-[#0f172a] font-sans">
      
      {/* Left Panel - Auth Area */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col absolute left-0 top-0 bottom-0 p-6 lg:p-12 items-center justify-center min-h-screen z-20 bg-[#f8fafc] lg:rounded-r-[40px] shadow-[20px_0_40px_rgba(0,0,0,0.1)] overflow-hidden">
        
        {/* Subtle Aurora Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-[30%] right-[-20%] w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Logo Area */}
        <div className="absolute top-6 left-6 lg:top-10 lg:left-10 flex items-center gap-2.5 z-10">
          <img src={logoImg} alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-[#0f172a] text-[18px] tracking-tight">Property Ledge</span>
        </div>

        {/* Main Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[440px] bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-10 border border-slate-100 flex flex-col items-center relative z-10"
        >
          <h1 className="text-[32px] font-bold text-[#0f172a] mb-2 text-center tracking-tight">Team Invitation</h1>
          <p className="text-[#64748b] font-bold text-[10px] tracking-[0.15em] uppercase mb-8 text-center">Join the Management Team</p>
          
          {(() => {
            const roleConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
              Agent: { color: 'text-blue-600', bg: 'bg-blue-50', icon: <User className="w-3.5 h-3.5" /> },
              Strata: { color: 'text-violet-600', bg: 'bg-violet-50', icon: <Building className="w-3.5 h-3.5" /> },
              Manager: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <Shield className="w-3.5 h-3.5" /> },
            };
            const cfg = roleConfig[invite?.role || ''] || roleConfig['Manager'];
            return (
              <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full ${cfg.bg} ${cfg.color} mb-6`}>
                {cfg.icon}
                <span className="text-[10px] font-bold uppercase tracking-widest">{invite?.role} Role</span>
              </div>
            );
          })()}

          <h2 className="text-[28px] font-bold text-[#0f172a] text-center leading-tight">{invite?.property_address}</h2>
          <p className="text-[14px] font-semibold text-[#64748b] mt-1.5 mb-8 text-center">Invited by {invite?.inviter_name}</p>

          <div className="w-full h-px bg-slate-100 mb-8" />

          {/* Action Area */}
          <div className="w-full relative min-h-[220px]">
            {acceptError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm font-bold flex gap-2 items-center"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p className="text-sm">{acceptError}</p>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {/* ─── CASE 1: Logged in, email matches ─── */}
              {session && !emailMismatch && (
                <motion.div 
                  key="case-match"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center absolute inset-0 w-full"
                >
                  <p className="text-[#64748b] text-[13px] font-medium mb-1">This invite is securely meant for</p>
                  <p className="font-bold text-[#451a03] text-[14px] mb-4">{invite?.email}</p>
                  
                  <p className="text-[#64748b] text-[13px] font-medium mb-1">And you're correctly logged in as</p>
                  <p className="font-bold text-[#451a03] text-[14px] mb-8">{session.user?.email}.</p>
                  
                  <button
                    onClick={handleAcceptExisting}
                    disabled={accepting}
                    className="w-full bg-[#0a5cff] hover:bg-blue-700 text-white font-bold py-3.5 rounded-full transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 text-[15px] disabled:opacity-70"
                  >
                    {accepting ? <Loader2 className="w-5 h-5 animate-spin" /> : <> <CheckCircle2 className="w-5 h-5" /> Accept Invitation </>}
                  </button>
                </motion.div>
              )}

              {/* ─── CASE 2: Logged in, email DOESN'T match ─── */}
              {session && emailMismatch && (
                <motion.div 
                  key="case-mismatch"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center absolute inset-0 w-full"
                >
                  <p className="text-[#64748b] text-[13px] font-medium mb-1">This invite is securely meant for</p>
                  <p className="font-bold text-[#451a03] text-[14px] mb-4">{invite?.email}</p>
                  
                  <p className="text-[#64748b] text-[13px] font-medium mb-1">But you're currently logged in as</p>
                  <p className="font-bold text-[#451a03] text-[14px] mb-8">{session.user?.email}.</p>

                  <button
                    onClick={async () => { await supabase.auth.signOut(); }}
                    className="w-full bg-[#0a5cff] hover:bg-blue-700 text-white font-bold py-3.5 rounded-full transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 text-[15px]"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Sign Out & Switch Account
                  </button>
                </motion.div>
              )}

              {/* ─── CASE 3: Not logged in ─── */}
              {!session && invite && (
                <motion.div 
                  key="case-signup"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <form onSubmit={handleSignupAndAccept} className="space-y-4">
                    {/* Locked Email */}
                    <div>
                      <div className="relative">
                        <input
                          type="email"
                          value={invite.email}
                          disabled
                          className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-3.5 text-slate-500 font-medium text-[13px] cursor-not-allowed"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          placeholder="First Name"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-[#0f172a] font-medium text-[13px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                        />
                        <input
                          type="text"
                          required
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          placeholder="Last Name"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-[#0f172a] font-medium text-[13px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                        />
                      </div>

                      <input
                        type="tel"
                        required
                        value={mobile}
                        onChange={e => setMobile(e.target.value)}
                        placeholder="Mobile Number"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-[#0f172a] font-medium text-[13px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 mt-3"
                      />
                    </motion.div>

                    <div className="relative mt-3">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Create a Password"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 pr-10 text-[#0f172a] font-medium text-[13px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors bg-white w-7 h-7 rounded-md flex items-center justify-center"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="relative mt-3">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Confirm Password"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 pr-10 text-[#0f172a] font-medium text-[13px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={accepting}
                      className="w-full bg-[#0a5cff] hover:bg-blue-700 text-white font-bold py-4 rounded-full transition-all flex items-center justify-center gap-2 text-[15px] mt-4 disabled:opacity-70 shadow-md shadow-blue-500/20"
                    >
                      {accepting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign Up & Continue'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Right Panel - Features & Image */}
      <div className="hidden lg:flex w-full lg:w-[60%] xl:w-[65%] bg-[#0f172a] absolute right-0 top-0 bottom-0 h-screen overflow-hidden items-center z-10">
        
        {/* Full-bleed Background Image */}
        <div className="absolute inset-0 w-full h-full z-0">
          <img 
            src={sideImg} 
            alt="Building" 
            className="w-full h-full object-cover object-[center_right]" 
          />
        </div>

        {/* Text Content */}
        <div className="relative z-10 pr-12 py-12 pl-28 xl:pr-20 xl:py-20 xl:pl-36 flex flex-col justify-start pt-[12vh] xl:pt-[15vh] h-full max-w-[650px]">
          {/* Top text over light sky remains dark */}
          <h2 className="text-[44px] xl:text-[52px] font-bold text-[#0f172a] leading-[1.1] mb-5 tracking-tight drop-shadow-sm">
            Manage Properties,<br /><span className="text-[#0a5cff]">Effortlessly.</span>
          </h2>
          <p className="text-[#1e293b] text-[15px] xl:text-[16px] font-medium max-w-[400px] leading-relaxed drop-shadow-sm">
            Collaborate seamlessly with agents, strata, and landlords to streamline your property management.
          </p>
        </div>
      </div>
    </div>
  );
}
