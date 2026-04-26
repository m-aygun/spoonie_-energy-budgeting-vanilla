import type { DayState } from './types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface RecoveryActivitySuggestion {
  name: string;
  suggestedSpoons: number;
  reason?: string;
}

interface RecoveryApiResponse {
  suggestions: RecoveryActivitySuggestion[];
}

interface RecoveryFallbackItem {
  name: string;
  suggestedSpoons: number;
  keywords: string[];
}

const LOCAL_RECOVERY_FALLBACKS: RecoveryFallbackItem[] = [
  { name: 'Powernap (20 min)', suggestedSpoons: 3, keywords: ['sleep', 'sleeping', 'nap', 'sove', 'lur', 'hvile'] },
  { name: 'Guidet meditation', suggestedSpoons: 2, keywords: ['meditation', 'mindfulness', 'rolig', 'ro'] },
  { name: 'Vejrtraekningsoevelse (5 min)', suggestedSpoons: 1, keywords: ['breath', 'breathing', 'vejrtraekning', 'calm'] },
  { name: 'Lyt til rolig musik', suggestedSpoons: 2, keywords: ['music', 'musik', 'listen', 'lytte'] },
  { name: 'Lig i et moerkt rum', suggestedSpoons: 2, keywords: ['rest', 'quiet', 'moerkt', 'pause'] },
  { name: 'Drik vand og spis en snack', suggestedSpoons: 1, keywords: ['water', 'drink', 'eat', 'vand', 'snack'] },
  { name: 'Kort gaatur', suggestedSpoons: 2, keywords: ['walk', 'outside', 'gaa', 'tur'] },
  { name: 'Varmt bad', suggestedSpoons: 2, keywords: ['bath', 'shower', 'warm', 'bad'] },
];

const clampSpoons = (value: number) => {
  if (Number.isNaN(value)) return 2;
  return Math.max(1, Math.min(5, Math.round(value)));
};

const normalizeName = (name: string) => name.trim().toLowerCase();

export function fallbackRecoverySuggestionsFromInput(
  rawInput: string,
  existingNames: string[],
  count = 6
): RecoveryActivitySuggestion[] {
  const query = normalizeName(rawInput);
  if (query.length < 2) {
    return [];
  }

  const existing = new Set(existingNames.map(normalizeName));

  return LOCAL_RECOVERY_FALLBACKS
    .map(item => {
      const name = normalizeName(item.name);
      let score = 0;
      if (name.includes(query) || query.includes(name)) score = 80;
      else if (item.keywords.some(keyword => normalizeName(keyword) === query)) score = 70;
      else if (item.keywords.some(keyword => normalizeName(keyword).startsWith(query))) score = 60;
      else if (item.keywords.some(keyword => normalizeName(keyword).includes(query) || query.includes(normalizeName(keyword)))) score = 40;

      return { item, score };
    })
    .filter(entry => entry.score > 0)
    .filter(entry => !existing.has(normalizeName(entry.item.name)))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(entry => ({
      name: entry.item.name,
      suggestedSpoons: entry.item.suggestedSpoons,
      reason: 'Lokalt forslag (fallback)',
    }));
}

const summarizeHistory = (history: DayState[]) => {
  if (history.length === 0) {
    return 'Ingen historik endnu.';
  }

  return history
    .slice(0, 10)
    .map(day => {
      const recoveryDone = day.activities
        .filter(activity => activity.completed && activity.category === 'recovery')
        .map(activity => `${activity.name} (+${activity.estimatedSpoons || 0})`)
        .join(', ');

      return `${day.date}: remaining=${day.remainingSpoons ?? 'ukendt'}, recovery=[${recoveryDone || 'ingen'}]`;
    })
    .join('\n');
};

const parseJsonPayload = (raw: string): RecoveryApiResponse | null => {
  const trimmed = raw.trim();

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i);
  const payload = fenced ? fenced[1] : trimmed;

  try {
    return JSON.parse(payload) as RecoveryApiResponse;
  } catch {
    return null;
  }
};

