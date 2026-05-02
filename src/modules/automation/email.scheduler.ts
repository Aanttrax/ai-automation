import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AiService } from '../ai/ai.service';
import { GmailService } from 'src/infrastructure/gmail/gmail.service';

@Injectable()
export class EmailScheduler {
  private readonly logger = new Logger(EmailScheduler.name);

  constructor(
    private readonly gmailService: GmailService,
    private readonly aiService: AiService,
  ) {}

  @Cron('*/2 * * * *') // cada 2 minutos
  async handleEmails() {
    this.logger.log('Starting email processing job');

    try {
      const emails = await this.gmailService.fetchUnreadEmails();

      this.logger.log(`Emails found: ${emails.length}`);

      for (const email of emails) {
        const category = await this.aiService.classify(email.content);

        this.logger.log({
          emailId: email.id,
          category,
        });

        // aquí luego agregamos reply automático
      }
    } catch (error) {
      this.logger.error('Scheduler failed', error);
    }
  }
}
