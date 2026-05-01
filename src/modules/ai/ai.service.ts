import { Inject, Injectable } from '@nestjs/common';
import { AiProvider } from './providers/ai.provider';

@Injectable()
export class AiService {
  constructor(
    @Inject('AI_PROVIDER')
    private readonly aiProvider: AiProvider,
  ) {}

  async classify(content: string) {
    return this.aiProvider.classifyEmail(content);
  }

  async reply(content: string) {
    return this.aiProvider.generateReply(content);
  }
}
