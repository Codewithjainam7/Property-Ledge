import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building, MapPin, Search, Filter, Home, ArrowUpRight, CheckCircle2, LayoutGrid, List, ChevronDown, ArrowRight, ChevronLeft, ChevronRight, Wallet, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from './DashboardLayout';
import { supabase } from '../lib/supabase';
import { SkeletonPropertyCard } from './Skeletons';
import { useAuth } from '../contexts/AuthContext';

const PropertyImageCarousel = ({ property }: { property: any }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const images = property.images?.length > 0 ? property.images : (property.image ? [property.image] : []);

  if (images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-container">
        <Home className="w-8 h-8 text-on-surface-variant/40" />
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full relative group/carousel"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <AnimatePresence initial={false}>
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          alt={`${property.address} view ${currentIndex + 1}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full object-cover absolute inset-0 transition-transform duration-700 group-hover:scale-105"
        />
      </AnimatePresence>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <div className={`absolute inset-0 flex items-center justify-between px-2 transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev - 1 + images.length) % images.length); }}
            className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % images.length); }}
            className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-full">
          {images.map((_: any, idx: number) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
              className={`w-1 h-1 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'bg-white w-2' : 'bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function TenantPortal() {
  const navigate = useNavigate();
  const { session } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'marketplace' | 'lease'>('marketplace');
  const [properties, setProperties] = useState<any[]>([]);
  const [leasedProperty, setLeasedProperty] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterState, setFilterState] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isStateFilterOpen, setIsStateFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    if (!session?.user?.id) return;
    setDataLoading(true);
    try {
      // Fetch active marketplace properties
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'Active')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) {
        const mappedData = data.map(p => ({
          ...p,
          rentAmount: p.rent_amount,
          propertyType: p.property_type,
          paymentFrequency: p.payment_frequency,
        }));
        setProperties(mappedData);
      }

      // Fetch the user's specific leased property
      const { data: leaseData } = await supabase
        .from('properties')
        .select('*')
        .eq('tenant_id', session.user.id)
        .single();
        
      if (leaseData) {
        setLeasedProperty({
          ...leaseData,
          rentAmount: leaseData.rent_amount,
          propertyType: leaseData.property_type,
          paymentFrequency: leaseData.payment_frequency,
        });
        setActiveTab('lease');
      }

    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const australianStates = [
    'All', 
    'New South Wales', 
    'Victoria', 
    'Queensland', 
    'Western Australia', 
    'South Australia', 
    'Tasmania', 
    'ACT', 
    'Northern Territory'
  ];

  const filteredProperties = properties.filter((p: any) => {
    const matchesSearch = p.address?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.suburb?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'All' || p.propertyType === filterType;
    // Handle both abbreviations (QLD) and full names (Queensland) if needed, but we do exact or includes match
    const stateMatchStr = filterState === 'All' ? 'All' : filterState;
    const matchesState = filterState === 'All' || 
                         p.state?.toLowerCase() === filterState.toLowerCase() ||
                         (filterState === 'Queensland' && p.state?.toLowerCase() === 'qld') ||
                         (filterState === 'New South Wales' && p.state?.toLowerCase() === 'nsw') ||
                         (filterState === 'Victoria' && p.state?.toLowerCase() === 'vic') ||
                         (filterState === 'Western Australia' && p.state?.toLowerCase() === 'wa') ||
                         (filterState === 'South Australia' && p.state?.toLowerCase() === 'sa') ||
                         (filterState === 'Tasmania' && p.state?.toLowerCase() === 'tas') ||
                         (filterState === 'Northern Territory' && p.state?.toLowerCase() === 'nt');
                         
    return matchesSearch && matchesFilter && matchesState;
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
        <header className="px-6 md:px-10 pt-8 pb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-6 z-30 relative">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-on-surface font-display mb-1">
                Welcome Home
              </h1>
              <p className="text-sm text-on-surface-variant font-medium hidden sm:block">Find your next rental or manage your current lease.</p>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-surface-container-low p-1 rounded-2xl w-fit border border-outline-variant/30 shadow-inner mt-2">
              <button
                onClick={() => setActiveTab('lease')}
                className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'lease' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                My Lease & Property
              </button>
              <button
                onClick={() => setActiveTab('marketplace')}
                className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'marketplace' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Find Properties
              </button>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
              
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

              {/* State Filter Dropdown */}
              <div className="relative flex-1 min-w-[140px] md:flex-none" tabIndex={0} onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsStateFilterOpen(false);
                }
              }}>
                <button
                  onClick={() => setIsStateFilterOpen(!isStateFilterOpen)}
                  className="w-full flex justify-between items-center gap-2 pl-4 pr-3 py-2.5 bg-surface/80 backdrop-blur-md border border-outline-variant/40 rounded-full text-sm font-bold focus:outline-none focus:border-primary shadow-sm text-on-surface cursor-pointer hover:bg-surface-container-lowest transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{filterState === 'All' ? 'All States' : filterState}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-on-surface-variant transition-transform ${isStateFilterOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isStateFilterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-2 left-0 w-full min-w-[180px] max-h-60 overflow-y-auto bg-surface/90 backdrop-blur-xl border border-outline-variant/40 rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50 py-1.5"
                    >
                      {australianStates.map((state: any) => (
                        <button
                          key={state}
                          onClick={() => {
                            setFilterState(state);
                            setIsStateFilterOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${
                            filterState === state 
                              ? 'bg-primary/10 text-primary' 
                              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                          }`}
                        >
                          {state === 'All' ? 'All States' : state}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>


          </div>
        </header>

        <div className="px-6 md:px-10 max-w-[1600px] mx-auto relative z-10">
          
          {dataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-4">
              {[...Array(4)].map((_, i) => <SkeletonPropertyCard key={i} />)}
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-20 bg-surface rounded-3xl border border-outline-variant/30 mt-4 shadow-sm">
              <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-on-surface-variant" />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">No properties found</h3>
              <p className="text-on-surface-variant max-w-md mx-auto mb-6 text-sm">
                Try adjusting your search criteria or checking back later for new listings.
              </p>
            </div>
          ) : activeTab === 'lease' ? (
            <div className="pt-4">
              {leasedProperty ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface rounded-[32px] p-6 md:p-8 border border-outline-variant/30 shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex flex-col md:flex-row gap-8"
                >
                  <div className="w-full md:w-1/3 aspect-[4/3] rounded-2xl overflow-hidden relative shadow-inner">
                    {leasedProperty.image || leasedProperty.images?.[0] ? (
                      <img src={leasedProperty.images?.[0] || leasedProperty.image} alt={leasedProperty.address} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-surface-container">
                        <Home className="w-12 h-12 text-on-surface-variant/30" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active Lease
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center">
                    <h2 className="text-2xl md:text-3xl font-black text-on-surface mb-2 tracking-tight">{leasedProperty.address}</h2>
                    <div className="flex items-center gap-1.5 text-on-surface-variant font-bold text-sm uppercase tracking-widest mb-6">
                      <MapPin className="w-4 h-4 text-primary" />
                      {leasedProperty.suburb}, {leasedProperty.state} {leasedProperty.postcode}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Wallet className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-0.5">Rent Amount</p>
                          <p className="text-lg font-black text-on-surface">${leasedProperty.rentAmount || '0'}<span className="text-xs font-medium text-on-surface-variant">/{leasedProperty.paymentFrequency === 'Monthly' ? 'mo' : 'wk'}</span></p>
                        </div>
                      </div>
                      <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-0.5">Property Type</p>
                          <p className="text-lg font-black text-on-surface">{leasedProperty.propertyType || 'Residential'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => navigate(`/dashboard/marketplace/${leasedProperty.id}`)}
                      className="flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-on-primary rounded-xl font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 w-fit"
                    >
                      View Property Details <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-surface rounded-[32px] p-12 text-center border border-outline-variant/30 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                  <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mb-6">
                    <FileText className="w-10 h-10 text-on-surface-variant" />
                  </div>
                  <h2 className="text-2xl font-black text-on-surface mb-3 tracking-tight">No Active Lease</h2>
                  <p className="text-on-surface-variant max-w-md mx-auto mb-8 text-base font-medium">
                    You currently have no active leases linked to your account. Head over to the marketplace to find your next home!
                  </p>
                  <button 
                    onClick={() => setActiveTab('marketplace')}
                    className="px-8 py-4 bg-primary text-on-primary rounded-full font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                  >
                    Browse Marketplace
                  </button>
                </div>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <motion.div 
              key="grid"
              variants={containerVariants} 
              initial="hidden" 
              animate="visible" 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-4"
            >
              {filteredProperties.map((property) => (
                <motion.div 
                  key={property.id} 
                  variants={itemVariants}
                  onClick={() => navigate(`/dashboard/marketplace/${property.id}`)}
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-surface rounded-3xl flex flex-col relative overflow-hidden group shadow-[0_8px_30px_rgba(0,0,0,0.06)] cursor-pointer"
                >
                  {/* Property Image Cover */}
                  <div className="h-40 w-full relative bg-surface-container overflow-hidden">
                    <PropertyImageCarousel property={property} />
                    <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-20">
                      <ArrowUpRight className="w-4 h-4 text-on-surface" />
                    </div>
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
              className="bg-surface/80 backdrop-blur-2xl border border-white/50 rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] mt-4"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/40 bg-surface-container-low/50">
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Property</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant hidden md:table-cell">Location</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">Rent</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-wider text-on-surface-variant text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProperties.map((property, index) => (
                      <tr key={property.id} className={`border-b border-outline-variant/20 transition-colors group cursor-pointer ${index % 2 === 0 ? 'bg-transparent hover:bg-surface-container-low/50' : 'bg-surface-container-lowest/80 hover:bg-surface-container-low/80'}`} onClick={() => navigate(`/dashboard/marketplace/${property.id}`)}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-[14px] md:rounded-[20px] overflow-hidden bg-surface-container shrink-0 border border-outline-variant/30 shadow-sm relative">
                              {property.images?.length > 0 || property.image ? (
                                <img src={property.images?.[0] || property.image} alt={property.address} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><Home className="w-6 h-6 text-on-surface-variant/50" /></div>
                              )}
                            </div>
                            <div className="flex flex-col justify-center">
                              <div className="font-black text-sm md:text-base text-on-surface tracking-tight mb-0.5">{property.address}</div>
                              <div className="text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider">{property.propertyType}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <div className="text-sm md:text-base font-bold text-on-surface">{property.suburb}</div>
                          <div className="text-xs md:text-sm font-medium text-on-surface-variant mt-0.5">{property.state} {property.postcode}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm md:text-base font-black text-on-surface">${property.rentAmount} <span className="text-[10px] md:text-xs font-bold text-on-surface-variant">/ {property.paymentFrequency === 'Monthly' ? 'mo' : 'wk'}</span></div>
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
