
import React, { useMemo, useRef, useState } from 'react';
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
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

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
  entityInitials: string;
  entityName: string;
}

const SummaryTable: React.FC<SummaryTableProps> = ({
  schools,
  thresholds,
  inadimplenciaRankingConfig,
  managementBonusConfig,
  anrsBonusConfig,
  activePeriodLabel,
  allPeriodEvaluations,
  entityInitials,
  entityName
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const getSchoolResult = (school: SchoolWithEvaluationStatus) => {
    // Se estiver finalizado e tiver snapshot, usar os dados congelados
    if (school.isFinalized && school.snapshot) {
      const snap = school.snapshot;

      // Ranking dinâmico (depende de outras unidades estarem prontas)
      const hasVice = !!(snap.viceTreasurerName || school.viceTreasurerName);
      const livePrizes = calculateAllPrizes(
        snap.totalPoints,
        thresholds,
        inadimplenciaRankingConfig,
        managementBonusConfig,
        anrsBonusConfig,
        allPeriodEvaluations,
        school.id,
        activePeriodLabel,
        hasVice
      );

      // Garante que o resumo respeite o status "Ativo/Inativo" global atual
      const inadimplenciaRankingBonus = inadimplenciaRankingConfig.enabled ? livePrizes.inadimplenciaRankingBonus : 0;
      const managementBonus = managementBonusConfig.enabled ? (snap.managementBonusValue || 0) : 0;
      const anrsBonus = anrsBonusConfig.enabled ? (snap.anrsBonusValue || 0) : 0;

      const totalTreasurerPrize = inadimplenciaRankingBonus + managementBonus + anrsBonus;
      const vicePrize = hasVice ? totalTreasurerPrize * 0.5 : 0;

      return {
        inadimplenciaRankingBonus,
        managementBonus,
        anrsBonus,
        totalTreasurerPrize,
        vicePrize,
        level: snap.awardLevel,
        inadimplenciaRank: livePrizes.inadimplenciaRank,
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
    const activeCategoriesForPoints = school.categories.filter(cat => {
      if (cat.id === 'adiantamentos' || cat.id === 'cartao_corporativo') return managementBonusConfig.enabled;
      if (cat.id === 'orcamento_bi' || cat.id === 'descontos_concedidos') return anrsBonusConfig.enabled;
      if (cat.id === 'inadimplencia_mes') return inadimplenciaRankingConfig.enabled || anrsBonusConfig.enabled;
      return true;
    });

    const points = activeCategoriesForPoints.reduce((acc, cat) => {
      const target = school.targets[cat.id] || 0;
      const realized = school.realizedValues[cat.id];
      const selection = school.selections[cat.id];
      const p = calculatePoints(cat, selection, realized, target, activePeriodLabel);
      return acc + p;
    }, 0);

    const level = getAwardLevel(points, thresholds);

    const hasVice = !!(school.viceTreasurerName);
    const prizes = calculateAllPrizes(
      points,
      thresholds,
      inadimplenciaRankingConfig,
      managementBonusConfig,
      anrsBonusConfig,
      allPeriodEvaluations.map(e => ({ ...e, isFinalized: schools.find(s => s.id === e.schoolId)?.isFinalized })),
      school.id,
      activePeriodLabel,
      hasVice
    );

    let statusText = "Aberto";
    let statusColor = "bg-blue-100 text-blue-600";

    if (school.isFinalized) {
      statusText = "Finalizado";
      statusColor = "bg-green-100 text-green-600";
    } else if (Object.keys(school.selections).length > 0 || Object.keys(school.realizedValues).length > 0) {
      statusText = "Aberto";
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
        // Linha do Tesoureiro (Apenas se tiver prêmio > 0)
        if (res.school.treasurerName && res.totalTreasurerPrize > 0) {
          dataRows.push({
            nome: res.school.treasurerName,
            cpf: (res.school.treasurerCpf || '').replace(/\D/g, ''),
            saldo: res.totalTreasurerPrize
          });
        }

        // Linha do Vice-Tesoureiro (Apenas se tiver prêmio > 0)
        if (res.school.viceTreasurerName && res.vicePrize > 0) {
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
      const pdf = new jsPDF('l', 'pt', 'a4'); // Paisagem para caber todas as colunas
      const pageWidth = pdf.internal.pageSize.getWidth();

      // 1. Cabeçalho Institucional (Design Executivo)
      pdf.setFillColor(0, 59, 113); // Azul Marinho ANRS (#003B71)
      pdf.rect(0, 0, pageWidth, 80, 'F');

      pdf.setTextColor(253, 184, 19); // Dourado (#FDB813)
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RELATÓRIO DE PREMIAÇÕES', 40, 45);

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`PERÍODO DE REFERÊNCIA: ${activePeriodLabel.toUpperCase()}`, 40, 65);
      pdf.text(`EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 40, 65, { align: 'right' });

      // Injeta a logo acima da emissão
      try {
        const response = await fetch('/ea-logo.png');
        const blob = await response.blob();
        const reader = new FileReader();
        const base64data = await new Promise<string | null>((resolve) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                // Converte tudo que não for transparente para branco
                ctx.globalCompositeOperation = 'source-in';
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png'));
              } else {
                resolve(result);
              }
            };
            img.onerror = () => resolve(result);
            img.src = result;
          };
          reader.readAsDataURL(blob);
        });

        if (base64data) {
          const logoWidth = 130;  // Logo EA costuma ser retangular
          const logoHeight = 40;
          // Alinhar a logo à direita
          pdf.addImage(base64data, 'PNG', pageWidth - 40 - logoWidth, 15, logoWidth, logoHeight);
        }
      } catch (err) {
        console.warn("Erro ao carregar a logo para o PDF:", err);
      }



      // 2. Preparar Dados para a Tabela e Estilos
      const showPointsPDF = anrsBonusConfig.enabled || managementBonusConfig.enabled;
      const tableHeaders = [
        'UNIDADE',
        'INAD. (%)'
      ];
      if (showPointsPDF) tableHeaders.push('PONTOS');
      if (inadimplenciaRankingConfig.enabled) tableHeaders.push('PRÊMIO RANKING');
      tableHeaders.push('Total');
      if (anrsBonusConfig.enabled) tableHeaders.push(`Meta ${entityInitials}`);
      if (managementBonusConfig.enabled) tableHeaders.push('Meta de Gestão');
      tableHeaders.push('TESOUREIRO(A)', 'VICE', 'STATUS');

      const dynamicColumnStyles: Record<number, any> = {
        0: { fontStyle: 'bold', minCellWidth: 100, halign: 'left' },
        1: { halign: 'center' },
      };

      let colIdx = 2;
      if (showPointsPDF) {
        dynamicColumnStyles[colIdx++] = { halign: 'center' };
      }
      if (inadimplenciaRankingConfig.enabled) {
        dynamicColumnStyles[colIdx++] = { textColor: [21, 128, 61], fontStyle: 'bold' };
      }
      dynamicColumnStyles[colIdx++] = { textColor: [0, 59, 113], fontStyle: 'bold' }; // Total
      if (anrsBonusConfig.enabled) {
        dynamicColumnStyles[colIdx++] = { textColor: [21, 128, 61], fontStyle: 'bold' }; // Meta {entityInitials}
      }
      if (managementBonusConfig.enabled) {
        dynamicColumnStyles[colIdx++] = { textColor: [21, 128, 61], fontStyle: 'bold' }; // Meta de Gestão
      }
      dynamicColumnStyles[colIdx++] = { fontStyle: 'bold' }; // Tesoureiro
      dynamicColumnStyles[colIdx++] = { fontStyle: 'bold' }; // Vice
      dynamicColumnStyles[colIdx++] = { fontStyle: 'bold', halign: 'center' }; // Status

      const tableRows = sortedResults.map(res => {
        const row = [
          res.school.name.toUpperCase(),
          formatPercentage(res.school.realizedValues['inadimplencia_mes'] || 0)
        ];
        if (showPointsPDF) {
          row.push(`${res.points} PTS`);
        }
        if (inadimplenciaRankingConfig.enabled) {
          row.push(res.inadimplenciaRankingBonus > 0 ? `+${formatBRL(res.inadimplenciaRankingBonus)}` : '---');
        }
        row.push(formatBRL(res.inadimplenciaRankingBonus + res.managementBonus + res.anrsBonus));
        if (anrsBonusConfig.enabled) {
          row.push(res.anrsBonus > 0 ? `+${formatBRL(res.anrsBonus)}` : '---');
        }
        if (managementBonusConfig.enabled) {
          row.push(res.managementBonus > 0 ? `+${formatBRL(res.managementBonus)}` : '---');
        }
        row.push(formatBRL(res.totalTreasurerPrize), formatBRL(res.vicePrize), res.statusText.toUpperCase());

        return row;
      });

      // 3. Gerar Tabela Automática (Robusta e sem erros de CSS)
      autoTable(pdf, {
        head: [tableHeaders],
        body: tableRows,
        startY: 100,
        margin: { top: 100, right: 40, bottom: 60, left: 40 },
        styles: {
          fontSize: 8,
          font: 'helvetica',
          cellPadding: 8,
          valign: 'middle',
          halign: 'center'
        },
        headStyles: {
          fillColor: [0, 59, 113],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 9
        },
        columnStyles: dynamicColumnStyles,
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didDrawPage: (data: any) => {
          // Rodapé em cada página
          pdf.setFontSize(8);
          pdf.setTextColor(150);
          pdf.text(
            `Documento emitido pelo Sistema de Premiações - Autenticidade garantida por consolidado sistêmico.`,
            40,
            pdf.internal.pageSize.getHeight() - 30
          );
          pdf.text(
            `Página ${data.pageNumber}`,
            pageWidth - 60,
            pdf.internal.pageSize.getHeight() - 30
          );
        }
      });

      // 4. Totais Finais
      const finalY = ((pdf as any).lastAutoTable?.finalY || 100) + 20;
      pdf.setDrawColor(0, 59, 113);
      pdf.setLineWidth(1);
      pdf.line(pageWidth - 300, finalY, pageWidth - 40, finalY);

      pdf.setFontSize(11);
      pdf.setTextColor(0, 59, 113);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TOTAL GERAL NO PERÍODO:', pageWidth - 300, finalY + 20);

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.text(formatBRL(totalTreasurer + totalVice), pageWidth - 40, finalY + 20, { align: 'right' });

      // 5. Salvar
      pdf.save(`Relatorio_Executivo_${entityInitials}_${activePeriodLabel.replace('/', '_')}.pdf`);
      setIsExporting(false);
    } catch (e) {
      console.error("Erro ao gerar PDF Nativo:", e);
      alert("Erro ao gerar relatório profissional. Detalhes: " + (e instanceof Error ? e.message : 'Desconhecido'));
    }
  };

  const totalTreasurer = sortedResults.reduce((acc, r) => acc + r.totalTreasurerPrize, 0);
  const totalVice = sortedResults.reduce((acc, r) => acc + r.vicePrize, 0);
  const showPointsHTML = anrsBonusConfig.enabled || managementBonusConfig.enabled;

  return (
    <div ref={tableRef} className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden print-container" >
      {/* Cabeçalho Profissional - Visível apenas no PDF/Print */}
      < div className="hidden pdf-only bg-[#003B71] p-10 text-white border-b-4 border-[#FDB813]" >
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">Relatório Institucional</h1>
            <h2 className="text-xl font-bold text-[#FDB813] opacity-90 uppercase">Premiação Mensal - Tesouraria</h2>
          </div>
          <div className="text-right">
            <p className="text-sm font-black opacity-60 uppercase tracking-widest mb-1">Período de Referência</p>
            <p className="text-2xl font-black">{activePeriodLabel}</p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10 flex gap-10">
          <div>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1">Data de Emissão</p>
            <p className="text-sm font-bold">{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1">Status do Período</p>
            <p className="text-sm font-bold uppercase">Consolidado e Auditado</p>
          </div>
        </div>
      </div >

      <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6 screen-only">
        <div>
          <h2 className="text-sm font-black text-[#003B71] uppercase tracking-tight">Resumo Finalizado</h2>
          <p className="text-sm text-slate-500 font-medium">Período Ativo: <span className="text-[#FDB813] font-bold">{activePeriodLabel}</span></p>
        </div>
        <div className="flex items-center gap-3" data-html2canvas-ignore="true">
          <div className="pdf-adobe-wrapper">
            <button
              onClick={downloadPDF}
              className="pdf-adobe-content"
              disabled={isExporting}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {isExporting ? 'Gerando PDF...' : 'Exportar PDF'}
            </button>
          </div>
          <div className="swile-button-wrapper">
            <button
              onClick={downloadExcel}
              className="swile-button-content"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
              </svg>
              Arquivo Swile
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="px-6 py-4 border-b border-slate-100">Unidade</th>
              <th className="px-6 py-4 border-b border-slate-100">Inad. Mês (%)</th>
              {showPointsHTML && <th className="px-6 py-4 border-b border-slate-100">Pontuação</th>}
              {inadimplenciaRankingConfig.enabled && <th className="px-6 py-4 border-b border-slate-100">Prêmio Ranking</th>}
              {anrsBonusConfig.enabled && <th className="px-6 py-4 border-b border-slate-100">Meta {entityInitials}</th>}
              {managementBonusConfig.enabled && <th className="px-6 py-4 border-b border-slate-100">Meta de Gestão</th>}
              <th className="px-6 py-4 border-b border-slate-100 text-right">Tesoureiro(a)</th>
              <th className="px-6 py-4 border-b border-slate-100 text-right">Vice-Tesoureiro(a)</th>
              <th className="px-6 py-4 border-b border-slate-100 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm font-bold text-slate-700">
            {sortedResults.map((res, idx) => (
              <tr key={res.school.id} className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                <td className="px-6 py-4 border-b border-slate-100">
                  <span className="text-[#003B71] text-base font-black uppercase tracking-tight">{res.school.name}</span>
                </td>
                <td className="px-6 py-4 border-b border-slate-100">
                  <span className="text-slate-600">{formatPercentage(res.school.realizedValues['inadimplencia_mes'] || 0)}</span>
                </td>
                {showPointsHTML && (
                  <td className="px-6 py-4 border-b border-slate-100">
                    <span className={`px-2 py-1 rounded text-xs font-black border ${res.points >= 700 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                      {res.points} PTS
                    </span>
                  </td>
                )}
                {inadimplenciaRankingConfig.enabled && (
                  <td className="px-6 py-4 border-b border-slate-100">
                    {res.inadimplenciaRankingBonus > 0 ? (
                      <div className="flex flex-col">
                        <span className="text-green-600 text-sm font-black">+{formatBRL(res.inadimplenciaRankingBonus)}</span>
                        <span className="text-[10px] text-[#003B71] font-black uppercase tracking-widest">{res.inadimplenciaRank}º Lugar</span>
                      </div>
                    ) : <span className="text-slate-200">---</span>}
                  </td>
                )}
                {managementBonusConfig.enabled && (
                  <td className="px-6 py-4 border-b border-slate-100">
                    {res.managementBonus > 0 ? <span className="text-green-600 text-sm font-black">+{formatBRL(res.managementBonus)}</span> : <span className="text-slate-200">---</span>}
                  </td>
                )}
                {anrsBonusConfig.enabled && (
                  <td className="px-6 py-4 border-b border-slate-100">
                    {res.anrsBonus > 0 ? <span className="text-green-600 text-sm font-black">+{formatBRL(res.anrsBonus)}</span> : <span className="text-slate-200">---</span>}
                  </td>
                )}
                <td className="px-6 py-4 border-b border-slate-100 text-right font-black text-slate-600">
                  {formatBRL(res.totalTreasurerPrize)}
                </td>
                <td className="px-6 py-4 border-b border-slate-100 text-right font-black text-slate-600">
                  {formatBRL(res.vicePrize)}
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
              <td colSpan={2 + (showPointsHTML ? 1 : 0) + (inadimplenciaRankingConfig.enabled ? 1 : 0) + (managementBonusConfig.enabled ? 1 : 0) + (anrsBonusConfig.enabled ? 1 : 0)} className="px-6 py-6 text-right uppercase tracking-[0.2em] text-[10px]">Total de Repasses no Período</td>
              <td className="px-6 py-6 text-right text-lg border-l border-white/10">{formatBRL(totalTreasurer)}</td>
              <td className="px-6 py-6 text-right text-lg border-l border-white/10">{formatBRL(totalVice)}</td>
              <td className="px-6 py-6 border-l border-white/10"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Rodapé de Autenticidade - Visível apenas no PDF */}
      <div className="hidden pdf-only p-8 bg-slate-50 border-t border-slate-200">
        <div className="flex justify-between items-end">
          <div className="flex-1">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1">Nota de Auditoria</h4>
            <p className="text-[9px] text-slate-500 font-bold max-w-2xl leading-relaxed">
              Este documento é gerado automaticamente pelo Sistema de Premiações. Os valores apresentados
              referem-se à data e período especificados. Alterações posteriores nos caixas ou fechamentos contábeis
              podem impactar os resultados, mas este relatório reflete o status consolidado no momento da emissão,
              com base nos critérios de excelência e metas institucionais estabelecidas.
            </p>
          </div>
          <div className="flex flex-col items-end justify-center text-right border-l border-slate-200 pl-6 ml-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{entityName}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest leading-none">Status: Consolidado Oficial</p>
          </div>
        </div>
      </div>
    </div >
  );
};

export default SummaryTable;
