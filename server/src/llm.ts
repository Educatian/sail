// Marin (the SAIL mentor) runs on OpenRouter (OpenAI-compatible). Dev stub when no key.
const MODEL = process.env.SAIL_MODEL ?? 'anthropic/claude-sonnet-4';
const apiKey = process.env.OPENROUTER_API_KEY;

export interface LlmTurn {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

export async function* streamMentor(turn: LlmTurn): AsyncGenerator<string> {
  if (!apiKey) {
    yield '[[LABEL:SOCRATIC]] ';
    yield '(dev mode: set OPENROUTER_API_KEY to enable Marin) ';
    yield 'What is the very first thing you want to understand here, in your own words?';
    return;
  }
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${apiKey}`, 'X-Title': 'SAIL' },
    body: JSON.stringify({ model: MODEL, stream: true, max_tokens: 1024, messages: [{ role: 'system', content: turn.system }, ...turn.messages] }),
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
      } catch { /* keep-alive */ }
    }
  }
}

export const modelName = MODEL;
export const llmEnabled = !!apiKey;
