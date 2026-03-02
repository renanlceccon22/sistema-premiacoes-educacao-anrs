
export const formatBRL = (val: number) => {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatPercentage = (val: number) => {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
};

/**
 * Formata um número para string de moeda brasileira COM o prefixo R$
 */
export const formatCurrency = (val: number) => {
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formata um número para string de porcentagem brasileira (0,00) sem o símbolo
 */
export const formatPercentageMask = (val: number) => {
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' %';
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
 * Converte uma string com máscara (R$ 1.234,56 ou 1.234,56%) para número (1234.56)
 */
export const parseMaskedString = (val: string): number => {
  const cleanValue = val.replace(/\D/g, '');
  if (!cleanValue) return 0;
  return Number(cleanValue) / 100;
};

/**
 * Converte uma string com máscara (1.234,56) para número (1234.56)
 * @deprecated Use parseMaskedString
 */
export const parseCurrencyString = (val: string): number => {
  return parseMaskedString(val);
};
