import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { AiProvider } from './ai.provider';
import { Logger } from '@nestjs/common';
import { LABELS, LabelType } from 'src/common/constants/labels';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenAiProvider implements AiProvider {
  private client: OpenAI;

  constructor(private config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.get<string>('openaiApiKey'),
    });
  }
  private readonly logger = new Logger(OpenAiProvider.name);
  private timeout(ms: number) {
    return new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));
  }

  async retry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) throw error;

      this.logger.warn('Retrying AI call...');
      await new Promise(r => setTimeout(r, 500));

      return this.retry(fn, retries - 1);
    }
  }

  async classifyEmail(content: string): Promise<LabelType> {
    return this.retry(async () => {
      try {
        const res: any = await Promise.race([
          this.client.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
              {
                role: 'system',
                content: `
You are an email classifier.

You MUST choose ONLY one label from this list:

${LABELS.join('\n')}

Rules:
- Return ONLY the label
- No explanations
- No extra text
      `,
              },
              {
                role: 'user',
                content: content,
              },
            ],
          }),
          this.timeout(5000),
        ]);

        const label = res?.choices?.[0]?.message?.content.trim() as LabelType;

        if (!LABELS.includes(label)) {
          return 'AI/OTHER';
        }

        return label;
      } catch (error) {
        this.logger.error({ error, content }, 'Error classifying email');
        throw new Error('AI classification failed');
      }
    });
  }

  async generateReply(content: string): Promise<string> {
    return this.retry(async () => {
      try {
        const res: any = await Promise.race([
          this.client.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
              {
                role: 'system',
                content: `
You are a professional assistant.

Write a concise, polite and clear reply.

Rules:
- Be professional
- Be short
- No unnecessary text
        `,
              },
              {
                role: 'user',
                content,
              },
            ],
          }),
          this.timeout(5000),
        ]);

        const result = res?.choices?.[0]?.message?.content;

        if (!result) {
          throw new Error('Empty response');
        }

        return result;
      } catch (error) {
        this.logger.error({ error, content }, 'AI reply failed');
        throw new Error('AI reply failed');
      }
    });
  }
}
