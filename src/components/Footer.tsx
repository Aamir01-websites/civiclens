import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#06172A] text-slate-300 py-6 px-4 md:px-8 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 justify-center md:justify-start font-medium text-slate-200">
          <a href="#terms" className="hover:text-white transition-colors">Terms and Conditions</a>
          <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#accessibility" className="hover:text-white transition-colors">Accessibility Statement</a>
          <a href="#help" className="hover:text-white transition-colors">Help</a>
          <a href="#contact" className="hover:text-white transition-colors">Contact Us</a>
        </div>
        <div className="text-slate-400 text-center md:text-right">
          Content owned by Municipal Administration Department. Last updated: 20/NOV/2026. Prototype for demonstration only.
        </div>
      </div>
    </footer>
  );
};
