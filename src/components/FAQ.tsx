// src/components/FAQ.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, MessageSquare, ArrowRight } from 'lucide-react';
import faqBgImage from './faq-bg.png';

const faqs = [
  {
    category: "RENT COLLECTION",
    number: "01",
    question: "How does the automated rent collection work?",
    answer: "PropertyLedge generates a recurring invoice which is sent automatically to your tenants. Tenants can easily pay via BPAY or Direct Deposit securely. Using your uploaded transaction files or live bank feeds, PropertyLedge automatically matches and marks invoiced amounts as paid in real-time."
  },
  {
    category: "ONBOARDING",
    number: "02",
    question: "Do I need technical skills to set this up?",
    answer: "Not at all. Our property onboarding setup guides you through step-by-step in plain English. If you have your property details and tenant's email address handy, you can successfully configure your first property in under 3 minutes."
  },
  {
    category: "COMPLIANCE",
    number: "03",
    question: "Are the digital lease agreements legally binding?",
    answer: "Yes. Our lease templates have been prepared by legal property specialists and our digital signatures fully comply with the Electronic Transactions Act across all Australian states and territories, ensuring rigorous compliance and validity."
  },
  {
    category: "TAX & REPORTS",
    number: "04",
    question: "What happens at tax time (EOFY)?",
    answer: "PropertyLedge features instant, automated one-click EOFY reporting. It aligns all your property expenses and rental income strictly against standard ATO rental schedules, minimizing accountant errors and maximizing returns."
  },
  {
    category: "MULTI-STATE",
    number: "05",
    question: "Can I manage properties across different states?",
    answer: "Absolutely. When adding a property, selecting its respective territory (e.g. QLD, NSW) ensures PropertyLedge dynamically applies and generates the appropriate state-specific localized leasing rules, documents, and workflows."
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-32 px-6 relative overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 pointer-events-none scale-105"
        style={{ 
          backgroundImage: `url(${faqBgImage})`,
          filter: 'blur(16px) saturate(1.2)',
          WebkitFilter: 'blur(16px) saturate(1.2)'
        }}
      />
      {/* Light overlay without nested backdrop-filter */}
      <div className="absolute inset-0 bg-white/10 z-0"></div>
      
      {/* Soft background ambient glow lights */}
      <div className="absolute top-1/4 left-1/4 -translate-y-1/2 w-72 h-72 rounded-full bg-primary/15 blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary-container/20 blur-[120px] pointer-events-none z-0"></div>

      <div className="max-w-6xl mx-auto relative z-10 faq-glass p-8 md:p-16 rounded-[48px] shadow-2xl border border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Left Column: Sticky Title & Support Callout */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 self-start space-y-10">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-widest mb-6">
                <HelpCircle className="w-4 h-4" /> Got Questions?
              </div>
              <h2 
                className="text-4xl md:text-5xl lg:text-[44px] font-black tracking-tight text-on-surface mb-6 leading-[1.15]"
                style={{ textShadow: '0 1px 3px rgba(255, 255, 255, 0.6), 0 0 20px rgba(255, 255, 255, 0.4)' }}
              >
                Frequently asked questions
              </h2>
              <p 
                className="text-lg text-on-surface-variant font-semibold leading-relaxed"
                style={{ textShadow: '0 1px 2px rgba(255, 255, 255, 0.6)' }}
              >
                Everything you need to know about setting up and automating your properties on PropertyLedge.
              </p>
            </div>

            {/* Glowing Support Sub-card */}
            <div className="relative p-6 rounded-3xl bg-surface/80 backdrop-blur-md border border-white/30 shadow-lg overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-primary/15 blur-xl group-hover:bg-primary/25 transition-all duration-500"></div>
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-on-surface mb-1">Still need help?</h4>
                  <p className="text-sm text-on-surface-variant font-medium mb-4 leading-relaxed">
                    Our team of Australian property specialists is ready to guide you.
                  </p>
                  <a 
                    href="mailto:support@propertyledge.com.au" 
                    className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-primary-container tracking-wider uppercase transition-colors"
                  >
                    Contact Support <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Premium Accordion Items */}
          <div className="lg:col-span-7 space-y-5">
            {faqs.map((faq, i) => {
              const isOpen = openIndex === i;
              return (
                <motion.div 
                  key={i} 
                  layout="position"
                  className={`liquid-glass-card rounded-[28px] overflow-hidden transition-all duration-500 border ${
                    isOpen 
                      ? 'border-primary bg-surface/90 shadow-xl shadow-primary/5' 
                      : 'border-outline-variant/30 bg-surface/70 shadow-sm hover:border-primary/45 hover:bg-surface/85 hover:-translate-y-0.5'
                  }`}
                >
                  <button 
                    onClick={() => toggleFAQ(i)}
                    className="w-full text-left px-6 md:px-8 py-6 md:py-7 flex justify-between items-center focus:outline-none group relative z-10"
                  >
                    <div className="flex items-start gap-4 md:gap-5 pr-4">
                      {/* Number badge */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-colors duration-300 ${
                        isOpen ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-surface/30 text-on-surface-variant/50 border border-outline-variant/20'
                      }`}>
                        {faq.number}
                      </div>
                      <div className="flex flex-col gap-1">
                        {/* Category Tag */}
                        <span className="text-[10px] font-black tracking-widest text-primary/85 uppercase">
                          {faq.category}
                        </span>
                        {/* Question Title */}
                        <span className={`text-base md:text-[19px] font-black leading-snug transition-colors duration-300 ${
                          isOpen ? 'text-primary' : 'text-on-surface group-hover:text-primary'
                        }`}>
                          {faq.question}
                        </span>
                      </div>
                    </div>

                    {/* Chevron Circle Icon Button */}
                    <div className={`w-10 h-10 md:w-11 md:h-11 rounded-full border flex items-center justify-center shrink-0 transition-all duration-500 ${
                      isOpen 
                        ? 'bg-primary border-primary text-on-primary shadow-md' 
                        : 'border-outline-variant text-primary group-hover:bg-primary group-hover:border-primary group-hover:text-on-primary'
                    }`}>
                      <ChevronDown className={`w-5 h-5 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                          open: { height: 'auto', opacity: 1 },
                          collapsed: { height: 0, opacity: 0 }
                        }}
                        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="overflow-hidden">
                          {/* Inner Content with Left Glowing Accent Line */}
                          <motion.div 
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                            className="px-6 md:px-8 pb-7 md:pb-8 text-sm md:text-[15px] text-on-surface-variant font-bold leading-relaxed border-t border-outline-variant/20 pt-6 mt-1 mx-4 md:mx-6 flex gap-4"
                          >
                            {/* Glowing Left Indicator Accent Bar */}
                            <div className="w-1 bg-gradient-to-b from-primary to-primary-container rounded-full shrink-0 my-0.5 shadow-sm shadow-primary/50"></div>
                            <div>
                              {faq.answer}
                            </div>
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
