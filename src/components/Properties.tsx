import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building, Plus, MapPin, Search, Filter, Home, ArrowUpRight, CheckCircle2, Clock, LayoutGrid, List } from 'lucide-react';
import { motion } from 'framer-motion';
import { DashboardLayout } from './DashboardLayout';

export function Properties() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    const loadedProps = JSON.parse(localStorage.getItem('properties') || '[]');
    setProperties(loadedProps);
  }, []);

  const filteredProperties = properties.filter((p: any) => 
    p.address?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.suburb?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <header className="px-6 md:px-10 pt-8 pb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4 z-10 relative">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-on-surface font-display mb-1">
              Properties
            </h1>
            <p className="text-sm text-on-surface-variant font-medium">Manage your portfolio and track performance.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            
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

            <div className="relative flex-1 md:w-64">
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
            <Link to="/dashboard/onboarding" className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-[0_4px_12px_rgba(34,51,59,0.2)] hover:shadow-lg hover:-translate-y-0.5 transition-all shrink-0">
              <Plus className="w-4 h-4" /> Add New
            </Link>
          </div>
        </header>

        <div className="px-6 md:px-10 max-w-[1600px] mx-auto relative z-10">
          
          {filteredProperties.length === 0 ? (
            <div className="text-center py-20 bg-surface rounded-3xl border border-outline-variant/30 mt-4 shadow-sm">
              <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-on-surface-variant" />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">No properties found</h3>
              <p className="text-on-surface-variant max-w-md mx-auto mb-6 text-sm">
                {searchQuery ? "We couldn't find any properties matching your search." : "You haven't added any properties to your portfolio yet."}
              </p>
              {!searchQuery && (
                <Link to="/dashboard/onboarding" className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-bold text-sm shadow-md hover:bg-primary/95 transition-all">
                  <Plus className="w-4 h-4" /> Add Your First Property
                </Link>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <motion.div 
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
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Location</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Rent</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Tenant</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.map((property) => (
                        <tr key={property.id} className="border-b border-outline-variant/20 hover:bg-surface-container-lowest/80 transition-colors group cursor-pointer" onClick={() => navigate(`/dashboard/property/${property.id}`)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-surface-container shrink-0 border border-outline-variant/30 shadow-sm">
                                {property.image ? (
                                  <img src={property.image} alt={property.address} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><Home className="w-5 h-5 text-on-surface-variant/50" /></div>
                                )}
                              </div>
                              <div>
                                <div className="font-black text-sm text-on-surface tracking-tight">{property.address}</div>
                                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mt-1">{property.propertyType}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-on-surface">{property.suburb}</div>
                            <div className="text-xs font-medium text-on-surface-variant mt-0.5">{property.state} {property.postcode}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-black text-on-surface">${property.rentAmount} <span className="text-[10px] font-bold text-on-surface-variant">/ {property.paymentFrequency === 'Monthly' ? 'mo' : 'wk'}</span></div>
                          </td>
                          <td className="px-6 py-4">
                            {property.tenantName ? (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shadow-inner">
                                  {property.tenantName.charAt(0)}
                                </div>
                                <span className="text-sm font-bold text-on-surface">{property.tenantName}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-black text-on-surface-variant px-2.5 py-1 bg-surface-container-high rounded-full uppercase tracking-wider">Vacant</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-primary hover:text-primary-fixed-dim bg-primary/5 hover:bg-primary/10 p-2.5 rounded-full transition-colors">
                              <ArrowUpRight className="w-4 h-4" />
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
