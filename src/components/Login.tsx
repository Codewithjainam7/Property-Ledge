import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Typography, Button, TextField, Alert } from '@mui/material';
import { Building2, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message); // e.g. "Invalid login credentials"
      setLoading(false);
    } else if (data.session) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[480px] bg-white/80 backdrop-blur-2xl rounded-[40px] p-8 md:p-10 shadow-[0_24px_64px_-12px_rgba(59,34,181,0.08)] border border-white relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#f8f9fc] to-white rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-inner border border-black/5">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          
          <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: 'Space Grotesk', color: '#1c1c28', mb: 1, letterSpacing: '-1px' }}>
            Welcome Back
          </Typography>
          <Typography variant="body2" sx={{ color: '#4a4a5e' }}>
            Sign in to manage your properties and invoices.
          </Typography>
        </div>

        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: '16px', fontWeight: 500 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-[#4a4a5e] uppercase tracking-widest pl-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" 
              required
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-[#1c1c28] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium placeholder:text-gray-400 text-sm" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-[#4a4a5e] uppercase tracking-widest pl-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                required
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 pr-10 text-[#1c1c28] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium placeholder:text-gray-400 text-sm" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Link to="/forgot-password" className="text-xs font-bold text-primary hover:text-primary/80 transition-colors">
              Forgot password?
            </Link>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full relative group overflow-hidden bg-[#22333b] text-white font-bold uppercase tracking-wider rounded-2xl py-4 mt-6 hover:bg-[#111a1e] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : (
              <>
                SIGN IN <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative flex items-center py-6">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase tracking-widest">Or</span>
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

        <div className="mt-8 text-center">
          <Typography variant="body2" sx={{ color: '#4a4a5e', fontWeight: 500 }}>
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-bold hover:underline">
              Sign up here
            </Link>
          </Typography>
        </div>
      </motion.div>
    </div>
  );
}
