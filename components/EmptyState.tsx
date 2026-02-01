
import React from 'react';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, className = '' }) => {
    return (
        <div className={`flex flex-col items-center justify-center p-8 bg-white rounded-3xl border-2 border-dashed border-slate-100 text-center animate-in fade-in zoom-in-95 duration-700 ${className}`}>
            <div className="mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner group transition-all hover:bg-white hover:border-slate-200">
                <div className="text-slate-300 group-hover:text-[#003B71] transition-colors">
                    {icon}
                </div>
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-[0.1em] mb-1.5">{title}</h3>
            {description && (
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest opacity-60">
                    {description}
                </p>
            )}
        </div>
    );
};

export default EmptyState;
