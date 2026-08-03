import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, FileText, CheckCircle2, Info, Check, ArrowRight, Minus, Plus, Building2 } from 'lucide-react';

interface PricingCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: 'Starter' | 'Professional' | 'Premium Concierge';
}

export function PricingCalculatorModal({ isOpen, onClose, selectedPackage }: PricingCalculatorModalProps) {
  const [properties, setProperties] = useState<number>(1);
  const [totalWeeklyRent, setTotalWeeklyRent] = useState<number>(1000);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProperties(1);
      setTotalWeeklyRent(1000);
      setDiscountCode('');
      setAppliedDiscount(null);
      setIsSuccess(false);
    }
  }, [isOpen]);

  const isPremium = selectedPackage === 'Premium Concierge';
  
  let basePrice = 0;
  if (selectedPackage === 'Starter') {
    basePrice = 29 * properties * 12;
  } else if (selectedPackage === 'Professional') {
    basePrice = 59 * properties * 12;
  } else if (isPremium) {
    const annualRentTotal = totalWeeklyRent * 52;
    basePrice = annualRentTotal * 0.04;
  }

  const monthlyPrice = selectedPackage === 'Starter' ? 29 * properties : selectedPackage === 'Professional' ? 59 * properties : basePrice / 12;
  const finalPrice = appliedDiscount ? basePrice * (1 - appliedDiscount) : basePrice;

  const handleApplyDiscount = () => {
    if (!discountCode.trim()) return;
    const code = discountCode.toUpperCase();
    if (code === 'EARLY20') {
      setAppliedDiscount(0.20);
    } else {
      alert('Invalid discount code. Try EARLY20.');
      setAppliedDiscount(null);
    }
  };

  const handleGenerateInvoice = async () => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSuccess(true);
    } catch (error) {
      console.error('Error generating invoice:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-primary/50 backdrop-blur-[12px]"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 30 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-[520px] flex flex-col max-h-[90vh] z-10"
        >
          <div className="bg-white rounded-[32px] flex flex-col flex-1 overflow-hidden relative shadow-[0_32px_80px_-16px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.04)]">
            
            {/* Close Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="absolute top-5 right-5 z-[9999] w-9 h-9 bg-surface-container hover:bg-surface-container-high rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90"
            >
              <X className="w-4 h-4 text-on-surface-variant" />
            </button>

            {/* Header */}
            <div className="pt-8 pb-5 px-8 shrink-0">
              <h2 className="text-2xl font-black font-display tracking-tight text-on-surface mb-1 pr-10">
                {selectedPackage}
              </h2>
              <p className="text-on-surface-variant/70 text-[13px] font-medium">
                Generate a pro-forma invoice for your tax records.
              </p>
            </div>

            <div className="overflow-y-auto hide-scrollbar flex-1">
              {isSuccess ? (
                <div className="px-8 py-6 text-center flex flex-col items-center">
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-5 relative"
                  >
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping opacity-30" />
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </motion.div>
                  <h3 className="text-2xl font-black text-on-surface mb-2 font-display">Invoice Sent!</h3>
                  <p className="text-on-surface-variant/70 font-medium mb-8 text-sm max-w-[320px]">
                    Your pro-forma invoice has been emailed to you and our team.
                  </p>
                  <div className="w-full bg-surface-container/60 rounded-2xl p-5 text-left mb-8">
                    <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-[0.15em] mb-3">Next Steps</p>
                    <div className="space-y-3">
                      {['Check your email for the PDF invoice.', 'Pay via bank transfer using attached details.', 'Your account tier activates upon receipt.'].map((step, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black">{i + 1}</div>
                          <p className="text-[13px] text-on-surface-variant font-medium">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={onClose} className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all active:scale-[0.98]">
                    Done
                  </button>
                </div>
              ) : (
                <div className="px-8 pb-8 space-y-6">
                  
                  {/* Info */}
                  <div className="bg-primary/[0.03] border border-primary/[0.06] rounded-2xl p-4 flex gap-3">
                    <Info className="w-4 h-4 text-primary/50 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-on-surface-variant/80 leading-relaxed font-medium">
                      This generates an <strong className="text-on-surface">estimate invoice</strong>. Adjust property counts anytime in the dashboard.
                    </p>
                  </div>

                  {/* Property Counter or Rent Input */}
                  {!isPremium ? (
                    <div>
                      <label className="block text-[13px] font-black text-on-surface mb-3">Number of Properties</label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setProperties(Math.max(1, properties - 1))}
                          className="w-12 h-12 rounded-2xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 flex items-center justify-center transition-all active:scale-90"
                        >
                          <Minus className="w-4 h-4 text-on-surface-variant" />
                        </button>
                        <div className="flex-1 bg-surface-container/60 border border-outline-variant/20 rounded-2xl h-12 flex items-center justify-center relative">
                          <Building2 className="w-4 h-4 text-primary/30 absolute left-4" />
                          <span className="text-2xl font-black text-on-surface font-display tabular-nums">{properties}</span>
                        </div>
                        <button
                          onClick={() => setProperties(properties + 1)}
                          className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center transition-all hover:bg-primary/90 active:scale-90 shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[13px] font-black text-on-surface mb-3">Portfolio Total Weekly Rent</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-on-surface-variant/30 text-lg">$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={totalWeeklyRent}
                          onChange={(e) => setTotalWeeklyRent(parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                          className="w-full pl-9 pr-5 py-3.5 bg-surface-container/60 border border-outline-variant/20 rounded-2xl text-[16px] font-bold text-on-surface focus:ring-2 focus:ring-primary/15 focus:border-primary/30 outline-none transition-all"
                        />
                      </div>
                      <p className="text-[11px] text-on-surface-variant/50 mt-2 font-medium">4% premium fee applies to your total annual rent.</p>
                    </div>
                  )}

                  {/* Discount Code */}
                  <div>
                    <label className="block text-[13px] font-black text-on-surface mb-3">Discount Code</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-outline-variant" />
                        <input
                          type="text"
                          placeholder="e.g. EARLY20"
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value)}
                          className="w-full pl-10 pr-4 py-3.5 bg-surface-container/60 border border-outline-variant/20 rounded-2xl text-[13px] font-bold text-on-surface focus:ring-2 focus:ring-primary/15 focus:border-primary/30 outline-none transition-all uppercase placeholder:text-outline-variant/40 placeholder:font-medium"
                        />
                      </div>
                      <button 
                        onClick={handleApplyDiscount}
                        className="px-5 py-3.5 bg-primary text-white rounded-2xl font-bold text-[13px] hover:bg-primary/90 transition-all active:scale-[0.97] shrink-0"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {/* Total Card */}
                  <div className="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/[0.04] rounded-full blur-xl pointer-events-none" />
                    <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-secondary/10 rounded-full blur-xl pointer-events-none" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em]">Annual Total</span>
                        {appliedDiscount && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest">
                            <Check className="w-3 h-3" />
                            {Math.round(appliedDiscount * 100)}% OFF
                          </div>
                        )}
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          {appliedDiscount && (
                            <span className="text-sm text-white/30 line-through font-bold block mb-1">
                              ${basePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                          <span className="text-[40px] font-black text-white font-display tracking-tighter leading-none">
                            ${(appliedDiscount ? finalPrice : basePrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest block">Per month</span>
                          <span className="text-lg font-black text-white/80 font-display">
                            ${(appliedDiscount ? (finalPrice / 12) : monthlyPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateInvoice}
                    disabled={isGenerating}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[14px] hover:bg-primary/90 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98] shadow-[0_8px_24px_rgba(34,51,59,0.2)]"
                  >
                    {isGenerating ? (
                      <div className="w-5 h-5 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <FileText className="w-4 h-4" /> Generate Pro-Forma Invoice <ArrowRight className="w-4 h-4 opacity-60" />
                      </>
                    )}
                  </button>

                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
