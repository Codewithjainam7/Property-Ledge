/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, MouseEvent } from 'react';

const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

function Navigation() {
  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl rounded-full border border-white/60 bg-white/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] z-50 flex justify-between items-center px-8 py-3">
      <a className="text-2xl font-bold tracking-tighter text-primary flex items-center gap-2" href="#">
        <svg className="h-8 w-8 text-primary" fill="none" height="32" viewBox="0 0 32 32" width="32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2"></circle>
          <path d="M11 10V22M21 10V22M11 16H21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
        </svg>
      </a>
      <div className="hidden md:flex items-center gap-6">
        <a className="text-primary font-bold text-base hover:scale-105 transition-transform" href="#">Product</a>
        <a className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-300 text-base hover:scale-105" href="#">Use Cases</a>
        <a className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-300 text-base hover:scale-105" href="#">Resources</a>
        <a className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-300 text-base hover:scale-105" href="#">Pricing</a>
        <a className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-300 text-base hover:scale-105" href="#">Enterprise</a>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-on-surface-variant hover:text-primary transition-colors duration-300 hover:scale-105 flex items-center justify-center">
          <Icon name="language" />
        </button>
        <a className="bg-white/40 text-on-surface border border-white/60 shadow-sm backdrop-blur-md text-base font-bold px-6 py-2 rounded-full hover:bg-white/60 transition-colors duration-300 hover:scale-105" href="#">
          Start Building
        </a>
      </div>
    </nav>
  );
}

