// Lightweight lexical RAG (no external embedding service). Grounds the mentor on
// user-provided course material and lets it say "outside the materials" instead of guessing.

export function chunkText(text: string, size = 600): string[] {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  for (const p of paras) {
    if (p.length <= size) chunks.push(p);
    else for (let i = 0; i < p.length; i += size) chunks.push(p.slice(i, i + size));
  }
  return chunks.slice(0, 200);
}

export function retrieve(query: string, chunks: string[], k = 4): string[] {
  const terms = new Set(query.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
  if (!terms.size) return [];
  return chunks
    .map((ch) => {
      const toks = ch.toLowerCase().match(/[a-z0-9]{3,}/g) || [];
      let s = 0;
      for (const w of toks) if (terms.has(w)) s++;
      return { ch, score: s / Math.sqrt(toks.length || 1) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.ch);
}
