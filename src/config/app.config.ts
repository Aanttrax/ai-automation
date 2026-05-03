export default () => ({
  openaiApiKey: process.env.OPENAI_API_KEY,
  gmailClientId: process.env.GOOGLE_CLIENT_ID,
  gmailClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  gmailRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
});
