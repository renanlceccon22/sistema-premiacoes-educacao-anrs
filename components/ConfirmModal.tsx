import React from 'react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    isDanger?: boolean;
    showCancel?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    isDanger = false,
    showCancel = true
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className="bg-white rounded-[24px] shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header decorativo */}
                <div className={`h-2 w-full ${isDanger ? 'bg-red-500' : 'bg-[#003B71]'}`}></div>

                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDanger ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-[#003B71]'
                            }`}>
                            {isDanger ? (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                        <h2 className="text-xs font-black text-slate-800 leading-tight uppercase tracking-tight">
                            {title}
                        </h2>
                    </div>

                    <p className="text-slate-500 font-medium leading-relaxed mb-6 text-xs">
                        {message}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                        {showCancel && (
                            <button
                                onClick={onCancel}
                                className="flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all uppercase tracking-widest active:scale-95"
                            >
                                {cancelLabel}
                            </button>
                        )}
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black text-white shadow-lg shadow-blue-900/10 transition-all uppercase tracking-widest active:scale-95 ${isDanger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#003B71] hover:bg-[#002a51]'
                                }`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmModal;
