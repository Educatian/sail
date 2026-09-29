export interface LlmTurn {
  apiKey?: string;
  model: string;
  /** OpenAI-compatible base URL (no trailing /chat/completions). Defaults to Google Gemini. */
  baseUrl?: string;
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

// Gemini through its OpenAI-compatible endpoint. To point at another OpenAI-compatible Gemini endpoint
// (for example a UA-managed Vertex AI project), set LLM_BASE_URL and LLM_API_KEY (bearer token).
export const DEFAULT_LLM_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
export const DEFAULT_LLM_MODEL = 'gemini-2.5-flash';

// Marin (the SAIL mentor) runs on Gemini (OpenAI-compatible chat/completions). Dev stub when no key.
export async function* streamMentor(turn: LlmTurn): AsyncGenerator<string> {
  if (!turn.apiKey) {
    yield '[[LABEL:SOCRATIC]] ';
    yield '(dev mode: set LLM_API_KEY secret to enable Marin) ';
    yield 'What is the very first thing you want to understand here, in your own words?';
    return;
  }
  const base = (turn.baseUrl ?? DEFAULT_LLM_BASE_URL).replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${turn.apiKey}`,
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
