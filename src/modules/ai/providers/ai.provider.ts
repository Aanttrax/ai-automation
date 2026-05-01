export interface AiProvider {
  classifyEmail(content: string): Promise<string>;
  generateReply(content: string): Promise<string>;
}
