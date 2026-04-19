export function normalizeText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

export function splitSentences(text) {
  const cleaned = normalizeText(text);
  if (!cleaned) return [];

  const parts = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return parts.length ? parts : [cleaned];
}

export function splitWords(text) {
  const cleaned = normalizeText(text);
  if (!cleaned) return [];

  return cleaned
    .split(/\s+/)
    .map((word) => word.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, ""))
    .filter(Boolean);
}
