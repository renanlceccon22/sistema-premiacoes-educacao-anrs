
import React from 'react';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, className = '' }) => {
    return (
        <div className={`flex flex-col items-center justify-center p-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-center animate-in fade-in zoom-in-95 duration-700 ${className}`}>
            <div className="mb-8 p-8 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner group transition-all hover:bg-white hover:border-slate-200">
                <div className="text-slate-300 group-hover:text-[#003B71] transition-colors scale-[2]">
                    {icon}
                </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-[0.1em] mb-3">{title}</h3>
            {description && (
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest opacity-60">
                    {description}
                </p>
            )}
        </div>
    );
};

export default EmptyState;
