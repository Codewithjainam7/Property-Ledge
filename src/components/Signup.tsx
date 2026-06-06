import React, { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Button } from '@mui/material';
import { Building, ClipboardList, Users, UserCircle2, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function Signup() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // OTP Verification State
  const [needsVerification, setNeedsVerification] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  
  const calculateStrength = (pass: string) => {
    let strength = 0;
    if (pass.length > 7) strength += 25;
    if (pass.length > 12) strength += 25;
    if (pass.match(/[A-Z]/)) strength += 15;
    if (pass.match(/[0-9]/)) strength += 15;
    if (pass.match(/[^a-zA-Z0-9]/)) strength += 20;
    return Math.min(100, strength);
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let pass = "";
    for (let i = 0; i < 16; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    setConfirmPassword(pass);
    setShowPassword(true);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    
    if (error) {
      setError(error.message);
    }
  };

  const handleNext = (e: FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
      setError(null);
      setStep(2);
    }
  };

  const handleCompleteSetup = async () => {
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${fname} ${lname}`.trim(),
          mobile,
          role
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data?.session) {
      // If Email Confirmation is turned OFF in Supabase, you get a session immediately.
      navigate('/dashboard');
    } else {
      // If Email Confirmation is ON, session is null until they verify the OTP.
      setNeedsVerification(true);
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'signup'
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.session) {
      navigate('/dashboard');
    }
  };

  const roles = [
    { id: 'landlord', icon: Building, title: 'Landlord', desc: 'I self-manage my own properties' },
    { id: 'manager', icon: ClipboardList, title: 'Property Manager', desc: 'I manage properties on behalf of owners' },
    { id: 'agent', icon: Users, title: 'Real Estate Agent', desc: 'I am part of a property management team' },
    { id: 'tenant', icon: UserCircle2, title: 'Tenant', desc: 'I am renting a property' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden"
    >
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f8f9fc] via-white to-[#f8f9fc] z-0"></div>

      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-primary/10 blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none z-0"></div>

      <div className="w-full max-w-[560px] p-6 sm:p-10 md:p-12 rounded-[32px] relative z-10 bg-white/80 backdrop-blur-2xl shadow-2xl border border-white text-on-surface">
        <div className="flex justify-between items-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-all font-bold text-xs tracking-widest uppercase group">
             <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to home
          </Link>
          {!needsVerification && (
            <div className="text-[10px] font-black text-[#4a4a5e] bg-gray-100 border border-gray-200 rounded-full px-3 py-1 flex items-center gap-1 shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Step {step} of 2
            </div>
          )}
        </div>
        
        {needsVerification ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl md:text-[38px] font-black text-[#1c1c28] mb-2 tracking-tight leading-tight">Check your email</h2>
            <p className="text-sm text-[#4a4a5e] mb-8 font-medium">We've sent a 6-digit verification code to {email}.</p>
            {error && <div className="p-3 mb-6 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">{error}</div>}
            
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-[#4a4a5e] uppercase tracking-widest pl-1 text-center block">Verification Code</label>
                <input 
                  type="text" 
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="12345678" 
                  maxLength={8}
                  required
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-center text-2xl tracking-[0.4em] font-black text-[#1c1c28] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-300" 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading || otpCode.length < 6}
                className="w-full relative group overflow-hidden bg-[#22333b] text-white font-bold uppercase tracking-wider rounded-2xl py-4 mt-4 hover:bg-[#111a1e] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'VERIFY & CONTINUE'}
              </button>
            </form>
          </motion.div>
        ) : step === 1 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl md:text-[38px] font-black text-[#1c1c28] mb-2 tracking-tight leading-tight">Create your account</h2>
            <p className="text-sm text-[#4a4a5e] mb-8 font-medium">Start your 14-day free trial. No credit card required.</p>
            {error && <div className="p-3 mb-6 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">{error}</div>}
            <form onSubmit={handleNext} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                 <div className="space-y-2">
                  <label className="block text-[10px] font-black text-[#4a4a5e] uppercase tracking-widest">First name</label>
                  <input type="text" placeholder="Sarah" required value={fname} onChange={(e) => setFname(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-[#1c1c28] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium placeholder:text-gray-400 text-sm" />
                 </div>
                 <div className="space-y-2">
                  <label className="block text-[10px] font-black text-[#4a4a5e] uppercase tracking-widest">Last name</label>
                  <input type="text" placeholder="Jenkins" required value={lname} onChange={(e) => setLname(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-[#1c1c28] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium placeholder:text-gray-400 text-sm" />
                 </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                 <div className="space-y-2">
                  <label className="block text-[10px] font-black text-[#4a4a5e] uppercase tracking-widest">Email address</label>
                  <input type="email" placeholder="sarah@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-[#1c1c28] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium placeholder:text-gray-400 text-sm" />
                 </div>
                 <div className="space-y-2">
                  <label className="block text-[10px] font-black text-[#4a4a5e] uppercase tracking-widest">Mobile number</label>
                  <input type="tel" placeholder="+61 400 000 000" required value={mobile} onChange={(e) => setMobile(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-[#1c1c28] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium placeholder:text-gray-400 text-sm" />
                 </div>
              </div>
              <div className="pt-2 border-t border-gray-100">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                   <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-black text-[#4a4a5e] uppercase tracking-widest">Password</label>
                        <button type="button" onClick={generatePassword} className="text-[10px] font-black text-primary hover:text-primary/80 uppercase tracking-wider transition-colors">Generate</button>
                      </div>
                      <div className="relative">
                        <input type={showPassword ? "text" : "password"} placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 pr-10 text-[#1c1c28] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium placeholder:text-gray-400 text-sm" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1c1c28] transition-colors">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="block text-[10px] font-black text-[#4a4a5e] uppercase tracking-widest">Confirm Password</label>
                      <div className="relative">
                        <input type={showPassword ? "text" : "password"} placeholder="••••••••" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-[#1c1c28] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium placeholder:text-gray-400 text-sm" />
                      </div>
                   </div>
                 </div>
                 {password && (
                   <div className="mt-4">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-black text-[#4a4a5e] uppercase tracking-wider">Password Strength</span>
                        <span className="text-[10px] font-black text-[#1c1c28]">{calculateStrength(password) < 40 ? 'Weak' : calculateStrength(password) < 80 ? 'Good' : 'Strong'}</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${calculateStrength(password) < 40 ? 'bg-red-500' : calculateStrength(password) < 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${calculateStrength(password)}%` }}></div>
                      </div>
                   </div>
                 )}
              </div>
              <button type="submit" className="w-full relative group overflow-hidden bg-[#22333b] text-white font-bold uppercase tracking-wider rounded-2xl py-4 mt-8 hover:bg-[#111a1e] transition-all shadow-lg flex items-center justify-center gap-2">
                CONTINUE <ArrowRight className="w-4 h-4" />
              </button>
              
              <div className="relative flex items-center py-6">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-[#4a4a5e] text-xs font-bold uppercase tracking-widest">Or sign up with</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <Button 
                variant="outlined" 
                fullWidth
                onClick={handleGoogleLogin}
                sx={{ 
                  color: '#1c1c28',
                  borderColor: '#e2e8f0',
                  borderRadius: '16px', 
                  py: 1.5, 
                  fontWeight: 800, 
                  textTransform: 'none', 
                  fontSize: '0.95rem', 
                  display: 'flex',
                  gap: 1.5,
                  '&:hover': { 
                    bgcolor: '#f8f9fc',
                    borderColor: '#cbd5e1'
                  } 
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>
            </form>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl md:text-[36px] font-black text-[#1c1c28] mb-3 tracking-tight leading-tight">How will you use PropertyLedge?</h2>
            <p className="text-sm text-[#4a4a5e] font-medium mb-8">We'll customize your dashboard based on your answer.</p>
            {error && <div className="p-3 mb-6 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">{error}</div>}
            
            <div className="space-y-4 mb-8">
              {roles.map((r) => {
                const Icon = r.icon;
                const active = role === r.id;
                return (
                  <div 
                    key={r.id} 
                    onClick={() => setRole(r.id)}
                    className={`p-4 md:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4
                      ${active ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white/40 backdrop-blur-sm'}
                    `}
                  >
                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-primary text-white shadow-md' : 'bg-gray-50 border border-gray-200 text-[#4a4a5e]'}`}>
                        <Icon className="w-5 h-5" />
                     </div>
                     <div>
                        <div className={`text-base md:text-lg font-black ${active ? 'text-primary' : 'text-[#1c1c28]'}`}>{r.title}</div>
                        <div className={`text-xs font-bold mt-0.5 ${active ? 'text-primary/80' : 'text-[#4a4a5e]'}`}>{r.desc}</div>
                     </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="px-6 py-4 rounded-2xl border-2 border-gray-200 text-[#4a4a5e] font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors text-xs">Back</button>
              <button 
                onClick={handleCompleteSetup} 
                disabled={!role || loading} 
                className="flex-1 bg-[#22333b] text-white font-bold uppercase tracking-wider rounded-2xl py-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:bg-[#111a1e] transition-all text-xs flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Complete Setup <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
