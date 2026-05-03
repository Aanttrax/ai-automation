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
        if (!email?.id || !email?.content) {
          this.logger.warn('Invalid email skipped');
          continue;
        }
        const label = await this.aiService.classify(email.content);
        await this.gmailService.addLabel(email.id, label);

        if (label === 'AI/IMPORTANT' || label === 'AI/JOBS') {
          const reply = await this.aiService.reply(email.content);
          await this.gmailService.createDraft(email.from, email.subject, reply);
          await this.gmailService.addLabel(email.id, 'AI/REVIEW');
        }

        await this.gmailService.addLabel(email.id, 'AI/PROCESSED');
        this.logger.log({ emailId: email.id, label });
      }
    } catch (error) {
      this.logger.error('Scheduler failed', error);
    }
  }
}
