import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // บังคับสิทธิ์ให้เฉพาะการทำ POST อัปโหลด
  if (req.method === 'POST') {
    try {
      const { folder, filename, base64Data, gasUrl, parentFolderId } = req.body;
      if (!folder || !filename || !base64Data) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // หากมีการตั้งค่า Google Apps Script Web App (gasUrl) ให้ส่งไฟล์ไปอัปโหลดที่ Google Drive
      if (gasUrl) {
        try {
          const response = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'upload_file',
              parentFolderId,
              folder,
              filename,
              base64Data
            })
          });
          if (response.ok) {
            const result = await response.json();
            if (result.status === 'success' && result.url) {
              return res.status(200).json({ url: result.url });
            } else {
              console.error('GAS file upload returned error:', result.message);
            }
          } else {
            console.error('GAS Web App response was not ok:', response.statusText);
          }
        } catch (gasErr) {
          console.error('Failed to upload to Google Drive via GAS, falling back to server storage:', gasErr);
        }
      }
      
      const base64Content = base64Data.includes(';base64,') 
        ? base64Data.split(';base64,').pop() 
        : base64Data;
      const buffer = Buffer.from(base64Content, 'base64');
      
      const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL;
      const targetDir = isLocal 
        ? path.join(process.cwd(), 'public', 'uploads', folder)
        : path.join('/tmp', 'uploads', folder);
        
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, filename), buffer);
      
      const relativeUrl = `/uploads/${folder}/${filename}`;
      return res.status(200).json({ url: relativeUrl });
    } catch (err) {
      console.error('Upload API serverless function error:', err);
      return res.status(500).json({ error: 'Server error during upload' });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
