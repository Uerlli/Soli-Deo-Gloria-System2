/**
 * Normaliza um nome para comparação: remove acentos, ignora maiúsculas/minúsculas
 * e colapsa espaços. Usado para sugerir comandas abertas com nomes parecidos.
 */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Retorna nomes existentes parecidos com o termo digitado (nunca o idêntico). */
export function findSimilarNames(
  term: string,
  existing: string[],
  limit = 3
): string[] {
  const target = normalizeName(term);
  if (target.length < 2) return [];
  const matches: string[] = [];
  for (const name of existing) {
    const current = normalizeName(name);
    if (!current || current === target) continue;
    if (current.includes(target) || target.includes(current)) {
      if (!matches.includes(name)) matches.push(name);
    }
    if (matches.length >= limit) break;
  }
  return matches;
}

/**
 * Nomes existentes que casam com o termo — incluindo nomes idênticos.
 * Usado para bloquear o envio quando já existe uma comanda aberta com o
 * mesmo nome (ou um nome parecido) e exigir uma escolha explícita.
 */
export function matchSimilarNames(
  term: string,
  existing: string[],
  limit = 4
): string[] {
  const target = normalizeName(term);
  if (!target) return [];
  const matches: string[] = [];
  for (const name of existing) {
    const current = normalizeName(name);
    if (!current) continue;
    const exact = current === target;
    const fuzzy =
      target.length >= 2 && (current.includes(target) || target.includes(current));
    if (exact || fuzzy) {
      if (!matches.includes(name)) matches.push(name);
    }
    if (matches.length >= limit) break;
  }
  return matches;
}