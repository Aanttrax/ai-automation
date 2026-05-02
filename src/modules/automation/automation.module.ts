import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { GmailModule } from 'src/infrastructure/gmail/gmail.module';
import { EmailScheduler } from './email.scheduler';

@Module({
  imports: [GmailModule, AiModule],
  providers: [EmailScheduler],
})
export class AutomationModule {}
