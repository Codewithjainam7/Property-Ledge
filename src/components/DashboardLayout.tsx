import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Building, LogOut, PieChart, Wallet, Users, Home, Search, Bell, Menu, X, FileText, HelpCircle, UserPlus, Settings, User } from 'lucide-react';
import { motion } from 'framer-motion';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
    }
  }, [navigate]);

  const userStr = localStorage.getItem('user');
  if (!userStr) {
    return null;
  }
  const user = JSON.parse(userStr);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const location = useLocation();

  const navLinks = [
    { name: 'Overview', icon: PieChart, to: '/dashboard', exact: true },
    { name: 'Properties', icon: Building, to: '/dashboard/properties', exact: false },
    { name: 'Tenants', icon: Users, to: '/dashboard/tenants', exact: false },
    { name: 'Accounting', icon: Wallet, to: '/dashboard/accounting', exact: false },
    { name: 'Documents', icon: FileText, to: '/dashboard/documents', exact: false },
  ];

  const checkIsActive = (link: any) => {
    if (link.exact) {
      return location.pathname === link.to || location.pathname === `${link.to}/`;
    }
    if (link.to === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/dashboard/'; // safety
    return location.pathname.startsWith(link.to);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#eff1f3] flex"
    >
      {/* Mobile Menubar */}
      <div className="md:hidden fixed top-0 w-full bg-[#f8f9fa] border-b border-[#e2e8f0] z-50 px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-extrabold tracking-tighter text-[#356064] flex items-center gap-2">
          <Home className="w-6 h-6 rounded-md bg-[#e2e6e9] p-1" />
          PropVault
        </Link>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-[#333333]">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-[#ffffff] border-r border-[#e2e8f0] flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 hidden md:block border-b border-[#e2e8f0]">
          <Link to="/" className="text-2xl font-extrabold tracking-tighter text-[#356064] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#e2e6e9] flex items-center justify-center">
              <Home className="w-5 h-5 text-[#356064]" />
            </div>
            PropVault
          </Link>
        </div>
        
        <nav className="flex-1 px-6 py-4 space-y-2 overflow-y-auto mt-16 md:mt-0">
          <div className="text-[11px] font-black text-[#0C2B4B] uppercase tracking-[0.1em] mb-4 mt-2 px-2">Organise</div>
          
          {navLinks.map((link, idx) => {
            const isActive = checkIsActive(link);
            return (
              <Link key={idx} to={link.to} className={`flex items-center gap-4 px-4 py-3.5 font-bold rounded-[14px] transition-colors text-sm ${isActive ? 'bg-[#d6e5e6] text-[#356064]' : 'text-[#6a808f] hover:bg-[#f8f9fa]'}`}>
                <link.icon className={`w-5 h-5 ${isActive ? 'text-[#356064]' : 'text-[#a0acb5]'}`} /> {link.name}
              </Link>
            )
          })}
          
        </nav>
        
        <nav className="px-6 py-4 space-y-1">
           <Link to="#" className="flex items-center gap-4 px-4 py-3 text-[#6a808f] hover:bg-[#f8f9fa] font-bold rounded-xl transition-colors text-sm hover:text-[#0C2B4B]">
             <HelpCircle className="w-4 h-4" /> <span>Help centre</span>
           </Link>
           <Link to="#" className="flex items-center gap-4 px-4 py-3 text-[#6a808f] hover:bg-[#f8f9fa] font-bold rounded-xl transition-colors text-sm hover:text-[#0C2B4B]">
             <UserPlus className="w-4 h-4" /> <span>Refer a friend</span>
           </Link>
           <Link to="/dashboard/settings" className={`flex items-center gap-4 px-4 py-3 font-bold rounded-xl transition-colors text-sm ${location.pathname.startsWith('/dashboard/settings') ? 'bg-[#d6e5e6] text-[#356064]' : 'text-[#6a808f] hover:bg-[#f8f9fa] hover:text-[#0C2B4B]'}`}>
             <Settings className={`w-4 h-4 ${location.pathname.startsWith('/dashboard/settings') ? 'text-[#356064]' : ''}`} /> <span>Account settings</span>
           </Link>
        </nav>

        <div className="p-6 border-t border-outline-variant/50">
          <div className="flex items-center justify-between bg-[#f8f9fa] border border-[#e2e8f0] rounded-xl p-4 mb-4 shadow-sm">
            <div className="flex items-center gap-3 overflow-hidden">
               <div className="w-9 h-9 rounded-full bg-[#e2e6e9] flex items-center justify-center shrink-0 shadow-sm border border-[#d2d6dc]">
                 <User className="w-4 h-4 text-[#356064]" />
               </div>
               <div className="truncate">
                  <div className="font-bold text-[13px] text-[#333333] truncate">{user.name}</div>
                  <div className="font-medium text-[11px] text-[#6a808f] truncate">{user.email || 'user@example.com'}</div>
               </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[#c62828] bg-[#fdf0f0] border border-[#facdcd] hover:bg-[#fae3e3] rounded-xl font-bold transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 overflow-y-auto h-screen pt-16 md:pt-0">
        {children}
      </div>
      
      {/* Overlay for mobile */}
      {mobileMenuOpen && (
         <div 
           className="fixed inset-0 bg-on-surface/20 backdrop-blur-sm z-30 md:hidden"
           onClick={() => setMobileMenuOpen(false)}
         />
      )}
    </motion.div>
  );
}
