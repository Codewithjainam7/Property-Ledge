import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

  const navLinks = [
    { name: 'Overview', icon: PieChart, to: '/dashboard' },
    { name: 'Properties', icon: Building, to: '/dashboard' },
    { name: 'Tenants', icon: Users, to: '/dashboard' },
    { name: 'Accounting', icon: Wallet, to: '/dashboard' },
    { name: 'Documents', icon: FileText, to: '/dashboard' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-surface flex"
    >
      {/* Mobile Menubar */}
      <div className="md:hidden fixed top-0 w-full bg-surface-container-lowest border-b border-outline-variant z-50 px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-extrabold tracking-tighter text-primary flex items-center gap-2">
          <Home className="w-6 h-6 rounded-md bg-primary/10 p-1" />
          PropVault
        </Link>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-on-surface">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-surface-container-lowest border-r border-outline-variant flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 hidden md:block">
          <Link to="/" className="text-2xl font-extrabold tracking-tighter text-primary flex items-center gap-3">
            <Home className="w-8 h-8 rounded-lg bg-primary/10 p-1.5" />
            PropVault
          </Link>
        </div>
        
        <nav className="flex-1 px-6 py-4 space-y-2 overflow-y-auto mt-16 md:mt-0">
          <div className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 mt-2 px-2">Organise</div>
          
          {navLinks.map((link, idx) => (
            <Link key={idx} to={link.to} className="flex items-center gap-4 px-4 py-4 text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container transition-colors">
              <link.icon className="w-5 h-5" /> {link.name}
            </Link>
          ))}
          
        </nav>
        
        <nav className="px-6 py-4 space-y-1">
           <Link to="#" className="flex items-center gap-4 px-4 py-3 text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container transition-colors">
             <HelpCircle className="w-4 h-4" /> <span className="text-sm">Help centre</span>
           </Link>
           <Link to="#" className="flex items-center gap-4 px-4 py-3 text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container transition-colors">
             <UserPlus className="w-4 h-4" /> <span className="text-sm">Refer a friend</span>
           </Link>
           <Link to="#" className="flex items-center gap-4 px-4 py-3 text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container transition-colors">
             <Settings className="w-4 h-4" /> <span className="text-sm">Account settings</span>
           </Link>
        </nav>

        <div className="p-6 border-t border-outline-variant/50">
          <div className="flex items-center justify-between bg-[#e6e8eb] rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3 overflow-hidden">
               <div className="w-8 h-8 rounded-full bg-[#d2d9de] flex items-center justify-center shrink-0">
                 <User className="w-4 h-4 text-[#356064]" />
               </div>
               <div className="truncate">
                  <div className="font-extrabold text-sm text-[#333333] truncate">{user.name}</div>
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
      <div className="flex-1 overflow-y-auto w-full md:w-[calc(100%-18rem)] h-screen pt-16 md:pt-0">
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