function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    containerRef.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    containerRef.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  return (
    <section 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative pt-48 pb-[120px] px-8 md:px-[64px] min-h-[90vh] flex flex-col items-center justify-center text-center overflow-hidden"
    >
      <div 
        className="absolute inset-0 -z-10 transition-all duration-700 ease-out opacity-80" 
        style={{
          background: 'radial-gradient(1200px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), var(--color-primary-container) 0%, var(--color-secondary-container) 40%, transparent 80%), linear-gradient(135deg, rgba(159, 65, 34, 0.05) 0%, rgba(50, 101, 120, 0.05) 100%)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-tertiary-container/20 via-primary-container/10 to-transparent -z-20"></div>

      <div className="inline-flex items-center gap-3 bg-white/40 backdrop-blur-xl border border-white/60 rounded-full px-4 py-2 mb-8 shadow-sm">
        <span className="bg-secondary-container text-on-secondary-container text-xs font-bold px-2 py-1 rounded-full uppercase tracking-widest">NEW</span>
        <span className="text-base text-on-surface font-semibold pr-2">Horizon 2.0 is live</span>
      </div>
      
      <h1 className="text-[52px] md:text-[64px] font-extrabold leading-[1.1] tracking-tighter text-on-surface max-w-4xl mb-6">
        Build with Horizon
      </h1>
      
      <p className="text-lg text-on-surface-variant max-w-2xl mb-12 font-medium">
        Horizon lets you build limitless applications in minutes. An airy, minimalist workspace designed for seamless AI integration.
      </p>

      <div className="w-full max-w-[870px] bg-white/40 rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-6 mb-8 backdrop-blur-xl">
        <div className="flex flex-col gap-4">
          <textarea 
            className="w-full bg-transparent border-none resize-none text-lg text-on-surface placeholder:text-outline focus:ring-0 focus:outline-none min-h-[80px]" 
            placeholder="Describe the application you want to build..."
          />
          <div className="flex items-center justify-between pt-4 border-t border-white/40">
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-full hover:bg-white/50 transition-colors text-on-surface-variant">
                <Icon name="add" />
              </button>
              <div className="flex items-center gap-2 bg-white/50 border border-white/60 rounded-full px-4 py-2 cursor-pointer shadow-sm hover:bg-white/60 transition-colors">
                <span className="text-base font-semibold text-on-surface">Plan</span>
                <Icon name="toggle_on" className="text-[20px] text-primary" />
              </div>
            </div>
            <button className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors scale-95 hover:scale-105 active:scale-95">
              <Icon name="arrow_upward" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {['Reporting Dashboard', 'Gaming Platform', 'CRM System', 'Inventory Tracker'].map((tag) => (
          <button key={tag} className="bg-white/40 text-on-surface border border-white/60 shadow-sm rounded-full px-5 py-2 text-sm font-semibold hover:bg-white/60 transition-colors backdrop-blur-md">
            {tag}
          </button>
        ))}
      </div>
    </section>
  );
}

function Slogan() {
  return (
    <section className="py-[120px] px-8 md:px-[64px] bg-surface relative min-h-[50vh] flex items-center justify-center">
      <div className="max-w-5xl mx-auto text-center relative z-10">
        <h2 className="text-[48px] md:text-[62px] leading-[1.2] font-semibold text-on-surface tracking-tight">
          Imagine lorem ipsum without limits...
        </h2>
      </div>
    </section>
  );
}

function Features() {
  return (
    <div className="space-y-[120px]">
      <section className="px-8 md:px-[64px] relative">
        <div className="max-w-[1118px] mx-auto bg-white/40 backdrop-blur-2xl rounded-[20px] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col md:flex-row min-h-[596px]">
          <div className="p-10 flex-1 flex flex-col justify-center">
            <span className="text-xs font-bold text-on-surface-variant mb-6 tracking-widest uppercase">01 / 04</span>
            <h3 className="text-[36px] font-bold text-on-surface mb-6 leading-tight tracking-tight">Tell Horizon your big idea...</h3>
            <p className="text-lg text-on-surface-variant mb-10 max-w-md font-medium leading-relaxed">
              Transform your ideas into functional applications seamlessly. Our intuitive builder lets you craft complex interfaces and logic without traditional coding constraints.
            </p>
            <a className="inline-flex items-center justify-center gap-2 bg-white/50 border border-white/60 shadow-sm backdrop-blur-md text-on-surface text-base font-bold px-8 py-4 rounded-xl w-fit hover:bg-white/80 transition-colors" href="#">
              Start building
            </a>
          </div>
          <div className="flex-1 bg-white/20 relative overflow-hidden flex items-center justify-end border-l border-white/40 min-h-[400px]">
            <div className="absolute inset-0 bg-gradient-to-br from-tertiary/10 via-primary/5 to-secondary/10"></div>
            <div className="absolute inset-0 overflow-hidden opacity-30">
              <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-tertiary/20 rounded-full blur-[100px]"></div>
              <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px]"></div>
            </div>
            
            <div className="relative z-10 w-[85%] h-[80%] mx-auto bg-white/30 backdrop-blur-[32px] rounded-2xl border border-white/50 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden">
              <div className="flex items-center justify-center p-4 border-b border-white/20">
                <div className="flex p-1 rounded-full border border-white/30 backdrop-blur-md bg-white/50">
                  <button className="px-5 py-1.5 rounded-full text-xs font-bold bg-white text-on-surface shadow-sm">Chat</button>
                  <button className="px-5 py-1.5 rounded-full text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">Idea</button>
                  <button className="px-5 py-1.5 rounded-full text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">Generate</button>
                </div>
              </div>
              <div className="flex-1 p-6 space-y-6">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 shrink-0 border border-white/50 flex items-center justify-center">
                      <Icon name="auto_awesome" className="text-primary text-[16px]" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="h-2 w-24 bg-on-surface/30 rounded-full"></div>
                      <div className="bg-white/60 rounded-2xl rounded-tl-none p-5 border border-white/80 shadow-sm space-y-3">
                        <div className="h-2 w-full bg-on-surface/20 rounded-full"></div>
                        <div className="h-2 w-4/5 bg-on-surface/20 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-tertiary/20 shrink-0 border border-white/50 flex items-center justify-center">
                      <Icon name="person" className="text-tertiary text-[16px]" />
                    </div>
                    <div className="flex-1 space-y-3 flex flex-col items-end">
                      <div className="h-2 w-16 bg-on-surface/30 rounded-full"></div>
                      <div className="bg-primary/10 rounded-2xl rounded-tr-none p-4 border border-primary/20 w-4/5 space-y-3">
                        <div className="h-2 w-full bg-primary/40 rounded-full"></div>
                        <div className="h-2 w-2/3 bg-primary/40 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="h-24 bg-white/40 rounded-xl border border-white/60 flex items-center justify-center shadow-sm">
                      <Icon name="dashboard" className="text-on-surface/40 text-4xl" />
                    </div>
                    <div className="h-24 bg-white/40 rounded-xl border border-white/60 flex items-center justify-center shadow-sm">
                      <Icon name="bar_chart" className="text-on-surface/40 text-4xl" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-8 md:px-[64px] relative">
        <div className="max-w-[1118px] mx-auto bg-white/40 backdrop-blur-2xl rounded-[20px] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col md:flex-row min-h-[596px]">
          <div className="p-10 flex-1 flex flex-col justify-center">
            <span className="text-xs font-bold text-on-surface-variant mb-6 tracking-widest uppercase">02 / 04</span>
            <h3 className="text-[36px] font-bold text-on-surface mb-6 leading-tight tracking-tight">A backend instantly generated</h3>
            <p className="text-lg text-on-surface-variant mb-10 max-w-md font-medium leading-relaxed">
              Robust infrastructure generated instantly. From authentication to database schemas, Horizon writes the backend so you can focus on the user experience.
            </p>
          </div>
          <div className="flex-1 bg-surface relative overflow-hidden flex items-center justify-center backdrop-blur-md min-h-[400px]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-tertiary/10"></div>
            <div className="absolute inset-0 opacity-40 mix-blend-soft-light" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #ffffff 0%, transparent 100%)' }}></div>
            
            <div className="relative z-10 w-[80%] bg-white/30 backdrop-blur-[40px] rounded-3xl border border-white/50 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] p-8 overflow-hidden">
              <div className="flex items-center gap-4 mb-8 border-b border-white/30 pb-6">
                <div className="w-12 h-12 rounded-xl bg-white/50 flex items-center justify-center border border-white/60 shadow-sm">
                  <Icon name="cloud_upload" className="text-on-surface text-2xl" />
                </div>
                <div>
                  <span className="block text-on-surface font-bold text-lg leading-none mb-1">Deployment</span>
                  <span className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest">v1.2.0-stable</span>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm font-bold text-on-surface">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#27C93F] shadow-[0_0_8px_rgba(39,201,63,0.8)]"></div>
                      <span>Edge Runtime</span>
                    </div>
                    <span className="font-mono">99.9%</span>
                  </div>
                  <div className="h-2 w-full bg-white/40 rounded-full overflow-hidden p-[1px] border border-white/50">
                    <div className="h-full w-[85%] bg-gradient-to-r from-primary to-primary-container rounded-full"></div>
                  </div>
                </div>
                <div className="pt-4 space-y-4">
                  <div className="flex items-center gap-3 text-on-surface-variant text-sm font-bold">
                    <Icon name="data_object" className="text-[20px]" />
                    <span>Syncing edge database...</span>
                  </div>
                  <div className="flex items-center gap-3 text-on-surface-variant text-sm font-bold">
                    <Icon name="bolt" className="text-[20px]" />
                    <span>Optimizing cold starts...</span>
                  </div>
                  <div className="mt-8 p-4 bg-white/60 rounded-2xl border border-white/80 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <Icon name="check_circle" className="text-[#27C93F]" />
                      <span className="text-on-surface text-sm font-bold">Live in production</span>
                    </div>
                    <span className="text-on-surface-variant text-xs font-mono font-bold bg-black/5 px-2 py-1 rounded">0.4ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Showcase() {
  const cards = [
    { title: 'Operations Hub', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60' },
    { title: 'Data Pipeline', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=60' },
    { title: 'Strategy Planner', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60' },
    { title: 'Fleet Tracking', image: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&auto=format&fit=crop&q=60' }
  ];

  return (
    <section className="py-section-gap bg-surface relative overflow-hidden mt-section-gap">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--color-outline-variant) 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      <div className="max-w-[1440px] mx-auto px-8 md:px-container-padding flex flex-col items-center justify-center mb-16 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-headline-lg font-bold text-on-surface tracking-tight">Vast capabilities, simple execution</h2>
        </div>
      </div>
      <div className="w-full relative z-10">
        <div className="w-full flex gap-8 overflow-x-auto px-8 md:px-container-padding pb-12 snap-x snap-mandatory hide-scrollbar">
          {cards.map((card, i) => (
            <div key={i} className="snap-center shrink-0 w-[350px] lg:w-[450px] h-[400px] glass-panel rounded-[32px] flex flex-col overflow-hidden group">
              <div className="h-full relative overflow-hidden">
                <img src={card.image} alt={card.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="relative z-10 h-full p-8 flex flex-col justify-end transition-transform group-hover:-translate-y-2">
                  <div className="bg-white/20 backdrop-blur-md border border-white/40 px-6 py-3 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] w-fit">
                    <span className="text-white font-bold text-lg tracking-tight">{card.title}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className="py-[120px] px-8 md:px-[64px]">
      <div className="max-w-[1300px] mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="p-10 flex flex-col justify-center bg-white/40 backdrop-blur-xl rounded-[24px] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.02)]">
            <h2 className="text-[40px] font-bold leading-tight text-on-surface mb-4 tracking-tight">Simple, transparent pricing.</h2>
            <p className="text-lg text-on-surface-variant mb-8 font-medium">Choose the plan that fits your ambition. No hidden fees.</p>
          </div>
          
          <div className="p-10 bg-white/40 backdrop-blur-xl rounded-[24px] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] flex flex-col relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-tertiary/10 to-transparent -z-10 group-hover:from-tertiary/20 transition-colors"></div>
            <h3 className="text-[32px] font-bold text-on-surface mb-2 tracking-tight">Start</h3>
            <div className="text-[56px] font-extrabold text-on-surface mb-6 tracking-tighter">$0<span className="text-lg font-bold text-on-surface-variant">/mo</span></div>
            <ul className="space-y-4 mb-10 flex-1 text-base font-bold text-on-surface-variant">
              <li className="flex items-center gap-3"><Icon name="check" className="text-primary text-[20px]" /> 3 Projects</li>
              <li className="flex items-center gap-3"><Icon name="check" className="text-primary text-[20px]" /> Community Support</li>
              <li className="flex items-center gap-3"><Icon name="check" className="text-primary text-[20px]" /> Basic UI Components</li>
            </ul>
            <button className="w-full bg-white/60 backdrop-blur-md border border-white/80 shadow-sm text-on-surface rounded-xl py-4 text-base font-bold hover:bg-white/90 transition-colors">Get Started</button>
          </div>

          <div className="p-10 bg-white/40 backdrop-blur-xl rounded-[24px] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)] flex flex-col relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-secondary/10 -z-10 group-hover:from-primary/20 group-hover:to-secondary/20 transition-colors"></div>
            <div className="absolute top-6 right-6 bg-white/80 backdrop-blur-md border border-white text-on-surface shadow-sm text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">Popular</div>
            <h3 className="text-[32px] font-bold text-on-surface mb-2 tracking-tight">Pro</h3>
            <div className="text-[56px] font-extrabold text-on-surface mb-6 tracking-tighter">$20<span className="text-lg font-bold text-on-surface-variant">/mo</span></div>
            <ul className="space-y-4 mb-10 flex-1 text-base font-bold text-on-surface-variant">
              <li className="flex items-center gap-3"><Icon name="check" className="text-on-surface text-[20px]" /> Unlimited Projects</li>
              <li className="flex items-center gap-3"><Icon name="check" className="text-on-surface text-[20px]" /> Priority Support</li>
              <li className="flex items-center gap-3"><Icon name="check" className="text-on-surface text-[20px]" /> Custom Domains</li>
              <li className="flex items-center gap-3"><Icon name="check" className="text-on-surface text-[20px]" /> Advanced Integrations</li>
            </ul>
            <button className="w-full bg-primary backdrop-blur-md border border-primary text-white shadow-md rounded-xl py-4 text-base font-bold hover:bg-primary/90 transition-colors">Upgrade to Pro</button>
          </div>
        </div>

        <div className="mt-8 bg-white/40 backdrop-blur-xl rounded-[24px] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.02)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-tertiary-container/30 to-primary-container/20 -z-10"></div>
          <div>
            <h4 className="text-[28px] font-bold text-on-surface mb-2 tracking-tight">Enterprise needs?</h4>
            <p className="text-base font-medium text-on-surface-variant">Custom SLAs, dedicated account management, and more.</p>
          </div>
          <button className="mt-6 md:mt-0 bg-white/60 backdrop-blur-md border border-white/80 shadow-sm text-on-surface rounded-xl px-10 py-4 text-base font-bold hover:bg-white/90 transition-colors">Contact Sales</button>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    "What is Horizon?",
    "How does Horizon work?",
    "Can I export my code?",
    "Is there a free trial?",
    "How secure is my data on Horizon?",
    "Can I collaborate with my team in real-time?",
    "Do you offer custom enterprise solutions?",
    "What kind of support is available for the free plan?"
  ];

  return (
    <section className="py-[120px] px-8 md:px-[64px] bg-surface">
      <div className="max-w-[1300px] mx-auto flex flex-col lg:flex-row gap-16">
        <div className="lg:w-5/12">
          <h2 className="text-[48px] md:text-[56px] font-bold leading-[1.1] text-on-surface tracking-tight sticky top-32">
            Frequently asked questions
          </h2>
        </div>
        <div className="lg:w-7/12 flex flex-col">
          {faqs.map((q, i) => (
            <div key={i} className="border-b border-outline-variant/40 py-6 group cursor-pointer flex items-center pr-4">
              <div className="flex justify-between items-center w-full">
                <h3 className="text-xl md:text-2xl text-on-surface font-semibold tracking-tight group-hover:text-primary transition-colors">{q}</h3>
                <Icon name="add" className="text-on-surface-variant group-hover:text-primary transition-colors text-3xl shrink-0 ml-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    containerRef.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    containerRef.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  return (
    <section 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="py-[160px] px-8 md:px-[64px] relative overflow-hidden flex flex-col items-center justify-center min-h-[70vh] group/cta"
    >
      <div className="absolute inset-0 bg-surface -z-20"></div>
      <div 
        className="absolute inset-0 opacity-20 -z-10" 
        style={{ background: 'radial-gradient(circle at 10% 20%, var(--color-primary-container) 0%, transparent 60%), radial-gradient(circle at 90% 80%, var(--color-tertiary-container) 0%, transparent 60%), radial-gradient(circle at 50% 50%, var(--color-secondary-container) 0%, transparent 70%)' }}>
      </div>
      <div 
        className="absolute inset-0 -z-10 opacity-0 group-hover/cta:opacity-50 transition-opacity duration-700" 
        style={{ background: 'radial-gradient(1000px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), var(--color-primary) 0%, rgba(168, 85, 247, 0.3), transparent 60%)' }}>
      </div>

      <h2 className="text-[48px] md:text-[64px] font-extrabold leading-[1.1] mb-12 text-center relative z-10 max-w-3xl drop-shadow-sm text-on-surface tracking-tighter">
        So, what app are we building next?
      </h2>
      <a className="inline-flex items-center gap-4 bg-white/60 backdrop-blur-2xl border border-white/80 text-lg font-bold px-10 py-5 rounded-full hover:bg-white/80 hover:scale-105 active:scale-95 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.08)] group relative z-10 text-on-surface" href="#">
        Get started
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
          <Icon name="arrow_forward" className="text-white text-base group-hover:translate-x-1 transition-transform" />
        </div>
      </a>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-surface w-full pt-16 pb-12 px-8 md:px-[64px] text-on-surface relative z-20">
      <div className="max-w-[1300px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-2xl font-bold flex items-center gap-2">
          <svg className="h-8 w-8" fill="none" height="32" viewBox="0 0 32 32" width="32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2"></circle>
            <path d="M11 10V22M21 10V22M11 16H21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
          </svg>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-8 font-bold">
          <a className="hover:text-primary transition-colors text-on-surface-variant hover:text-on-surface" href="#">Privacy Policy</a>
          <a className="hover:text-primary transition-colors text-on-surface-variant hover:text-on-surface" href="#">Terms of Service</a>
          <a className="hover:text-primary transition-colors text-on-surface-variant hover:text-on-surface" href="#">Security</a>
          <a className="hover:text-primary transition-colors text-on-surface-variant hover:text-on-surface" href="#">Status</a>
          <a className="hover:text-primary transition-colors text-on-surface-variant hover:text-on-surface" href="#">Contact</a>
        </div>
        <div className="text-sm font-bold text-on-surface-variant">
          © 2026 Horizon AI. Built for the future of SaaS.
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary-container selection:text-on-primary-container">
      <Navigation />
      <Hero />
      <Slogan />
      <Features />
      <Showcase />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
