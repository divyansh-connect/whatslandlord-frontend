import React from 'react';
import { useThemeStore } from '../store/useStore';
import { Sun, Moon } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="relative min-h-screen w-full flex bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden text-slate-900 dark:text-white transition-colors duration-300">
      {/* Floating Theme Toggle Switch */}
      <div className="absolute top-4 right-4 z-50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme} 
          className="rounded-full shadow-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-500" />}
        </Button>
      </div>

      {/* Left Side: Premium property showcase (hidden on small screens) */}
      <div className="hidden lg:flex lg:w-1/2 relative justify-center items-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center scale-105 transition-all duration-[10000ms] hover:scale-100"
          style={{ backgroundImage: 'url("/luxury_apartment_login_bg.png")' }}
        />
        {/* Dark overlay with elegant gradient */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/60 to-transparent" />
        
        {/* Decorative blur elements */}
        <div className="absolute top-10 left-10 w-44 h-44 bg-primary/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px]" />

        {/* Content text */}
        <div className="relative z-10 max-w-lg p-12 space-y-6 text-white text-left animate-fade-in-slow">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-semibold tracking-wider uppercase text-primary">
            <span>✨ Premium SaaS Solution</span>
          </div>
          <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Unifying property management in the cloud.
          </h1>
          <p className="text-sm xl:text-base text-slate-300 font-semibold leading-relaxed">
            From tenant screening and rent collection matrices to live developer integrations and AI-assisted workflows.
          </p>
          <div className="flex gap-6 text-xs text-slate-400 font-bold border-t border-white/10 pt-6">
            <div>
              <p className="text-white text-lg font-black">99.9%</p>
              <p>Platform Uptime</p>
            </div>
            <div>
              <p className="text-white text-lg font-black">150K+</p>
              <p>Active Leases</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form with glassmorphic container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative px-3 sm:px-6 py-8 sm:py-12 bg-slate-50 dark:bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.1),transparent_50%)]" />
        
        <div className="w-full max-w-md relative z-10 space-y-6 sm:space-y-8 animate-fade-in">
          {/* Logo and Brand Heading */}
          <div className="text-center flex flex-col items-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              WhatsLandlord
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-extrabold">
              Enterprise Property Suite
            </p>
          </div>

          {/* Content Card */}
          <div className="rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 p-4 sm:p-8 backdrop-blur-xl hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 text-slate-900 dark:text-white">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
