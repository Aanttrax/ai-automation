import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { AppLoggerModule } from './common/logger/logger.module';
import { AiModule } from './modules/ai/ai.module';
import { GmailModule } from './infrastructure/gmail/gmail.module';
import { AutomationModule } from './modules/automation/automation.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot(), AppConfigModule, AppLoggerModule, AiModule, GmailModule, AutomationModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
