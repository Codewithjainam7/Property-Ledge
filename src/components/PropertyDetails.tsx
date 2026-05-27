import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Settings, MapPin, Building, Home, FileText, Wallet, Clock, Wrench, BarChart3, HelpCircle, XCircle, ClipboardList, Users } from 'lucide-react';
import { DashboardLayout } from './DashboardLayout';

export function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('Find a tenant');

  useEffect(() => {
    const loadedProps = JSON.parse(localStorage.getItem('properties') || '[]');
    const found = loadedProps.find((p: any) => p.id === id);
    if (found) {
      setProperty(found);
    } else {
      navigate('/dashboard');
    }
  }, [id, navigate]);

  if (!property) return null;

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
      const loadedProps = JSON.parse(localStorage.getItem('properties') || '[]');
      const updatedProps = loadedProps.filter((p: any) => p.id !== id);
      localStorage.setItem('properties', JSON.stringify(updatedProps));
      navigate('/dashboard');
    }
  };

  const findTenantItems = [
    { title: 'Create ad', desc: 'Create your property ad and advertise on the property sites', icon: FileText, primaryAction: 'Get started' },
    { title: 'Enquiries', desc: 'Receive phone and email enquiries regarding your property', icon: Home, chevron: true },
    { title: 'Applications', desc: 'Review information from potential tenants to assess their eligibility for renting a property', icon: ClipboardList, chevron: true },
    { title: 'Tenant checks', desc: 'Verify a potential tenant\'s identity to assess their reliability and suitability as a tenant', icon: Users, chevron: true },
    { title: 'Tenancy setup', desc: 'Set up your tenant, create or import your lease agreement', icon: Home, primaryAction: 'Continue' },
  ];

  const managePropertyItems = [
    { title: 'Condition report', desc: 'Complete entry, routine, and exit inspections with digital condition reports', icon: Clock, chevron: true },
    { title: 'Bond', desc: 'Bond request and payment details', icon: Wallet, chevron: true },
    { title: 'Expenses', desc: 'Record any expenses for your property and feed them into the reports', icon: FileText, chevron: true },
    { title: 'Tenant bills', desc: 'Send bills to your tenant and keep track of the payment status', icon: FileText, chevron: true },
    { title: 'Maintenance and repairs', desc: 'Track and manage maintenance requests from your tenant', icon: Wrench, chevron: true },
    { title: 'Finance report', desc: 'Generate end-of-year report and see the income and expenses for your property', icon: BarChart3, chevron: true },
  ];

  const activeItems = activeTab === 'Find a tenant' ? findTenantItems : managePropertyItems;

  return (
    <DashboardLayout>
      <div className="bg-surface min-h-screen">
        {/* Breadcrumb Header */}
        <div className="px-6 md:px-10 py-4 border-b border-outline-variant bg-surface flex items-center justify-between text-sm text-on-surface-variant">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <ChevronRight className="w-4 h-4" />
            <span className="font-medium">{property.address}, {property.suburb}</span>
          </div>
          <button className="flex items-center gap-2 font-bold hover:text-primary transition-colors">
            <HelpCircle className="w-4 h-4" /> Help
          </button>
        </div>

        <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
          
          <div className="flex flex-col gap-1 mb-2 mt-4">
            <h1 className="text-[28px] font-extrabold text-[#1a1a1a]">Property overview</h1>
            <div className="flex items-center gap-2 text-[#1a1a1a] font-bold text-sm cursor-pointer">
              <MapPin className="w-4 h-4" /> {property.address}, {property.suburb}
              <ChevronRight className="w-4 h-4 rotate-90" />
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
            {/* Top Info section */}
            <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div className="flex items-center gap-6">
                 <div className="w-20 h-20 bg-surface-container rounded-lg flex flex-col items-center justify-center border border-outline-variant text-on-surface-variant relative overflow-hidden">
                   <Building className="w-8 h-8 opacity-50 z-10" />
                   <div className="absolute inset-x-0 bottom-0 top-1/2 bg-surface-container-high z-0" style={{ clipPath: 'polygon(0 0, 100% 60%, 100% 100%, 0% 100%)'}}></div>
                 </div>
                 <div>
                   <h2 className="text-lg font-bold text-[#0C2B4B] mb-2">{property.address}, {property.suburb} {property.state} {property.postcode}</h2>
                   <div className="text-sm font-medium text-on-surface-variant flex items-center gap-2 mb-2">
                     Residential | For rent <span className="text-[#36b8e3] bg-[#e6f7fc] px-2 py-0.5 rounded text-xs font-bold">Ad: Draft</span>
                   </div>
                   <div className="inline-block bg-[#f1f3f5] px-3 py-1 rounded-md text-xs font-bold text-[#333333] tracking-wider">
                     Property ID: {property.propertyId}
                   </div>
                 </div>
               </div>
               
               <button className="px-6 py-2 w-full md:w-auto border border-[#d2d6dc] rounded font-bold text-sm text-[#0C2B4B] hover:bg-surface-container transition-colors shrink-0">
                 Activate plan
               </button>
            </div>

            {/* Tabs */}
            <div className="flex border-t border-outline-variant">
              <button 
                onClick={() => setActiveTab('Find a tenant')}
                className={`flex-1 py-4 text-center font-bold text-sm border-b-2 transition-colors ${activeTab === 'Find a tenant' ? 'border-[#36b8e3] text-[#36b8e3]' : 'border-transparent text-[#6a808f] hover:bg-surface-container'}`}
              >
                Find a tenant
              </button>
              <button 
                onClick={() => setActiveTab('Manage my property')}
                className={`flex-1 py-4 text-center font-bold text-sm border-b-2 transition-colors ${activeTab === 'Manage my property' ? 'border-[#36b8e3] text-[#36b8e3]' : 'border-transparent text-[#333333] hover:bg-surface-container'}`}
              >
                Manage my property
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
             {activeItems.map((item, index) => (
                <div key={index} className={`bg-[#ffffff] border rounded-xl p-5 flex justify-between items-center transition-all group ${item.primaryAction ? 'border-[#0C2B4B] border-2 shadow-sm' : 'border-outline-variant hover:border-[#3c6e71] cursor-pointer'}`}>
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-[#eef3f7] rounded-full flex items-center justify-center text-[#0C2B4B]">
                        <item.icon className="w-5 h-5" />
                     </div>
                     <div>
                        <h4 className="font-bold text-[#0C2B4B]">{item.title}</h4>
                        <p className="text-sm text-on-surface-variant mt-0.5">{item.desc}</p>
                     </div>
                   </div>
                   {item.chevron && <ChevronRight className="w-5 h-5 text-[#aeb6bf]" />}
                   {item.primaryAction && (
                     <button className="bg-[#0C2B4B] text-white px-6 py-2 rounded font-bold text-sm hover:bg-[#1a3d66] transition-colors ml-4 shrink-0">
                       {item.primaryAction}
                     </button>
                   )}
                </div>
             ))}
          </div>

          <div className="pt-6 pb-20">
            <button 
              onClick={handleDelete}
              className="flex items-center gap-2 text-on-surface-variant hover:text-error transition-colors font-medium text-sm"
            >
              <XCircle className="w-4 h-4" /> Delete property
            </button>
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}