export async function generateRecoveryActivitySuggestions(
  history: DayState[],
  existingNames: string[],
  count = 4
): Promise<RecoveryActivitySuggestion[]> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('NO_API_KEY');
  }

  const historySummary = summarizeHistory(history);
  const existing = existingNames.join(', ') || 'ingen';

  const systemPrompt = [
    'Du er en empatisk energi-coach i en Spoonie app.',
    'Foreslå recovery-aktiviteter som hjælper brugeren med at få energi tilbage.',
    'Returnér KUN gyldig JSON uden markdown.',
    'Brug formatet: {"suggestions":[{"name":"...","suggestedSpoons":2,"reason":"..."}]}.',
    'suggestedSpoons skal være heltal mellem 1 og 5.',
    'Aktiviteter må ikke være dubletter af eksisterende navne.',
    `Returnér præcis ${count} forslag.`,
  ].join(' ');

  const userPrompt = [
    'Eksisterende recovery-forslag:',
    existing,
    '',
    'Brugerens historik (seneste dage):',
    historySummary,
    '',
    'Foreslå nye recovery-aktiviteter på dansk og et realistisk spoon-gain.',
  ].join('\n');

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      max_tokens: 350,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = (error as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content || '';
  const parsed = parseJsonPayload(content);

  if (!parsed || !Array.isArray(parsed.suggestions)) {
    throw new Error('INVALID_RESPONSE');
  }

  const existingSet = new Set(existingNames.map(normalizeName));
  const seen = new Set<string>();

  return parsed.suggestions
    .map(item => ({
      name: (item.name || '').trim(),
      suggestedSpoons: clampSpoons(Number(item.suggestedSpoons)),
      reason: item.reason?.trim(),
    }))
    .filter(item => item.name.length > 1)
    .filter(item => {
      const normalized = normalizeName(item.name);
      if (existingSet.has(normalized) || seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    })
    .slice(0, count);
}

export async function suggestRecoveryFromInput(
  rawInput: string,
  history: DayState[],
  existingNames: string[],
  count = 6
): Promise<RecoveryActivitySuggestion[]> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('NO_API_KEY');
  }

  const query = rawInput.trim();
  if (query.length < 2) {
    return [];
  }

  const historySummary = summarizeHistory(history);
  const existing = existingNames.join(', ') || 'ingen';

  const systemPrompt = [
    'Du er en empatisk energi-coach i en Spoonie app.',
    'Brug brugerens tekstinput til at foreslå recovery-aktiviteter, der matcher intentionen.',
    'Returnér KUN gyldig JSON uden markdown.',
    'Brug formatet: {"suggestions":[{"name":"...","suggestedSpoons":2,"reason":"..."}]}.',
    'suggestedSpoons skal være heltal mellem 1 og 5.',
    'Aktiviteter må ikke være dubletter af eksisterende navne.',
    `Returnér præcis ${count} forslag.`,
  ].join(' ');

  const userPrompt = [
    `Brugerens input: "${query}"`,
    '',
    'Eksisterende recovery-forslag:',
    existing,
    '',
    'Brugerens historik (seneste dage):',
    historySummary,
    '',
    'Foreslå recovery-aktiviteter på dansk der matcher inputtet, og angiv realistisk spoon-gain.',
  ].join('\n');

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      max_tokens: 350,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = (error as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content || '';
  const parsed = parseJsonPayload(content);

  if (!parsed || !Array.isArray(parsed.suggestions)) {
    throw new Error('INVALID_RESPONSE');
  }

  const existingSet = new Set(existingNames.map(normalizeName));
  const seen = new Set<string>();

  return parsed.suggestions
    .map(item => ({
      name: (item.name || '').trim(),
      suggestedSpoons: clampSpoons(Number(item.suggestedSpoons)),
      reason: item.reason?.trim(),
    }))
    .filter(item => item.name.length > 1)
    .filter(item => {
      const normalized = normalizeName(item.name);
      if (existingSet.has(normalized) || seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    })
    .slice(0, count);
}
