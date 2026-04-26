import type { DayState } from './types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function buildHistorySummary(history: DayState[]): string {
  if (history.length === 0) return 'No history available.';

  const lines = history.map(day => {
    const date = new Date(day.date);
    const dayName = DAY_NAMES[date.getDay()];
    const spoonsUsed = (day.totalSpoons || 0) - (day.remainingSpoons || 0);
    const crashed = (day.remainingSpoons || 0) < 0;
    const borrowed = day.borrowedFromTomorrow > 0 ? ` (borrowed ${day.borrowedFromTomorrow} from tomorrow)` : '';
    const activityNames = day.activities
      .filter(a => a.completed)
      .map(a => a.name)
      .slice(0, 5)
      .join(', ');

    return `${day.date} (${dayName}): ${spoonsUsed} spoons used, ${day.remainingSpoons} remaining${crashed ? ' [CRASHED]' : ''}${borrowed}. Activities: ${activityNames || 'none logged'}.`;
  });

  return lines.join('\n');
}

export async function analyzePatterns(history: DayState[]): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('NO_API_KEY');
  }

  if (history.length < 3) {
    throw new Error('NOT_ENOUGH_DATA');
  }

  const summary = buildHistorySummary(history);

  const systemPrompt = `You are a compassionate energy coach for people with chronic illness who use the spoon theory to manage their daily energy. 
Analyze the user's spoon usage history and identify meaningful patterns. 
Be warm, encouraging, and specific. Focus on:
- Days of the week that tend to be high-drain or recovery days
- Sequences of days (e.g. "after a big day, you often crash")
- Activities that frequently appear on high-drain days
- Positive patterns worth celebrating
Keep your response concise (3-5 bullet points). Use plain language, no jargon. 
Write in English. Start each bullet with an emoji.`;

  const userMessage = `Here is my spoon usage history (most recent first):\n\n${summary}\n\nWhat patterns do you notice?`;

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 400,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = (error as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[];
  };

  return data.choices[0]?.message?.content?.trim() || 'No insights returned.';
}
