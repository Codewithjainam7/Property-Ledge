import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Building, LogOut, PieChart, Wallet, Users, Home, Search, Bell, Menu, X, FileText, HelpCircle, UserPlus, Settings, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Try to load sidebar preference from local storage, default to false (expanded)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
    }
  }, [navigate]);

  const toggleSidebar = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem('sidebarCollapsed', String(newVal));
  };

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
    <div className="min-h-screen bg-surface-container-lowest flex overflow-hidden relative">
      {/* --- Ambient Background Elements --- */}
      {/* Grid Pattern */}
      <div className="absolute inset-0 grid-pattern opacity-40 z-0 pointer-events-none" />
      
      {/* Ambient Glowing Orbs */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-secondary-container/20 blur-[140px] pointer-events-none z-0" />
      {/* ---------------------------------- */}

      {/* Mobile Menubar */}
      <div className="md:hidden fixed top-0 w-full bg-surface/80 backdrop-blur-xl border-b border-outline-variant/40 z-50 px-4 py-4 flex justify-between items-center shadow-sm">
        <Link to="/" className="text-xl font-extrabold tracking-tighter text-primary flex items-center gap-2">
          <Home className="w-6 h-6 rounded-md bg-surface-container-high p-1 text-primary" />
          PropertyLedge
        </Link>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-on-surface">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop Sidebar Navigation */}
      <motion.div 
        animate={{ width: isCollapsed ? 90 : 288 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:flex flex-col relative inset-y-0 left-0 z-40 bg-surface/80 backdrop-blur-2xl border-r border-outline-variant/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
      >
        <div className="p-8 hidden md:flex items-center justify-center h-24 border-b border-outline-variant/50">
          <Link to="/" className="text-2xl font-extrabold tracking-tighter text-primary flex items-center justify-center gap-3 overflow-hidden whitespace-nowrap">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden"
                >
                  PropertyLedge
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
        
        <nav className={`flex-1 py-4 space-y-2 overflow-y-auto mt-16 md:mt-0 overflow-x-hidden ${isCollapsed ? 'flex flex-col items-center px-0' : 'px-4'}`}>
          <div className={`h-6 mb-4 mt-2 flex items-center justify-center ${isCollapsed ? 'px-0' : 'px-2'}`}>
            <AnimatePresence>
              {!isCollapsed ? (
                <motion.span 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[11px] font-black text-on-surface uppercase tracking-[0.1em] w-full"
                >
                  Organise
                </motion.span>
              ) : (
                <div className="w-8 h-[1px] bg-outline-variant/50" />
              )}
            </AnimatePresence>
          </div>
          
          {navLinks.map((link, idx) => {
            const isActive = checkIsActive(link);
            return (
              <Link 
                key={idx} 
                to={link.to} 
                title={isCollapsed ? link.name : ''}
                className={`flex items-center font-bold rounded-2xl transition-all ${isCollapsed ? 'w-12 h-12 justify-center p-0' : 'px-4 py-3.5 gap-4'} ${isActive ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
              >
                <link.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-on-primary' : ''}`} />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span 
                      initial={{ opacity: 0, width: 0 }} 
                      animate={{ opacity: 1, width: 'auto' }} 
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden text-sm"
                    >
                      {link.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )
          })}
        </nav>
        
        <nav className={`py-4 space-y-2 overflow-x-hidden border-t border-outline-variant/50 ${isCollapsed ? 'flex flex-col items-center px-0' : 'px-4'}`}>
           <Link to="#" title="Help centre" className={`flex items-center text-on-surface-variant hover:bg-surface-container-low font-bold rounded-2xl transition-all ${isCollapsed ? 'w-12 h-12 justify-center p-0' : 'px-4 py-3.5 gap-4'} hover:text-on-surface`}>
             <HelpCircle className="w-5 h-5 shrink-0" /> 
             <AnimatePresence>
                {!isCollapsed && (
                  <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="text-sm whitespace-nowrap overflow-hidden">
                    Help centre
                  </motion.span>
                )}
             </AnimatePresence>
           </Link>
           <Link to="/dashboard/settings" title="Account settings" className={`flex items-center font-bold rounded-2xl transition-all ${isCollapsed ? 'w-12 h-12 justify-center p-0' : 'px-4 py-3.5 gap-4'} ${location.pathname.startsWith('/dashboard/settings') ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}>
             <Settings className={`w-5 h-5 shrink-0`} /> 
             <AnimatePresence>
                {!isCollapsed && (
                  <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="text-sm whitespace-nowrap overflow-hidden">
                    Account settings
                  </motion.span>
                )}
             </AnimatePresence>
           </Link>
        </nav>

        <div className="p-4 border-t border-outline-variant/50 overflow-hidden mt-auto">
          <div className={`flex items-center bg-surface-container-low border border-outline-variant/50 rounded-2xl shadow-sm ${isCollapsed ? 'w-12 h-12 mx-auto justify-center p-0 mb-4' : 'p-3 mb-4 justify-between'}`}>
            <div className="flex items-center gap-3 overflow-hidden">
               <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 shadow-inner border border-primary/20">
                 <User className="w-5 h-5 text-primary" />
               </div>
               {!isCollapsed && (
                 <div className="truncate">
                    <div className="font-extrabold text-[13px] text-on-surface truncate">{user.name}</div>
                    <div className="font-semibold text-[11px] text-on-surface-variant truncate">{user.email || 'user@example.com'}</div>
                 </div>
               )}
            </div>
          </div>
          
          <button 
            onClick={toggleSidebar}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className={`hidden md:flex items-center justify-center text-on-surface-variant bg-transparent hover:bg-surface-container hover:text-on-surface rounded-2xl font-bold transition-all mb-2 ${isCollapsed ? 'w-12 h-12 mx-auto p-0' : 'w-full px-4 py-3.5 gap-3'}`}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5 shrink-0" /> : <ChevronLeft className="w-5 h-5 shrink-0" />}
            {!isCollapsed && <span className="text-sm whitespace-nowrap">Collapse Menu</span>}
          </button>

          <button 
            onClick={handleLogout}
            title={isCollapsed ? 'Sign Out' : ''}
            className={`flex items-center justify-center text-error bg-error-container/50 border border-error/30 hover:bg-error-container rounded-2xl font-bold transition-all ${isCollapsed ? 'w-12 h-12 mx-auto p-0' : 'w-full px-4 py-3.5 gap-2'}`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="text-sm whitespace-nowrap">Sign Out</span>}
          </button>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 overflow-y-auto h-screen pt-16 md:pt-0 bg-background relative z-0">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {children}
        </motion.div>
      </div>
      {/* Mobile Right-Side Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-on-surface/60 backdrop-blur-sm z-[90] md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-4/5 max-w-[320px] bg-surface z-[100] md:hidden shadow-2xl flex flex-col border-l border-outline-variant/50 pt-20"
            >
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                <div className="text-[11px] font-black text-on-surface-variant uppercase tracking-[0.1em] mb-4">Organise</div>
                {navLinks.map((link, idx) => {
                  const isActive = checkIsActive(link);
                  return (
                    <Link 
                      key={idx} 
                      to={link.to} 
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center font-bold rounded-2xl px-4 py-4 gap-4 transition-all ${isActive ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
                    >
                      <link.icon className={`w-6 h-6 shrink-0 ${isActive ? 'text-on-primary' : ''}`} />
                      <span className="text-base">{link.name}</span>
                    </Link>
                  )
                })}
                
                <div className="pt-6 mt-6 border-t border-outline-variant/50 space-y-2">
                   <Link to="#" className="flex items-center text-on-surface-variant hover:bg-surface-container-low font-bold rounded-2xl px-4 py-4 gap-4 hover:text-on-surface">
                     <HelpCircle className="w-6 h-6 shrink-0" /> 
                     <span className="text-base">Help centre</span>
                   </Link>
                   <Link to="/dashboard/settings" onClick={() => setMobileMenuOpen(false)} className={`flex items-center font-bold rounded-2xl px-4 py-4 gap-4 ${location.pathname.startsWith('/dashboard/settings') ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}>
                     <Settings className={`w-6 h-6 shrink-0`} /> 
                     <span className="text-base">Account settings</span>
                   </Link>
                </div>
              </div>
              
              <div className="p-6 border-t border-outline-variant/50">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                     <User className="w-6 h-6 text-primary" />
                   </div>
                   <div className="overflow-hidden">
                      <div className="font-extrabold text-base text-on-surface truncate">{user.name}</div>
                      <div className="font-semibold text-sm text-on-surface-variant truncate">{user.email || 'user@example.com'}</div>
                   </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center justify-center text-error bg-error-container/50 border border-error/30 rounded-2xl font-bold w-full px-4 py-4 gap-3"
                >
                  <LogOut className="w-6 h-6 shrink-0" />
                  <span className="text-base">Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
