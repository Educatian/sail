// Marin (the SAIL mentor). Uses Google Gemini through its OpenAI-compatible API when LLM_API_KEY is set. Without a key it
// defaults to LOCAL Ollama (Qwen) so local development works with no key. LLM_BASE_URL / SAIL_MODEL override either default.
const apiKey = process.env.LLM_API_KEY;
const BASE = process.env.LLM_BASE_URL ?? (apiKey ? 'https://generativelanguage.googleapis.com/v1beta/openai' : 'http://localhost:11434/v1');
const MODEL = process.env.SAIL_MODEL ?? (apiKey ? 'gemini-2.5-flash' : 'qwen2.5-coder:7b');

export interface LlmTurn {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

export async function* streamMentor(turn: LlmTurn): AsyncGenerator<string> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ model: MODEL, stream: true, max_tokens: 1024, messages: [{ role: 'system', content: turn.system }, ...turn.messages] }),
    });
  } catch {
    yield '[[LABEL:SOCRATIC]] (mentor offline — start Ollama, or set LLM_API_KEY) ';
    yield 'What is the very first thing you want to understand here, in your own words?';
    return;
  }
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
      } catch { /* keep-alive */ }
    }
  }
}

export const modelName = MODEL;
export const llmEnabled = true;   // local Ollama is the default endpoint
