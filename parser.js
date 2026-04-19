export function cleanOcrText(text) {
  if (!text) return "";

  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

export function normalizeText(text) {
  return cleanOcrText(text).replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
}

export function getSentences(text) {
  const cleaned = cleanOcrText(text);
  if (!cleaned) return [];

  return cleaned
    .split(/\n+|(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getWords(text) {
  const cleaned = cleanOcrText(text);
  if (!cleaned) return [];

  const words = cleaned.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g);
  return words ? words.filter(Boolean) : [];
}

export const splitSentences = getSentences;
export const splitWords = getWords;
