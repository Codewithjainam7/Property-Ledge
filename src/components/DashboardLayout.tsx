import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Building, LogOut, PieChart, Wallet, Users, Home, Search, Bell, Menu, X, FileText, HelpCircle, UserPlus, Settings, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import logoImg from '../assets/logo.png';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Try to load sidebar preference from local storage, default to false (expanded)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const { session, user, userContext, signOut, loading } = useAuth();
  const [assignedProperties, setAssignedProperties] = useState<any[]>([]);

  useEffect(() => {
    if (userContext?.isTeamMember && userContext.teamPropertyIds?.length > 0) {
      const fetchAssignedProperties = async () => {
        try {
          const { data, error } = await supabase
            .from('properties')
            .select('id, address')
            .in('id', userContext.teamPropertyIds);
          if (error) throw error;
          if (data) {
            setAssignedProperties(data);
          }
        } catch (err) {
          console.error("Error fetching assigned properties for sidebar:", err);
        }
      };
      fetchAssignedProperties();
    }
  }, [userContext]);
  
  const toggleSidebar = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem('sidebarCollapsed', String(newVal));
  };
  
  useEffect(() => {
    if (!loading) {
      if (!session) {
        navigate(`/login?redirectTo=${encodeURIComponent(location.pathname + location.search)}`);
      } else {
        const pendingInvite = localStorage.getItem('pendingInviteToken');
        if (pendingInvite) {
          navigate(`/accept-invite?token=${pendingInvite}`);
          return;
        }
        // Removed complete-profile redirect as all organic signups are now assumed to be Property Owners.
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading, user, userContext]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface relative overflow-hidden">
        {/* Dynamic Backgrounds */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-surface to-surface pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-secondary-container/10 blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        
        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4,
              ease: "easeInOut",
              repeat: Infinity
            }}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-[32px] bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-2xl shadow-primary/30 mb-8 relative"
          >
            <div className="absolute inset-0 rounded-[32px] border-2 border-white/20" />
            <Building className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            
            {/* Spinning rings */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 3, ease: "linear", repeat: Infinity }}
              className="absolute -inset-4 border-[3px] border-transparent border-t-primary/40 border-r-primary/10 rounded-full"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 4, ease: "linear", repeat: Infinity }}
              className="absolute -inset-8 border-[3px] border-transparent border-b-secondary/30 border-l-secondary/10 rounded-full"
            />
          </motion.div>
          
          <motion.h2
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-xl sm:text-2xl font-black text-on-surface tracking-tight font-display mb-3 uppercase tracking-widest"
          >
            Loading Workspace
          </motion.h2>
          
          <div className="flex gap-2 mt-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary"
                animate={{
                  y: ["0%", "-100%", "0%"],
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  
  
  let organiseLinks = [];
  let toolsLinks = [];

  if (userContext?.isTenant && !userContext?.isLandlordOrTeam) {
    organiseLinks = [
      { name: 'My Lease', icon: Home, to: '/dashboard', exact: true },
      { name: 'Invoices', icon: FileText, to: '/dashboard/invoices', exact: false }
    ];
    toolsLinks = [];
  } else if (userContext?.isTeamMember) {
    const role = userContext.userRole; // 'Agent' | 'Strata' | 'Manager'
    const isStrata = role === 'Strata';
    
    organiseLinks = [
      { name: 'Portfolio Overview', icon: PieChart, to: '/dashboard', exact: true },
      { name: 'Properties', icon: Building, to: '/dashboard/properties', exact: false },
      ...(!isStrata ? [{ name: 'Tenants', icon: Users, to: '/dashboard/tenants', exact: false }] : []),
    ];
    toolsLinks = [
      ...(!isStrata ? [{ name: 'Invoices', icon: FileText, to: '/dashboard/invoices', exact: false }] : []),
    ];
  } else {
    // Default Owner/Team View
    organiseLinks = [
      { name: 'Portfolio Overview', icon: PieChart, to: '/dashboard', exact: true },
      { name: 'Properties', icon: Building, to: '/dashboard/properties', exact: false },
      { name: 'Tenants', icon: Users, to: '/dashboard/tenants', exact: false },
    ];

    toolsLinks = [
      { name: 'Invoices', icon: FileText, to: '/dashboard/invoices', exact: false },
      { name: 'Accounting', icon: Wallet, to: '/dashboard/accounting', exact: false },
      { name: 'Team Access', icon: UserPlus, to: '/dashboard/team', exact: false },
    ];
  }

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
          <img src={logoImg} alt="PropertyLedge" className="h-6 w-auto object-contain" />
          <span className="font-black text-[14px] tracking-tight text-[#2d3748]">PropertyLedge<span className="font-normal text-[#4a5568]">.com.au</span></span>
        </Link>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-on-surface">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop Sidebar Navigation */}
      <motion.div 
        animate={{ width: isCollapsed ? 90 : 280 }}
        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
        className="hidden md:flex flex-col relative inset-y-0 left-0 z-40 bg-white/90 backdrop-blur-3xl border-r border-slate-200/60 shadow-[8px_0_32px_rgba(0,0,0,0.02)]"
      >
        <div className="p-6 hidden md:flex items-center justify-center h-[90px] border-b border-slate-200/50 relative">
          <Link to="/" className="flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap">
            <AnimatePresence initial={false}>
              {isCollapsed ? (
                <img src={logoImg} alt="PropertyLedge" className="h-7 w-auto object-contain shrink-0" />
              ) : (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden flex items-center gap-2"
                >
                  <img src={logoImg} alt="PropertyLedge" className="h-7 w-auto object-contain shrink-0" />
                  <span className="font-black text-[14px] tracking-tight text-[#2d3748] whitespace-nowrap">PropertyLedge<span className="font-normal text-[#4a5568]">.com.au</span></span>
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
        
        <nav className={`flex-1 py-6 overflow-y-auto mt-16 md:mt-0 overflow-x-hidden ${isCollapsed ? 'flex flex-col items-center px-0 gap-6' : 'px-5 space-y-8'}`}>
          {/* Assigned Properties Section for Property Managers */}
          {userContext?.isTeamMember && assignedProperties.length > 0 && (
            <div className="space-y-1.5 mb-6">
              <div className={`h-6 mb-3 flex items-center justify-center ${isCollapsed ? 'px-0' : 'px-3'}`}>
                <AnimatePresence initial={false}>
                  {!isCollapsed ? (
                    <motion.span 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] w-full"
                    >
                      Assigned Properties
                    </motion.span>
                  ) : (
                    <div className="w-6 h-[2px] bg-slate-200 rounded-full" />
                  )}
                </AnimatePresence>
              </div>
              
              {assignedProperties.map((prop, idx) => {
                const isActive = location.pathname === `/dashboard/property/${prop.id}`;
                return (
                  <Link 
                    key={`assigned-prop-${prop.id}`} 
                    to={`/dashboard/property/${prop.id}`}
                    title={isCollapsed ? prop.address : ''}
                    className={`flex items-center font-bold rounded-xl transition-all duration-300 relative group ${isCollapsed ? 'w-11 h-11 justify-center p-0 mb-1' : 'px-4 py-2.5 gap-3'} ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'}`}
                  >
                    {isActive && !isCollapsed && (
                      <motion.div layoutId="activeNavAssigned" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                    )}
                    <Building className={`w-[18px] h-[18px] shrink-0 transition-transform duration-300 ${isActive ? 'text-primary scale-110' : 'group-hover:scale-110'}`} />
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.span 
                          initial={{ opacity: 0, width: 0 }} 
                          animate={{ opacity: 1, width: 'auto' }} 
                          exit={{ opacity: 0, width: 0 }}
                          className="whitespace-nowrap overflow-hidden text-[13.5px] font-semibold"
                        >
                          {prop.address.split(',')[0]}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="space-y-1.5">
            <div className={`h-6 mb-3 flex items-center justify-center ${isCollapsed ? 'px-0' : 'px-3'}`}>
              <AnimatePresence initial={false}>
                {!isCollapsed ? (
                  <motion.span 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] w-full"
                  >
                    {userContext?.isTenant && !userContext?.isLandlordOrTeam ? 'My Rental' : userContext?.isTeamMember ? 'Workspace' : 'Organise'}
                  </motion.span>
                ) : (
                  <div className="w-6 h-[2px] bg-slate-200 rounded-full" />
                )}
              </AnimatePresence>
            </div>
            
            {organiseLinks.map((link: any, idx: number) => {
              const isActive = checkIsActive(link) && !link.locked;
              if (link.locked) {
                return (
                  <div
                    key={`org-${idx}`}
                    title={isCollapsed ? `${link.name} (No Access)` : ''}
                    className={`flex items-center rounded-xl transition-all duration-300 relative opacity-35 cursor-not-allowed ${isCollapsed ? 'w-11 h-11 justify-center p-0 mb-1' : 'px-4 py-3 gap-4'} text-slate-400`}
                  >
                    <link.icon className="w-[22px] h-[22px] shrink-0" />
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="whitespace-nowrap overflow-hidden text-[14.5px] flex items-center gap-2"
                        >
                          {link.name}
                          <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md">No Access</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }
              return (
                <Link 
                  key={`org-${idx}`} 
                  to={link.to} 
                  title={isCollapsed ? link.name : ''}
                  className={`flex items-center font-bold rounded-xl transition-all duration-300 relative group ${isCollapsed ? 'w-11 h-11 justify-center p-0 mb-1' : 'px-4 py-3 gap-4'} ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'}`}
                >
                  {isActive && !isCollapsed && (
                    <motion.div layoutId="activeNavOrg" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                  )}
                  {isActive && isCollapsed && (
                    <motion.div layoutId="activeNavCollapsedOrg" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                  )}
                  <link.icon className={`w-[22px] h-[22px] shrink-0 transition-transform duration-300 ${isActive ? 'text-primary scale-110' : 'group-hover:scale-110'}`} />
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.span 
                        initial={{ opacity: 0, width: 0 }} 
                        animate={{ opacity: 1, width: 'auto' }} 
                        exit={{ opacity: 0, width: 0 }}
                        className="whitespace-nowrap overflow-hidden text-[14.5px]"
                      >
                        {link.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              )
            })}
          </div>

          {toolsLinks.length > 0 && (
            <div className="space-y-1.5">
              <div className={`h-6 mb-3 flex items-center justify-center ${isCollapsed ? 'px-0' : 'px-3'}`}>
                <AnimatePresence initial={false}>
                  {!isCollapsed ? (
                    <motion.span 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] w-full"
                    >
                      Tools
                    </motion.span>
                  ) : (
                    <div className="w-6 h-[2px] bg-slate-200 rounded-full" />
                  )}
                </AnimatePresence>
              </div>
              
              {toolsLinks.map((link: any, idx: number) => {
                const isActive = checkIsActive(link) && !link.locked;
                if (link.locked) {
                  return (
                    <div
                      key={`tool-${idx}`}
                      title={isCollapsed ? `${link.name} (No Access)` : ''}
                      className={`flex items-center rounded-xl transition-all duration-300 relative opacity-35 cursor-not-allowed ${isCollapsed ? 'w-11 h-11 justify-center p-0 mb-1' : 'px-4 py-3 gap-4'} text-slate-400`}
                    >
                      <link.icon className="w-[22px] h-[22px] shrink-0" />
                      <AnimatePresence initial={false}>
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className="whitespace-nowrap overflow-hidden text-[14.5px] flex items-center gap-2"
                          >
                            {link.name}
                            <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md">No Access</span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }
                return (
                  <Link 
                    key={`tool-${idx}`} 
                    to={link.to} 
                    title={isCollapsed ? link.name : ''}
                    className={`flex items-center font-bold rounded-xl transition-all duration-300 relative group ${isCollapsed ? 'w-11 h-11 justify-center p-0 mb-1' : 'px-4 py-3 gap-4'} ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'}`}
                  >
                    {isActive && !isCollapsed && (
                      <motion.div layoutId="activeNavTool" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                    )}
                    {isActive && isCollapsed && (
                      <motion.div layoutId="activeNavCollapsedTool" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                    )}
                    <link.icon className={`w-[22px] h-[22px] shrink-0 transition-transform duration-300 ${isActive ? 'text-primary scale-110' : 'group-hover:scale-110'}`} />
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.span 
                          initial={{ opacity: 0, width: 0 }} 
                          animate={{ opacity: 1, width: 'auto' }} 
                          exit={{ opacity: 0, width: 0 }}
                          className="whitespace-nowrap overflow-hidden text-[14.5px]"
                        >
                          {link.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                )
              })}
            </div>
          )}
        </nav>
        
        <nav className={`py-6 space-y-1.5 overflow-x-hidden border-t border-slate-200/50 ${isCollapsed ? 'flex flex-col items-center px-0' : 'px-5'}`}>
           <Link to="#" title="Help centre" className={`flex items-center text-slate-500 hover:bg-slate-100/80 font-bold rounded-xl transition-all duration-300 group ${isCollapsed ? 'w-11 h-11 justify-center p-0 mb-1' : 'px-4 py-3 gap-4'} hover:text-slate-900`}>
             <HelpCircle className="w-[22px] h-[22px] shrink-0 group-hover:scale-110 transition-transform duration-300" /> 
             <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="text-[14.5px] whitespace-nowrap overflow-hidden">
                    Help Centre
                  </motion.span>
                )}
             </AnimatePresence>
           </Link>
           <Link to="/dashboard/settings" title="Account settings" className={`flex items-center font-bold rounded-xl transition-all duration-300 relative group ${isCollapsed ? 'w-11 h-11 justify-center p-0' : 'px-4 py-3 gap-4'} ${location.pathname.startsWith('/dashboard/settings') ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'}`}>
             {location.pathname.startsWith('/dashboard/settings') && !isCollapsed && (
               <motion.div layoutId="activeNav" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
             )}
             <Settings className={`w-[22px] h-[22px] shrink-0 transition-transform duration-300 ${location.pathname.startsWith('/dashboard/settings') ? 'text-primary scale-110' : 'group-hover:scale-110'}`} /> 
             <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="text-[14.5px] whitespace-nowrap overflow-hidden">
                    Settings
                  </motion.span>
                )}
             </AnimatePresence>
           </Link>
        </nav>

        <div className="p-5 border-t border-slate-200/50 overflow-hidden mt-auto bg-slate-50/50">
          <div className={`flex items-center bg-white border border-slate-200 rounded-2xl shadow-sm ${isCollapsed ? 'w-11 h-11 mx-auto justify-center p-0 mb-4' : 'p-3 mb-5 justify-between'}`}>
            <div className="flex items-center gap-3 overflow-hidden">
               <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center shrink-0 shadow-inner border border-slate-200/60">
                 <User className="w-5 h-5 text-indigo-500" />
               </div>
               {!isCollapsed && (
                 <div className="truncate">
                    <div className="font-extrabold text-[13px] text-slate-800 truncate tracking-tight">{user?.user_metadata?.full_name || 'Admin User'}</div>
                    <div className="font-semibold text-[11px] text-slate-400 truncate">{user?.email || 'admin@example.com'}</div>
                 </div>
               )}
            </div>
          </div>
          
          <div className={`flex ${isCollapsed ? 'flex-col items-center gap-2' : 'gap-2'}`}>
            <button 
              onClick={toggleSidebar}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className={`flex items-center justify-center text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 rounded-xl font-bold transition-all ${isCollapsed ? 'w-11 h-11 p-0' : 'w-1/2 py-2.5 gap-2 shadow-sm'}`}
            >
              {isCollapsed ? <ChevronRight className="w-[18px] h-[18px] shrink-0" /> : <ChevronLeft className="w-[18px] h-[18px] shrink-0" />}
              {!isCollapsed && <span className="text-[13px] whitespace-nowrap">Collapse</span>}
            </button>

            <button 
              onClick={handleLogout}
              title={isCollapsed ? 'Sign Out' : ''}
              className={`flex items-center justify-center text-red-500 bg-red-50/50 border border-red-100 hover:bg-red-50 hover:border-red-200 rounded-xl font-bold transition-all ${isCollapsed ? 'w-11 h-11 p-0' : 'w-1/2 py-2.5 gap-2 shadow-sm'}`}
            >
              <LogOut className="w-[18px] h-[18px] shrink-0" />
              {!isCollapsed && <span className="text-[13px] whitespace-nowrap">Sign Out</span>}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 overflow-y-auto h-screen pt-16 md:pt-0 bg-background relative">
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
              className="fixed inset-y-0 right-0 w-4/5 max-w-[340px] bg-white z-[100] md:hidden shadow-[0_0_40px_rgba(0,0,0,0.1)] flex flex-col border-l border-slate-200/50"
            >
              {/* Drawer Header with explicit Close button */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="text-lg font-extrabold tracking-tight text-slate-800">Menu</div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                {/* Assigned Properties Section for Property Managers on Mobile */}
                {userContext?.isTeamMember && assignedProperties.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] mb-4">Assigned Properties</div>
                    {assignedProperties.map((prop) => {
                      const isActive = location.pathname === `/dashboard/property/${prop.id}`;
                      return (
                        <Link 
                          key={`m-assigned-prop-${prop.id}`} 
                          to={`/dashboard/property/${prop.id}`} 
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center font-bold rounded-xl px-4 py-3 gap-3 transition-all duration-300 relative ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                          )}
                          <Building className={`w-[20px] h-[20px] shrink-0 ${isActive ? 'text-primary scale-110' : ''}`} />
                          <span className="text-[14px]">{prop.address.split(',')[0]}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] mb-4">
                    {userContext?.isTenant && !userContext?.isLandlordOrTeam ? 'My Rental' : userContext?.isTeamMember ? 'Workspace' : 'Organise'}
                  </div>
                  {organiseLinks.map((link, idx) => {
                    const isActive = checkIsActive(link);
                    return (
                      <Link 
                        key={`m-org-${idx}`} 
                        to={link.to} 
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center font-bold rounded-xl px-4 py-3.5 gap-4 transition-all duration-300 relative ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                        )}
                        <link.icon className={`w-[22px] h-[22px] shrink-0 ${isActive ? 'text-primary scale-110' : ''}`} />
                        <span className="text-[15px]">{link.name}</span>
                      </Link>
                    )
                  })}
                </div>

                {toolsLinks.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] mb-4">Tools</div>
                    {toolsLinks.map((link, idx) => {
                      const isActive = checkIsActive(link);
                      return (
                        <Link 
                          key={`m-tool-${idx}`} 
                          to={link.to} 
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center font-bold rounded-xl px-4 py-3.5 gap-4 transition-all duration-300 relative ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                          )}
                          <link.icon className={`w-[22px] h-[22px] shrink-0 ${isActive ? 'text-primary scale-110' : ''}`} />
                          <span className="text-[15px]">{link.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
                
                <div className="pt-6 mt-6 border-t border-slate-100 space-y-2">
                   <Link to="#" className="flex items-center text-slate-500 hover:bg-slate-100 font-bold rounded-xl px-4 py-3.5 gap-4 hover:text-slate-900 transition-colors">
                     <HelpCircle className="w-[22px] h-[22px] shrink-0" /> 
                     <span className="text-[15px]">Help centre</span>
                   </Link>
                   <Link to="/dashboard/settings" onClick={() => setMobileMenuOpen(false)} className={`flex items-center font-bold rounded-xl px-4 py-3.5 gap-4 transition-colors relative ${location.pathname.startsWith('/dashboard/settings') ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
                     {location.pathname.startsWith('/dashboard/settings') && (
                       <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                     )}
                     <Settings className={`w-[22px] h-[22px] shrink-0`} /> 
                     <span className="text-[15px]">Settings</span>
                   </Link>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                   <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center shrink-0 border border-slate-200/60 shadow-inner">
                     <User className="w-5 h-5 text-indigo-500" />
                   </div>
                   <div className="overflow-hidden">
                      <div className="font-extrabold text-[14px] text-slate-800 truncate tracking-tight">{user?.user_metadata?.full_name || 'Admin User'}</div>
                      <div className="font-medium text-[12px] text-slate-400 truncate">{user?.email || 'admin@example.com'}</div>
                   </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center justify-center text-red-500 bg-red-50/50 border border-red-100 rounded-xl font-bold w-full px-4 py-3 gap-2 hover:bg-red-50 transition-colors shadow-sm"
                >
                  <LogOut className="w-[18px] h-[18px] shrink-0" />
                  <span className="text-[14px]">Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
