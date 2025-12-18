
import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, iconBg }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between relative min-h-[140px]">
      <div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-tight mb-4">{title}</p>
        <h3 className="text-4xl font-extrabold text-slate-800">{value}</h3>
      </div>
      <div className={`absolute top-6 right-6 p-2 rounded-xl ${iconBg} bg-opacity-10 text-opacity-100 flex items-center justify-center`}>
        <div className={iconBg.replace('bg-', 'text-')}>
          {icon}
        </div>
      </div>
    </div>
  );
};
