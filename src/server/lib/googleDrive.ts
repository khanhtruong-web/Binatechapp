import { google } from 'googleapis';
import { getGoogleAuth } from './googleAuth.js';
import stream from 'stream';

export async function getDriveClient() {
  const auth = await getGoogleAuth();
  return google.drive({ version: 'v3', auth });
}

export async function createFolder(folderName: string, parentFolderId?: string) {
  const drive = await getDriveClient();
  const fileMetadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    fileMetadata.parents = [parentFolderId];
  }
  
  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, webViewLink',
  });
  
  // Set permissions for the folder
  if (folder.data.id) {
    await drive.permissions.create({
      fileId: folder.data.id,
      requestBody: { role: 'reader', type: 'anyone' }
    });
  }
  return folder.data;
}

export async function copyFile(sourceFileId: string, newFileName: string, parentFolderId: string) {
  const drive = await getDriveClient();
  const file = await drive.files.copy({
    fileId: sourceFileId,
    requestBody: {
      name: newFileName,
      parents: [parentFolderId],
    },
    fields: 'id, webViewLink',
  });
  return file.data;
}

export async function uploadToDrive(buffer: Buffer, fileName: string, mimeType: string, folderId: string) {
  const drive = await getDriveClient();

  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);

  // 1. Upload File
  const fileMetadata = {
    name: fileName,
    parents: folderId === 'ROOT' ? [] : [folderId] // Specific Google Drive Folder ID
  };
  const media = {
    mimeType: mimeType,
    body: bufferStream
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, webViewLink, webContentLink',
  });

  const fileId = file.data.id;

  // 2. Automatically set permissions to "Anyone with the link can view"
  if (fileId) {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      }
    });
  }

  // 3. Return the preview and download links
  return {
    id: fileId,
    webViewLink: file.data.webViewLink,
    webContentLink: file.data.webContentLink
  };
}
