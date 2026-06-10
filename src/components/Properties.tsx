import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building, Plus, MapPin, Search, Filter, Home, ArrowUpRight, CheckCircle2, Clock, LayoutGrid, List, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from './DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonPropertyCard } from './Skeletons';

export function Properties() {
  const navigate = useNavigate();
  const { globalRole } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setDataLoading(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      const { data: teamMemberships } = await supabase
        .from('property_team')
        .select('property_id')
        .eq('user_id', userId);
        
      const managedPropertyIds = teamMemberships?.map(m => m.property_id) || [];
      
      let query = supabase.from('properties').select('*');
      if (managedPropertyIds.length > 0) {
        query = query.or(`owner_id.eq.${userId},id.in.(${managedPropertyIds.join(',')})`);
      } else {
        query = query.eq('owner_id', userId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) {
        const mappedData = data.map(p => ({
          ...p,
          rentAmount: p.rent_amount,
          propertyType: p.property_type,
          paymentFrequency: p.payment_frequency,
          tenantName: p.tenant_name,
          tenantEmail: p.tenant_email,
          leaseStart: p.lease_start
        }));
        setProperties(mappedData);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const filteredProperties = properties.filter((p: any) => {
    const matchesSearch = p.address?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.suburb?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'All' || p.propertyType === filterType;
    return matchesSearch && matchesFilter;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <DashboardLayout>
      <div className="relative overflow-hidden min-h-screen pb-20">
        
        {/* Header */}
        <header className="px-6 md:px-10 pt-8 pb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4 z-30 relative">
          <div className="flex justify-between items-center w-full md:w-auto gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-on-surface font-display mb-1">
                Properties
              </h1>
              <p className="text-sm text-on-surface-variant font-medium hidden sm:block">Manage your portfolio and track performance.</p>
            </div>
            {/* Mobile Add New Button */}
            {globalRole === 'Owner' && (
              <Link to="/dashboard/onboarding" className="md:hidden bg-primary text-on-primary px-4 py-2 rounded-full font-bold text-sm flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all shrink-0">
                <Plus className="w-4 h-4" /> Add New
              </Link>
            )}
          </div>
          <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto">
            
            {/* View Mode Toggle */}
            <div className="hidden md:flex bg-surface-container-high/60 backdrop-blur-md p-1 rounded-full shadow-inner border border-outline-variant/40 items-center">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-surface shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-full transition-all ${viewMode === 'table' ? 'bg-surface shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Custom Filter Dropdown */}
            <div className="relative flex-1 min-w-[140px] md:flex-none" tabIndex={0} onBlur={(e) => {
              // Ensure we don't close if clicking inside the dropdown
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setIsFilterOpen(false);
              }
            }}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="w-full flex justify-between items-center gap-2 pl-4 pr-3 py-2.5 bg-surface/80 backdrop-blur-md border border-outline-variant/40 rounded-full text-sm font-bold focus:outline-none focus:border-primary shadow-sm text-on-surface cursor-pointer hover:bg-surface-container-lowest transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <Filter className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{filterType === 'All' ? 'All Properties' : filterType}</span>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-on-surface-variant transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isFilterOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-0 w-full min-w-[160px] bg-surface/90 backdrop-blur-xl border border-outline-variant/40 rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden z-50 py-1.5"
                  >
                    {['All', 'House', 'Apartment', 'Townhouse'].map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setFilterType(type);
                          setIsFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${
                          filterType === type 
                            ? 'bg-primary/10 text-primary' 
                            : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                        }`}
                      >
                        {type === 'All' ? 'All Properties' : type}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative flex-[2] min-w-[200px] md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-on-surface-variant" />
              </div>
              <input
                type="text"
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant/50 rounded-full text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
              />
            </div>
            
            {/* Desktop Add New Button */}
            {globalRole === 'Owner' && (
              <Link to="/dashboard/onboarding" className="hidden md:flex bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold text-sm items-center gap-2 shadow-[0_4px_12px_rgba(34,51,59,0.2)] hover:shadow-lg hover:-translate-y-0.5 transition-all shrink-0">
                <Plus className="w-4 h-4" /> Add New
              </Link>
            )}
          </div>
        </header>

        <div className="px-6 md:px-10 max-w-[1600px] mx-auto relative z-10">
          
          {/* Skeleton loading grid */}
          {dataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-4">
              {[...Array(4)].map((_, i) => <SkeletonPropertyCard key={i} />)}
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-20 bg-surface rounded-3xl border border-outline-variant/30 mt-4 shadow-sm">
              <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-on-surface-variant" />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">No properties found</h3>
              <p className="text-on-surface-variant max-w-md mx-auto mb-6 text-sm">
                {searchQuery ? "We couldn't find any properties matching your search." : "You haven't added any properties to your portfolio yet."}
              </p>
              {!searchQuery && globalRole === 'Owner' && (
                <Link to="/dashboard/onboarding" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-bold text-sm shadow-md hover:bg-primary/95 transition-all">
                  <Plus className="w-4 h-4" /> Add Your First Property
                </Link>
              )}
            </div>
          ) : viewMode === 'grid' ? (

            <motion.div 
              key="grid"
              variants={containerVariants} 
              initial="hidden" 
              animate="visible" 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            >
              {filteredProperties.map((property) => (
                <motion.div 
                  key={property.id} 
                  variants={itemVariants}
                  onClick={() => navigate(`/dashboard/property/${property.id}`)}
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-surface rounded-3xl flex flex-col relative overflow-hidden group shadow-[0_8px_30px_rgba(0,0,0,0.06)] cursor-pointer"
                >
                  {/* Property Image Cover */}
                  <div className="h-40 w-full relative bg-surface-container overflow-hidden">
                    {property.image ? (
                      <img src={property.image} alt={property.address} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-surface-container">
                        <Home className="w-8 h-8 text-on-surface-variant/40" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                      <ArrowUpRight className="w-4 h-4 text-on-surface" />
                    </div>
                    {property.tenantName && (
                      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm text-primary">
                        <CheckCircle2 className="w-3 h-3" /> Tenanted
                      </div>
                    )}
                  </div>
                  
                  <div className="p-5 mt-auto">
                    <h3 className="text-lg font-black tracking-tight mb-1 text-on-surface truncate">{property.address}</h3>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-5 truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{property.suburb}, {property.state} {property.postcode}</span>
                    </div>
                    
                    <div className="pt-4 border-t border-outline-variant/30 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-black text-on-surface-variant tracking-[0.08em] uppercase block mb-0.5">Rent</span>
                        <span className="text-lg font-black font-display text-on-surface leading-none">${property.rentAmount || '0'} <span className="text-[10px] font-bold text-on-surface-variant font-sans">/{property.paymentFrequency === 'Monthly' ? 'mo' : 'wk'}</span></span>
                      </div>
                      <div className="bg-primary/5 text-primary px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        {property.propertyType}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface/80 backdrop-blur-2xl border border-white/50 rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant/40 bg-surface-container-low/50">
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Property</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant hidden md:table-cell">Location</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Rent</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant hidden lg:table-cell">Tenant</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.map((property, index) => (
                        <tr key={property.id} className={`border-b border-outline-variant/20 transition-colors group cursor-pointer ${index % 2 === 0 ? 'bg-transparent hover:bg-surface-container-low/50' : 'bg-surface-container-lowest/80 hover:bg-surface-container-low/80'}`} onClick={() => navigate(`/dashboard/property/${property.id}`)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 md:w-20 md:h-20 rounded-[14px] md:rounded-[20px] overflow-hidden bg-surface-container shrink-0 border border-outline-variant/30 shadow-sm relative">
                                {property.image ? (
                                  <img src={property.image} alt={property.address} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><Home className="w-6 h-6 text-on-surface-variant/50" /></div>
                                )}
                              </div>
                              <div className="flex flex-col justify-center">
                                <div className="font-black text-sm md:text-base text-on-surface tracking-tight mb-0.5">{property.address}</div>
                                <div className="text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider">{property.propertyType}</div>
                                <div className="text-[10px] text-on-surface-variant/60 uppercase font-bold mt-1">ID: {property.propertyId || property.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <div className="text-sm md:text-base font-bold text-on-surface">{property.suburb}</div>
                            <div className="text-xs md:text-sm font-medium text-on-surface-variant mt-0.5">{property.state} {property.postcode}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm md:text-base font-black text-on-surface">${property.rentAmount} <span className="text-[10px] md:text-xs font-bold text-on-surface-variant">/ {property.paymentFrequency === 'Monthly' ? 'mo' : 'wk'}</span></div>
                            {property.leaseStart && (
                              <div className="text-[10px] text-on-surface-variant font-medium mt-1">Lease start: {new Date(property.leaseStart).toLocaleDateString()}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            {property.tenantName ? (
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black shadow-inner shrink-0">
                                  {property.tenantName.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-on-surface leading-tight">{property.tenantName}</span>
                                  {property.tenantEmail && <span className="text-[10px] md:text-xs text-on-surface-variant truncate w-24 md:w-auto mt-0.5">{property.tenantEmail}</span>}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] font-black text-on-surface-variant px-3 py-1.5 bg-surface-container-high rounded-full uppercase tracking-wider inline-block">Vacant</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-primary hover:text-primary-fixed-dim bg-primary/5 hover:bg-primary/15 p-3 rounded-full transition-colors">
                              <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

        </div>
      </div>
    </DashboardLayout>
  );
}
