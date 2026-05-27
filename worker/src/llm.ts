export interface LlmTurn {
  apiKey?: string;
  model: string;
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

// Marin (the SAIL mentor) runs on OpenRouter (OpenAI-compatible). Dev stub when no key.
export async function* streamMentor(turn: LlmTurn): AsyncGenerator<string> {
  if (!turn.apiKey) {
    yield '[[LABEL:SOCRATIC]] ';
    yield '(dev mode: set OPENROUTER_API_KEY secret to enable Marin) ';
    yield 'What is the very first thing you want to understand here, in your own words?';
    return;
  }
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${turn.apiKey}`,
      'HTTP-Referer': 'https://sail.pages.dev',
      'X-Title': 'SAIL',
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
