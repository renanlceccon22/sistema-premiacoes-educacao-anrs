
import React, { useState } from 'react';
import { CustomAward } from '../types';
import { formatBRL } from '../utils/formatting';

interface ResultsPanelProps {
  prizes: {
    totalTreasurerPrize: number;
    vicePrize: number;
    awardedPrizes: CustomAward[];
  };
  isFinalized: boolean;
  isReadOnly: boolean;
  onFinalize: () => void;
  onReopen: () => void;
  schoolName: string;
  activePeriodLabel: string;
  schoolViceName?: string;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({
  prizes,
  isFinalized,
  isReadOnly,
  onFinalize,
  onReopen,
  schoolName,
  activePeriodLabel,
  schoolViceName
}) => {
  const [isReopening, setIsReopening] = useState(false);

  const handleReopenClick = async () => {
    setIsReopening(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    onReopen();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsReopening(false);
  };

  const { totalTreasurerPrize, vicePrize, awardedPrizes } = prizes;

  return (
    <div className="lg:sticky lg:top-6">
      <div className={`bg-[#003B71] text-white rounded-3xl shadow-xl overflow-hidden transition-all duration-500 ${isFinalized ? 'ring-4 ring-green-400 ring-offset-4' : ''}`}>
        <div className="p-8 text-center border-b border-white/10 relative overflow-hidden">
          {isFinalized && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
          )}
          <p className="text-blue-200 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Resumo da Unidade</p>
          <h3 className="text-2xl font-black mb-1 tracking-tight truncate px-2">{schoolName}</h3>
          <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">{activePeriodLabel}</p>

          <div className="mt-6 flex flex-col items-center">
            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1 opacity-60">Total em Prêmios</p>
            <h3 className="text-4xl font-black text-[#FDB813] mb-4">
              {formatBRL(totalTreasurerPrize)}
            </h3>
            {isFinalized ? (
              <span className="flex items-center bg-green-500 text-[10px] text-white px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-lg">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                FINALIZADA
              </span>
            ) : (
              <span className="bg-blue-400/20 text-[10px] text-blue-200 px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-white/10">Em Avaliação</span>
            )}
          </div>
        </div>

        <div className="bg-white p-6">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 border-b border-slate-200 pb-3">Premiações Recebidas</h3>

            <div className="space-y-3">
              {awardedPrizes.map((award) => (
                <div key={award.id} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{award.name}</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">{formatBRL(award.value)}</span>
                </div>
              ))}
              {awardedPrizes.length === 0 && (
                <p className="text-[10px] text-slate-400 text-center py-4 font-bold italic">Nenhum prêmio selecionado</p>
              )}
            </div>

            <div className="h-px bg-slate-200 w-full opacity-50 my-4"></div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-[#003B71] uppercase tracking-widest">Repasse Tesoureiro</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Integral (100%)</span>
                </div>
                <p className="text-lg font-black text-[#003B71]">{formatBRL(totalTreasurerPrize)}</p>
              </div>

              {schoolViceName && (
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Repasse Vice</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Repasse (50%)</span>
                  </div>
                  <p className="text-lg font-black text-slate-700">{formatBRL(vicePrize)}</p>
                </div>
              )}
            </div>
          </div>

          {!isReadOnly && (
            <div className="mt-8 space-y-3">
              {!isFinalized ? (
                <button
                  onClick={onFinalize}
                  className="w-full py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2 bg-[#003B71] text-white hover:bg-[#002a51] hover:shadow-[#003B71]/20"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  <span>GRAVAR AVALIAÇÃO</span>
                </button>
              ) : (
                <button
                  onClick={handleReopenClick}
                  disabled={isReopening}
                  className={`w-full py-3 rounded-xl font-bold text-[10px] border-2 transition-all flex items-center justify-center space-x-2 tracking-widest uppercase ${isReopening ? 'bg-orange-100 text-orange-400 cursor-not-allowed' : 'border-orange-100 text-orange-600 hover:bg-orange-50'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                  <span>{isReopening ? 'Reabrindo...' : 'Reabrir para Ajustes'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsPanel;
