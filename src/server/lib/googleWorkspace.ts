import { google } from 'googleapis';
import { getGoogleAuth } from './googleAuth.js';

export async function getDriveClient(accessToken?: string) {
  const auth = await getGoogleAuth(accessToken);
  if (!auth) throw new Error('Google Auth client not available. Configure in Settings or sign in.');
  return google.drive({ version: 'v3', auth });
}

export async function getCalendarClient(accessToken?: string) {
  const auth = await getGoogleAuth(accessToken);
  if (!auth) throw new Error('Google Auth client not available. Configure in Settings or sign in.');
  return google.calendar({ version: 'v3', auth });
}

export async function getDocsClient(accessToken?: string) {
  const auth = await getGoogleAuth(accessToken);
  if (!auth) throw new Error('Google Auth client not available. Configure in Settings or sign in.');
  return google.docs({ version: 'v1', auth });
}

// === DRIVE UTILITIES ===

export async function listDriveFiles(accessToken?: string, folderId?: string) {
  try {
    const drive = await getDriveClient(accessToken);
    const q = folderId ? `'${folderId}' in parents and trashed = false` : 'trashed = false';
    const response = await drive.files.list({
      q,
      fields: 'files(id, name, mimeType, webViewLink, iconLink, modifiedTime, size)',
      orderBy: 'folder,name',
      pageSize: 50,
    });
    return response.data.files || [];
  } catch (err: any) {
    console.error('Error listing drive files:', err);
    throw new Error('Failed to list Google Drive files: ' + err.message);
  }
}

export async function createDriveFolder(folderName: string, parentFolderId?: string, accessToken?: string) {
  try {
    const drive = await getDriveClient(accessToken);
    const fileMetadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
    }

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, webViewLink',
    });

    // Share folder with anyone with link as reader
    if (folder.data.id) {
      try {
        await drive.permissions.create({
          fileId: folder.data.id,
          requestBody: { role: 'reader', type: 'anyone' },
        });
      } catch (permErr) {
        console.warn('Could not set public view permission on folder (usually permissions restricted by workspace domain):', permErr);
      }
    }

    return folder.data;
  } catch (err: any) {
    console.error('Error creating folder:', err);
    throw new Error('Failed to create folder: ' + err.message);
  }
}

export async function syncDriveFolders(accessToken?: string) {
  try {
    // 1. Create main parent folder
    const masterFolder = await createDriveFolder('Binatech ERP Master', undefined, accessToken);
    const masterFolderId = masterFolder.id;

    if (!masterFolderId) throw new Error('Failed to create Master Folder ID');

    // 2. Create subfolders
    const subfolders = [
      'Marketing',
      'HR Documents',
      'NDT Reports',
      'Technical Dossier',
      'Equipment Certificates'
    ];

    const results = [];
    for (const folderName of subfolders) {
      const folder = await createDriveFolder(folderName, masterFolderId, accessToken);
      results.push({ name: folderName, id: folder.id, webViewLink: folder.webViewLink });
    }

    return {
      master: { id: masterFolderId, name: 'Binatech ERP Master', webViewLink: masterFolder.webViewLink },
      subfolders: results
    };
  } catch (err: any) {
    console.error('Error syncing folders:', err);
    throw new Error('Failed to synchronize workspace folders: ' + err.message);
  }
}

// === CALENDAR UTILITIES ===

export async function listCalendarEvents(accessToken?: string) {
  try {
    const calendar = await getCalendarClient(accessToken);
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 15,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return response.data.items || [];
  } catch (err: any) {
    console.error('Error listing calendar events:', err);
    throw new Error('Failed to retrieve calendar events: ' + err.message);
  }
}

export async function createCalendarEvent(eventData: { title: string, description: string, startTime: string, endTime: string }, accessToken?: string) {
  try {
    const calendar = await getCalendarClient(accessToken);
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime,
          timeZone: 'Asia/Ho_Chi_Minh',
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: 'Asia/Ho_Chi_Minh',
        },
        reminders: {
          useDefault: true,
        },
      },
    });
    return response.data;
  } catch (err: any) {
    console.error('Error creating calendar event:', err);
    throw new Error('Failed to create calendar event: ' + err.message);
  }
}

// === GOOGLE DOCS UTILITIES ===

export async function createGoogleDoc(title: string, content: string, accessToken?: string) {
  try {
    const drive = await getDriveClient(accessToken);
    
    // Create an empty Google Doc file in Google Drive
    const docFile = await drive.files.create({
      requestBody: {
        name: title,
        mimeType: 'application/vnd.google-apps.document',
      },
      fields: 'id, webViewLink',
    });

    const docId = docFile.data.id;
    if (!docId) throw new Error('Failed to create Google Doc file in Drive');

    // Share document
    try {
      await drive.permissions.create({
        fileId: docId,
        requestBody: { role: 'writer', type: 'anyone' },
      });
    } catch (permErr) {
      console.warn('Could not set permissions on doc:', permErr);
    }

    // Insert content using Docs API
    const docs = await getDocsClient(accessToken);
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content,
            }
          }
        ]
      }
    });

    return {
      id: docId,
      webViewLink: docFile.data.webViewLink
    };
  } catch (err: any) {
    console.error('Error creating Google Doc:', err);
    throw new Error('Failed to create Google Doc: ' + err.message);
  }
}
