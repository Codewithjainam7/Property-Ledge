import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Shield, Sparkles, ArrowRight, Star, TrendingUp } from 'lucide-react';
import { Navigation, Footer } from '../App';
import { PricingCalculatorModal } from './PricingCalculatorModal';

type PackageType = 'Starter' | 'Professional' | 'Premium Concierge';

export function Pricing() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageType>('Starter');

  const handleSelectPackage = (pkg: PackageType) => {
    setSelectedPackage(pkg);
    setIsModalOpen(true);
  };

  const features = [
    { name: 'Rental Ledger', starter: true, pro: true, premium: true },
    { name: 'Rent Tracking', starter: true, pro: true, premium: true },
    { name: 'Maintenance Management', starter: true, pro: true, premium: true },
    { name: 'Tenant Portal', starter: true, pro: true, premium: true },
    { name: 'AI Property Assistant', starter: 'Basic', pro: 'Advanced', premium: 'Dedicated AI + VA' },
    { name: 'Document Storage', starter: true, pro: true, premium: 'Unlimited' },
    { name: 'Condition Reports', starter: true, pro: 'AI Assisted', premium: 'AI + Concierge Review' },
    { name: 'Financial Reports', starter: 'Basic', pro: 'Advanced', premium: 'Premium Reports' },
    { name: 'Mobile App', starter: true, pro: true, premium: true },
    { name: 'Custom Workflows', starter: false, pro: 'Limited', premium: true },
    { name: 'Bespoke Feature Requests', starter: false, pro: false, premium: true },
    { name: 'Dedicated Virtual Assistant', starter: false, pro: false, premium: true },
    { name: 'Priority Support', starter: false, pro: true, premium: 'Highest Priority' },
    { name: 'Early Access to Features', starter: false, pro: true, premium: true },
    { name: 'Platform Training', starter: 'Self-service', pro: 'Group Sessions', premium: '1-on-1 Onboarding' },
    { name: 'Multi-property Discounts', starter: false, pro: 'Optional', premium: 'Negotiated' },
  ];

  const renderValue = (value: string | boolean, column: 'starter' | 'pro' | 'premium') => {
    if (value === true) {
      return (
        <div className="flex justify-center">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
            column === 'pro' ? 'bg-white/15 text-white' : column === 'premium' ? 'bg-emerald-500/12 text-emerald-600' : 'bg-primary/8 text-primary'
          }`}>
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        </div>
      );
    }
    if (value === false) {
      return <span className={`text-[13px] ${column === 'pro' ? 'text-white/15' : 'text-outline-variant/30'}`}>—</span>;
    }
    return (
      <span className={`text-[11px] font-bold tracking-wide leading-tight ${
        column === 'pro' ? 'text-white/80' : 'text-on-surface/80'
      }`}>
        {value}
      </span>
    );
  };

  const starterFeatures = ['Rental Ledger & Tracking', 'Tenant Portal', 'Maintenance Requests', 'Basic Financial Reports'];
  const proFeatures = ['Everything in Starter', 'AI-Assisted Condition Reports', 'Advanced Analytics & EOFY', 'Priority Support'];
  const premiumFeatures = ['Everything in Professional', 'Dedicated Virtual Assistant', 'Bespoke Feature Requests', '1-on-1 Onboarding'];

  return (
    <div className="min-h-screen bg-surface selection:bg-primary selection:text-white flex flex-col">
      <Navigation />

      <main className="pt-32 pb-24 px-6 relative overflow-hidden flex-1">
        {/* Background Art */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[60%] bg-gradient-to-br from-secondary/12 to-transparent rounded-full blur-[120px]" />
          <div className="absolute top-[5%] right-[-15%] w-[55%] h-[55%] bg-gradient-to-bl from-primary/6 to-transparent rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[25%] w-[45%] h-[45%] bg-gradient-to-t from-powder-blue/8 to-transparent rounded-full blur-[100px]" />
          {/* Mesh grid pattern */}
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto mb-20">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 bg-white border border-outline-variant/15 rounded-full px-4 py-1.5 mb-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
            >
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.12em]">Transparent Pricing</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-[56px] font-black text-on-surface font-display mb-6 tracking-tight leading-[1.08]"
            >
              Self-management software with{' '}
              <span className="bg-gradient-to-r from-secondary via-tertiary to-secondary bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_ease-in-out_infinite]">optional concierge</span>{' '}
              services.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base text-on-surface-variant/70 font-medium max-w-lg mx-auto leading-relaxed"
            >
              Choose the level of support that fits your portfolio. From DIY tools to a complete white-glove experience.
            </motion.p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-5 lg:gap-6 mb-28 max-w-[1100px] mx-auto items-stretch">

            {/* Starter */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative group"
            >
              <div className="bg-white rounded-[28px] p-7 lg:p-8 border border-outline-variant/10 shadow-[0_2px_16px_rgba(0,0,0,0.03)] group-hover:shadow-[0_16px_48px_rgba(0,0,0,0.07)] group-hover:-translate-y-1.5 transition-all duration-500 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-surface-container rounded-xl flex items-center justify-center text-primary">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-on-surface font-display tracking-tight leading-none">Starter</h3>
                    <p className="text-[11px] text-on-surface-variant/60 font-medium mt-0.5">For DIY landlords</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[44px] font-black text-on-surface font-display tracking-tighter leading-none">$29</span>
                    <span className="text-on-surface-variant/40 font-bold text-sm">/mo per property</span>
                  </div>
                </div>

                <div className="space-y-3 mb-8 flex-1">
                  {starterFeatures.map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-md bg-primary/8 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-primary stroke-[3]" />
                      </div>
                      <span className="text-[13px] text-on-surface-variant font-medium">{f}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => handleSelectPackage('Starter')}
                  className="w-full py-3.5 bg-surface-container text-on-surface rounded-2xl font-bold text-[13px] hover:bg-primary hover:text-white transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.97]"
                >
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

            {/* Professional */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="relative group z-10"
            >
              {/* Outer glow */}
              <div className="absolute -inset-[1px] bg-gradient-to-b from-secondary/60 via-primary to-primary-container rounded-[29px] group-hover:from-secondary/80 transition-all duration-500" />
              <div className="absolute -inset-4 bg-primary/15 rounded-[36px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <div className="relative bg-primary rounded-[28px] p-7 lg:p-8 flex flex-col h-full overflow-hidden">
                {/* Ambient light effects */}
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-white/[0.03] rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-secondary/8 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/[0.08] border border-white/[0.08] rounded-xl flex items-center justify-center text-white backdrop-blur-sm">
                      <Zap className="w-5 h-5 fill-white/20" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white font-display tracking-tight leading-none">Professional</h3>
                      <p className="text-[11px] text-white/40 font-medium mt-0.5">For active investors</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-gradient-to-r from-secondary to-secondary-container text-on-surface text-[9px] font-black uppercase tracking-[0.12em] py-1 px-3 rounded-full shadow-sm">
                    <Star className="w-3 h-3 fill-current" />
                    Popular
                  </div>
                </div>

                <div className="mb-6 relative z-10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[44px] font-black text-white font-display tracking-tighter leading-none">$59</span>
                    <span className="text-white/30 font-bold text-sm">/mo per property</span>
                  </div>
                </div>

                <div className="space-y-3 mb-8 flex-1 relative z-10">
                  {proFeatures.map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-secondary stroke-[3]" />
                      </div>
                      <span className="text-[13px] text-white/70 font-medium">{f}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => handleSelectPackage('Professional')}
                  className="w-full py-3.5 bg-white text-primary rounded-2xl font-bold text-[13px] hover:bg-white/90 transition-all duration-300 shadow-lg flex items-center justify-center gap-2 active:scale-[0.97] relative z-10"
                >
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

            {/* Premium Concierge */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="relative group"
            >
              <div className="bg-white rounded-[28px] p-7 lg:p-8 border border-outline-variant/10 shadow-[0_2px_16px_rgba(0,0,0,0.03)] group-hover:shadow-[0_16px_48px_rgba(0,0,0,0.07)] group-hover:-translate-y-1.5 transition-all duration-500 flex flex-col h-full overflow-hidden">
                <div className="absolute -right-16 -top-16 w-40 h-40 bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/[0.08] transition-colors duration-500" />

                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-on-surface font-display tracking-tight leading-none">Premium</h3>
                    <p className="text-[11px] text-emerald-600/70 font-medium mt-0.5">White-glove concierge</p>
                  </div>
                </div>

                <div className="mb-6 relative z-10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[44px] font-black text-on-surface font-display tracking-tighter leading-none">4%</span>
                    <span className="text-on-surface-variant/40 font-bold text-sm">of rent collected</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                    <span className="text-[11px] text-emerald-600 font-bold">Volume discounts available</span>
                  </div>
                </div>

                <div className="space-y-3 mb-8 flex-1 relative z-10">
                  {premiumFeatures.map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                      </div>
                      <span className="text-[13px] text-on-surface-variant font-medium">{f}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => handleSelectPackage('Premium Concierge')}
                  className="w-full py-3.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl font-bold text-[13px] hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.97] relative z-10"
                >
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </div>

          {/* Feature Comparison Table */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="relative max-w-[1100px] mx-auto mb-12"
          >
            {/* Section Header */}
            <div className="flex flex-col items-center mb-12">
              <div className="inline-flex items-center gap-2.5 bg-white border border-outline-variant/10 rounded-full px-5 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.03)] mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                <span className="text-[11px] font-black text-on-surface uppercase tracking-[0.12em]">Full Feature Comparison</span>
              </div>
              <p className="text-sm text-on-surface-variant/50 font-medium">See exactly what's included in every plan</p>
            </div>

            {/* Table Container */}
            <div className="relative">
              {/* ===== MOBILE / TABLET: Stacked Plan Cards ===== */}
              <div className="lg:hidden space-y-5">
                {/* Starter Card */}
                <div className="bg-white rounded-[24px] border border-outline-variant/10 shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden">
                  <div className="p-5 flex items-center gap-3 border-b border-outline-variant/8">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-surface-container to-surface-container-high flex items-center justify-center shadow-sm">
                      <Shield className="w-5 h-5 text-primary/60" />
                    </div>
                    <div>
                      <span className="font-black text-on-surface text-base block">Starter</span>
                      <span className="text-[11px] font-bold text-on-surface-variant/40">$29/mo per property</span>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    {features.map((f, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-[13px] font-medium text-on-surface-variant/70 flex-1">{f.name}</span>
                        <div className="ml-4 shrink-0">
                          {f.starter === true ? (
                            <div className="w-6 h-6 rounded-lg bg-primary/8 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
                            </div>
                          ) : f.starter === false ? (
                            <span className="text-outline-variant/30 text-sm">—</span>
                          ) : (
                            <span className="text-[11px] font-bold text-on-surface bg-surface-container px-2.5 py-1 rounded-lg">{f.starter}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Professional Card */}
                <div className="bg-primary rounded-[24px] shadow-[0_8px_32px_rgba(34,51,59,0.2)] overflow-hidden relative">
                  <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/[0.03] rounded-full blur-2xl pointer-events-none" />
                  <div className="p-5 flex items-center justify-between border-b border-white/[0.06] relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/[0.08] flex items-center justify-center backdrop-blur-sm">
                        <Zap className="w-5 h-5 text-white/70 fill-white/15" />
                      </div>
                      <div>
                        <span className="font-black text-white text-base block">Professional</span>
                        <span className="text-[11px] font-bold text-white/35">$59/mo per property</span>
                      </div>
                    </div>
                    <span className="text-[8px] font-black text-on-surface bg-secondary px-2 py-1 rounded-full uppercase tracking-wider">Best</span>
                  </div>
                  <div className="p-5 space-y-3 relative z-10">
                    {features.map((f, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-[13px] font-medium text-white/60 flex-1">{f.name}</span>
                        <div className="ml-4 shrink-0">
                          {f.pro === true ? (
                            <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                            </div>
                          ) : f.pro === false ? (
                            <span className="text-white/15 text-sm">—</span>
                          ) : (
                            <span className="text-[11px] font-bold text-white bg-white/10 px-2.5 py-1 rounded-lg">{f.pro}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Premium Card */}
                <div className="bg-white rounded-[24px] border border-outline-variant/10 shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden">
                  <div className="p-5 flex items-center gap-3 border-b border-outline-variant/8">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/30 flex items-center justify-center shadow-sm">
                      <Crown className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <span className="font-black text-on-surface text-base block">Premium</span>
                      <span className="text-[11px] font-bold text-emerald-600/50">4% of rent</span>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    {features.map((f, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-[13px] font-medium text-on-surface-variant/70 flex-1">{f.name}</span>
                        <div className="ml-4 shrink-0">
                          {f.premium === true ? (
                            <div className="w-6 h-6 rounded-lg bg-emerald-500/12 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                            </div>
                          ) : f.premium === false ? (
                            <span className="text-outline-variant/30 text-sm">—</span>
                          ) : (
                            <span className="text-[11px] font-bold text-on-surface bg-emerald-50 px-2.5 py-1 rounded-lg">{f.premium}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mobile Bottom CTA */}
                <div className="bg-white rounded-[24px] border border-outline-variant/10 shadow-[0_2px_16px_rgba(0,0,0,0.03)] p-6 text-center">
                  <p className="text-[14px] text-on-surface font-bold mb-1">Not sure which plan is right?</p>
                  <p className="text-[12px] text-on-surface-variant/50 font-medium mb-5">Most property managers start with Professional.</p>
                  <button 
                    onClick={() => handleSelectPackage('Professional')}
                    className="inline-flex items-center gap-2.5 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-[13px] hover:bg-primary/90 transition-all active:scale-[0.97] shadow-[0_4px_12px_rgba(34,51,59,0.15)] w-full justify-center"
                  >
                    Start with Professional <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ===== DESKTOP: Full Table ===== */}
              <div className="hidden lg:block">
                {/* Professional column outer glow */}
                <div className="absolute top-0 bottom-0 left-[34%] w-[22%] -inset-y-2 bg-primary/10 blur-2xl rounded-3xl pointer-events-none" />
                
                <div className="bg-white/80 backdrop-blur-sm rounded-[28px] shadow-[0_4px_32px_rgba(0,0,0,0.04)] border border-outline-variant/8 overflow-hidden relative">
                  <div className="overflow-x-auto hide-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[860px]">
                      <thead>
                        <tr>
                          {/* Feature Column Header */}
                          <th className="p-6 lg:p-7 w-[34%] bg-white border-b border-outline-variant/8">
                            <span className="text-[11px] font-black text-on-surface-variant/50 uppercase tracking-[0.15em]">Feature</span>
                          </th>

                          {/* Starter Header */}
                          <th className="p-6 lg:p-7 text-center w-[22%] bg-white border-b border-outline-variant/8">
                            <div className="flex flex-col items-center">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-surface-container to-surface-container-high flex items-center justify-center mb-2.5 shadow-sm">
                                <Shield className="w-5 h-5 text-primary/60" />
                              </div>
                              <span className="font-black text-on-surface text-sm block">Starter</span>
                              <span className="text-[10px] font-bold text-on-surface-variant/35 mt-0.5">$29/mo</span>
                            </div>
                          </th>

                          {/* Professional Header - Dark */}
                          <th className="p-6 lg:p-7 text-center w-[22%] relative border-b-0">
                            <div className="absolute inset-x-1 inset-y-0 bg-primary rounded-t-3xl" />
                            <div className="absolute inset-x-1 inset-y-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_70%)] rounded-t-3xl" />
                            <div className="relative z-10 flex flex-col items-center">
                              <div className="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/[0.08] flex items-center justify-center mb-2.5 backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
                                <Zap className="w-5 h-5 text-white/70 fill-white/15" />
                              </div>
                              <span className="font-black text-white text-sm block">Professional</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] font-bold text-white/35">$59/mo</span>
                                <span className="text-[8px] font-black text-on-surface bg-secondary px-1.5 py-0.5 rounded-full uppercase tracking-wider">Best</span>
                              </div>
                            </div>
                          </th>

                          {/* Premium Header */}
                          <th className="p-6 lg:p-7 text-center w-[22%] bg-white border-b border-outline-variant/8">
                            <div className="flex flex-col items-center">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/30 flex items-center justify-center mb-2.5 shadow-sm">
                                <Crown className="w-5 h-5 text-emerald-600" />
                              </div>
                              <span className="font-black text-on-surface text-sm block">Premium</span>
                              <span className="text-[10px] font-bold text-emerald-600/50 mt-0.5">4% of rent</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {features.map((feature, i) => (
                          <tr 
                            key={i} 
                            className={`group transition-all duration-200 ${i % 2 === 0 ? 'bg-white' : 'bg-surface/30'} hover:bg-primary/[0.02]`}
                          >
                            <td className={`py-4 px-6 lg:px-7 text-[13px] font-semibold text-on-surface-variant/60 group-hover:text-primary/80 transition-colors ${i < features.length - 1 ? 'border-b border-outline-variant/[0.05]' : ''}`}>
                              <div className="flex items-center gap-2.5">
                                <div className="w-1 h-1 rounded-full bg-outline-variant/20 group-hover:bg-primary/40 group-hover:scale-150 transition-all duration-300" />
                                {feature.name}
                              </div>
                            </td>
                            <td className={`py-4 px-4 text-center ${i < features.length - 1 ? 'border-b border-outline-variant/[0.05]' : ''}`}>
                              {renderValue(feature.starter, 'starter')}
                            </td>
                            <td className="py-4 px-4 text-center relative">
                              <div className={`absolute inset-x-1 inset-y-0 bg-primary/[0.97] ${i === features.length - 1 ? 'rounded-b-3xl' : ''}`} />
                              {i < features.length - 1 && <div className="absolute bottom-0 left-6 right-6 h-px bg-white/[0.05]" />}
                              <div className="relative z-10">{renderValue(feature.pro, 'pro')}</div>
                            </td>
                            <td className={`py-4 px-4 text-center ${i < features.length - 1 ? 'border-b border-outline-variant/[0.05]' : ''}`}>
                              {renderValue(feature.premium, 'premium')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom CTA */}
                  <div className="border-t border-outline-variant/[0.06] p-6 lg:p-7 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.01] via-primary/[0.03] to-primary/[0.01]" />
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                      <div>
                        <p className="text-[14px] text-on-surface font-bold">Not sure which plan is right?</p>
                        <p className="text-[12px] text-on-surface-variant/50 font-medium mt-0.5">Most property managers start with Professional.</p>
                      </div>
                      <button 
                        onClick={() => handleSelectPackage('Professional')}
                        className="inline-flex items-center gap-2.5 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-[13px] hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg transition-all active:scale-[0.97] shadow-[0_4px_12px_rgba(34,51,59,0.15)]"
                      >
                        Start with Professional <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <PricingCalculatorModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        selectedPackage={selectedPackage} 
      />
      
      <Footer />
    </div>
  );
}
