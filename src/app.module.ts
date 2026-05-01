import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { AppLoggerModule } from './common/logger/logger.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [AppConfigModule, AppLoggerModule, AiModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
