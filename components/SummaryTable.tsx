
import React, { useMemo } from 'react';
import {
  SchoolUnit,
  Thresholds,
  AwardLevel,
  Category,
  InadimplenciaRankingConfig,
  ManagementBonusConfig,
  AnrsBonusConfig
} from '../types';
import { calculatePoints, getAwardLevel, calculateAllPrizes, getMonthIndexFromLabel } from '../utils/calculations';
import { formatBRL, formatPercentage } from '../utils/formatting';

interface SchoolWithEvaluationStatus extends SchoolUnit {
  selections: Record<string, string>;
  realizedValues: Record<string, number>;
  inadimplenciaRankingPercentage?: number;
  isFinalized: boolean;
  categories: Category[];
  snapshot?: any; // SnapshotData
}

interface SummaryTableProps {
  schools: SchoolWithEvaluationStatus[];
  thresholds: Thresholds;
  inadimplenciaRankingConfig: InadimplenciaRankingConfig;
  managementBonusConfig: ManagementBonusConfig;
  anrsBonusConfig: AnrsBonusConfig;
  activePeriodLabel: string;
  allPeriodEvaluations: {
    schoolId: string;
    inadimplenciaRankingPercentage?: number;
    categories: Category[];
    selections: Record<string, string>;
    realizedValues: Record<string, number>;
    targets: Record<string, number>;
    periodLabel?: string;
  }[];
}

