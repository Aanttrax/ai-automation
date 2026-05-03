import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { Logger } from '@nestjs/common';

@Injectable()
export class GmailService {
  private gmail;

  constructor() {
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    this.gmail = google.gmail({ version: 'v1', auth });
  }

  private labelCache: Record<string, string> = {};
  private readonly logger = new Logger(GmailService.name);

  async fetchUnreadEmails() {
    try {
      const messages = await this.getUnreadEmails();

      const emails = [];

      for (const msg of messages) {
        if (!msg.id) {
          this.logger.warn({ msg }, 'Message without ID, skipping');
          continue;
        }
        try {
          const content = await this.getEmailContent(msg.id);

          if (content) {
            emails.push({
              id: msg.id,
              content,
            });
          }
        } catch (error) {
          this.logger.warn({ msg }, 'Skipping failed email');
          this.logger.error({ error });
        }
      }

      this.logger.log({ count: emails.length }, 'Emails fetched');

      return emails;
    } catch (error) {
      this.logger.error({ error }, 'Critical Gmail failure');
      throw error;
    }
  }
  async getUnreadEmails() {
    try {
      this.logger.log('Fetching unread emails');

      const res = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread -label:AI/PROCESSED',
        maxResults: 5,
      });

      return res.data.messages || [];
    } catch (error) {
      this.logger.error({ error }, 'Failed to fetch unread emails');
      throw new Error('Gmail fetch failed');
    }
  }

  async getEmailContent(messageId: string) {
    try {
      this.logger.log({ messageId }, 'Fetching email content');

      const res = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
      });

      const body = res.data.payload?.body?.data;

      if (!body) {
        this.logger.warn({ messageId }, 'Empty email body');
        return '';
      }

      return Buffer.from(body, 'base64').toString('utf-8');
    } catch (error) {
      this.logger.error({ error, messageId }, 'Failed to fetch email content');
      return '';
    }
  }

  async addLabel(messageId: string, label: string) {
    try {
      const labelId = await this.resolveLabelId(label);
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [labelId],
        },
      });

      this.logger.log({ messageId, label }, 'Label applied');
    } catch (error) {
      this.logger.error({ messageId, label, error: error?.message }, 'Failed to apply label');
      throw error;
    }
  }

  async getLabels(): Promise<Record<string, string>> {
    try {
      const res = await this.gmail.users.labels.list({
        userId: 'me',
      });

      const labels = res.data.labels ?? [];
      const map: Record<string, string> = {};

      for (const label of labels) {
        if (label.name && label.id) {
          map[label.name] = label.id;
        }
      }

      this.logger.log({ count: labels.length }, 'Labels fetched');

      return map;
    } catch (error) {
      this.logger.error({ error }, 'Failed to fetch labels');
      throw error;
    }
  }

  async createLabel(name: string): Promise<string> {
    try {
      const res = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
      });

      const id = res.data.id!;

      this.logger.log({ name, id }, 'Label created');

      return id;
    } catch (error) {
      this.logger.error({ name, error }, 'Failed to create label');
      throw error;
    }
  }

  async resolveLabelId(labelName: string): Promise<string> {
    if (this.labelCache[labelName]) {
      return this.labelCache[labelName];
    }

    const labels = await this.getLabels();

    if (labels[labelName]) {
      this.labelCache = labels;
      return labels[labelName];
    }

    const newId = await this.createLabel(labelName);

    this.labelCache[labelName] = newId;

    return newId;
  }
}
