// Marin (the SAIL mentor). Defaults to LOCAL Ollama (Qwen) via the OpenAI-compatible API so it works
// with no API key and stays connected across restarts as long as Ollama is running. Set OPENROUTER_API_KEY
// to use OpenRouter instead, or LLM_BASE_URL / SAIL_MODEL to point elsewhere.
const useOpenRouter = !!process.env.OPENROUTER_API_KEY;
const BASE = process.env.LLM_BASE_URL ?? (useOpenRouter ? 'https://openrouter.ai/api/v1' : 'http://localhost:11434/v1');
const MODEL = process.env.SAIL_MODEL ?? (useOpenRouter ? 'anthropic/claude-sonnet-4' : 'qwen2.5-coder:7b');
const apiKey = process.env.OPENROUTER_API_KEY;

export interface LlmTurn {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

export async function* streamMentor(turn: LlmTurn): AsyncGenerator<string> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}`, 'X-Title': 'SAIL' } : {}) },
      body: JSON.stringify({ model: MODEL, stream: true, max_tokens: 1024, messages: [{ role: 'system', content: turn.system }, ...turn.messages] }),
    });
  } catch {
    yield '[[LABEL:SOCRATIC]] (mentor offline — start Ollama, or set OPENROUTER_API_KEY) ';
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
