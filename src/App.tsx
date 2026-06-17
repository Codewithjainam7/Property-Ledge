import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Play, CheckCircle2, Star, Home, Users, Building, UserCircle2, Check, FileText, ClipboardList, PieChart, ShieldCheck, Eye, EyeOff, RefreshCw, Shield, Lock, Globe, Mail, Zap, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card as MuiCard, CardContent, Avatar as MuiAvatar, Rating as MuiRating, Chip as MuiChip, Box, Typography } from '@mui/material';
import { FAQ } from './components/FAQ';
import dashboardPreview from './assets/dashboard-preview.png';
import { Dashboard } from './components/Dashboard';
import { PropertyOnboarding } from './components/PropertyOnboarding';
import { PropertyDetails } from './components/PropertyDetails';
import { Properties } from './components/Properties';
import { AccountSettings } from './components/AccountSettings';
import { InvoiceManagement } from './components/InvoiceManagement';
import { Tenants } from './components/Tenants';
import { Accounting } from './components/Accounting';
import { Login as SupabaseLogin } from './components/Login';
import { Signup } from './components/Signup';
import { AcceptInvite } from './components/AcceptInvite';
import { ManagerDashboard } from './components/ManagerDashboard';
import { useAuth } from './contexts/AuthContext';
import { CompleteProfile } from './components/CompleteProfile';

