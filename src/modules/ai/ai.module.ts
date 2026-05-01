import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { OpenAiProvider } from './providers/openai.provider';

@Module({
  providers: [
    AiService,
    {
      provide: 'AI_PROVIDER',
      useClass: OpenAiProvider,
    },
  ],
  exports: [AiService],
})
export class AiModule {}
