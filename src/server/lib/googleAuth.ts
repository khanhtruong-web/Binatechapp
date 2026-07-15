import { google } from 'googleapis';
import fs from 'fs';

/**
 * Pillar 1: Authentication & Google Cloud Setup
 * 
 * Securely loads the Service Account JSON from env or local configs.
 * Supports passing a user OAuth access token in the header as well.
 */

let serviceAuthClient: any = null;

export async function getGoogleAuth(accessToken?: string) {
  // If an explicit user accessToken is passed, initialize an OAuth2 client with it
  if (accessToken) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    return oauth2Client;
  }

  if (serviceAuthClient) return serviceAuthClient;

  let credentialsString = '';
  try {
    if (fs.existsSync('/tmp/server-config.json')) {
      const config = JSON.parse(fs.readFileSync('/tmp/server-config.json', 'utf8'));
      if (config.serviceAccountJson) {
        credentialsString = config.serviceAccountJson;
      }
    }
    if (!credentialsString && fs.existsSync('server-config.json')) {
      const config = JSON.parse(fs.readFileSync('server-config.json', 'utf8'));
      if (config.serviceAccountJson) {
        credentialsString = config.serviceAccountJson;
      }
    }
  } catch (e) {}

  if (!credentialsString) {
    credentialsString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
  }

  if (!credentialsString) {
    // If not configured, return null and let callers handle gracefully or fallback
    return null;
  }

  try {
    const credentials = JSON.parse(credentialsString);

    serviceAuthClient = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/calendar'
      ],
    });

    return serviceAuthClient;
  } catch (err) {
    console.error('Failed to initialize Service Account Auth:', err);
    return null;
  }
}

export function clearGoogleAuthCache() {
  serviceAuthClient = null;
}


