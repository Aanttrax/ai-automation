import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { Logger } from '@nestjs/common';
import addressparser from 'addressparser';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GmailService {
  private gmail;

  constructor(private config: ConfigService) {
    const clientId = this.config.get<string>('gmailClientId');
    const clientSecret = this.config.get<string>('gmailClientSecret');
    const refreshToken = this.config.get<string>('gmailRefreshToken');

    const auth = new google.auth.OAuth2(clientId, clientSecret);

    auth.setCredentials({
      refresh_token: refreshToken,
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
          const raw = await this.getEmailContent(msg.id);

          if (raw) {
            emails.push({
              id: msg.id,
              content: raw.content,
              from: raw.from,
              subject: raw.subject,
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
        q: 'is:unread -label:AI/PROCESSED -label:AI/REVIEW',
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

      const payload = res.data.payload;
      const headers = payload?.headers ?? [];

      const getHeader = (name: string) => headers.find(h => h.name === name)?.value ?? '';

      const fromRaw = getHeader('From');
      const subject = getHeader('Subject');

      const parsed = addressparser(fromRaw);
      const from = parsed[0]?.address ?? '';

      const bodyData = payload?.parts?.[0]?.body?.data || payload?.body?.data || '';

      if (!bodyData) {
        this.logger.warn({ messageId }, 'Empty email body');
        return '';
      }

      const content = Buffer.from(bodyData, 'base64').toString('utf-8');
      return { content, from, subject };
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

  async createDraft(to: string, subject: string, body: string) {
    try {
      const message = [`To: ${to}`, `Subject: Re: ${subject}`, '', body].join('\n');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await this.gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: encodedMessage,
          },
        },
      });

      this.logger.log({ draftId: res.data.id }, 'Draft created');

      return res.data;
    } catch (error) {
      this.logger.error({ error }, 'Failed to create draft');
      throw error;
    }
  }
}
