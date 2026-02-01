
import React, { useState } from 'react';
import { AwardLevel } from '../types';
import { formatBRL } from '../utils/formatting';

interface ResultsPanelProps {
  totalPoints: number;
  awardLevel: AwardLevel;
  inadimplenciaRankingBonus: number;
  managementBonus: number;
  anrsBonus: number;
  totalTreasurerPrize: number;
  vicePrize: number;
  isFinalized: boolean;
  isReadOnly: boolean;
  inadimplenciaRank?: number;
  onFinalize: () => void;
  onReopen: () => void;
  schoolName?: string;
  periodLabel?: string;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({
  totalPoints,
  awardLevel,
  inadimplenciaRankingBonus,
  managementBonus,
  anrsBonus,
  totalTreasurerPrize,
  vicePrize,
  isFinalized,
  isReadOnly,
  inadimplenciaRank,
  onFinalize,
  onReopen,
  schoolName = "Unidade Escolar",
  periodLabel = ""
}) => {
  const [isReopening, setIsReopening] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleReopenClick = async () => {
    setIsReopening(true);
    await new Promise(resolve => setTimeout(resolve, 600)); 
    onReopen();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsReopening(false);
  };

  const exportIndividualPDF = async () => {
    setIsExporting(true);
    try {
      const { jsPDF } = await import('https://esm.sh/jspdf');
      const doc = new jsPDF();
      doc.setFillColor(0, 59, 113);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("COMPROVANTE DE PREMIAÇÃO", 105, 18, { align: 'center' });
      doc.text(`TESOURARIA - EDUCAÇÃO ADVENTISTA - ${periodLabel}`, 105, 28, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.text(`Unidade: ${schoolName}`, 14, 55);
      doc.save(`Premiacao_${schoolName.replace(/\s+/g, '_')}_${periodLabel.replace('/', '_')}.pdf`);
    } catch (e) { alert("Erro ao gerar PDF."); } finally { setIsExporting(false); }
  };

  return (
    <div className="sticky top-6">
      <div className={`bg-[#003B71] text-white rounded-2xl shadow-xl overflow-hidden transition-all duration-500 ${isFinalized ? 'ring-4 ring-green-400 ring-offset-4' : ''}`}>
        <div className="p-8 text-center border-b border-white/10 relative overflow-hidden">
          {isFinalized && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
          )}
          <p className="text-blue-200 font-semibold text-[10px] uppercase tracking-[0.2em] mb-2">PONTUAÇÃO ATUAL</p>
          <h3 className="text-7xl font-black mb-2 tracking-tighter">{totalPoints}</h3>
          <div className="flex justify-center">
            {isFinalized ? (
              <span className="flex items-center bg-green-500 text-[10px] text-white px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-lg">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
                CALCULADO E CONSOLIDADO
              </span>
            ) : (
              <span className="bg-blue-400/20 text-[10px] text-blue-200 px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-white/10">Aguardando Gravação</span>
            )}
          </div>
        </div>

        <div className="bg-white p-6">
          <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 space-y-5">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 border-b border-slate-200 pb-3">Detalhamento das Conquistas</h3>

            {/* Premiação Gestão - Medalha */}
            <div className="flex justify-between items-center group">
              <div className="flex items-center">
                <div className={`p-2 rounded-xl mr-3 shadow-sm transition-all duration-500 ${managementBonus > 0 ? 'bg-green-100 text-green-600 scale-110 shadow-green-100' : 'bg-white text-slate-200 border border-slate-100'}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 2zM12 0L9.1 5.9 2.6 6.9l4.7 4.6-1.1 6.5 5.8-3 5.8 3-1.1-6.5 4.7-4.6-6.5-1L12 0z"/>
                    <path d="M12 18c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6zm0-10c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z"/>
                  </svg>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${managementBonus > 0 ? 'text-slate-800' : 'text-slate-400'}`}>Premiação Gestão</span>
              </div>
              <p className={`text-sm font-black ${managementBonus > 0 ? 'text-green-600' : 'text-slate-300'}`}>{formatBRL(managementBonus)}</p>
            </div>

            {/* Premiação Meta ANRS - Troféu */}
            <div className="flex justify-between items-center group">
              <div className="flex items-center">
                <div className={`p-2 rounded-xl mr-3 shadow-sm transition-all duration-500 ${anrsBonus > 0 ? 'bg-purple-100 text-purple-600 scale-110 shadow-purple-100' : 'bg-white text-slate-200 border border-slate-100'}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 2H6v2h12V2zM19 5H5c-1.1 0-2 .9-2 2v3c0 2.5 1.8 4.6 4.2 5.2.8 1.4 2.2 2.4 3.8 2.7V20H8v2h8v-2h-3v-2.1c1.6-.3 3-1.3 3.8-2.7 2.4-.6 4.2-2.7 4.2-5.2V7c0-1.1-.9-2-2-2zM5 10V7h2v5.1C5.8 11.6 5 10.9 5 10zm14 0c0 .9-.8 1.6-2 2.1V7h2v3z"/>
                  </svg>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${anrsBonus > 0 ? 'text-slate-800' : 'text-slate-400'}`}>Premiação Meta ANRS</span>
              </div>
              <p className={`text-sm font-black ${anrsBonus > 0 ? 'text-purple-600' : 'text-slate-300'}`}>{formatBRL(anrsBonus)}</p>
            </div>

            {/* Premiação Ranking - Podium/Estrela */}
            <div className="flex justify-between items-center group">
              <div className="flex items-center">
                <div className={`p-2 rounded-xl mr-3 shadow-sm transition-all duration-500 ${inadimplenciaRankingBonus > 0 ? 'bg-blue-100 text-blue-600 scale-110 shadow-blue-100' : 'bg-white text-slate-200 border border-slate-100'}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${inadimplenciaRankingBonus > 0 ? 'text-slate-800' : 'text-slate-400'}`}>Ranking Inadimplência {inadimplenciaRank ? `(${inadimplenciaRank}º)` : ''}</span>
              </div>
              <p className={`text-sm font-black ${inadimplenciaRankingBonus > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{formatBRL(inadimplenciaRankingBonus)}</p>
            </div>

            <div className="h-px bg-slate-200 w-full opacity-50 my-2"></div>

            {/* Repasse Total - Troféu Master */}
            <div className="flex justify-between items-center p-4 bg-[#003B71]/5 rounded-2xl border border-[#003B71]/10">
               <div className="flex items-center">
                  <div className="bg-[#003B71] p-2.5 rounded-xl mr-4 shadow-lg shadow-[#003B71]/20">
                     <svg className="w-6 h-6 text-[#FDB813]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 2H6v2h12V2zm1 3H5c-1.1 0-2 .9-2 2v3c0 2.5 1.8 4.6 4.2 5.2.8 1.4 2.2 2.4 3.8 2.7V20H8v2h8v-2h-3v-2.1c1.6-.3 3-1.3 3.8-2.7 2.4-.6 4.2-2.7 4.2-5.2V7c0-1.1-.9-2-2-2zM5 10V7h2v5.1C5.8 11.6 5 10.9 5 10zm14 0c0 .9-.8 1.6-2 2.1V7h2v3z"/>
                        <circle cx="12" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1"/>
                     </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-[#003B71] uppercase tracking-[0.2em]">Repasse Tesoureiro</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Total Consolidado (100%)</span>
                  </div>
               </div>
               <p className="text-2xl font-black text-[#003B71]">{formatBRL(totalTreasurerPrize)}</p>
            </div>

            {/* Repasse Vice - Estrela */}
            <div className="flex justify-between items-center px-4 py-3 bg-[#FDB813]/5 rounded-2xl border border-[#FDB813]/20">
               <div className="flex items-center">
                  <div className="bg-[#FDB813] p-2 rounded-xl mr-4 shadow-md">
                     <svg className="w-5 h-5 text-[#003B71]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                     </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Repasse Vice</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Participação (50%)</span>
                  </div>
               </div>
               <p className="text-lg font-black text-slate-700">{formatBRL(vicePrize)}</p>
            </div>
          </div>

          {!isReadOnly && (
            <div className="mt-8 space-y-3">
              {!isFinalized ? (
                <button onClick={onFinalize} className="w-full py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2 bg-[#003B71] text-white hover:bg-[#002a51] border-2 border-[#003B71]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                  <span>CALCULAR E GRAVAR REPASSE</span>
                </button>
              ) : (
                <>
                  <button onClick={exportIndividualPDF} disabled={isExporting} className="w-full py-3 rounded-xl font-black text-[10px] tracking-[0.2em] shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2 bg-green-600 text-white hover:bg-green-700 uppercase">
                    {isExporting ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
                    <span>Baixar Comprovante PDF</span>
                  </button>
                  <button onClick={handleReopenClick} disabled={isReopening} className={`w-full py-3 rounded-xl font-bold text-xs border-2 transition-all flex items-center justify-center space-x-2 ${isReopening ? 'bg-orange-100 text-orange-400 cursor-not-allowed' : 'border-orange-100 text-orange-600 hover:bg-orange-50'}`}>
                    {isReopening ? 'Reabrindo...' : 'REABRIR PARA AJUSTES'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsPanel;
