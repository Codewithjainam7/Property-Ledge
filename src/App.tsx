import React, { useState, useEffect, FormEvent } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Play, CheckCircle2, Star, Home, Users, Building, UserCircle2, Check, FileText, ClipboardList, PieChart, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FAQ } from './components/FAQ';
import { Dashboard } from './components/Dashboard';
import { PropertyOnboarding } from './components/PropertyOnboarding';

function Navigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl rounded-full border border-outline-variant transition-all duration-300 z-50 flex justify-between items-center px-8 py-3 ${scrolled ? 'bg-surface/80 backdrop-blur-xl shadow-md' : 'bg-surface/40 backdrop-blur-md shadow-sm'}`}>
      <Link to="/" className="text-2xl font-bold tracking-tighter text-primary flex items-center gap-2">
        <svg className="h-8 w-8 text-primary" fill="none" height="32" viewBox="0 0 32 32" width="32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2"></circle>
          <path d="M11 10V22M21 10V22M11 16H21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
        </svg>
        PropVault
      </Link>
      <div className="hidden md:flex items-center gap-8">
        <a href="#features" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-bold">Features</a>
        <a href="#pricing" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-bold">Pricing</a>
        <a href="#testimonials" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-bold">Testimonials</a>
      </div>
      <div className="flex items-center gap-4">
        <Link to="/login" className="text-on-surface-variant hover:text-primary font-bold text-sm hidden sm:block">Log in</Link>
        <Link to="/signup" className="flex items-center gap-2 bg-primary text-on-primary font-bold uppercase tracking-wider text-xs px-6 py-3 rounded-full hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
          Start Free Trial <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section 
      className="pt-40 pb-20 px-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[90vh]"
    >
      <div 
        className="absolute inset-0 -z-10 opacity-30" 
        style={{
          background: `radial-gradient(1200px circle at 50% 50%, var(--color-primary-container) 0%, var(--color-secondary-container) 40%, transparent 80%), linear-gradient(135deg, rgba(60, 110, 113, 0.1) 0%, rgba(40, 75, 99, 0.1) 100%)`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-tertiary-container/20 via-primary-container/10 to-transparent -z-20"></div>

      <div className="max-w-4xl mx-auto text-center flex flex-col items-center relative z-10 w-full mt-10">
        <div className="inline-flex items-center gap-3 bg-surface-container-lowest/60 backdrop-blur-xl border border-outline-variant rounded-full px-4 py-2 mb-8 shadow-sm">
          <span className="bg-secondary-container text-on-secondary-container text-xs font-bold px-2 py-1 rounded-full uppercase tracking-widest">Update</span>
          <span className="text-on-surface-variant text-sm font-bold pr-2">🇦🇺 Built for Australian Landlords — Now in Open Beta</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-[88px] font-extrabold tracking-tight leading-[1.05] text-on-surface mb-6">
          Your Rental Properties.<br />
          <span className="text-primary tracking-tighter">Managed Smarter.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-on-surface-variant max-w-[640px] mx-auto mb-10 font-medium leading-relaxed">
          The all-in-one platform for Australian landlords, property managers and agencies. Automated invoices, digital leases, condition reports — without the agency fees.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-14 w-full sm:w-auto">
          <Link to="/signup" className="bg-primary text-on-primary w-full sm:w-auto text-lg font-bold uppercase tracking-wider rounded-full px-8 py-4 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-xl shadow-primary/20">
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
          <button className="bg-surface border-2 border-outline-variant text-on-surface w-full sm:w-auto text-lg font-bold uppercase tracking-wider rounded-full px-8 py-4 flex items-center justify-center gap-2 hover:bg-surface-container transition-colors shadow-sm">
            <Play className="w-5 h-5" /> Watch Demo
          </button>
        </div>
        
        <div className="flex flex-col items-center gap-3">
          <div className="flex -space-x-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-surface overflow-hidden shadow-sm">
                <img src={`https://i.pravatar.cc/150?img=${i + 10}`} alt="User avatar" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-4 h-4 fill-secondary text-secondary" />
              ))}
            </div>
            <span className="text-sm text-on-surface-variant font-bold">Trusted by 2,500+ landlords across Australia</span>
          </div>
        </div>
      </div>
      
      <div className="w-full max-w-5xl mx-auto mt-20 relative z-10 perspective-[1000px]">
        <div className="bg-surface-container-lowest/80 backdrop-blur-2xl rounded-[32px] overflow-hidden border border-outline-variant shadow-[0_32px_64px_rgba(159,65,34,0.1),_0_0_0_1px_rgba(255,255,255,0.3)] transform transition-transform duration-1000">
          <div className="h-12 border-b border-outline-variant flex items-center px-6 gap-2 bg-surface-container/50">
            <div className="flex gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-error"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-[#f59e0b]"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-secondary"></div>
            </div>
          </div>
          <div className="h-[400px] md:h-[600px] bg-surface p-6 relative flex items-center justify-center overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&auto=format&fit=crop&q=80" 
              alt="Dashboard overview" 
              className="w-full h-full object-cover rounded-[20px] shadow-lg border border-outline-variant/50"
            />
            <div className="absolute inset-x-10 top-20 bottom-10 flex gap-6">
               <div className="w-64 bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl p-6 shadow-2xl flex flex-col gap-4 border border-outline-variant h-fit">
                 <div className="w-12 h-12 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
                    <PieChart className="w-6 h-6" />
                 </div>
                 <div className="text-3xl font-extrabold text-on-surface tracking-tight">$4,260</div>
                 <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">Rent Collected</div>
               </div>
            </div>
          </div>
        </div>
      </div>
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
            {['REA Group', 'Domain', 'TICA', 'RTA QLD', 'NSW Fair Trading', 'ATO', 'REA Group', 'Domain', 'TICA', 'RTA QLD', 'NSW Fair Trading', 'ATO'].map((logo, i) => (
              <span key={i} className="text-2xl font-extrabold tracking-tight text-on-surface inline-block uppercase">
                {logo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureRow({ reversed, label, title, desc, bullets, image, floatingBadge }: any) {
  return (
    <section className="py-24 px-6 overflow-hidden relative">
      <div className={`max-w-7xl mx-auto glass-panel-heavy rounded-[40px] border border-outline-variant p-10 lg:p-16 flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16 lg:gap-24 shadow-[0_24px_48px_-12px_rgba(159,65,34,0.06)]`}>
        <div className="flex-1 space-y-8 z-10 relative">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary-container text-on-primary-container text-xs font-bold uppercase tracking-widest shadow-sm">
            {label}
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface leading-[1.1]">{title}</h2>
          <p className="text-lg text-on-surface-variant font-medium leading-relaxed">{desc}</p>
          <ul className="space-y-4">
            {bullets.map((b: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-7 h-7 text-primary shrink-0" />
                <span className="text-on-surface font-semibold text-lg">{b}</span>
              </li>
            ))}
          </ul>
          <Link to="/signup" className="inline-flex items-center gap-2 text-primary font-bold hover:text-on-surface transition-colors group pt-4 text-lg">
            Explore feature <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="flex-1 relative w-full lg:w-1/2">
          {floatingBadge && (
            <div className={`absolute -top-6 ${reversed ? '-left-6' : '-right-6'} z-20 bg-surface-container-lowest/90 backdrop-blur-xl border border-outline-variant shadow-xl p-5 rounded-2xl flex items-center gap-4`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${floatingBadge.colorClass || 'bg-secondary-container text-on-secondary-container'}`}>
                {floatingBadge.icon || <Check className="w-6 h-6" />}
              </div>
              <div>
                <div className="text-sm font-extrabold text-on-surface">{floatingBadge.title}</div>
                <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mt-1">{floatingBadge.subtitle}</div>
              </div>
            </div>
          )}
          <div className="bg-surface-container rounded-[32px] p-2 relative overflow-hidden aspect-[4/3] border border-outline-variant/50">
            <img src={image} alt={title} className="w-full h-full object-cover rounded-[28px]" />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary-container/20 via-transparent to-transparent"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-32 px-6 bg-surface-container/20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-20 relative z-10">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-6">Simple, fair pricing for portfolios of any size.</h2>
          <p className="text-lg text-on-surface-variant font-medium">14-day free trial — no credit card required.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 relative z-10">
          {[
            { name: "Starter", price: "Free", limit: "1 property", desc: "Perfect for the single-property landlord.", isPopular: false },
            { name: "Pro", price: "$29", period: "/mo", limit: "Up to 10 properties", desc: "For growing portfolios needing automation.", isPopular: true },
            { name: "Agency", price: "$79", period: "/mo", limit: "Unlimited + Team", desc: "Full team access and advanced reporting.", isPopular: false }
          ].map((plan, i) => (
            <div key={i} className={`p-10 bg-surface-container-lowest/80 backdrop-blur-xl rounded-[32px] border border-outline-variant flex flex-col relative group hover:-translate-y-2 transition-transform duration-300 ${plan.isPopular ? 'shadow-[0_24px_48px_-12px_rgba(159,65,34,0.15)] ring-2 ring-primary border-transparent' : 'shadow-sm'}`}>
              {plan.isPopular && (
                <div className="absolute -top-4 inset-x-0 flex justify-center">
                  <span className="bg-primary text-on-primary text-xs font-bold uppercase tracking-widest py-1.5 px-6 rounded-full shadow-md">Recommended</span>
                </div>
              )}
              <h3 className="text-3xl font-extrabold text-on-surface mb-2 mt-4">{plan.name}</h3>
              <p className="text-on-surface-variant font-medium mb-6 h-12 leading-relaxed">{plan.desc}</p>
              <div className="mb-8 flex items-baseline">
                <span className="text-6xl font-extrabold text-on-surface tracking-tighter">{plan.price}</span>
                {plan.period && <span className="text-xl text-on-surface-variant font-bold ml-1">{plan.period}</span>}
              </div>
              <ul className="space-y-5 mb-10 flex-1">
                <li className="flex items-center gap-3 text-on-surface font-semibold text-lg">
                  <CheckCircle2 className="w-6 h-6 text-primary" /> {plan.limit}
                </li>
                <li className="flex items-center gap-3 text-on-surface font-semibold text-lg">
                  <CheckCircle2 className="w-6 h-6 text-primary" /> Automated Invoicing
                </li>
                <li className="flex items-center gap-3 text-on-surface font-semibold text-lg">
                  <CheckCircle2 className="w-6 h-6 text-primary" /> Ledger & EOFY Reports
                </li>
              </ul>
              <Link to="/signup" className={`w-full py-4 rounded-full font-bold text-center uppercase tracking-wider transition-all ${plan.isPopular ? 'bg-primary text-on-primary hover:bg-primary/90 shadow-lg shadow-primary/20' : 'bg-surface-container text-on-surface hover:bg-outline-variant'}`}>
                Start Free Trial
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const testimonials = [
    { quote: "It completely replaced our agency. What used to cost us 8% of rent now costs $29 a month. The automated rent tracking is flawless.", name: "Sarah Jenkins", role: "Landlord, Brisbane QLD", rating: 5 },
    { quote: "The EOFY reporting saved me a weekend of matching bank statements. Everything aligns with the ATO categories directly.", name: "Mark T.", role: "Property Investor, Melbourne VIC", rating: 5 },
    { quote: "Condition reports used to be a nightmare of PDFs and emails. Doing it straight from the phone and getting digital signatures changed the game.", name: "Elena R.", role: "Property Manager, Sydney NSW", rating: 5 },
    { quote: "Finally, a platform built for the Australian market. The localized lease agreements and default settings save so much time.", name: "David L.", role: "Agency Director, Perth WA", rating: 5 },
    { quote: "I can see exactly when my tenants have paid, and the automated reminders mean I never have to chase up rent again.", name: "Jessica W.", role: "Landlord, Gold Coast QLD", rating: 5 },
    { quote: "The tenant portal is so clean. My tenants love being able to see their payment history and easily log maintenance requests.", name: "Tom C.", role: "Self-Managed Landlord, Adelaide SA", rating: 5 }
  ];

  return (
    <section id="testimonials" className="py-32 px-6">
      <div className="max-w-7xl mx-auto relative z-10">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-20 text-center">Trusted by landlords everywhere</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="glass-panel p-10 rounded-[32px] flex flex-col hover:-translate-y-1 transition-transform border border-outline-variant shadow-sm bg-surface-container-lowest/50">
              <div className="flex mb-6 gap-1">
                {[...Array(t.rating)].map((_, idx) => <Star key={idx} className="w-5 h-5 fill-secondary text-secondary" />)}
              </div>
              <p className="text-on-surface font-semibold text-lg leading-relaxed flex-1 mb-8">"{t.quote}"</p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full border-2 border-surface overflow-hidden shadow-sm">
                   <img src={`https://i.pravatar.cc/150?img=${i + 20}`} alt={t.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="text-base font-extrabold text-on-surface">{t.name}</div>
                  <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-32 px-6 relative overflow-hidden">
      <div className="max-w-5xl mx-auto text-center relative z-10 glass-panel-heavy border border-outline-variant shadow-xl p-16 md:p-24 rounded-[48px]">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary-container/30 to-tertiary-container/30 rounded-[48px] z-[-1]"></div>
        <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight text-on-surface mb-8">Start managing smarter today</h2>
        <p className="text-xl text-on-surface-variant font-medium mb-12 max-w-2xl mx-auto leading-relaxed">Join thousands of Australian landlords saving time and money on property management.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link to="/signup" className="bg-primary text-on-primary text-lg font-bold uppercase tracking-wider rounded-full px-10 py-5 flex items-center justify-center gap-2 hover:bg-primary/90 transition-opacity shadow-xl shadow-primary/20 w-full sm:w-auto">
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="pt-24 pb-12 px-6 border-t border-outline-variant bg-surface relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-12 mb-20">
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2 mb-6">
              <svg className="h-8 w-8 text-primary" fill="none" height="32" viewBox="0 0 32 32" width="32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2"></circle>
                <path d="M11 10V22M21 10V22M11 16H21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
              </svg>
              PropVault
            </Link>
            <p className="text-on-surface-variant font-medium max-w-sm mb-8 leading-relaxed text-lg">The complete operating system for modern Australian property managers and landlords.</p>
          </div>
          <div>
            <h4 className="text-on-surface font-extrabold mb-6 text-lg">Product</h4>
            <ul className="space-y-4 text-base text-on-surface-variant font-medium">
              <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Integrations</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Changelog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-on-surface font-extrabold mb-6 text-lg">Resources</h4>
            <ul className="space-y-4 text-base text-on-surface-variant font-medium">
              <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Community</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">ATO Guidelines</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-on-surface font-extrabold mb-6 text-lg">Company</h4>
            <ul className="space-y-4 text-base text-on-surface-variant font-medium">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Partners</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-outline-variant flex flex-col md:flex-row items-center justify-between gap-6 text-sm font-bold text-on-surface-variant uppercase tracking-wider">
          <p>PropVault Pty Ltd | ABN XX XXX XXX XXX | 🇦🇺 Made in Australia</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <LogoStrip />
        
        <FeatureRow 
          label="INVOICING"
          title="Automate rent collection, perfectly."
          desc="Set up your rent schedule once. PropVault generates the invoices, emails them to tenants, and tracks payments status automatically. Never chase rent again."
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
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      
      const usersStr = localStorage.getItem('users');
      let users = [];
      if (usersStr) users = JSON.parse(usersStr);
      
      const existing = users.find((u: any) => u.email === email);
      
      if (existing) {
        localStorage.setItem('user', JSON.stringify(existing));
      } else {
        localStorage.setItem('user', JSON.stringify({ name: email.split('@')[0], role: 'landlord', email: email }));
      }

      navigate('/dashboard'); 
    }, 1000);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-surface">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-container/20 to-tertiary-container/20 z-0"></div>
      <div className="glass-panel-heavy w-full max-w-md p-10 rounded-[40px] relative z-10 shadow-2xl border border-outline-variant text-on-surface">
        <div className="flex justify-center mb-10">
           <Link to="/" className="w-16 h-16 rounded-[20px] bg-primary flex items-center justify-center shadow-lg shadow-primary/20 hover:-translate-y-1 transition-transform">
             <Home className="w-8 h-8 text-on-primary" />
           </Link>
        </div>
        <h2 className="text-4xl font-extrabold text-center mb-2">Welcome back</h2>
        <p className="text-center text-on-surface-variant mb-10 font-medium text-lg">Log in to manage your properties</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-2 uppercase tracking-widest">Email address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border-2 border-outline-variant rounded-2xl px-5 py-4 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              placeholder="you@example.com"
            />
          </div>
          <div>
             <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-on-surface uppercase tracking-widest">Password</label>
                <a href="#" className="text-xs font-bold text-primary hover:text-primary/80 uppercase tracking-widest transition-colors">Forgot password?</a>
             </div>
            <input 
              type="password" 
              required
              className="w-full bg-surface border-2 border-outline-variant rounded-2xl px-5 py-4 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-on-primary font-bold uppercase tracking-wider rounded-2xl py-5 mt-8 hover:bg-primary/90 transition-all shadow-lg flex items-center justify-center"
          >
            {loading ? <div className="w-6 h-6 border-4 border-surface border-t-transparent rounded-full animate-spin"></div> : 'Sign In'}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-outline-variant text-center">
          <p className="text-base text-on-surface-variant font-medium">
            Don't have an account? <Link to="/signup" className="text-primary font-bold hover:underline">Start free trial</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Signup() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [fname, setFname] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  
  const handleNext = (e: FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else {
      const newUser = { name: fname || 'New User', email: email || 'user@example.com', role };
      const usersStr = localStorage.getItem('users');
      let users = [];
      if (usersStr) users = JSON.parse(usersStr);
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('user', JSON.stringify(newUser));
      
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
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-surface">
      <div className="absolute inset-0 bg-gradient-to-tr from-tertiary-container/20 to-primary-container/10 z-0"></div>
      <div className="glass-panel-heavy w-full max-w-2xl p-10 md:p-14 rounded-[40px] relative z-10 shadow-2xl border border-outline-variant text-on-surface">
        <Link to="/" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-10 font-bold text-sm tracking-widest uppercase">
          <ArrowRight className="w-5 h-5 rotate-180" /> Back to home
        </Link>
        
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-4xl md:text-5xl font-extrabold text-on-surface mb-3 tracking-tight">Create your account</h2>
            <p className="text-lg text-on-surface-variant font-medium mb-10">Start your 14-day free trial. No credit card required.</p>
            <form onSubmit={handleNext} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                 <div>
                  <label className="block text-xs font-bold text-on-surface mb-2 uppercase tracking-widest">First name</label>
                  <input type="text" required value={fname} onChange={(e) => setFname(e.target.value)} className="w-full bg-surface border-2 border-outline-variant rounded-2xl px-5 py-4 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium" />
                 </div>
                 <div>
                  <label className="block text-xs font-bold text-on-surface mb-2 uppercase tracking-widest">Last name</label>
                  <input type="text" required className="w-full bg-surface border-2 border-outline-variant rounded-2xl px-5 py-4 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium" />
                 </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface mb-2 uppercase tracking-widest">Email address</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-surface border-2 border-outline-variant rounded-2xl px-5 py-4 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface mb-2 uppercase tracking-widest">Password</label>
                <input type="password" required className="w-full bg-surface border-2 border-outline-variant rounded-2xl px-5 py-4 text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium" />
              </div>
              <button type="submit" className="w-full bg-primary text-on-primary font-bold uppercase tracking-wider rounded-2xl py-5 mt-8 hover:bg-primary/90 transition-all shadow-lg">Continue</button>
            </form>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-4xl md:text-5xl font-extrabold text-on-surface mb-3 tracking-tight">How will you use PropVault?</h2>
            <p className="text-lg text-on-surface-variant font-medium mb-10">We'll customize your dashboard based on your answer.</p>
            <div className="space-y-4 mb-10">
              {roles.map((r) => {
                const Icon = r.icon;
                const active = role === r.id;
                return (
                  <div 
                    key={r.id} 
                    onClick={() => setRole(r.id)}
                    className={`p-6 rounded-[24px] border-2 cursor-pointer transition-all flex items-center gap-5
                      ${active ? 'border-primary bg-primary-container shadow-md' : 'border-outline-variant hover:border-primary/50 bg-surface/50'}
                    `}
                  >
                     <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-primary text-on-primary shadow-lg' : 'bg-surface-container border border-outline-variant text-on-surface'}`}>
                        <Icon className="w-7 h-7" />
                     </div>
                     <div>
                        <div className={`text-xl font-extrabold ${active ? 'text-on-primary-container' : 'text-on-surface'}`}>{r.title}</div>
                        <div className={`text-base font-medium mt-1 ${active ? 'text-on-primary-container/80' : 'text-on-surface-variant'}`}>{r.desc}</div>
                     </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="px-10 py-5 rounded-2xl border-2 border-outline-variant text-on-surface font-bold uppercase tracking-wider hover:bg-surface-container transition-colors">Back</button>
              <button onClick={handleNext} disabled={!role} className="flex-1 bg-primary text-on-primary font-bold uppercase tracking-wider rounded-2xl py-5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all">Complete Setup</button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/onboarding" element={<PropertyOnboarding />} />
      </Routes>
    </Router>
  );
}
