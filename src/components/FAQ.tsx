// src/components/FAQ.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: "How does the automated rent collection work?",
    answer: "PropVault generates a recurring invoice which is sent automatically to your tenants. Tenants can easily pay via BPAY or Direct Deposit securely. Using your uploaded transaction files or live bank feeds, PropVault automatically matches and marks invoiced amounts as paid in real-time."
  },
  {
    question: "Do I need technical skills to set this up?",
    answer: "Not at all. Our property onboarding setup guides you through step-by-step in plain English. If you have your property details and tenant's email address handy, you can successfully configure your first property in under 3 minutes."
  },
  {
    question: "Are the digital lease agreements legally binding?",
    answer: "Yes. Our lease templates have been prepared by legal property specialists and our digital signatures fully comply with the Electronic Transactions Act across all Australian states and territories, ensuring rigorous compliance and validity."
  },
  {
    question: "What happens at tax time (EOFY)?",
    answer: "PropVault features instant, automated one-click EOFY reporting. It aligns all your property expenses and rental income strictly against standard ATO rental schedules, minimizing accountant errors and maximizing returns."
  },
  {
    question: "Can I manage properties across different states?",
    answer: "Absolutely. When adding a property, selecting its respective territory (e.g. QLD, NSW) ensures PropVault dynamically applies and generates the appropriate state-specific localized leasing rules, documents, and workflows."
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-32 px-6 bg-surface-container/20">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-6">Frequently asked questions</h2>
          <p className="text-lg text-on-surface-variant font-medium">Everything you need to know about setting up and automating your properties on PropVault.</p>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <button 
                onClick={() => toggleFAQ(i)}
                className="w-full text-left px-8 py-6 flex justify-between items-center focus:outline-none"
              >
                <span className="text-xl font-extrabold text-on-surface pr-4">{faq.question}</span>
                <ChevronDown className={`w-6 h-6 shrink-0 text-primary transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="px-8 pb-8 text-lg text-on-surface-variant font-medium leading-relaxed border-t border-outline-variant pt-6 mt-2 mx-4">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
