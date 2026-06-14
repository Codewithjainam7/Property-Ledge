import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Building, Calendar, Wallet, Check, AlertTriangle, FileText, Sparkles, User, Mail, PenTool, RefreshCw, Home, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ─── Animated Welcome Splash ───
function WelcomeSplash({ tenantName, onComplete }: { tenantName: string; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  // Generate floating particle positions
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 6 + 2,
    delay: Math.random() * 1.5,
    duration: Math.random() * 3 + 2,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0d0e12 0%, #1a1b2e 50%, #0d0e12 100%)' }}
    >
      {/* Animated particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.id % 3 === 0
              ? 'rgba(129, 140, 248, 0.6)'
              : p.id % 3 === 1
              ? 'rgba(99, 102, 241, 0.4)'
              : 'rgba(165, 180, 252, 0.3)',
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0.5, 0],
            scale: [0, 1.5, 1, 0],
            y: [0, -80, -160],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Radial glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-violet-500/15 blur-[100px] pointer-events-none translate-y-20" />

      <div className="relative z-10 text-center px-6 max-w-lg">
        {/* Animated icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="w-24 h-24 mx-auto mb-8 rounded-[28px] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 relative"
        >
          <Home className="w-12 h-12 text-white" />
          <motion.div
            className="absolute -inset-3 rounded-[36px] border-2 border-indigo-400/30"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        {/* Welcome text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-3">
            Welcome Home{tenantName ? `, ${tenantName}` : ''}!
          </h1>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '60%' }}
            transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}
            className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full mx-auto mb-5"
          />
          <p className="text-base sm:text-lg text-slate-400 font-semibold leading-relaxed">
            Your landlord has invited you to <span className="text-indigo-400 font-bold">PropertyLedge</span>. Let's finalize your lease and unlock your premium resident portal.
          </p>
        </motion.div>

        {/* Stars animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex items-center justify-center gap-1 mt-8"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 1.4 + i * 0.1, type: 'spring', stiffness: 300 }}
            >
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </motion.div>
          ))}
        </motion.div>

        {/* Loading indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-10 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-[0.2em]"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </motion.div>
          Preparing your dashboard...
        </motion.div>
      </div>
    </motion.div>
  );
}

export function Welcome() {
  const { session, userContext } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tenantRecord, setTenantRecord] = useState<any>(null);
  const [propertyRecord, setPropertyRecord] = useState<any>(null);
  const [leaseRecord, setLeaseRecord] = useState<any>(null);
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    async function fetchHandshakeDetails() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // See if there's an original invite email stored from the signup process
        const storedInviteEmail = localStorage.getItem('pendingInviteEmail');
        const searchEmail = storedInviteEmail || session.user.email;

        // Fetch handshake details using the secure RPC to bypass RLS
        const { data: handshakeData, error: handshakeErr } = await supabase.rpc('get_pending_handshake', {
          p_email: searchEmail
        });

        if (handshakeErr) throw handshakeErr;

        if (!handshakeData || !handshakeData.tenant) {
          // No pending invite found. The user might be logging in normally, not accepting a lease.
          setTenantRecord(null);
          setLoading(false);
          return;
        }

        const { tenant, property, lease } = handshakeData;

        setTenantRecord(tenant);
        if (tenant.first_name) {
          setFirstName(tenant.first_name);
        }
        setPropertyRecord(property);
        setLeaseRecord(lease);

      } catch (err: any) {
        console.error("Error fetching handshake details:", err);
        setError(err.message || "Failed to load lease details.");
      } finally {
        setLoading(false);
      }
    }

    fetchHandshakeDetails();
  }, [session]);

  // Canvas Handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
  }, [tenantRecord, showSplash]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const endDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        setHasSigned(true);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    setHasSigned(false);
  };

  const handleAcceptLease = async () => {
    if (!tenantRecord || !propertyRecord) return;
    if (!agreeChecked) {
      setError("Please check the confirmation box to agree to the lease terms.");
      return;
    }
    if (!hasSigned) {
      setError("Please sign in the digital signature pad before continuing.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Signature pad not found.");
      const signatureDataUrl = canvas.toDataURL('image/png');

      // Call accept_lease RPC
      const { error: rpcErr } = await supabase.rpc('accept_lease', {
        p_property_id: propertyRecord.id,
        p_signature_data: signatureDataUrl,
        p_tenant_record_id: tenantRecord.id
      });

      if (rpcErr) throw rpcErr;

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard/my-lease');
        window.location.reload();
      }, 3000);

    } catch (err: any) {
      console.error("Failed to accept lease handshake:", err);
      setError(err.message || "Could not complete the handshake. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0e12] flex items-center justify-center p-6 text-white">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm font-bold tracking-widest uppercase text-slate-400">Loading handshake portal...</p>
        </div>
      </div>
    );
  }

  // Redirect if they don't have a pending invite
  if (!tenantRecord) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      {/* Welcome Splash Overlay */}
      <AnimatePresence>
        {showSplash && (
          <WelcomeSplash
            tenantName={tenantRecord?.first_name || ''}
            onComplete={() => setShowSplash(false)}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-[#0d0e12] text-white flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden">
        {/* Decorative Blur Spheres */}
        <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[160px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: showSplash ? 0 : 1, y: showSplash ? 30 : 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full max-w-4xl bg-white/5 border border-white/10 backdrop-blur-3xl rounded-[40px] shadow-2xl p-6 sm:p-10 md:p-12 relative z-10 space-y-8"
        >
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12 space-y-6"
              >
                <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Check className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight font-display">Digital Handshake Complete!</h2>
                  <p className="text-slate-400 max-w-md mx-auto text-sm sm:text-base font-semibold">
                    Welcome to PropertyLedge. Your lease is now active, and your resident dashboard is being initialized.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">
                  <Sparkles className="w-4 h-4 text-emerald-400" /> Redirecting to portal...
                </div>
              </motion.div>
            ) : (
              <motion.div key="handshake" className="space-y-8">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary-light px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
                    <Sparkles className="w-3.5 h-3.5" /> Tenant Onboarding
                  </div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight font-display">
                    Finalize Your Digital Handshake
                  </h2>
                  <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base font-semibold">
                    Review lease terms, sign digitally, and unlock your premium PropertyLedge tenant portal.
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-2xl text-sm font-semibold flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Step Sections grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Side: Lease details */}
                  <div className="bg-white/5 border border-white/5 rounded-[32px] p-6 sm:p-8 space-y-6">
                    <h3 className="text-lg font-black tracking-wider uppercase text-slate-300 border-b border-white/10 pb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" /> Lease Summary
                    </h3>

                    <div className="space-y-5">
                      {/* Property address */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-300 border border-white/10 shrink-0">
                          <Building className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Residency Address</span>
                          <span className="text-base font-bold text-white leading-snug">
                            {propertyRecord?.address}, {propertyRecord?.suburb}, {propertyRecord?.state} {propertyRecord?.postcode}
                          </span>
                        </div>
                      </div>

                      {/* Rent amount */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-300 border border-white/10 shrink-0">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Weekly Rent</span>
                          <span className="text-base font-bold text-white">
                            ${leaseRecord?.rent_amount || propertyRecord?.rent_amount || 'N/A'} per week
                          </span>
                        </div>
                      </div>

                      {/* Lease duration */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-300 border border-white/10 shrink-0">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Lease Start Date</span>
                          <span className="text-base font-bold text-white">
                            {leaseRecord?.start_date ? new Date(leaseRecord.start_date).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Landlord Info */}
                      <div className="flex items-start gap-4 pt-4 border-t border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-300 border border-white/10 shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Managed By Owner</span>
                          <span className="text-sm font-semibold text-white">Landlord Admin</span>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                            <Mail className="w-3.5 h-3.5" />
                            <span>Portal notifications enabled</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Signature Canvas */}
                  <div className="bg-white/5 border border-white/5 rounded-[32px] p-6 sm:p-8 flex flex-col justify-between space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-black tracking-wider uppercase text-slate-300 flex items-center gap-2">
                        <PenTool className="w-5 h-5 text-primary" /> Digital Signature
                      </h3>
                      <p className="text-xs font-semibold text-slate-400 leading-relaxed">
                        Use your mouse cursor or touch screen to draw your official signature inside the signature box below.
                      </p>
                    </div>

                    {/* Canvas container */}
                    <div className="bg-white rounded-2xl border border-white/10 overflow-hidden relative shadow-inner h-[180px]">
                      <canvas 
                        ref={canvasRef}
                        width={400}
                        height={180}
                        onMouseDown={startDrawing}
                        onMouseUp={endDrawing}
                        onMouseLeave={endDrawing}
                        onMouseMove={draw}
                        onTouchStart={startDrawing}
                        onTouchEnd={endDrawing}
                        onTouchMove={draw}
                        className="w-full h-full cursor-crosshair bg-white"
                      />
                      <button 
                        onClick={clearCanvas}
                        className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white border border-white/10 font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-md"
                      >
                        Clear
                      </button>
                    </div>

                    {/* Agree Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group text-left">
                      <input 
                        type="checkbox"
                        checked={agreeChecked}
                        onChange={e => setAgreeChecked(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary focus:ring-offset-slate-900 focus:ring-2 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors leading-relaxed">
                        I hereby accept the lease details, rent specifications, and digitally sign this lease agreement to initialize my PropertyLedge dashboard access.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Action Button footer */}
                <div className="pt-6 border-t border-white/10 flex justify-end">
                  <button
                    onClick={handleAcceptLease}
                    disabled={submitting || !agreeChecked || !hasSigned}
                    className="w-full sm:w-auto px-10 py-4.5 bg-white text-slate-950 hover:bg-slate-200 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed transition-all font-black text-sm uppercase tracking-widest rounded-full shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                    ) : (
                      <><Check className="w-4 h-4" /> Confirm & Enter Portal</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
