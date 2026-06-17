import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Building, Shield, CheckCircle2, AlertTriangle, ArrowRight, Eye, EyeOff, Loader2, User, Mail, Clock, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
      // Clear the stored invite token
      localStorage.removeItem('pendingInviteToken');

      // Refresh the context so they are recognized as a team member immediately
      await refreshContext();

      // Redirect to dashboard after a short celebration delay
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
      // Create the account
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
        // Email confirmation required — store token and ask them to verify
        localStorage.setItem('pendingInviteToken', token);
        setAcceptError('Please check your email to confirm your account, then return to this page to complete accepting the invitation.');
        return;
      }

      // Now accept the invite with the new session
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

      // Refresh the context so they are recognized as a team member immediately
      await refreshContext();

      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (err: any) {
      setAcceptError(err.message || 'An unexpected error occurred.');
    } finally {
      setAccepting(false);
    }
  };

  const calculateStrength = (pass: string) => {
    let s = 0;
    if (pass.length > 7) s += 25;
    if (pass.length > 12) s += 25;
    if (pass.match(/[A-Z]/)) s += 15;
    if (pass.match(/[0-9]/)) s += 15;
    if (pass.match(/[^a-zA-Z0-9]/)) s += 20;
    return Math.min(100, s);
  };

  const roleColor = (role: string) => {
    if (role === 'Manager') return 'text-purple-600 bg-purple-50 border-purple-200';
    if (role === 'Agent') return 'text-blue-600 bg-blue-50 border-blue-200';
    if (role === 'Strata') return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  // ─── Render: Accepted success screen ───────────────────────
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8f9fc] to-white p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </motion.div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">You're in!</h1>
          <p className="text-slate-500 font-medium mb-1">
            You now have access to <span className="text-slate-700 font-bold">{invite?.property_address}</span>
          </p>
          <p className="text-slate-400 text-sm">Redirecting you to your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  // ─── Render: Loading ────────────────────────────────────────
  if (previewLoading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8f9fc] to-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  // ─── Render: Error (invalid / expired token) ────────────────
  if (previewError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8f9fc] to-white p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md bg-white rounded-3xl border border-slate-200 p-10 shadow-xl"
        >
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-3">Invalid Invitation</h1>
          <p className="text-slate-500 font-medium mb-8 text-sm leading-relaxed">{previewError}</p>
          <Link to="/" className="text-primary font-bold hover:underline text-sm">
            Return to Property Ledge →
          </Link>
        </motion.div>
      </div>
    );
  }

  const emailMismatch = session && invite && session.user?.email?.toLowerCase() !== invite.email.toLowerCase();

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-gradient-to-b from-[#f8f9fc] via-white to-[#f8f9fc]">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-primary/8 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-400/8 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[520px] relative z-10"
      >
        {/* Property Ledge brand */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <Building className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">PropertyLedge</span>
          </Link>
        </div>

        <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] border border-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-100 flex items-center justify-center shrink-0 border border-primary/20">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Team Invitation</p>
                <h1 className="text-2xl font-black text-slate-900 leading-tight">You've been invited!</h1>
              </div>
            </div>
          </div>

          {/* Invite details card */}
          <div className="px-8 py-6 bg-slate-50/60 border-b border-slate-100">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Property</span>
                  <span className="font-bold text-slate-800 text-sm">{invite?.property_address}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Invited by</span>
                  <span className="font-bold text-slate-800 text-sm">{invite?.inviter_name}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">For email</span>
                  <span className="font-bold text-slate-800 text-sm">{invite?.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Expires</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {invite?.expires_at ? new Date(invite.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                  </span>
                </div>
              </div>
              <div className="pt-1">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${invite?.role ? roleColor(invite.role) : ''}`}>
                  Role: {invite?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Main action area */}
          <div className="px-8 py-8">
            {acceptError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-semibold flex gap-3 items-start"
              >
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{acceptError}</p>
              </motion.div>
            )}

            {/* ─── CASE 1: Logged in, email matches ─── */}
            {session && !emailMismatch && (
              <div className="text-center">
                <p className="text-slate-500 text-sm font-medium mb-6">
                  You're logged in as <span className="font-bold text-slate-800">{session.user?.email}</span>. Click below to accept this invitation.
                </p>
                <button
                  onClick={handleAcceptExisting}
                  disabled={accepting}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-base disabled:opacity-60"
                >
                  {accepting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Accept Invitation <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ─── CASE 2: Logged in, email DOESN'T match ─── */}
            {session && emailMismatch && (
              <div className="text-center space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-amber-700 text-sm font-semibold">
                    This invite is for <span className="font-black">{invite?.email}</span>, but you're logged in as <span className="font-black">{session.user?.email}</span>.
                  </p>
                  <p className="text-amber-600 text-xs font-medium mt-1">Please sign out and then open this link again.</p>
                </div>
                <button
                  onClick={async () => { await supabase.auth.signOut(); }}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-2xl transition-colors text-sm"
                >
                  Sign Out &amp; Switch Account
                </button>
              </div>
            )}

            {/* ─── CASE 3: Not logged in ─── */}
            {!session && invite && (
              <div>
                <p className="text-center text-slate-500 text-sm font-medium mb-6">
                  Create a free account to accept this invitation and access the property dashboard.
                </p>
                <form onSubmit={handleSignupAndAccept} className="space-y-4">
                  {/* Email — locked to invite email */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={invite.email}
                      disabled
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-500 font-bold text-sm cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-400 font-medium mt-1 ml-1">Email is locked to the invited address.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">First Name</label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="Sarah"
                        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-medium text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Last Name</label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Jenkins"
                        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-medium text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mobile Number</label>
                    <input
                      type="tel"
                      required
                      value={mobile}
                      onChange={e => setMobile(e.target.value)}
                      placeholder="+61 400 000 000"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-medium text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Set Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 pr-11 text-slate-900 font-medium text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {password && (
                      <div className="mt-2">
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${calculateStrength(password) < 40 ? 'bg-red-400' : calculateStrength(password) < 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${calculateStrength(password)}%` }}
                          />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                          {calculateStrength(password) < 40 ? 'Weak' : calculateStrength(password) < 80 ? 'Good' : 'Strong'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-medium text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={accepting}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-sm mt-2 disabled:opacity-60"
                  >
                    {accepting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Create Account &amp; Accept Invitation <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-400 font-medium">
                    Already have a Property Ledge account?{' '}
                    <Link
                      to={`/login?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
                      className="text-primary font-bold hover:underline"
                    >
                      Log in instead
                    </Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 font-medium mt-6">
          Property Ledge — Secure team access management
        </p>
      </motion.div>
    </div>
  );
}
