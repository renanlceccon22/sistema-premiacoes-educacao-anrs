import React, { useMemo, useRef, useState } from 'react';
import {
  SchoolUnit,
  CustomAward
} from '../types';
import { formatBRL } from '../utils/formatting';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

interface SchoolWithEvaluationStatus extends SchoolUnit {
  wonAwardIds: string[];
  isFinalized: boolean;
}

interface SummaryTableProps {
  schools: SchoolWithEvaluationStatus[];
  customAwards: CustomAward[];
  activePeriodLabel: string;
  entityInitials: string;
  entityName: string;
}

const SummaryTable: React.FC<SummaryTableProps> = ({
  schools,
  customAwards,
  activePeriodLabel,
  entityInitials,
  entityName
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const schoolResults = useMemo(() => {
    return schools.map(school => {
      const prizes = customAwards.filter(a => school.wonAwardIds && school.wonAwardIds.includes(a.id));
      const totalTreasurerPrize = prizes.reduce((acc, p) => acc + p.value, 0);
      const vicePrize = school.viceTreasurerName ? totalTreasurerPrize * 0.5 : 0;

      return {
        school,
        prizes,
        totalTreasurerPrize,
        vicePrize,
        statusText: school.isFinalized ? "Finalizado" : "Aberto",
        statusColor: school.isFinalized ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
      };
    });
  }, [schools, customAwards]);

  const totalTreasurer = schoolResults.reduce((acc, r) => acc + r.totalTreasurerPrize, 0);
  const totalVice = schoolResults.reduce((acc, r) => acc + r.vicePrize, 0);

  const downloadExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Resumo de Premiações');

      worksheet.columns = [
        { header: 'Unidade', key: 'unidade', width: 30 },
        { header: 'Nome', key: 'nome', width: 45 },
        { header: 'CPF', key: 'cpf', width: 20 },
        { header: 'Saldo Livre', key: 'saldo', width: 20 },
        { header: 'Prêmios', key: 'premios', width: 40 },
      ];

      const dataRows: any[] = [];

      schoolResults.forEach(res => {
        const prizeNames = res.prizes.map(p => p.name).join(', ');

        if (res.school.treasurerName && res.totalTreasurerPrize > 0) {
          dataRows.push({
            unidade: res.school.name,
            nome: res.school.treasurerName,
            cpf: (res.school.treasurerCpf || '').replace(/\D/g, ''),
            saldo: res.totalTreasurerPrize,
            premios: prizeNames
          });
        }

        if (res.school.viceTreasurerName && res.vicePrize > 0) {
          dataRows.push({
            unidade: res.school.name,
            nome: res.school.viceTreasurerName,
            cpf: (res.school.viceTreasurerCpf || '').replace(/\D/g, ''),
            saldo: res.vicePrize,
            premios: prizeNames
          });
        }
      });

      worksheet.addRows(dataRows);

      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        });

        if (rowNumber > 1) {
          const cpfCell = row.getCell(3);
          cpfCell.numFmt = '@';
          cpfCell.value = cpfCell.value?.toString();

          const saldoCell = row.getCell(4);
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

      pdf.setFillColor(0, 59, 113);
      pdf.rect(0, 0, pageWidth, 90, 'F');

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
        'TOTAL PRÊMIOS',
        'TESOUREIRO(A)',
        'VICE-TESOUREIRO(A)',
        'STATUS'
      ];

      const tableRows = schoolResults.map(res => [
        res.school.name.toUpperCase(),
        res.prizes.map(p => p.name).join(', ') || 'NENHUM',
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
        styles: { fontSize: 8, cellPadding: 8, valign: 'middle' },
        headStyles: { fillColor: [0, 59, 113], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          1: { cellWidth: 200 },
          2: { fontStyle: 'bold', halign: 'right' },
          3: { fontStyle: 'bold', halign: 'right' },
          4: { fontStyle: 'bold', halign: 'right' }
        }
      });

      const finalY = ((pdf as any).lastAutoTable?.finalY || 100) + 25;
      pdf.setTextColor(0, 59, 113);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`TOTAL GERAL: ${formatBRL(totalTreasurer + totalVice)}`, pageWidth - 40, finalY, { align: 'right' });

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
