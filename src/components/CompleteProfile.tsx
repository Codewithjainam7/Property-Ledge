import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Building, ClipboardList, Users, UserCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function CompleteProfile() {
  const { user } = useAuth();
  const [role, setRole] = useState('');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // If the user already has these fields, redirect them to dashboard
    if (user && user.user_metadata?.mobile && user.user_metadata?.role) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleCompleteSetup = async () => {
    if (!mobile || !role) {
      setError("Please provide your mobile number and select a role.");
      return;
    }

    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.updateUser({
      data: {
        mobile,
        role
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Also update the user_profiles table since the trigger only ran on insert
      await supabase
        .from('user_profiles')
        .update({ global_role: role })
        .eq('id', user.id);
        
      window.location.href = '/dashboard';
    }
  };

  const roles = [
    { id: 'Owner', icon: Building, title: 'Property Owner', desc: 'I own and manage properties' },
    { id: 'Agent', icon: Users, title: 'Property Agent / Manager', desc: 'I manage properties for an owner' },
    { id: 'Tenant', icon: UserCircle2, title: 'Tenant', desc: 'I am looking to rent or currently renting' }
  ];

  if (!user) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#f8f9fc] via-white to-[#f8f9fc] z-0"></div>

      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-primary/10 blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none z-0"></div>

      <div className="w-full max-w-[560px] p-6 sm:p-10 md:p-12 rounded-[32px] relative z-10 bg-white/80 backdrop-blur-2xl shadow-2xl border border-white text-on-surface">
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-3xl md:text-[36px] font-black text-[#1c1c28] mb-3 tracking-tight leading-tight">Complete your profile</h2>
          <p className="text-sm text-[#4a4a5e] font-medium mb-8">Just a few more details to customize your dashboard.</p>
          
          {error && <div className="p-3 mb-6 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">{error}</div>}
          
          <div className="space-y-4 mb-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-[#4a4a5e] uppercase tracking-widest">Mobile number</label>
              <input 
                type="tel" 
                placeholder="+61 400 000 000" 
                required 
                value={mobile} 
                onChange={(e) => setMobile(e.target.value)} 
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-[#1c1c28] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium placeholder:text-gray-400 text-sm" 
              />
            </div>
          </div>

          <h3 className="text-lg font-black text-[#1c1c28] mb-4 tracking-tight leading-tight">How will you use PropertyLedge?</h3>
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
            <button 
              onClick={handleCompleteSetup} 
              disabled={!role || !mobile || loading} 
              className="flex-1 bg-[#22333b] text-white font-bold uppercase tracking-wider rounded-2xl py-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:bg-[#111a1e] transition-all text-xs flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Complete Setup <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
