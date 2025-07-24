
// Javított normalizációs függvény az ékezetek kezelésére
export const normalizeText = (text: string): string => {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ű/g, 'u')
    .replace(/ő/g, 'o')
    .trim();
};
