// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Building, FileText, Wallet, Search, Bell } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

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
    <DashboardLayout>
        <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-outline-variant px-6 md:px-10 py-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface">Dashboard Overview</h1>
            <p className="text-sm md:text-base text-on-surface-variant font-medium">Here's what's happening with your properties today.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="relative flex-1 md:flex-none">
               <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
               <input type="text" placeholder="Search properties..." className="w-full md:w-64 pl-12 pr-4 py-3 bg-surface-container rounded-full border border-outline-variant focus:outline-none focus:border-primary font-medium" />
             </div>
             <button className="w-12 h-12 shrink-0 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors relative">
               <Bell className="w-5 h-5" />
               <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-primary rounded-full border-2 border-surface-container"></span>
             </button>
          </div>
        </header>

        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          {properties.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mb-12">
              <div className="bg-[#3c6e71] text-white p-6 md:p-8 rounded-[32px] shadow-sm flex flex-col justify-between">
                 <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                   <Wallet className="w-6 h-6 md:w-7 md:h-7" />
                 </div>
                 <div>
                   <div className="text-xs md:text-sm font-bold uppercase tracking-widest opacity-90 mb-2">Weekly Est. Income</div>
                   <div className="text-3xl md:text-5xl font-extrabold tracking-tight">${Math.round(totalRent).toLocaleString()}</div>
                 </div>
              </div>
              <div className="bg-[#e2e6e9] p-6 md:p-8 rounded-[32px] flex flex-col justify-between">
                 <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                   <Building className="w-6 h-6 md:w-7 md:h-7 text-[#3c6e71]" />
                 </div>
                 <div>
                   <div className="text-xs md:text-sm font-bold uppercase tracking-widest text-[#2f4f4f] mb-2">Active Properties</div>
                   <div className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#333333]">{properties.length}</div>
                 </div>
              </div>
              <div className="bg-[#e2e6e9] p-6 md:p-8 rounded-[32px] flex flex-col justify-between hidden sm:flex">
                 <div className="w-12 h-12 md:w-14 md:h-14 bg-[#c8dfe3] rounded-2xl flex items-center justify-center mb-6 text-[#3c6e71]">
                   <FileText className="w-6 h-6 md:w-7 md:h-7" />
                 </div>
                 <div>
                   <div className="text-xs md:text-sm font-bold uppercase tracking-widest text-[#2f4f4f] mb-2">Active Leases</div>
                   <div className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#333333]">{properties.filter(p => p.tenantName).length}</div>
                 </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
             <h2 className="text-2xl font-extrabold text-[#333333] tracking-tight">Your Properties</h2>
             <Link to="/dashboard/onboarding" className="bg-[#356064] text-white px-6 py-2.5 rounded-full font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#254548] transition-all shadow-sm w-full sm:w-auto">
               <Plus className="w-4 h-4" /> Add Property
             </Link>
          </div>

          {properties.length === 0 ? (
            <div className="bg-[#f8f9fa] p-8 md:p-20 rounded-[32px] text-center border border-[#e2e8f0] flex flex-col items-center">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-[24px] flex items-center justify-center mb-8 border border-[#e2e8f0] shadow-sm">
                 <Building className="w-10 h-10 md:w-12 md:h-12 text-[#a0aab2]" />
              </div>
              <h3 className="text-2xl md:text-3xl font-extrabold mb-4 text-[#333333] tracking-tight">No properties managed yet</h3>
              <p className="text-base md:text-lg text-[#356064] font-medium mb-10 max-w-md">Start building your automated portfolio. Onboarding a new property takes just a few minutes.</p>
              <Link to="/dashboard/onboarding" className="bg-[#356064] text-white px-8 md:px-10 py-4 md:py-5 rounded-full font-bold uppercase tracking-wider shadow-sm hover:shadow-md hover:-translate-y-1 transition-all w-full sm:w-auto">
                Initialize First Property
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map(p => (
                 <Link to={`/dashboard/property/${p.id}`} key={p.id} className="bg-white p-6 md:p-8 rounded-[32px] border border-[#e2e8f0] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group flex flex-col h-full cursor-pointer">
                    <div className="flex justify-between items-start mb-6">
                       <div className="w-12 h-12 md:w-14 md:h-14 bg-[#e2e6e9] rounded-2xl flex items-center justify-center shrink-0">
                         <Building className="w-6 h-6 md:w-7 md:h-7 text-[#6a808f]" />
                       </div>
                       <span className="bg-[#bce4ec] text-[#2f4f4f] text-[10px] md:text-xs font-bold px-3 md:px-4 py-1.5 md:py-2 rounded-full uppercase tracking-widest shadow-sm">
                         {p.propertyType || 'Apartment'}
                       </span>
                    </div>
                    
                    <div className="mb-8 flex-1">
                      <h4 className="text-xl md:text-[22px] font-extrabold text-[#333333] tracking-tight mb-2 leading-tight" title={p.address}>{p.address}</h4>
                      <div className="text-sm md:text-sm font-medium text-[#6a808f]">{p.suburb} {p.state} {p.postcode}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pb-2 pt-2 border-t border-[#e2e8f0] border-dashed mt-auto">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-[#6a808f] mb-1">Rent Schedule</div>
                        <div className="font-extrabold text-[#333333] text-base md:text-lg">
                           ${p.rentAmount || 0} <span className="text-[10px] font-bold text-[#6a808f] uppercase tracking-widest">/ {p.paymentFrequency?.[0] || 'W'}{p.paymentFrequency?.[1] || 'E'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-[#6a808f] mb-1">Active Tenant</div>
                        <div className="font-bold text-[#356064] text-sm truncate" title={p.tenantName}>{p.tenantName || 'Pending'}</div>
                      </div>
                    </div>
                 </Link>
              ))}
            </div>
          )}
        </div>
    </DashboardLayout>
  );
}
