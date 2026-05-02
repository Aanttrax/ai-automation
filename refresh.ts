import { google } from 'googleapis';
import * as readline from 'readline';

const CLIENT_ID = '';
const CLIENT_SECRET = '';
const REDIRECT_URI = 'http://localhost';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent',
});

console.log('\n👉 Abre esta URL en tu navegador:\n');
console.log(url);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('\n👉 Pega el código aquí: ', async code => {
  try {
    const { tokens } = await oauth2Client.getToken(code);

    console.log('\n🔥 TOKENS:\n');
    console.log(tokens);

    console.log('\n👉 ESTE ES TU REFRESH TOKEN:\n');
    console.log(tokens.refresh_token);
  } catch (error) {
    console.error('Error obteniendo token:', error);
  } finally {
    rl.close();
  }
});
