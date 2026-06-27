import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle2, AlertTriangle, ArrowRight, Eye, EyeOff, Loader2, Mail, Lock, FileText, Clock, RefreshCw, MessageSquare } from 'lucide-react';
import logoImg from '../assets/logo.png';
import sideImg from '../assets/side_img.png';

interface TenantInvitePreview {
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  property_address: string;
  property_suburb: string;
  passcode?: string | null;
}

export function AcceptTenantInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  // Invite preview state
  const [invite, setInvite] = useState<TenantInvitePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState('');

  // Auth state
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Signup form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');
  const [accepted, setAccepted] = useState(false);
  
  const [isLoginMode, setIsLoginMode] = useState(false);

  // OTP Verification state
  const [isPasscodeVerified, setIsPasscodeVerified] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

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

  // Load invite preview via RPC
  useEffect(() => {
    if (!token) {
      setPreviewError('No invitation token found in the URL. Please check your email link.');
      setPreviewLoading(false);
      return;
    }

    const fetchPreview = async () => {
      try {
        const { data, error } = await supabase.rpc('get_tenant_invite_preview', { p_token: token });
        
        if (error || !data) {
          setPreviewError('Could not load invitation details. The link may have expired, or you have already accepted it.');
          setInvite(data);
          setFirstName(data.first_name || '');
          setLastName(data.last_name || '');
          setIsPasscodeVerified(true);
        }
      } catch (err) {
        setPreviewError('Could not connect to the server. Please check your internet connection.');
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchPreview();
  }, [token]);

  // Verify passcode
  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError('');
    if (!invite?.passcode || passcodeInput.trim() === invite?.passcode) {
      setIsPasscodeVerified(true);
    } else {
      setPasscodeError('Invalid 6-digit passcode. Please check your email.');
    }
  };

  // ─── Accept for existing user ───────────────────────────────
  const handleAcceptExisting = async () => {
    if (!session || !token || !invite) return;
    setAccepting(true);
    setAcceptError('');

    try {
      const { data: success, error: rpcError } = await supabase.rpc('accept_tenant_invite', {
        p_token: token,
        p_user_id: session.user.id
      });

      if (rpcError || !success) {
        setAcceptError('Failed to accept the invitation. Please try again.');
        return;
      }

      setAccepted(true);
      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (err) {
      setAcceptError('An unexpected error occurred. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  // Log in + Accept for existing user
  const handleLoginAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite || !token) return;
    
    setAccepting(true);
    setAcceptError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password
      });

      if (authError || !authData.user) {
        setAcceptError('Invalid password or account does not exist. Please switch to Sign Up.');
        setAccepting(false);
        return;
      }

      // Automatically accept invite now that they are logged in
      const { data: success, error: rpcError } = await supabase.rpc('accept_tenant_invite', {
        p_token: token,
        p_user_id: authData.user.id
      });

      if (rpcError || !success) {
        setAcceptError('Logged in successfully, but failed to accept the invitation.');
        return;
      }

      setAccepted(true);
      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (err) {
      setAcceptError('An unexpected error occurred while logging in. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  // Sign up + Accept for Tenant
  const handleSignupAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite || !token) return;

    if (password.length < 8) {
      setAcceptError('Password must be at least 8 characters.');
      return;
    }

    setAccepting(true);
    setAcceptError('');

    try {
      // 1. Create Auth Account
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName} ${lastName}`.trim(),
            mobile: mobile.trim(),
            role: 'Tenant', // Explicitly tenant
          }
        }
      });

      if (signupError) {
        setAcceptError(signupError.message);
        setAccepting(false);
        return;
      }

      if (!signupData.user) {
        setAcceptError('Failed to create account.');
        setAccepting(false);
        return;
      }

      // 2. Consume Token via RPC
      const { data: success, error: rpcError } = await supabase.rpc('accept_tenant_invite', {
        p_token: token,
        p_user_id: signupData.user.id
      });

      if (rpcError || !success) {
        setAcceptError('Account created, but failed to link the property. Please contact your landlord.');
        setAccepting(false);
        return;
      }

      // 3. Success!
      setAccepted(true);

      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err: any) {
      setAcceptError(err.message || 'An unexpected error occurred.');
      setAccepting(false);
    }
  };

  // ─── Render: Accepted success screen ───────────────────────
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7fb] p-4 font-sans relative overflow-hidden">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 text-center max-w-md bg-white p-12 rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-white overflow-hidden"
        >
          <div className="relative z-10">
            <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-8 border border-emerald-100 text-emerald-500">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">You're home!</h1>
            <p className="text-slate-500 font-medium mb-1 text-base">
              Your resident portal for <br/> <span className="text-slate-800 font-bold">{invite?.property_address}</span> <br/> is ready.
            </p>
            <p className="text-slate-400 text-xs mt-8 flex items-center justify-center gap-2 font-bold uppercase tracking-widest">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> Redirecting...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Render: Loading ────────────────────────────────────────
  if (previewLoading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7fb] font-sans">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-6" />
          <h2 className="text-lg font-bold text-slate-800">Securing connection...</h2>
        </div>
      </div>
    );
  }

  // ─── Render: Error (invalid / expired token) ────────────────
  if (previewError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7fb] p-4 font-sans relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md bg-white rounded-[32px] border border-white p-12 shadow-[0_8px_32px_rgba(0,0,0,0.05)] relative z-10"
        >
          <div className="w-24 h-24 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-8 border border-rose-100 text-rose-500">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">Link Expired</h1>
          <p className="text-slate-500 font-medium mb-10 text-sm leading-relaxed">{previewError}</p>
          <Link to="/" className="inline-flex items-center justify-center w-full gap-2 bg-blue-500 text-white px-8 py-4 rounded-full font-bold hover:bg-blue-600 transition-all text-base shadow-lg shadow-blue-500/30">
            Return Home <ArrowRight className="w-5 h-5" />
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
          <h1 className="text-[32px] font-bold text-[#0f172a] mb-2 text-center tracking-tight">Resident Portal</h1>
          <p className="text-[#64748b] font-bold text-[10px] tracking-[0.15em] uppercase mb-8 text-center">Activate Your Digital Lease</p>
          
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 mb-6">
            <Lock className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Secure Invite</span>
          </div>

          <h2 className="text-[28px] font-bold text-[#0f172a] text-center leading-tight">{invite?.property_address}</h2>
          <p className="text-[14px] font-semibold text-[#64748b] mt-1.5 mb-8 text-center">{invite?.property_suburb}</p>

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

            {!isPasscodeVerified ? (
              <></>
            ) : (
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
                  key={isLoginMode ? "case-login" : "case-signup"}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <form onSubmit={isLoginMode ? handleLoginAndAccept : handleSignupAndAccept} className="space-y-4">
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

                    {!isLoginMode && (
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
                    )}

                    <div className="relative mt-3">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={isLoginMode ? "Enter Your Password" : "Create a Password"}
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

                    <button
                      type="submit"
                      disabled={accepting}
                      className="w-full bg-[#0a5cff] hover:bg-blue-700 text-white font-bold py-4 rounded-full transition-all flex items-center justify-center gap-2 text-[15px] mt-4 disabled:opacity-70 shadow-md shadow-blue-500/20"
                    >
                      {accepting ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLoginMode ? 'Log In & Accept' : 'Sign Up & Continue')}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
            )}
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
            All Your Property<br />Needs, <span className="text-[#0a5cff]">In One Place</span>
          </h2>
          <p className="text-[#1e293b] text-[15px] xl:text-[16px] font-medium max-w-[400px] leading-relaxed drop-shadow-sm">
            Access your lease, payments, maintenance, documents, and more — anytime, anywhere.
          </p>
        </div>
      </div>
    </div>
  );
}
