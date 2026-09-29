export interface LlmTurn {
  apiKey?: string;
  model: string;
  /** OpenAI-compatible base URL of the Microsoft AI Foundry / Azure OpenAI v1 endpoint, e.g. https://<resource>.openai.azure.com/openai/v1 (no trailing /chat/completions). */
  baseUrl?: string;
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

// Microsoft AI Foundry (Azure OpenAI v1, OpenAI-compatible chat/completions). Set LLM_BASE_URL to the resource endpoint,
// LLM_API_KEY to the resource key, and SAIL_MODEL to the name of your Foundry model deployment.
export const DEFAULT_LLM_MODEL = 'gpt-4o-mini';   // replace with your deployment name

/** Azure endpoints use the `api-key` header; other OpenAI-compatible endpoints use a bearer token. */
export function llmAuthHeaders(baseUrl: string, key: string): Record<string, string> {
  return /azure\.com|azure\.net/i.test(baseUrl) ? { 'api-key': key } : { Authorization: `Bearer ${key}` };
}

// Marin (the SAIL mentor) runs on Microsoft AI Foundry. Dev stub when the key or endpoint is missing.
export async function* streamMentor(turn: LlmTurn): AsyncGenerator<string> {
  if (!turn.apiKey || !turn.baseUrl) {
    yield '[[LABEL:SOCRATIC]] ';
    yield '(dev mode: set the LLM_API_KEY secret and LLM_BASE_URL to enable Marin) ';
    yield 'What is the very first thing you want to understand here, in your own words?';
    return;
  }
  const base = turn.baseUrl.replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...llmAuthHeaders(base, turn.apiKey),
    },
    body: JSON.stringify({
      model: turn.model,
      stream: true,
      max_tokens: 1024,
      messages: [{ role: 'system', content: turn.system }, ...turn.messages],
    }),
  });
  if (!res.ok || !res.body) { yield `[[LABEL:SOCRATIC]] (mentor error ${res.status})`; return; }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const data = t.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const ev = JSON.parse(data);
        const delta = ev.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) yield delta;
      } catch { /* keep-alive / non-JSON */ }
    }
  }
}