function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { session } = useAuth();
  const isLoggedIn = !!session;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((window.scrollY / totalScroll) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Testimonials', href: '#testimonials' }
  ];

  return (
    <>
      {/* Scroll Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-[3px] bg-primary z-[60] transition-all duration-100 ease-out shadow-sm glow-primary" 
        style={{ width: `${scrollProgress}%` }}
      />

      <nav 
        className={`fixed left-1/2 -translate-x-1/2 w-[96%] sm:w-[94%] max-w-7xl transition-all duration-500 z-50 rounded-2xl border ${
          scrolled 
            ? 'top-3 bg-surface/95 backdrop-blur-2xl border-outline-variant/50 shadow-sm py-3 px-4 sm:px-5' 
            : 'top-4 bg-transparent border-transparent shadow-none py-3.5 px-4 sm:px-6'
        }`}
      >
        <div className="w-full flex justify-between items-center gap-3">
          <Link 
            to="/" 
            className="flex items-center gap-2.5 group z-50 shrink-0"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm transition-all duration-300 shrink-0">
              <Building className="w-5 h-5 text-on-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-[13px] xs:text-sm sm:text-base tracking-tight leading-none">
                Property<span className="text-primary">Ledge</span>
              </span>
              <span className="hidden sm:block text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-widest leading-none mt-0.5">Property Management</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center bg-surface-container/40 rounded-xl px-1 py-1 gap-0.5 border border-outline-variant/20">
            {links.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onMouseEnter={() => setHoveredLink(link.name)}
                onMouseLeave={() => setHoveredLink(null)}
                className="relative px-4 py-2 text-on-surface-variant hover:text-primary transition-colors text-sm font-semibold rounded-lg z-10"
              >
                {link.name}
                {hoveredLink === link.name && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-white border border-primary/10 rounded-lg -z-10 shadow-sm"
                    transition={{ type: 'spring' as const, stiffness: 400, damping: 32 }}
                  />
                )}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 z-50 shrink-0">
            {isLoggedIn ? null : (
              <Link 
                to="/login" 
                className="text-on-surface-variant hover:text-primary font-semibold text-sm hidden sm:block transition-colors px-3 py-2 rounded-xl hover:bg-surface-container/60"
              >
                Log in
              </Link>
            )}
            
            <Link 
              to={isLoggedIn ? "/dashboard" : "/signup"} 
              className="relative group flex items-center gap-2 bg-primary text-on-primary font-bold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all shadow-sm whitespace-nowrap"
            >
              <span className="hidden sm:inline">{isLoggedIn ? 'Go to Dashboard' : 'Start Free Trial'}</span>
              <span className="sm:hidden">{isLoggedIn ? 'Dashboard' : 'Sign Up'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Hamburger Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-xl bg-surface-container/50 hover:bg-primary/10 border border-outline-variant/25 transition-all focus:outline-none gap-1 p-2"
              aria-label="Toggle Menu"
            >
              <span className={`w-full h-0.5 bg-on-surface rounded-full transition-all duration-300 origin-center block ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`w-full h-0.5 bg-on-surface rounded-full transition-all duration-300 block ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`} />
              <span className={`w-full h-0.5 bg-on-surface rounded-full transition-all duration-300 origin-center block ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Menu (iOS style side-drawer panel) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
            />
            {/* Side panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="md:hidden fixed top-0 right-0 bottom-0 w-[85%] max-w-[360px] bg-surface/90 backdrop-blur-3xl z-50 flex flex-col justify-between p-6 pt-20 shadow-[-20px_0_60px_rgba(59,34,181,0.15)] rounded-l-[40px] border-l border-white/40 overflow-hidden"
            >
              {/* Dynamic Gradients inside Drawer */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-secondary/10 blur-[60px] rounded-full pointer-events-none -mr-10 -mt-10" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 blur-[50px] rounded-full pointer-events-none" />

              <div className="flex flex-col gap-6 relative z-10">
                {/* Visual Card Intro in drawer */}
                <div className="p-5 rounded-[24px] bg-primary shadow-sm relative overflow-hidden group">
                  <div className="flex items-center gap-3 mb-2 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/20">
                      <Building className="w-5 h-5 text-on-primary" />
                    </div>
                    <div>
                      <div className="text-on-primary font-black tracking-tight leading-none text-lg">Property<span className="text-on-primary/70">Ledge</span></div>
                      <div className="text-on-primary/80 font-bold text-[10px] uppercase tracking-widest mt-0.5">Mobile Access</div>
                    </div>
                  </div>
                  <div className="text-[13px] text-on-primary/90 font-medium leading-tight relative z-10">Premium property management toolkit in your pocket.</div>
                </div>

                <div className="flex flex-col gap-2">
                  {links.map((link, i) => (
                    <motion.a
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={link.name}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-4 text-lg font-extrabold text-on-surface hover:text-primary transition-all tracking-tight p-3 rounded-2xl bg-white/60 hover:bg-white border border-outline-variant/40 shadow-sm hover:shadow-md hover:border-primary/20 active:scale-95 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        {link.name === 'Features' && <ClipboardList className="w-5 h-5" />}
                        {link.name === 'Pricing' && <PieChart className="w-5 h-5" />}
                        {link.name === 'Testimonials' && <Users className="w-5 h-5" />}
                      </div>
                      {link.name}
                    </motion.a>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 relative z-10 mt-auto pb-4">
                {isLoggedIn ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-4 text-center bg-primary text-on-primary text-base font-black rounded-2xl hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 group active:scale-95"
                  >
                    Go to Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-4 text-center text-on-surface text-base font-black border border-outline-variant/60 bg-white/80 backdrop-blur-md rounded-2xl hover:bg-white shadow-sm transition-all active:scale-95"
                    >
                      Log in to account
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-4 text-center bg-primary text-on-primary text-base font-black rounded-2xl hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 group active:scale-95"
                    >
                      Start Free Trial <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </>
  );
}

function SimulatedDashboardMockup() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.4 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 20 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="w-full h-full flex flex-col md:flex-row text-on-surface bg-surface-container-lowest font-sans select-none text-left"
    >
      {/* Mini Sidebar */}
      <div className="w-full md:w-20 lg:w-24 bg-surface text-on-surface flex md:flex-col items-center justify-between p-4 md:py-8 border-b md:border-b-0 md:border-r border-outline-variant/50 shrink-0">
        <div className="flex md:flex-col items-center gap-6 w-full">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-black text-on-primary shadow-sm text-sm">PL</div>
          <div className="flex md:flex-col items-center gap-4 text-on-surface-variant w-full justify-center">
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary"><Home className="w-5 h-5" /></div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"><Building className="w-5 h-5" /></div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"><Users className="w-5 h-5" /></div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"><ClipboardList className="w-5 h-5" /></div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"><PieChart className="w-5 h-5" /></div>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-on-secondary text-xs">JD</div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-background p-4 sm:p-6 md:p-8 flex flex-col justify-between overflow-y-auto min-h-[350px] sm:min-h-[450px] md:min-h-[500px]">
        {/* Mock Top bar */}
        <motion.div variants={itemVariants} className="flex justify-between items-center mb-6">
          <div>
            <h4 className="text-base sm:text-lg font-black text-on-surface tracking-tight">Portfolio Ledger</h4>
            <p className="text-[10px] sm:text-xs text-on-surface-variant/80 font-bold">Welcome back, Jainam</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-surface border border-outline-variant/50 rounded-full px-3 py-1 text-xs text-on-surface-variant font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Auto-sync active
            </div>
            <div className="w-8 h-8 rounded-full bg-surface border border-outline-variant/50 flex items-center justify-center text-on-surface shadow-sm"><Mail className="w-4 h-4" /></div>
          </div>
        </motion.div>

        {/* 3 Metrics Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-surface p-4 rounded-2xl border border-outline-variant/50 shadow-sm flex flex-col justify-between">
            <div className="text-[10px] text-on-surface-variant/85 font-black uppercase tracking-wider">Rent Collected</div>
            <div className="text-lg sm:text-xl font-black text-primary mt-2">$14,820.00</div>
            <div className="text-[9px] text-emerald-600 font-bold mt-1">↑ 12% vs last month</div>
          </div>
          <div className="bg-surface p-4 rounded-2xl border border-outline-variant/50 shadow-sm flex flex-col justify-between">
            <div className="text-[10px] text-on-surface-variant/85 font-black uppercase tracking-wider">Occupancy</div>
            <div className="text-lg sm:text-xl font-black text-secondary mt-2">100%</div>
            <div className="text-[9px] text-secondary font-bold mt-1">8 of 8 units occupied</div>
          </div>
          <div className="bg-surface p-4 rounded-2xl border border-outline-variant/50 shadow-sm flex flex-col justify-between">
            <div className="text-[10px] text-on-surface-variant/85 font-black uppercase tracking-wider">Expenses Scanned</div>
            <div className="text-lg sm:text-xl font-black text-tertiary mt-2">$3,420.50</div>
            <div className="text-[9px] text-on-surface-variant font-bold mt-1">Matched EOFY deductions</div>
          </div>
        </motion.div>

        {/* Bottom Split (Recent payments & Property stats) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Rent Schedule */}
          <motion.div variants={itemVariants} className="lg:col-span-2 bg-surface rounded-2xl border border-outline-variant/50 p-4 sm:p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs sm:text-sm font-black text-on-surface">Active Tenancies Ledger</span>
              <span className="text-[8px] sm:text-[9px] bg-primary/5 text-primary font-black uppercase tracking-wider px-2 py-0.5 rounded-full">Live Ledger</span>
            </div>
            <div className="space-y-3">
              {[
                { address: "12 Acacia Avenue, Sydney", tenant: "Smith Family", amount: "$3,200/mo", status: "Paid", color: "bg-emerald-500/10 text-emerald-700" },
                { address: "48 Collins Street, Melbourne", tenant: "Sarah Jenkins", amount: "$4,100/mo", status: "Paid", color: "bg-emerald-500/10 text-emerald-700" },
                { address: "7a Boundary Rd, Brisbane", tenant: "David L.", amount: "$2,850/mo", status: "Pending", color: "bg-amber-500/10 text-amber-700" }
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 hover:bg-surface-container-lowest rounded-xl border border-transparent hover:border-outline-variant/50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-bold text-[10px]">0{idx+1}</div>
                    <div>
                      <div className="text-xs font-black text-on-surface">{item.address}</div>
                      <div className="text-[9px] text-on-surface-variant/80 font-bold">{item.tenant} • {item.amount}</div>
                    </div>
                  </div>
                  <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${item.color}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Expense breakdown graph */}
          <motion.div variants={itemVariants} className="bg-surface rounded-2xl border border-outline-variant/50 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
            <span className="text-xs sm:text-sm font-black text-on-surface mb-3">EOFY Tax Readiness</span>
            <div className="flex-1 flex items-center justify-center py-4">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                {/* Circular ring representation */}
                <div className="absolute inset-0 rounded-full border-8 border-primary/10" />
                <div className="absolute inset-0 rounded-full border-8 border-transparent border-t-primary border-l-secondary" />
                <div className="text-center">
                  <div className="text-base sm:text-lg font-black text-on-surface">88%</div>
                  <div className="text-[7px] sm:text-[8px] text-on-surface-variant/80 font-bold uppercase tracking-wider">Matched</div>
                </div>
              </div>
            </div>
            <div className="flex justify-between text-[9px] text-on-surface-variant font-bold border-t border-outline-variant/50 pt-3">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Repairs</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-secondary" /> Interest</span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring' as const, stiffness: 90, damping: 18 }
    }
  };

  return (
    <section 
      className="pt-28 pb-12 sm:pt-36 sm:pb-16 md:pt-40 md:pb-20 px-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[90vh]"
    >
      {/* Base background for the Hero section */}
      <div className="absolute inset-0 bg-background z-0"></div>

      {/* Geometric Grid Overlay */}
      <div className="absolute inset-0 grid-pattern opacity-40 z-0 pointer-events-none" />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto text-center flex flex-col items-center relative z-10 w-full mt-10"
      >
        <motion.div 
          variants={itemVariants}
          className="inline-flex items-center gap-2.5 bg-surface backdrop-blur-xl border border-outline-variant/50 rounded-full px-4 py-2 mb-8 shadow-sm hover:border-outline-variant transition-colors"
        >
          <span className="bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest py-0.5 px-2.5 rounded-full shadow-inner animate-pulse">Live</span>
          <span className="text-on-surface font-bold text-xs sm:text-sm pr-1">🇦🇺 The New Standard for Australian Landlords</span>
        </motion.div>
        
        <motion.h1 
          variants={itemVariants}
          className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-black tracking-tight leading-[1.05] text-on-surface mb-6 font-display"
        >
          Your entire property portfolio.<br />
          <span className="text-primary tracking-tighter">Automated in one place.</span>
        </motion.h1>
        
        <motion.p 
          variants={itemVariants}
          className="text-base sm:text-lg md:text-xl text-on-surface-variant max-w-[640px] mx-auto mb-10 font-medium leading-relaxed px-4"
        >
          The all-in-one platform for Australian landlords, property managers and agencies. Automated invoices, digital leases, condition reports — without the agency fees.
        </motion.p>
        
        <motion.div 
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center gap-4 mb-14 w-full sm:w-auto px-4"
        >
          <Link to="/signup" className="bg-primary text-on-primary w-full sm:w-auto text-base sm:text-lg font-bold uppercase tracking-wider rounded-full px-8 py-4 flex items-center justify-center gap-2 hover:bg-primary/95 transition-all shadow-sm">
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
          <button className="bg-white/80 border-2 border-outline-variant/60 text-on-surface w-full sm:w-auto text-base sm:text-lg font-bold uppercase tracking-wider rounded-full px-8 py-4 flex items-center justify-center gap-2 hover:bg-surface-container transition-colors shadow-sm">
            <Play className="w-5 h-5" /> Watch Demo
          </button>
        </motion.div>
        
        <motion.div 
          variants={itemVariants}
          className="flex flex-col items-center gap-3"
        >
          <div className="flex -space-x-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-surface overflow-hidden shadow-sm">
                <img src={`https://i.pravatar.cc/150?img=${i + 10}`} alt="User avatar" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-secondary text-secondary" />
              ))}
            </div>
            <span className="text-xs sm:text-sm text-on-surface-variant font-bold">Trusted by 2,500+ landlords across Australia</span>
          </div>
        </motion.div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 70, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ 
          y: -8, 
          scale: 1.01,
          transition: { type: 'spring' as const, stiffness: 300, damping: 22 }
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-5xl mx-auto mt-12 md:mt-20 relative z-10 perspective-[1000px] group/hero-img px-4"
      >
        <div className="bg-surface rounded-[24px] overflow-hidden border border-outline-variant/50 shadow-sm transition-transform duration-300">
          <div className="h-12 border-b border-outline-variant flex items-center px-6 gap-2 bg-surface-container/50">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-error hover:scale-110 transition-transform cursor-pointer"></div>
              <div className="w-3 h-3 rounded-full bg-[#f59e0b] hover:scale-110 transition-transform cursor-pointer"></div>
              <div className="w-3 h-3 rounded-full bg-secondary hover:scale-110 transition-transform cursor-pointer"></div>
            </div>
            <div className="mx-auto text-[10px] md:text-xs font-black text-on-surface-variant bg-surface-container-high/60 border border-outline-variant/30 rounded-full px-5 py-1.5 flex items-center gap-1.5 shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              app.propertyledge.com.au/dashboard
            </div>
          </div>
          <div className="w-full relative flex items-stretch justify-center overflow-hidden">
            <img 
              src={dashboardPreview} 
              alt="Property Ledge Dashboard" 
              className="w-full h-auto object-cover transform translate-y-1 sm:translate-y-2 max-h-[80vh] object-top transition-all"
              style={{ filter: 'hue-rotate(-120deg) saturate(0.8) contrast(1.1)' }}
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function LogoStrip() {
  return (
    <section className="py-20 border-y border-outline-variant bg-surface-container/30">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-10">Works alongside Australia's leading platforms</p>
        <div className="ticker-wrap filter opacity-60">
          <div className="ticker flex items-center gap-20 px-10">
            {[
              { name: 'REA Group', icon: <Building className="w-8 h-8" /> },
              { name: 'Domain', icon: <Home className="w-8 h-8" /> },
              { name: 'TICA', icon: <ShieldCheck className="w-8 h-8" /> },
              { name: 'RTA QLD', icon: <FileText className="w-8 h-8" /> },
              { name: 'NSW Fair Trading', icon: <CheckCircle2 className="w-8 h-8" /> },
              { name: 'ATO', icon: <Building className="w-8 h-8" /> },
              { name: 'REA Group', icon: <Building className="w-8 h-8" /> },
              { name: 'Domain', icon: <Home className="w-8 h-8" /> },
              { name: 'TICA', icon: <ShieldCheck className="w-8 h-8" /> },
              { name: 'RTA QLD', icon: <FileText className="w-8 h-8" /> },
              { name: 'NSW Fair Trading', icon: <CheckCircle2 className="w-8 h-8" /> },
              { name: 'ATO', icon: <Building className="w-8 h-8" /> }
            ].map((logo, i) => (
              <div 
                key={i} 
                className="flex items-center gap-2.5 text-on-surface opacity-50 hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 cursor-default"
              >
                {logo.icon}
                <span className="text-2xl font-black tracking-tighter uppercase whitespace-nowrap">
                  {logo.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureVisualMockup({ label }: { label: string }) {
  if (label === 'INVOICING') {
    return (
      <div className="w-full h-full bg-background p-5 sm:p-6 flex flex-col justify-between select-none text-left text-on-surface rounded-[28px] overflow-hidden">
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs sm:text-sm font-black text-on-surface">Rent Invoice INV-00142</div>
          <span className="text-[9px] bg-emerald-500/10 text-emerald-700 font-black uppercase tracking-wider px-2 py-0.5 rounded-full">Paid</span>
        </div>
        <div className="bg-white border border-outline-variant/35 rounded-2xl p-3 sm:p-4 shadow-sm space-y-2.5 flex-1 flex flex-col justify-center">
          <div className="flex justify-between text-xs">
            <span className="text-on-surface-variant font-bold">Tenant</span>
            <span className="font-black text-on-surface">Smith Family</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-on-surface-variant font-bold">Amount Due</span>
            <span className="font-black text-on-surface">$480.00</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-on-surface-variant font-bold">Due Date</span>
            <span className="font-bold text-on-surface">25 May 2026</span>
          </div>
          <div className="border-t border-outline-variant/20 pt-2.5">
            <div className="text-[9px] text-on-surface-variant font-black uppercase tracking-wider mb-1">Direct Deposit Instructions:</div>
            <div className="bg-surface-container p-2 rounded-xl border border-outline-variant/20 text-[9px] space-y-0.5 font-mono text-on-surface-variant">
              <div><span className="font-black">BSB:</span> 082-902</div>
              <div><span className="font-black">Account:</span> 4892-0193</div>
              <div><span className="font-black">Ref:</span> INV-00142</div>
            </div>
          </div>
        </div>
        <div className="text-[8px] sm:text-[9px] text-center text-on-surface-variant font-bold bg-white/60 p-2 rounded-xl border border-outline-variant/20 mt-2 shrink-0">
          🔒 Auto-generated & sent to tenant via email & SMS.
        </div>
      </div>
    );
  }

  if (label === 'PORTFOLIO') {
    return (
      <div className="w-full h-full bg-background p-5 sm:p-6 flex flex-col justify-between select-none text-left text-on-surface rounded-[28px] overflow-hidden">
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs sm:text-sm font-black text-on-surface">Property Assets</div>
          <span className="text-[9px] bg-primary/10 text-primary font-black uppercase tracking-wider px-2 py-0.5 rounded-full">2 Active</span>
        </div>
        <div className="space-y-2.5 flex-1 flex flex-col justify-center">
          <div className="bg-white border border-outline-variant/35 rounded-2xl p-3 shadow-sm flex justify-between items-center">
            <div>
              <div className="text-xs font-black text-on-surface">12 Acacia Avenue, Sydney</div>
              <div className="text-[9px] text-on-surface-variant font-bold mt-0.5">3 Bed • 2 Bath • Residential</div>
            </div>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-700 font-black px-2 py-0.5 rounded-full">100% Occupied</span>
          </div>
          <div className="bg-white border border-outline-variant/35 rounded-2xl p-3 shadow-sm flex justify-between items-center">
            <div>
              <div className="text-xs font-black text-on-surface">48 Collins Street, Melbourne</div>
              <div className="text-[9px] text-on-surface-variant font-bold mt-0.5">2 Bed • 1.5 Bath • Apartment</div>
            </div>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-700 font-black px-2 py-0.5 rounded-full">100% Occupied</span>
          </div>
        </div>
        <div className="text-[8px] sm:text-[9px] text-center text-on-surface-variant font-bold bg-white/60 p-2 rounded-xl border border-outline-variant/20 mt-2 shrink-0">
          👥 Assigned Manager: Jainam Jain (Owner)
        </div>
      </div>
    );
  }

  if (label === 'REPORTS') {
    return (
      <div className="w-full h-full bg-background p-5 sm:p-6 flex flex-col justify-between select-none text-left text-on-surface rounded-[28px] overflow-hidden">
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs sm:text-sm font-black text-on-surface">ATO Tax Ledger</div>
          <span className="text-[9px] bg-emerald-600/10 text-emerald-700 font-black uppercase tracking-wider px-2 py-0.5 rounded-full">EOFY Ready</span>
        </div>
        <div className="space-y-2 flex-1 flex flex-col justify-center">
          {[
            { cat: "Capital Works (Div 43)", amount: "$1,450.00", rule: "Depreciable assets" },
            { cat: "Water Charges", amount: "$480.00", rule: "100% Claimable" },
            { cat: "Interest Expenses", amount: "$2,840.00", rule: "Matched with bank feed" },
            { cat: "Repairs & Maintenance", amount: "$1,120.00", rule: "ATO receipt attached" }
          ].map((item, idx) => (
            <div key={idx} className="bg-white border border-outline-variant/35 rounded-xl p-2 sm:p-2.5 shadow-sm flex justify-between items-center text-xs">
              <div>
                <div className="font-black text-on-surface text-[11px] sm:text-xs">{item.cat}</div>
                <div className="text-[8px] sm:text-[9px] text-on-surface-variant/80 font-bold mt-0.5">{item.rule}</div>
              </div>
              <span className="font-black text-primary text-[11px] sm:text-xs">{item.amount}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (label === 'INSPECTIONS') {
    return (
      <div className="w-full h-full bg-background p-5 sm:p-6 flex flex-col justify-between select-none text-left text-on-surface rounded-[28px] overflow-hidden">
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs sm:text-sm font-black text-on-surface">Routine Inspection</div>
          <span className="text-[9px] bg-secondary/15 text-secondary font-black uppercase tracking-wider px-2 py-0.5 rounded-full">Unit 3B</span>
        </div>
        <div className="bg-white border border-outline-variant/35 rounded-2xl p-3 sm:p-4 shadow-sm space-y-2.5 flex-1 flex flex-col justify-center">
          <div className="text-[9px] font-black text-on-surface uppercase tracking-wider border-b border-outline-variant/20 pb-1">Checklist</div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-[11px] sm:text-xs">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500/10 flex items-center justify-center text-[9px] font-black shrink-0">✓</span> Kitchen: Clean, oven functioning
            </div>
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-[11px] sm:text-xs">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500/10 flex items-center justify-center text-[9px] font-black shrink-0">✓</span> Bathroom: Exhaust working, no leaks
            </div>
            <div className="flex items-center gap-2 text-amber-700 font-bold text-[11px] sm:text-xs">
              <span className="w-3.5 h-3.5 rounded bg-amber-500/10 flex items-center justify-center text-[9px] font-black shrink-0">!</span> Living: Scuff marks on entry wall
            </div>
          </div>
          <div className="border-t border-outline-variant/20 pt-2 shrink-0">
            <div className="text-[8px] sm:text-[9px] text-on-surface-variant font-black uppercase tracking-wider">Tenant Digital Sign-off:</div>
            <div className="h-8 bg-surface border border-outline-variant/30 rounded-xl mt-1 flex items-center justify-center font-display italic text-on-surface-variant text-[11px] sm:text-xs font-black select-none pointer-events-none">
              Sarah Jenkins
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LEASING
  return (
    <div className="w-full h-full bg-background p-5 sm:p-6 flex flex-col justify-between select-none text-left text-on-surface rounded-[28px] overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <div className="text-xs sm:text-sm font-black text-on-surface">Tenancy Agreement</div>
        <span className="text-[9px] bg-primary/10 text-primary font-black uppercase tracking-wider px-2 py-0.5 rounded-full">Legally Signed</span>
      </div>
      <div className="bg-white border border-outline-variant/35 rounded-2xl p-3 sm:p-4 shadow-sm space-y-2.5 flex-1 flex flex-col justify-center">
        <div className="text-[9px] font-black text-on-surface uppercase tracking-wider border-b border-outline-variant/20 pb-1">Key Terms</div>
        <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs font-bold text-on-surface-variant">
          <div>
            <span className="block font-black text-on-surface text-[9px] uppercase tracking-wider">Landlord</span>
            Sarah Jenkins
          </div>
          <div>
            <span className="block font-black text-on-surface text-[9px] uppercase tracking-wider">Tenant</span>
            Smith Family
          </div>
          <div>
            <span className="block font-black text-on-surface text-[9px] uppercase tracking-wider">Rent</span>
            $780 / week
          </div>
          <div>
            <span className="block font-black text-on-surface text-[9px] uppercase tracking-wider">Term</span>
            12 Months Fixed
          </div>
        </div>
        <div className="border-t border-outline-variant/20 pt-2 shrink-0">
          <div className="text-[8px] sm:text-[9px] text-emerald-600 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Encrypted audit log verified
          </div>
          <div className="h-9 bg-primary/5 border border-primary/20 rounded-xl mt-1 flex items-center justify-center font-display italic text-primary text-xs sm:text-sm font-black select-none">
            Smith Family Signatures
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ reversed, label, title, desc, bullets, image, floatingBadge }: any) {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 overflow-hidden relative">
      <motion.div 
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-120px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`max-w-7xl mx-auto group bg-surface rounded-[40px] border border-outline-variant/50 p-5 sm:p-8 md:p-12 lg:p-16 flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-8 lg:gap-20 shadow-sm transition-all duration-700`}
      >
        {/* Left Side: Content */}
        <div className="flex-1 space-y-6 sm:space-y-8 z-10 relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/15 text-primary text-xs font-black uppercase tracking-widest shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {label}
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-on-surface leading-[1.1] font-display group-hover:text-primary transition-colors duration-500">
            {title}
          </h2>
          
          <p className="text-base sm:text-lg text-on-surface-variant font-medium leading-relaxed">
            {desc}
          </p>
          
          <div className="space-y-3 sm:space-y-4">
            {bullets.map((b: string, i: number) => (
              <motion.div
                key={i}
                whileHover={{ x: 8 }}
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-sm transition-all duration-300 hover:bg-surface hover:border-primary/50 group/bullet"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover/bullet:bg-primary group-hover/bullet:text-on-primary transition-all duration-300 shadow-inner shrink-0">
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                </div>
                <span className="text-on-surface font-bold text-sm sm:text-base md:text-lg tracking-tight leading-none">
                  {b}
                </span>
              </motion.div>
            ))}
          </div>
          
          <div className="pt-2">
            <Link 
              to="/signup" 
              className="inline-flex items-center gap-3.5 text-primary font-black hover:text-on-surface transition-colors group/link text-xs sm:text-sm uppercase tracking-wider"
            >
              Explore feature 
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover/link:translate-x-1.5 group-hover/link:bg-primary group-hover/link:text-white transition-all duration-300">
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </Link>
          </div>
        </div>

        {/* Right Side: Visual */}
        <div className="flex-1 relative w-full lg:w-1/2">
          {floatingBadge && (
            <div className={`absolute -top-4 md:-top-6 ${reversed ? 'left-4 md:-left-6' : 'right-4 md:-right-6'} z-20 bg-surface border border-outline-variant/50 shadow-sm p-3 md:p-4.5 rounded-2xl flex items-center gap-3 md:gap-4 transition-all duration-500 hover:scale-105 scale-[0.8] sm:scale-95 md:scale-100 origin-center`}>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-sm bg-secondary-container text-on-secondary-container`}>
                {floatingBadge.icon || <Check className="w-6 h-6" />}
              </div>
              <div>
                <div className="text-xs sm:text-sm font-black text-on-surface tracking-tight">{floatingBadge.title}</div>
                <div className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-widest mt-0.5">{floatingBadge.subtitle}</div>
              </div>
            </div>
          )}
          
          <div className="bg-surface-container rounded-[32px] p-2.5 relative overflow-hidden aspect-[4/3] border border-outline-variant/40 shadow-lg group-hover:shadow-xl transition-shadow duration-500 flex items-stretch">
            <FeatureVisualMockup label={label} />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function Pricing() {
  const [isAnnual, setIsAnnual] = React.useState(true);

  const plans = [
    { 
      name: "Starter", price: isAnnual ? "Free" : "Free", period: "", limit: "1 property", 
      desc: "Perfect for the single-property landlord getting started.", 
      features: ["1 Property", "Automated Invoicing", "Basic Ledger", "Tenant Portal"],
      isPopular: false, badge: null, icon: <Home className="w-6 h-6" />
    },
    { 
      name: "Pro", price: isAnnual ? "$24" : "$29", period: "/mo", limit: "Up to 10 properties", 
      desc: "For growing portfolios needing full automation and reporting.", 
      features: ["Up to 10 Properties", "Automated Rent Collection", "EOFY Reports", "Digital Lease Signing", "Priority Support"],
      isPopular: true, badge: "Most Popular", icon: <Zap className="w-6 h-6" />
    },
    { 
      name: "Agency", price: isAnnual ? "$69" : "$79", period: "/mo", limit: "Unlimited + Team", 
      desc: "Full team access, advanced reporting, and white-label options.", 
      features: ["Unlimited Properties", "Team & Agent Roles", "Advanced Analytics", "API Access", "White Label"],
      isPopular: false, badge: "Best Value", icon: <Building className="w-6 h-6" />
    }
  ];

  return (
    <section id="pricing" className="py-24 sm:py-32 px-4 sm:px-6 relative overflow-hidden bg-surface">
      {/* Dynamic Backgrounds */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-surface to-surface pointer-events-none" />
      <div className="absolute -left-1/4 top-1/2 w-[800px] h-[800px] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />
      <div className="absolute right-0 bottom-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container border border-outline-variant shadow-sm mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-on-surface bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Flexible Plans</span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-on-surface mb-6 font-display">Pricing that scales with you.</h2>
          <p className="text-lg sm:text-xl text-on-surface-variant font-medium max-w-2xl mx-auto mb-10">Start for free, upgrade when you need more power. All plans include a 14-day premium trial.</p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-bold transition-colors ${!isAnnual ? 'text-on-surface' : 'text-on-surface-variant'}`}>Monthly</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-16 h-8 rounded-full bg-surface-container-high border border-outline-variant/60 relative flex items-center px-1 transition-all shadow-inner focus:outline-none"
            >
              <div className={`w-6 h-6 rounded-full bg-primary shadow-md transition-all duration-300 transform ${isAnnual ? 'translate-x-8' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm font-bold flex items-center gap-2 transition-colors ${isAnnual ? 'text-on-surface' : 'text-on-surface-variant'}`}>
              Annually <span className="text-[9px] uppercase tracking-widest font-black bg-emerald-500/10 text-emerald-600 py-1 px-2.5 rounded-full border border-emerald-500/20">Save 20%</span>
            </span>
          </div>
        </div>
        
        {/* Pricing Cards Grid */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
          {plans.map((plan, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              whileHover={plan.isPopular ? { y: -8, scale: 1.05, transition: { duration: 0.2 } } : { y: -8, transition: { duration: 0.2 } }}
              className={`relative flex flex-col rounded-[32px] transition-all duration-300
                ${plan.isPopular 
                  ? 'bg-primary text-on-primary border border-outline-variant/50 shadow-md lg:scale-105 z-20 py-12 px-8 md:px-10' 
                  : 'bg-surface border border-outline-variant/50 shadow-sm z-10 py-10 px-8 md:px-10'
                }
              `}
            >
              {/* Popular Glow Ring */}
              {plan.isPopular && (
                <div className="absolute -inset-[1px] rounded-[32px] bg-gradient-to-b from-primary via-secondary to-primary/20 -z-10 opacity-50" />
              )}
              
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${plan.isPopular ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'}`}>
                  {plan.icon}
                </div>
                {plan.badge && (
                  <div className={`text-[10px] font-black uppercase tracking-widest py-1.5 px-4 rounded-full border ${plan.isPopular ? 'bg-primary/20 text-primary-200 border-primary/30' : 'bg-surface-container text-on-surface-variant border-outline-variant'}`}>
                    {plan.badge}
                  </div>
                )}
              </div>

              <h3 className={`text-2xl font-black mb-2 ${plan.isPopular ? 'text-white' : 'text-on-surface'}`}>{plan.name}</h3>
              <p className={`text-sm font-semibold mb-8 h-10 ${plan.isPopular ? 'text-white/60' : 'text-on-surface-variant'}`}>{plan.desc}</p>
              
              <div className="flex items-baseline gap-1.5 mb-10 pb-10 border-b border-dashed border-outline-variant/30">
                <span className={`text-6xl font-black tracking-tighter ${plan.isPopular ? 'text-white' : 'text-on-surface'}`}>{plan.price}</span>
                {plan.period && <span className={`text-lg font-bold ${plan.isPopular ? 'text-white/40' : 'text-on-surface-variant'}`}>{plan.period}</span>}
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                {plan.features.map((f, fi) => (
                  <li key={fi} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.isPopular ? 'bg-primary/20' : 'bg-primary/10'}`}>
                      <Check className={`w-3 h-3 stroke-[3] ${plan.isPopular ? 'text-primary-300' : 'text-primary'}`} />
                    </div>
                    <span className={`text-sm font-bold leading-tight ${plan.isPopular ? 'text-white/90' : 'text-on-surface'}`}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link 
                to="/signup" 
                className={`w-full py-4 rounded-2xl font-black text-center text-sm transition-all uppercase tracking-widest flex items-center justify-center gap-2 group
                  ${plan.isPopular 
                    ? 'bg-primary text-white hover:bg-primary/90 shadow-[0_8px_30px_rgba(59,34,181,0.4)] hover:shadow-[0_12px_40px_rgba(59,34,181,0.6)]' 
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant'
                  }
                `}
              >
                Get Started <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


function Testimonials() {
  const allTestimonials = [
    { quote: "It completely replaced our agency. What used to cost us 8% of rent now costs $29 a month. The automated rent tracking is flawless.", name: "Sarah Jenkins", role: "Landlord, Brisbane QLD", rating: 5, tag: "Saved $3,400 annually", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" },
    { quote: "The EOFY reporting saved me a weekend of matching bank statements. Everything aligns with the ATO categories directly.", name: "Mark T.", role: "Property Investor, Melbourne VIC", rating: 5, tag: "3 Properties", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" },
    { quote: "Condition reports used to be a nightmare of PDFs and emails. Doing it straight from the phone changed the game.", name: "Elena R.", role: "Property Manager, Sydney NSW", rating: 5, tag: "Verified Manager", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150" },
    { quote: "Finally, a platform built for the Australian market. The localized lease agreements and default settings save so much time.", name: "David L.", role: "Agency Director, Perth WA", rating: 5, tag: "ABN Registered", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150" },
    { quote: "I can see exactly when my tenants have paid, and the automated reminders mean I never have to chase up rent again.", name: "Jessica W.", role: "Landlord, Gold Coast QLD", rating: 5, tag: "Self-Managed", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
    { quote: "The tenant portal is so clean. My tenants love being able to see their payment history and log maintenance requests.", name: "Tom C.", role: "Self-Managed Landlord, Adelaide SA", rating: 5, tag: "Saved 12hrs/mo", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150" },
  ];

  const row1 = [...allTestimonials.slice(0, 3), ...allTestimonials.slice(0, 3)];
  const row2 = [...allTestimonials.slice(3), ...allTestimonials.slice(3)];

  const TestimonialCard = ({ t }: { t: typeof allTestimonials[0] }) => (
    <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(12,43,75,0.04)] rounded-3xl p-4 flex flex-col justify-between h-full hover:shadow-[0_12px_40px_rgba(12,43,75,0.08)] hover:border-primary/25 transition-all duration-300 hover:-translate-y-0.5">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-xl object-cover border border-black/5 shrink-0" />
            <div>
              <div className="font-extrabold text-sm text-on-surface leading-tight">{t.name}</div>
              <div className="font-semibold text-[10px] text-on-surface-variant uppercase tracking-wide mt-0.5">{t.role}</div>
            </div>
          </div>
          <span className="bg-primary/8 border border-primary/15 text-primary text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 hidden sm:block">{t.tag}</span>
        </div>
        <div className="flex mb-2">
          {[...Array(t.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-secondary text-secondary" />)}
        </div>
        <p className="font-semibold text-[13px] text-on-surface leading-relaxed">"{t.quote}"</p>
      </div>
      <div className="flex items-center justify-between border-t border-outline-variant/30 pt-2.5 mt-3">
        <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wide">Verified Account</span>
        <div className="flex items-center gap-1 text-primary">
          <CheckCircle2 className="w-3 h-3" />
          <span className="text-[10px] font-extrabold uppercase tracking-wide">Active</span>
        </div>
      </div>
    </div>
  );

  return (
    <section id="testimonials" className="py-16 sm:py-24 px-4 sm:px-6 relative bg-surface-container-low/20 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-secondary-container/5 blur-[120px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto relative z-10 mb-8 sm:mb-14">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-widest mb-5">
            <Star className="w-3.5 h-3.5 fill-primary" /> Testimonials
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-on-surface mb-4 font-display">Trusted by landlords nationwide.</h2>
          <p className="text-sm sm:text-lg text-on-surface-variant font-medium leading-relaxed">
            See how landlords across Australia are simplifying management and cutting agency fees.
          </p>
        </div>
      </div>

      {/* Mobile: 2-column grid of cards */}
      <div className="sm:hidden max-w-lg mx-auto grid grid-cols-2 gap-3 relative z-10">
        {allTestimonials.map((t, i) => (
          <TestimonialCard key={i} t={t} />
        ))}
      </div>

      {/* Desktop: Marquee rows */}
      <div className="hidden sm:flex w-full max-w-[100vw] overflow-x-hidden flex-col gap-5 relative z-10">
        <div className="marquee-container">
          <div className="marquee-content animate-marquee-left">
            {row1.map((t, i) => (
              <div key={i} className="w-[340px] md:w-[400px] shrink-0">
                <TestimonialCard t={t} />
              </div>
            ))}
          </div>
        </div>
        <div className="marquee-container">
          <div className="marquee-content animate-marquee-right">
            {row2.map((t, i) => (
              <div key={i} className="w-[340px] md:w-[400px] shrink-0">
                <TestimonialCard t={t} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="pt-16 sm:pt-24 pb-10 sm:pb-16 px-4 sm:px-6 bg-gradient-to-b from-[#0c0628] via-[#08041a] to-[#03010b] text-white relative z-10 border-t border-white/5 overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/4 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/10 blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-secondary-container/10 blur-[120px] pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-16 mb-10 sm:mb-16">
          
          {/* Logo & Intro Brand Column — full width on mobile */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex flex-col gap-5">
            <Link to="/" className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5 font-display w-fit">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br bg-primary flex items-center justify-center shadow-md shadow-primary/40 shrink-0">
                <Building className="w-5 h-5 text-white" />
              </div>
              Property<span className="text-primary">Ledge</span>
            </Link>
            <p className="text-white/55 font-semibold max-w-xs leading-relaxed text-sm">
              The complete operating system for modern Australian property managers and landlords. Secure, compliant, zero agency fees.
            </p>
            <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 w-fit">
              <span className="text-xl">🇦🇺</span>
              <div>
                <div className="text-[10px] font-black tracking-widest text-primary uppercase">Australian Owned</div>
                <div className="text-xs font-bold text-white/80">Proudly Sydney & Melbourne based</div>
              </div>
            </div>
          </div>

          {/* Nav Links Column 1: Product */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-black mb-6 text-sm uppercase tracking-wider font-display">Product</h4>
            <ul className="space-y-4 text-sm text-white/60 font-semibold">
              <li><a href="#features" className="hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">Features</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">Pricing</a></li>
              <li><a href="#" className="hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">Integrations</a></li>
              <li><a href="#" className="hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">Changelog</a></li>
            </ul>
          </div>

          {/* Nav Links Column 2: Resources */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-black mb-6 text-sm uppercase tracking-wider font-display">Resources</h4>
            <ul className="space-y-4 text-sm text-white/60 font-semibold">
              <li><a href="#" className="hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">Help Center</a></li>
              <li><a href="#" className="hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">Community Forum</a></li>
              <li><a href="#" className="hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">Blog & Updates</a></li>
              <li><a href="#" className="hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">ATO Guidelines</a></li>
            </ul>
          </div>

          {/* Nav Links Column 3: Trust & Compliance */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-black mb-6 text-sm uppercase tracking-wider font-display">Compliance</h4>
            <ul className="space-y-4 text-sm text-white/60 font-semibold">
              <li><a href="#" className="hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">Direct Debit Compliance</a></li>
              <li><a href="#" className="hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">Security Protocols</a></li>
              <li><a href="#" className="hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">Privacy Shield</a></li>
              <li><a href="#" className="hover:text-primary transition-all duration-300 hover:translate-x-1 inline-block">Leasing Standards</a></li>
            </ul>
          </div>

          {/* Newsletter Subscription Column */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-black mb-6 text-sm uppercase tracking-wider font-display">Stay Updated</h4>
            <p className="text-xs text-white/50 font-semibold mb-4 leading-relaxed">
              Get the latest property regulations, tax tips, and feature updates delivered to your inbox.
            </p>
            {subscribed ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary/20 border border-primary/30 rounded-2xl p-4 text-center text-xs font-bold text-primary"
              >
                ✓ Thanks for subscribing!
              </motion.div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
                <div className="relative">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@email.com.au" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-semibold text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors shadow-inner"
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-primary text-on-primary text-xs font-bold uppercase tracking-wider py-3 rounded-2xl hover:bg-primary/95 transition-all shadow-lg glow-primary flex items-center justify-center gap-2 cursor-pointer"
                >
                  Subscribe <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Security & Payment Badges Area */}
        <div className="pt-8 pb-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-wrap items-center gap-6">
            <div className="inline-flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-widest">
              <Shield className="w-4 h-4 text-primary" /> Bank-grade 256-bit Security
            </div>
            <div className="w-px h-4 bg-white/10 hidden md:block"></div>
            <div className="inline-flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-widest">
              <Lock className="w-4 h-4 text-primary" /> Encrypted Payments via Stripe
            </div>
          </div>

          {/* Payment Card Icons */}
          <div className="flex items-center gap-4 text-white/30 text-xs font-bold uppercase tracking-widest">
            <span>Direct Debit</span>
            <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
            <span>Visa</span>
            <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
            <span>Mastercard</span>
            <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
            <span>BPAY</span>
          </div>
        </div>

        {/* Legal and Copyright Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col lg:flex-row items-center justify-between gap-6 text-[11px] font-black text-white/40 uppercase tracking-widest">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
            <p>PropertyLedge Pty Ltd</p>
            <span className="w-1.5 h-1.5 rounded-full bg-white/15 hidden sm:block"></span>
            <p>ABN 45 671 289 304</p>
            <span className="w-1.5 h-1.5 rounded-full bg-white/15 hidden sm:block"></span>
            <p className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> NSW, VIC, QLD, WA, SA, TAS Compliance Registered</p>
          </div>
          
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <span className="w-px h-3 bg-white/10"></span>
            <span className="text-white/30">© {new Date().getFullYear()} PropertyLedge</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function LandingPage() {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen"
    >
      <Navigation />
      <main>
        <Hero />
        <LogoStrip />
        
        <FeatureRow 
          label="INVOICING"
          title="Automate rent collection, perfectly."
          desc="Set up your rent schedule once. PropertyLedge generates the invoices, emails them to tenants, and tracks payments status automatically. Never chase rent again."
          bullets={["Automated schedule generation", "BPAY & Direct Deposit instructions", "Smart overdue reminders"]}
          image="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80"
          floatingBadge={{ title: "Rent Paid", subtitle: "INV-00142 • $480.00", icon: <Check className="w-6 h-6 text-primary" />, colorClass: "bg-surface text-primary" }}
        />
        
        <FeatureRow 
          reversed
          label="PORTFOLIO"
          title="Your entire property portfolio at a glance."
          desc="Manage multiple properties with ease. Assign team members or agents to specific properties, track occupancy rates, and maintain vital property details all in one central hub."
          bullets={["Team & Agent role assignments", "Occupancy tracking", "Centralized document vault"]}
          image="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1600&auto=format&fit=crop&q=80"
          floatingBadge={{ title: "New Tenant Added", subtitle: "24 Acacia Avenue", icon: <UserCircle2 className="w-6 h-6 text-tertiary" />, colorClass: "bg-tertiary-container text-on-tertiary-container" }}
        />

        <FeatureRow 
          label="REPORTS"
          title="Financial ledgers built for the ATO."
          desc="Tax time made painless. Every transaction is automatically categorized into ATO-compliant rental property expense and income categories. One-click export for your accountant."
          bullets={["ATO-ready expense categories", "Instant rent roll generation", "Income & Arrears reporting"]}
          image="https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1600&auto=format&fit=crop&q=80"
          floatingBadge={{ title: "Export Ready", subtitle: "EOFY Report 2025.pdf", icon: <FileText className="w-6 h-6 text-primary" />, colorClass: "bg-primary-container text-on-primary-container" }}
        />

        <FeatureRow 
          reversed
          label="INSPECTIONS"
          title="Condition reports done on your phone."
          desc="Walk through the property, snap photos, add notes, and get digital signatures right on the spot. No more printing clunky PDFs."
          bullets={["App-based property inspections", "Photo timestamping", "Custom inspection templates"]}
          image="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&auto=format&fit=crop&q=80"
          floatingBadge={{ title: "Inspection Complete", subtitle: "Move-in • 12 Photos", icon: <CheckCircle2 className="w-6 h-6" />, colorClass: "bg-secondary-container text-on-secondary-container" }}
        />

        <FeatureRow 
          label="LEASING"
          title="Digital lease signing in seconds."
          desc="Send localized, compliant lease agreements directly to your tenants' phones. Get legally binding digital signatures without printing a single piece of paper."
          bullets={["State-specific lease templates", "Legally binding digital signatures", "Automatic renewal reminders"]}
          image="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1600&auto=format&fit=crop&q=80"
          floatingBadge={{ title: "Lease Signed", subtitle: "Smith Family • 12 Months", icon: <ShieldCheck className="w-6 h-6" />, colorClass: "bg-primary-fixed-dim text-on-primary-fixed" }}
        />

        <Pricing />
        <Testimonials />
        <FAQ />
      </main>
      <Footer />
    </motion.div>
  );
}

function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Default credentials for checking
  const DEFAULT_USER = {
    name: 'Sarah Jenkins',
    email: 'landlord@gmail.com',
    password: 'password123',
    role: 'landlord',
    mobile: '0412345678'
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    setTimeout(() => {
      setLoading(false);
      
      const usersStr = localStorage.getItem('users');
      let users = [];
      if (usersStr) {
        try {
          users = JSON.parse(usersStr);
        } catch (err) {
          users = [];
        }
      }
      
      // Check against registered users or default fallback credentials
      let foundUser = null;
      if (email.toLowerCase() === DEFAULT_USER.email.toLowerCase() && password === DEFAULT_USER.password) {
        foundUser = DEFAULT_USER;
      } else {
        foundUser = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      }
      
      if (foundUser) {
        // Save user to session (without password)
        const { password: _, ...userSession } = foundUser;
        localStorage.setItem('user', JSON.stringify(userSession));
        navigate('/dashboard');
      } else {
        setError('Invalid email or password. Use landlord@gmail.com / password123 or register.');
      }
    }, 1000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden"
    >
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface via-surface-container-low to-surface z-0"></div>

      {/* Geometric Grid Overlay for modern 2026 tech look */}
      <div className="absolute inset-0 grid-pattern opacity-30 z-0 pointer-events-none" />

      {/* Dynamic Animated Ambient Blobs under the glass layer */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-primary/10 blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-secondary-container/15 blur-[120px] pointer-events-none z-0"></div>

      <div className="w-full max-w-[500px] p-6 sm:p-10 md:p-12 rounded-[32px] relative z-10 faq-glass shadow-2xl border border-white/40 text-on-surface">
        <div className="flex justify-between items-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-primary-fixed-dim transition-all font-bold text-xs tracking-widest uppercase group">
             <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to home
          </Link>
          <div className="text-[10px] font-black text-on-surface-variant bg-surface-container-high/60 border border-outline-variant/30 rounded-full px-3 py-1 flex items-center gap-1 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Secure
          </div>
        </div>

        <h2 className="text-3xl md:text-[36px] font-black text-on-surface text-center mb-1 tracking-tight font-display">Welcome back</h2>
        <p className="text-center text-on-surface-variant mb-8 font-medium text-sm md:text-base">Log in to manage your properties</p>
        
        {error && (
          <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-2xl text-xs sm:text-sm font-bold border border-red-100 text-center animate-fade-in">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Email address</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                <Mail className="w-5 h-5" />
              </span>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/70 border border-outline-variant/60 rounded-2xl pl-12 pr-5 py-3.5 text-on-surface placeholder-[#a0aab2] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium text-sm"
                placeholder="sarah@gmail.com"
              />
            </div>
          </div>
          <div className="space-y-2">
             <div className="flex justify-between items-center">
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Password</label>
                <a href="#" className="text-[10px] font-black text-primary hover:text-primary-fixed-dim uppercase tracking-wider transition-colors">Forgot password?</a>
             </div>
             <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                <Lock className="w-5 h-5" />
              </span>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/70 border border-outline-variant/60 rounded-2xl pl-12 pr-5 py-3.5 text-on-surface placeholder-[#a0aab2] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium text-sm"
                placeholder="••••••••"
              />
             </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full relative group overflow-hidden bg-primary text-on-primary font-bold uppercase tracking-wider rounded-2xl py-4 mt-8 hover:bg-primary/95 transition-all shadow-lg glow-primary flex items-center justify-center gap-2"
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-outline-variant/40 text-center">
          <p className="text-sm text-on-surface-variant font-medium">
            Don't have an account? <Link to="/signup" className="text-primary font-bold hover:underline">Start free trial</Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}



function DashboardRouter() {
  const { userContext, session, loading, user } = useAuth();
  
  if (loading) return null;

  if (user && !user.user_metadata?.role) {
    return <Navigate to="/complete-profile" replace />
  }

  // ─── Owner Dashboard ───
  if (userContext?.isOwner) {
    return <Dashboard />;
  }

  // ─── Team / Manager Dashboard ───
  if (userContext?.isTeamMember) {
    return <ManagerDashboard />;
  }
  
  // Fallback to the main owner Dashboard for all direct signups
  return <Dashboard />;
}

import { Team } from './components/Team';
import { Leases } from './components/Leases';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<SupabaseLogin />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/dashboard" element={<DashboardRouter />} />
      <Route path="/dashboard/properties" element={<Properties />} />
      <Route path="/dashboard/onboarding" element={<PropertyOnboarding />} />
      <Route path="/dashboard/property/:id" element={<PropertyDetails />} />

      <Route path="/dashboard/invoices" element={<InvoiceManagement />} />
      <Route path="/dashboard/settings" element={<AccountSettings />} />
      <Route path="/dashboard/team" element={<Team />} />
      <Route path="/dashboard/leases" element={<Leases />} />
      <Route path="/dashboard/tenants" element={<Tenants />} />
      <Route path="/dashboard/accounting" element={<Accounting />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
