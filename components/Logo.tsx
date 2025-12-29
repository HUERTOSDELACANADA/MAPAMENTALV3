
import React from 'react';
import { BRAND } from '../constants';

export const Logo: React.FC<{ className?: string }> = ({ className = "h-12" }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <img src={BRAND.logo} alt="MORETURISMO" className="h-full object-contain rounded" />
    <div className="flex flex-col">
      <span className="font-bold text-lg tracking-tight leading-none text-slate-800">MORETURISMO</span>
      <span className="text-xs font-medium text-blue-600 uppercase tracking-widest">Mapas Mentales</span>
    </div>
  </div>
);
