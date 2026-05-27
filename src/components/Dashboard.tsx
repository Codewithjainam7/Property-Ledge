// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Building, LogOut, FileText, PieChart, Wallet, Users, Home, Search, Bell } from 'lucide-react';

export function Dashboard() {
  const [user, setUser] = useState<{name: string, role: string, email: string} | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(loggedInUser));

    const loadedProps = JSON.parse(localStorage.getItem('properties') || '[]');
    setProperties(loadedProps);
  }, [navigate]);

  if (!user) return null;

  const totalRent = properties.reduce((sum, p) => {
     let amount = parseFloat(p.rentAmount) || 0;
     if (p.paymentFrequency === 'Fortnightly') amount = amount / 2;
     if (p.paymentFrequency === 'Monthly') amount = (amount * 12) / 52;
     return sum + amount;
  }, 0);

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar Navigation */}
      <div className="w-72 bg-surface-container-lowest border-r border-outline-variant flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="p-8">
          <Link to="/" className="text-2xl font-extrabold tracking-tighter text-primary flex items-center gap-3">
            <Home className="w-8 h-8 rounded-lg bg-primary/10 p-1.5" />
            PropVault
          </Link>
        </div>
        
        <nav className="flex-1 px-6 py-4 space-y-2 overflow-y-auto">
          <div className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 mt-2 px-2">Main Menu</div>
          <Link to="/dashboard" className="flex items-center gap-4 px-4 py-4 bg-primary text-on-primary font-bold rounded-2xl shadow-lg shadow-primary/20">
            <PieChart className="w-5 h-5" /> Overview
          </Link>
          <Link to="/dashboard" className="flex items-center gap-4 px-4 py-4 text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container transition-colors">
            <Building className="w-5 h-5" /> Properties
          </Link>
          <Link to="/dashboard" className="flex items-center gap-4 px-4 py-4 text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container transition-colors">
            <Users className="w-5 h-5" /> Tenants
          </Link>
          <Link to="/dashboard" className="flex items-center gap-4 px-4 py-4 text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container transition-colors">
            <Wallet className="w-5 h-5" /> Accounting
          </Link>
        </nav>
        
        <div className="p-6 border-t border-outline-variant/50">
          <div className="bg-surface-container rounded-2xl p-4 mb-4 border border-outline-variant">
            <div className="font-extrabold text-on-surface truncate">{user.name}</div>
            <div className="text-xs font-bold text-on-surface-variant truncate mb-2">{user.email}</div>
            <div className="inline-block px-2 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-black uppercase tracking-widest rounded-md">
              {user.role}
            </div>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('user');
              navigate('/');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 text-error bg-error/10 hover:bg-error/20 rounded-2xl font-bold transition-colors"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto w-full">
        <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-outline-variant px-10 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">Dashboard Overview</h1>
            <p className="text-on-surface-variant font-medium">Here's what's happening with your properties today.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="relative hidden md:block">
               <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
               <input type="text" placeholder="Search properties..." className="pl-12 pr-4 py-3 bg-surface-container rounded-full border border-outline-variant focus:outline-none focus:border-primary font-medium w-64" />
             </div>
             <button className="w-12 h-12 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors relative">
               <Bell className="w-5 h-5" />
               <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-primary rounded-full border-2 border-surface-container"></span>
             </button>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto">
          {properties.length > 0 && (
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="bg-primary text-on-primary p-8 rounded-[32px] shadow-lg shadow-primary/20 flex flex-col justify-between">
                 <div className="w-14 h-14 bg-on-primary/10 rounded-2xl flex items-center justify-center mb-6">
                   <Wallet className="w-7 h-7" />
                 </div>
                 <div>
                   <div className="text-sm font-bold uppercase tracking-widest opacity-80 mb-2">Weekly Est. Income</div>
                   <div className="text-4xl lg:text-5xl font-extrabold tracking-tight">${Math.round(totalRent).toLocaleString()}</div>
                 </div>
              </div>
              <div className="bg-surface-container p-8 rounded-[32px] border border-outline-variant flex flex-col justify-between">
                 <div className="w-14 h-14 bg-tertiary-container text-on-tertiary-container rounded-2xl flex items-center justify-center mb-6">
                   <Building className="w-7 h-7" />
                 </div>
                 <div>
                   <div className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-2">Active Properties</div>
                   <div className="text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface">{properties.length}</div>
                 </div>
              </div>
              <div className="bg-surface-container p-8 rounded-[32px] border border-outline-variant flex flex-col justify-between">
                 <div className="w-14 h-14 bg-secondary-container text-on-secondary-container rounded-2xl flex items-center justify-center mb-6">
                   <FileText className="w-7 h-7" />
                 </div>
                 <div>
                   <div className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-2">Active Leases</div>
                   <div className="text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface">{properties.filter(p => p.tenantName).length}</div>
                 </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-8">
             <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">Your Properties</h2>
             <Link to="/dashboard/onboarding" className="bg-primary text-on-primary px-6 py-3 rounded-full font-bold uppercase tracking-wider text-sm flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5">
               <Plus className="w-5 h-5" /> Add Property
             </Link>
          </div>

          {properties.length === 0 ? (
            <div className="glass-panel-heavy p-20 rounded-[48px] text-center border border-outline-variant flex flex-col items-center">
              <div className="w-24 h-24 bg-surface-container rounded-[24px] flex items-center justify-center mb-8 border border-outline-variant shadow-sm">
                 <Building className="w-12 h-12 text-on-surface-variant" />
              </div>
              <h3 className="text-3xl font-extrabold mb-4 text-on-surface tracking-tight">No properties managed yet</h3>
              <p className="text-lg text-on-surface-variant font-medium mb-10 max-w-md">Start building your automated portfolio. Onboarding a new property takes just a few minutes.</p>
              <Link to="/dashboard/onboarding" className="bg-primary text-on-primary px-10 py-5 rounded-full font-bold uppercase tracking-wider shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-1 transition-all">
                Initialize First Property
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map(p => (
                 <div key={p.id} className="bg-surface-container-lowest/80 backdrop-blur-md p-8 rounded-[32px] border border-outline-variant shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                       <div className="w-14 h-14 bg-surface-container rounded-2xl flex items-center justify-center shrink-0 border border-outline-variant group-hover:border-primary/30 transition-colors">
                         <Building className="w-7 h-7 text-primary" />
                       </div>
                       <span className="bg-secondary-container text-on-secondary-container text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest shadow-sm">
                         {p.propertyType || 'Asset'}
                       </span>
                    </div>
                    
                    <div className="mb-8 flex-1">
                      <h4 className="text-2xl font-extrabold text-on-surface tracking-tight mb-2 leading-tight" title={p.address}>{p.address}</h4>
                      <div className="text-base font-medium text-on-surface-variant">{p.suburb} {p.state} {p.postcode}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pb-6 border-b border-outline-variant/60 mb-6 bg-surface p-4 rounded-2xl flex-1 items-end">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Rent Schedule</div>
                        <div className="font-extrabold text-on-surface text-lg xl:text-xl">${p.rentAmount} <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">/ {p.paymentFrequency.substring(0,2)}</span></div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Active Tenant</div>
                        <div className="font-bold text-on-surface text-sm truncate" title={p.tenantName}>{p.tenantName || 'Pending'}</div>
                      </div>
                    </div>

                    <Link to={`#`} className="block text-center w-full bg-surface-container border border-outline-variant text-on-surface font-bold uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-primary hover:text-on-primary hover:border-primary transition-all">
                       Management Details
                    </Link>
                 </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
