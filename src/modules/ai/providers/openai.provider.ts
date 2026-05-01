import OpenAI from 'openai';
import { AiProvider } from './ai.provider';

export class OpenAiProvider implements AiProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async classifyEmail(content: string): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'user',
          content: `
Classify this email into:
work, support, spam, interview

Email:
${content}
          `,
        },
      ],
    });

    return res.choices[0].message.content ?? '';
  }

  async generateReply(content: string): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'user',
          content: `
Reply professionally and concisely.

Email:
${content}
          `,
        },
      ],
    });

    return res.choices[0].message.content ?? '';
  }
}
