import React, { useMemo, useRef, useState } from 'react';
import {
  SchoolUnit,
  CustomAward,
  AwardCriterion,
  Evaluation
} from '../types';
import { formatBRL } from '../utils/formatting';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

interface SchoolWithEvaluationStatus extends SchoolUnit {
  wonAwardIds?: string[];
  wonAwardValues?: Record<string, number>;
  isFinalized?: boolean;
}

interface SummaryTableProps {
  schools: SchoolWithEvaluationStatus[];
  customAwards: CustomAward[];
  activePeriodLabel: string;
  entityInitials: string;
  entityName: string;
  awardCriteria?: AwardCriterion[];
  evaluations?: Evaluation[];
  activePeriodId?: string | null;
  isPeriodClosed?: boolean;
}

const SummaryTable: React.FC<SummaryTableProps> = ({
  schools,
  customAwards,
  activePeriodLabel,
  entityInitials,
  entityName,
  awardCriteria = [],
  evaluations = [],
  activePeriodId,
  isPeriodClosed
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Critérios marcados para exibir no relatório
  const reportCriteria = useMemo(() => {
    return awardCriteria.filter(c => c.showInReport);
  }, [awardCriteria]);

  const schoolResults = useMemo(() => {
    return schools.map(school => {
      const prizes = customAwards.filter(a => school.wonAwardIds && school.wonAwardIds.includes(a.id));
      const totalTreasurerPrize = prizes.reduce((acc, p) => acc + (school.wonAwardValues?.[p.id] ?? p.value), 0);

      const vicePercentage = !isPeriodClosed ? (school.viceTreasurerPercentage ?? 50) : 50;
      const vicePrize = school.viceTreasurerName ? (totalTreasurerPrize * vicePercentage / 100) : 0;

      // Buscar dados de avaliação para critérios do relatório
      const evalData = evaluations.find(e => e.schoolId === school.id && e.periodId === activePeriodId);
      const criterionValues: Record<string, string> = {};

      let lowestPercentage: number | null = null;

      reportCriteria.forEach(criterion => {
        const result = evalData?.criterionResults?.[criterion.id];
        if (!result) {
          criterionValues[criterion.id] = '—';
          return;
        }

        if (criterion.type === 'TOGGLE') {
          if (criterion.options && criterion.options.length > 0 && result.selectedOptionId) {
            const opt = criterion.options.find(o => String(o.id).trim() === String(result.selectedOptionId).trim());
            criterionValues[criterion.id] = opt ? `${opt.label} (${opt.points} pts)` : (result.checked ? 'Sim' : 'Não');
          } else {
            criterionValues[criterion.id] = result.checked ? 'Sim' : 'Não';
          }
        } else {
          if (result.value !== undefined) {
            if (criterion.valueFormat === 'PERCENTAGE') {
              criterionValues[criterion.id] = result.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
              // Capturar a menor porcentagem para ordenação
              if (lowestPercentage === null || result.value < lowestPercentage) {
                lowestPercentage = result.value;
              }
            } else {
              criterionValues[criterion.id] = result.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }
          } else {
            criterionValues[criterion.id] = '—';
          }
        }
      });

      return {
        school,
        prizes,
        totalTreasurerPrize,
        vicePrize,
        criterionValues,
        lowestPercentage,
        statusText: school.isFinalized ? "Finalizado" : "Aberto",
        statusColor: school.isFinalized ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
      };
    }).sort((a, b) => {
      // 1. Ordem por menor %
      if (a.lowestPercentage !== null && b.lowestPercentage !== null) {
        if (a.lowestPercentage !== b.lowestPercentage) {
          return a.lowestPercentage - b.lowestPercentage;
        }
      } else if (a.lowestPercentage !== null && b.lowestPercentage === null) {
        return -1;
      } else if (a.lowestPercentage === null && b.lowestPercentage !== null) {
        return 1;
      }
      
      // 2. Ordem por total premiado descendente caso não haja porcentagem
      return (b.totalTreasurerPrize + b.vicePrize) - (a.totalTreasurerPrize + a.vicePrize);
    });
  }, [schools, customAwards, evaluations, activePeriodId, reportCriteria]);

  const totalTreasurer = schoolResults.reduce((acc, r) => acc + r.totalTreasurerPrize, 0);
  const totalVice = schoolResults.reduce((acc, r) => acc + r.vicePrize, 0);

  const downloadExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Resumo de Premiações');

      const columns: any[] = [
        { header: 'Nome', key: 'nome', width: 45 },
        { header: 'CPF', key: 'cpf', width: 20 },
        { header: 'Saldo Livre', key: 'saldo', width: 20 },
      ];

      worksheet.columns = columns;

      const dataRows: any[] = [];

      schoolResults.forEach(res => {
        if (res.school.treasurerName && res.totalTreasurerPrize > 0) {
          dataRows.push({
            nome: res.school.treasurerName,
            cpf: (res.school.treasurerCpf || '').replace(/\D/g, ''),
            saldo: res.totalTreasurerPrize,
          });
        }

        if (res.school.viceTreasurerName && res.vicePrize > 0) {
          dataRows.push({
            nome: res.school.viceTreasurerName,
            cpf: (res.school.viceTreasurerCpf || '').replace(/\D/g, ''),
            saldo: res.vicePrize,
          });
        }
      });

      worksheet.addRows(dataRows);

      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        });

        if (rowNumber > 1) {
          // Nome na coluna 1
          // CPF na coluna 2
          const cpfCell = row.getCell(2);
          cpfCell.numFmt = '@';
          cpfCell.value = cpfCell.value?.toString();

          // Saldo na coluna 3
          const saldoCell = row.getCell(3);
          saldoCell.numFmt = '#,##0.00';
        } else {
          row.font = { bold: true };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Resumo_Premiacoes_${activePeriodLabel.replace('/', '_')}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

    } catch (e) {
      console.error(e);
      alert("Erro ao gerar Excel formatado");
    }
  };

  const downloadPDF = async () => {
    try {
      setIsExporting(true);
      const pdf = new jsPDF('l', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();

      // --- Carregar Logo PNG da pasta public ---
      const logoImg = new Image();
      logoImg.src = '/logo.png';
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => reject(new Error('Erro ao carregar logo.png'));
      });

      // --- Converter para BRANCO usando Canvas ---
      const canvas = document.createElement('canvas');
      canvas.width = logoImg.naturalWidth;
      canvas.height = logoImg.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Primeiro desenha a imagem original
        ctx.drawImage(logoImg, 0, 0);
        // "Pinta" por cima da silhueta existente
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      const whiteLogoPng = canvas.toDataURL('image/png');

      // --- Cabeçalho do PDF ---
      pdf.setFillColor(0, 59, 113);
      pdf.rect(0, 0, pageWidth, 90, 'F');

      // Inserir logo branca no canto superior direito do cabeçalho
      const logoHeight = 70;
      const ratio = logoImg.naturalWidth / logoImg.naturalHeight;
      const logoWidth = logoHeight * ratio;
      pdf.addImage(whiteLogoPng, 'PNG', pageWidth - logoWidth - 25, 10, logoWidth, logoHeight);

      pdf.setTextColor(253, 184, 19);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RELATÓRIO DE PREMIAÇÕES', 40, 40);

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`PERÍODO DE REFERÊNCIA: ${activePeriodLabel.toUpperCase()}`, 40, 58);
      pdf.text(`EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}`, 40, 78);

      const tableHeaders = [
        'UNIDADE',
        'PRÊMIOS CONQUISTADOS',
        ...reportCriteria.map(c => c.name.toUpperCase()),
        'TOTAL PRÊMIOS',
        'TESOUREIRO(A)',
        'VICE-TESOUREIRO(A)',
        'STATUS'
      ];

      const tableRows = schoolResults.map(res => [
        res.school.name.toUpperCase(),
        res.prizes.map(p => p.name).join(', ') || 'NENHUM',
        ...reportCriteria.map(c => res.criterionValues[c.id] || '—'),
        formatBRL(res.totalTreasurerPrize + res.vicePrize),
        formatBRL(res.totalTreasurerPrize),
        formatBRL(res.vicePrize),
        res.statusText.toUpperCase()
      ]);

      autoTable(pdf, {
        head: [tableHeaders],
        body: tableRows,
        startY: 110,
        margin: { top: 110, right: 40, bottom: 60, left: 40 },
        styles: { fontSize: 7, cellPadding: 6, valign: 'middle' },
        headStyles: { fillColor: [0, 59, 113], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          1: { cellWidth: reportCriteria.length > 0 ? 120 : 200 },
        }
      });

      const finalY = ((pdf as any).lastAutoTable?.finalY || 100) + 25;

      // Desenha a linha superior de totalização
      pdf.setDrawColor(0, 59, 113);
      pdf.setLineWidth(1);
      pdf.line(40, finalY - 15, pageWidth - 40, finalY - 15);

      // Define a cor (Azul escuro #003B71) e desenha os textos
      pdf.setTextColor(0, 59, 113);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TOTAL GERAL NO PERÍODO:', 40, finalY, { align: 'left' });
      pdf.text(formatBRL(totalTreasurer + totalVice), pageWidth - 40, finalY, { align: 'right' });

      pdf.save(`Relatorio_Executivo_${entityInitials}_${activePeriodLabel.replace('/', '_')}.pdf`);
      setIsExporting(false);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar PDF");
      setIsExporting(false);
    }
  };

  return (
    <div ref={tableRef} className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden print-container">
      <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-xl font-black text-[#003B71] uppercase tracking-tight">Resumo de Premiações</h2>
          <p className="text-sm text-slate-500 font-medium">Período: <span className="text-[#FDB813] font-bold">{activePeriodLabel}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-red-500 text-red-600 rounded-[14px] font-black text-[11px] tracking-widest uppercase hover:bg-red-50 hover:-translate-y-0.5 transition-all shadow-sm hover:shadow-md"
            disabled={isExporting}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {isExporting ? 'GERANDO...' : 'EXPORTAR PDF'}
          </button>
          <button
            onClick={downloadExcel}
            className="swile-button-wrapper"
          >
            <div className="swile-button-content">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 8l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              ARQUIVO SWILE
            </div>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="px-6 py-4 border-b border-slate-100">Unidade</th>
              <th className="px-6 py-4 border-b border-slate-100">Prêmios Conquistados</th>
              {reportCriteria.map(criterion => (
                <th key={criterion.id} className="px-4 py-4 border-b border-slate-100 text-center">
                  <div className="flex flex-col gap-0.5">
                    <span>{criterion.name}</span>
                    <span className="text-[7px] text-slate-300 font-bold normal-case">
                      {customAwards.find(a => a.id === criterion.awardId)?.name || ''}
                    </span>
                  </div>
                </th>
              ))}
              <th className="px-6 py-4 border-b border-slate-100 text-right">Valor Total</th>
              <th className="px-6 py-4 border-b border-slate-100 text-right">Tesoureiro(a)</th>
              <th className="px-6 py-4 border-b border-slate-100 text-right">Vice-Tesoureiro(a)</th>
              <th className="px-6 py-4 border-b border-slate-100 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm font-bold text-slate-700">
            {schoolResults.map((res, idx) => (
              <tr key={res.school.id} className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                <td className="px-6 py-4 border-b border-slate-100">
                  <span className="text-[#003B71] text-base font-black uppercase tracking-tight">{res.school.name}</span>
                </td>
                <td className="px-6 py-4 border-b border-slate-100">
                  <div className="flex flex-wrap gap-1">
                    {res.prizes.map(p => (
                      <span key={p.id} className="text-[9px] bg-blue-50 text-[#003B71] px-2 py-0.5 rounded-full border border-blue-100">
                        {p.name}
                      </span>
                    ))}
                    {res.prizes.length === 0 && <span className="text-slate-300 italic font-normal text-xs">Nenhum prêmio</span>}
                  </div>
                </td>
                {reportCriteria.map(criterion => (
                  <td key={criterion.id} className="px-4 py-4 border-b border-slate-100 text-center">
                    <span className="text-[10px] font-black text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      {res.criterionValues[criterion.id] || '—'}
                    </span>
                  </td>
                ))}
                <td className="px-6 py-4 border-b border-slate-100 text-right text-[#003B71] font-black">
                  {formatBRL(res.totalTreasurerPrize + res.vicePrize)}
                </td>
                <td className="px-6 py-4 border-b border-slate-100 text-right text-slate-600">
                  <div className="flex flex-col">
                    <span>{formatBRL(res.totalTreasurerPrize)}</span>
                    <span className="text-[9px] text-slate-400 font-normal truncate max-w-[150px]">{res.school.treasurerName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 border-b border-slate-100 text-right text-slate-600">
                  <div className="flex flex-col">
                    <span>{formatBRL(res.vicePrize)}</span>
                    <span className="text-[9px] text-slate-400 font-normal truncate max-w-[150px]">{res.school.viceTreasurerName || '---'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 border-b border-slate-100 text-center">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${res.statusColor}`}>
                    {res.statusText}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white font-black">
              <td colSpan={2} className="px-6 py-6 text-right uppercase tracking-[0.2em] text-[10px]">Total de Repasses no Período</td>
              {reportCriteria.map(c => (
                <td key={c.id} className="px-4 py-6 border-l border-white/10"></td>
              ))}
              <td className="px-6 py-6 text-right text-lg border-l border-white/10 text-[#FDB813]">{formatBRL(totalTreasurer + totalVice)}</td>
              <td className="px-6 py-6 text-right text-lg border-l border-white/10">{formatBRL(totalTreasurer)}</td>
              <td className="px-6 py-6 text-right text-lg border-l border-white/10">{formatBRL(totalVice)}</td>
              <td className="px-6 py-6 border-l border-white/10"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default SummaryTable;