const SummaryTable: React.FC<SummaryTableProps> = ({
  schools,
  thresholds,
  inadimplenciaRankingConfig,
  managementBonusConfig,
  anrsBonusConfig,
  activePeriodLabel,
  allPeriodEvaluations
}) => {

  const getSchoolResult = (school: SchoolWithEvaluationStatus) => {
    // Se estiver finalizado e tiver snapshot, usar os dados congelados
    if (school.isFinalized && school.snapshot) {
      const snap = school.snapshot;
      return {
        inadimplenciaRankingBonus: snap.inadimplenciaRankingBonusValue,
        managementBonus: snap.managementBonusValue,
        anrsBonus: snap.anrsBonusValue,
        totalTreasurerPrize: snap.totalTreasurerPrize,
        vicePrize: snap.vicePrize,
        level: snap.awardLevel,
        inadimplenciaRank: snap.inadimplenciaRank,
        points: snap.totalPoints,
        statusText: "Finalizado",
        statusColor: "bg-green-100 text-green-600",
        school: {
          ...school,
          treasurerName: snap.treasurerName || school.treasurerName,
          treasurerCpf: snap.treasurerCpf || school.treasurerCpf,
          viceTreasurerName: snap.viceTreasurerName || school.viceTreasurerName,
          viceTreasurerCpf: snap.viceTreasurerCpf || school.viceTreasurerCpf,
        }
      };
    }

    // Cálculo rigoroso de pontos garantindo que orcamento_bi e descontos usem o contexto correto
    const points = school.categories.reduce((acc, cat) => {
      const target = school.targets[cat.id] || 0;
      const realized = school.realizedValues[cat.id];
      const selection = school.selections[cat.id];
      const p = calculatePoints(cat, selection, realized, target, activePeriodLabel);
      return acc + p;
    }, 0);

    const level = getAwardLevel(points, thresholds);

    const prizes = calculateAllPrizes(
      points,
      thresholds,
      inadimplenciaRankingConfig,
      managementBonusConfig,
      anrsBonusConfig,
      allPeriodEvaluations,
      school.id,
      activePeriodLabel
    );

    let statusText = "Pendente";
    let statusColor = "bg-slate-100 text-slate-400";

    if (school.isFinalized) {
      statusText = "Finalizado";
      statusColor = "bg-green-100 text-green-600";
    } else if (Object.keys(school.selections).length > 0 || Object.keys(school.realizedValues).length > 0) {
      statusText = "Em Aberto";
      statusColor = "bg-blue-100 text-blue-600";
    }

    return {
      ...prizes,
      points,
      level,
      statusText,
      statusColor,
      school
    };
  };

  const sortedResults = useMemo(() => {
    const results = schools.map(s => getSchoolResult(s));
    return results.sort((a, b) => {
      const inadA = a.school.realizedValues['inadimplencia_mes'] || 0;
      const inadB = b.school.realizedValues['inadimplencia_mes'] || 0;
      if (inadA !== inadB) return inadA - inadB;
      return b.points - a.points; // Desempate por pontos
    });
  }, [schools, thresholds, inadimplenciaRankingConfig, managementBonusConfig, anrsBonusConfig, allPeriodEvaluations, activePeriodLabel]);

  const downloadExcel = async () => {
    try {
      // @ts-ignore
      const ExcelJSModule = await import('https://esm.sh/exceljs');
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Resumo de Premiações');

      // 1. Definir Colunas
      worksheet.columns = [
        { header: 'Nome', key: 'nome', width: 45 },
        { header: 'CPF', key: 'cpf', width: 20 },
        { header: 'Saldo Livre', key: 'saldo', width: 20 },
      ];

      // 2. Adicionar Dados (Separando Tesoureiro e Vice em linhas diferentes)
      const dataRows: any[] = [];

      sortedResults.forEach(res => {
        // Linha do Tesoureiro
        if (res.school.treasurerName) {
          dataRows.push({
            nome: res.school.treasurerName,
            cpf: (res.school.treasurerCpf || '').replace(/\D/g, ''),
            saldo: res.totalTreasurerPrize
          });
        }

        // Linha do Vice-Tesoureiro
        if (res.school.viceTreasurerName) {
          dataRows.push({
            nome: res.school.viceTreasurerName,
            cpf: (res.school.viceTreasurerCpf || '').replace(/\D/g, ''),
            saldo: res.vicePrize
          });
        }
      });

      // 3. Adicionar as linhas ao worksheet
      worksheet.addRows(dataRows);

      // 4. Estilização de Células (Tudo Alinhado à ESQUERDA como no exemplo)
      worksheet.eachRow((row, rowNumber) => {
        // Alinhamento horizontal à esquerda para TODAS as células
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        });

        if (rowNumber > 1) {
          // Formatar CPF como Texto (para manter zeros à esquerda)
          const cpfCell = row.getCell(2);
          cpfCell.numFmt = '@';
          cpfCell.value = cpfCell.value?.toString(); // Forçar string

          // Formatar Moeda no Saldo Livre (sem o R$, apenas números com vírgula)
          const saldoCell = row.getCell(3);
          // Usamos um formato que garante 2 casas decimais e separador de milhar
          saldoCell.numFmt = '#,##0.00';
        } else {
          // Header bold
          row.font = { bold: true };
        }
      });

      // 5. Download
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
      // @ts-ignore
      const { jsPDF } = await import('https://esm.sh/jspdf');
      // @ts-ignore
      const { default: autoTable } = await import('https://esm.sh/jspdf-autotable');

      const doc = new jsPDF('l', 'mm', 'a4'); // Paisagem para caber tudo

      // 1. Função para carregar imagem e converter para Base64 (Garante que apareça)
      const getBase64Image = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.src = url;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } else {
              reject('Canvas context not available');
            }
          };
          img.onerror = () => reject('Error loading image');
        });
      };

      let logoData: string | null = null;
      try {
        logoData = await getBase64Image('/logo.png');
      } catch (e) { console.warn("Logo não carregada", e); }

      // Cabeçalho Elegante
      doc.setFillColor(0, 59, 113); // Deep Blue #003B71
      doc.rect(0, 0, 297, 40, 'F');

      // Adicionar Logo com Fundo Branco (Destaque)
      if (logoData) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(255, 5, 25, 25, 5, 5, 'F');
        doc.addImage(logoData, 'PNG', 257.5, 7.5, 20, 20);
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('PREMIAÇÕES ANRS', 15, 20);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período Contábil: ${activePeriodLabel}`, 15, 30);

      doc.setFillColor(253, 184, 19); // Gold #FDB813
      doc.rect(15, 33, 50, 2, 'F');

      const body = sortedResults.map(res => [
        {
          content: `${res.school.name}\nTESOUREIRO(A): ${res.school.treasurerName || 'PENDENTE'} (${res.school.treasurerCpf || '---'})\nVICE-TESOUREIRO(A): ${res.school.viceTreasurerName || 'CARGO NÃO EXISTENTE'} ${res.school.viceTreasurerName ? `(${res.school.viceTreasurerCpf || '---'})` : ''}`,
          styles: { fontStyle: 'bold' }
        },
        formatPercentage(res.school.realizedValues['inadimplencia_mes'] || 0),
        `${res.points} PTS`,
        formatBRL(res.inadimplenciaRankingBonus),
        formatBRL(res.managementBonus),
        formatBRL(res.anrsBonus),
        formatBRL(res.totalTreasurerPrize),
        formatBRL(res.vicePrize),
        res.statusText.toUpperCase()
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['Unidade / Responsáveis', 'Inad. %', 'Pontos', 'Bônus Ranking', 'Bônus Gestão', 'Bônus ANRS', 'Tesoureiro(a)', 'Rep. Vice', 'Status']],
        body: body,
        theme: 'striped',
        headStyles: {
          fillColor: [0, 59, 113],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 95, overflow: 'linebreak' },
          1: { halign: 'center', cellWidth: 18 },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'right', cellWidth: 22 },
          4: { halign: 'right', cellWidth: 22 },
          5: { halign: 'right', cellWidth: 22 },
          6: { halign: 'right', fontStyle: 'bold', cellWidth: 25 },
          7: { halign: 'right', cellWidth: 25 },
          8: { halign: 'center', fontSize: 6.5, cellWidth: 20 }
        },
        styles: {
          fontSize: 7,
          cellPadding: 2.5,
          valign: 'middle'
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10 }
      });

      // Totais no final
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFillColor(241, 245, 249);
      doc.rect(180, finalY, 105, 30, 'F');

      doc.setTextColor(0, 59, 113);
      doc.setFontSize(10);
      doc.text('TOTAL REPASSES:', 185, finalY + 8);

      doc.setFontSize(9);
      doc.text(`Tesoureiros: ${formatBRL(totalTreasurer)}`, 185, finalY + 15);
      doc.text(`Vice-Tesoureiros: ${formatBRL(totalVice)}`, 185, finalY + 22);

      doc.setFontSize(14);
      doc.setTextColor(253, 184, 19);
      doc.text(`GERAL: ${formatBRL(totalTreasurer + totalVice)}`, 280, finalY + 20, { align: 'right' });

      doc.save(`Resumo_Premiacoes_${activePeriodLabel.replace('/', '_')}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar PDF");
    }
  };

  const totalTreasurer = sortedResults.reduce((acc, r) => acc + r.totalTreasurerPrize, 0);
  const totalVice = sortedResults.reduce((acc, r) => acc + r.vicePrize, 0);

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-[#003B71] uppercase tracking-tight">Resumo Finalizado</h2>
          <p className="text-sm text-slate-500 font-medium">Período Ativo: <span className="text-[#FDB813] font-bold">{activePeriodLabel}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={downloadPDF} className="bg-[#003B71] text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#002a51] transition-all flex items-center gap-2 shadow-lg">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Exportar PDF
          </button>
          <button onClick={downloadExcel} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" /></svg>
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="px-6 py-4 border-b border-slate-100">Unidade / Responsáveis</th>
              <th className="px-6 py-4 border-b border-slate-100">Inad. Mês (%)</th>
              <th className="px-6 py-4 border-b border-slate-100">Pontuação</th>
              <th className="px-6 py-4 border-b border-slate-100">Bônus Ranking</th>
              <th className="px-6 py-4 border-b border-slate-100">Bônus Gestão</th>
              <th className="px-6 py-4 border-b border-slate-100">Bônus ANRS</th>
              <th className="px-6 py-4 border-b border-slate-100 text-right">Tesoureiro(a)</th>
              <th className="px-6 py-4 border-b border-slate-100 text-right">Vice-Tesoureiro(a)</th>
              <th className="px-6 py-4 border-b border-slate-100 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm font-bold text-slate-700">
            {sortedResults.map((res, idx) => (
              <tr key={res.school.id} className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                <td className="px-6 py-4 border-b border-slate-100">
                  <div className="flex flex-col gap-2">
                    <span className="text-[#003B71] text-base font-black uppercase tracking-tight">{res.school.name}</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase tracking-widest">Tesoureiro(a)</span>
                        <span className="text-[10px] text-slate-600 font-bold truncate leading-tight uppercase">{res.school.treasurerName || 'Pendente'}</span>
                        <span className="text-[9px] text-slate-600 font-medium">{res.school.treasurerCpf || '000.000.000-00'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase tracking-widest">Vice-Tesoureiro(a)</span>
                        <span className="text-[10px] text-slate-600 font-bold truncate leading-tight uppercase">{res.school.viceTreasurerName || 'Cargo não existente'}</span>
                        <span className="text-[9px] text-slate-600 font-medium">{res.school.viceTreasurerName ? (res.school.viceTreasurerCpf || '000.000.000-00') : '---'}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 border-b border-slate-100">
                  <span className="text-slate-600">{formatPercentage(res.school.realizedValues['inadimplencia_mes'] || 0)}</span>
                </td>
                <td className="px-6 py-4 border-b border-slate-100">
                  <span className={`px-2 py-1 rounded text-xs font-black border ${res.points >= 700 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                    {res.points} PTS
                  </span>
                </td>
                <td className="px-6 py-4 border-b border-slate-100">
                  {res.inadimplenciaRankingBonus > 0 ? (
                    <div className="flex flex-col">
                      <span className="text-green-600 text-sm font-black">+{formatBRL(res.inadimplenciaRankingBonus)}</span>
                      <span className="text-[10px] text-[#003B71] font-black uppercase tracking-widest">{res.inadimplenciaRank}º Lugar</span>
                    </div>
                  ) : <span className="text-slate-200">---</span>}
                </td>
                <td className="px-6 py-4 border-b border-slate-100">
                  {res.managementBonus > 0 ? <span className="text-green-600 text-sm font-black">+{formatBRL(res.managementBonus)}</span> : <span className="text-slate-200">---</span>}
                </td>
                <td className="px-6 py-4 border-b border-slate-100">
                  {res.anrsBonus > 0 ? <span className="text-green-600 text-sm font-black">+{formatBRL(res.anrsBonus)}</span> : <span className="text-slate-200">---</span>}
                </td>
                <td className="px-6 py-4 border-b border-slate-100 text-right font-black text-slate-600">
                  {formatBRL(res.totalTreasurerPrize)}
                </td>
                <td className="px-6 py-4 border-b border-slate-100 text-right font-black text-slate-600">
                  {formatBRL(res.vicePrize)}
                </td>
                <td className="px-6 py-4 border-b border-slate-100 text-center">
                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${res.statusColor}`}>
                    {res.statusText}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white font-black">
              <td colSpan={6} className="px-6 py-6 text-right uppercase tracking-[0.2em] text-[10px]">Total de Repasses no Período</td>
              <td className="px-6 py-6 text-right text-lg border-l border-white/10">{formatBRL(totalTreasurer)}</td>
              <td className="px-6 py-6 text-right text-lg border-l border-white/10">{formatBRL(totalVice)}</td>
              <td className="bg-[#FDB813] text-[#003B71] text-center text-xs uppercase tracking-widest p-0">
                <div className="flex flex-col items-center justify-center h-full">
                  <span>Geral</span>
                  <span className="text-base">{formatBRL(totalTreasurer + totalVice)}</span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default SummaryTable;
