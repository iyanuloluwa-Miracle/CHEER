import { getServerEnv } from '../../lib/env';

export type AiAssistKind = 'bio' | 'thank_you';

export interface BioAssistInput {
  displayName: string;
  draft: string;
  niche?: string;
}

export interface ThankYouAssistInput {
  creatorDisplayName: string;
  supporterName: string | null;
  isAnonymous: boolean;
  tipMessage: string | null;
  amount: string;
  currency: string;
  supportMessage?: string | null;
}

/**
 * Cencori AI gateway (OpenAI-compatible) with deterministic local fallback
 * so hackathon demos work without CENCORI_API_KEY.
 */
export class CencoriAiService {
  get isConfigured(): boolean {
    return Boolean(getServerEnv().CENCORI_API_KEY?.trim());
  }

  async polishBio(input: BioAssistInput): Promise<{
    bio: string;
    supportCta: string;
    source: 'cencori' | 'fallback';
  }> {
    const prompt = [
      'You help African builders write TippyMe creator bios.',
      'Return JSON only: {"bio":"...","supportCta":"..."}',
      'bio: max 220 characters, warm, specific, no hashtags, no emojis.',
      'supportCta: one short thank-you / tip line max 120 characters.',
      `Display name: ${input.displayName}`,
      input.niche ? `Niche: ${input.niche}` : '',
      `Draft: ${input.draft || '(none — invent a tasteful builder bio)'}`,
    ]
      .filter(Boolean)
      .join('\n');

    const raw = await this.chat(prompt);
    if (raw) {
      const parsed = this.tryParseJson(raw);
      if (parsed?.bio) {
        return {
          bio: String(parsed.bio).slice(0, 500),
          supportCta: String(
            parsed.supportCta ||
              'Thanks for supporting my work — every tip helps.',
          ).slice(0, 500),
          source: 'cencori',
        };
      }
    }

    return {
      ...this.fallbackBio(input),
      source: 'fallback',
    };
  }

  async thankYouNote(input: ThankYouAssistInput): Promise<{
    message: string;
    source: 'cencori' | 'fallback';
  }> {
    const who = input.isAnonymous
      ? 'an anonymous supporter'
      : input.supporterName || 'a supporter';
    const prompt = [
      'Write a short personalized thank-you from a creator who just received a tip on TippyMe.',
      'Return plain text only (no JSON, no quotes). Max 2 sentences. Warm, specific, no emojis.',
      `Creator: ${input.creatorDisplayName}`,
      `Supporter: ${who}`,
      `Amount: ${input.amount} ${input.currency}`,
      input.tipMessage ? `Their note: ${input.tipMessage}` : 'No note left.',
      input.supportMessage
        ? `Creator default support message: ${input.supportMessage}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const raw = await this.chat(prompt);
    if (raw?.trim()) {
      return { message: raw.trim().slice(0, 500), source: 'cencori' };
    }
    return { message: this.fallbackThankYou(input), source: 'fallback' };
  }

  private async chat(userPrompt: string): Promise<string | null> {
    const env = getServerEnv();
    const key = env.CENCORI_API_KEY?.trim();
    if (!key) return null;

    const base =
      env.CENCORI_API_BASE_URL?.replace(/\/$/, '') ||
      'https://api.cencori.com/v1';
    const model = env.CENCORI_MODEL?.trim() || 'gpt-4o-mini';

    try {
      const response = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          max_tokens: 280,
          messages: [
            {
              role: 'system',
              content:
                'You are TippyMe copy assist for African builders. Be concise and human.',
            },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: AbortSignal.timeout(12_000),
      });

      if (!response.ok) {
        console.warn(`Cencori chat failed status=${response.status}`);
        return null;
      }

      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        content?: string;
      };
      const content =
        body.choices?.[0]?.message?.content ??
        (typeof body.content === 'string' ? body.content : null);
      return content?.trim() || null;
    } catch (err) {
      console.warn(
        `Cencori chat error: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      return null;
    }
  }

  private tryParseJson(
    raw: string,
  ): { bio?: string; supportCta?: string } | null {
    try {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start < 0 || end <= start) return null;
      return JSON.parse(raw.slice(start, end + 1)) as {
        bio?: string;
        supportCta?: string;
      };
    } catch {
      return null;
    }
  }

  private fallbackBio(input: BioAssistInput): {
    bio: string;
    supportCta: string;
  } {
    const name = input.displayName.trim() || 'this creator';
    const draft = input.draft.trim();
    const niche = input.niche?.trim();
    const bio = draft
      ? draft.slice(0, 220)
      : niche
        ? `${name} builds in ${niche} — shipping in public and sharing the journey.`
        : `${name} is building in public. Tips keep the work going.`;
    return {
      bio,
      supportCta: `Thanks for supporting ${name} — every tip helps.`,
    };
  }

  private fallbackThankYou(input: ThankYouAssistInput): string {
    const who = input.isAnonymous
      ? 'friend'
      : input.supporterName?.trim() || 'friend';
    if (input.tipMessage?.trim()) {
      return `Thank you, ${who} — your note meant a lot, and your ${input.amount} ${input.currency} tip helps ${input.creatorDisplayName} keep building.`;
    }
    return `Thank you, ${who}! Your ${input.amount} ${input.currency} tip helps ${input.creatorDisplayName} keep building.`;
  }
}
