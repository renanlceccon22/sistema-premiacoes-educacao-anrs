
export const formatBRL = (val: number) => {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatPercentage = (val: number) => {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
};

/**
 * Formata um número para string de moeda brasileira sem o prefixo R$
 */
export const formatCurrencyInput = (val: number) => {
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Converte uma string com máscara (1.234,56) para número (1234.56)
 */
export const parseCurrencyString = (val: string): number => {
  const cleanValue = val.replace(/\D/g, '');
  return Number(cleanValue) / 100;
};
