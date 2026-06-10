import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // บังคับสิทธิ์ให้เฉพาะการทำ POST อัปโหลด
  if (req.method === 'POST') {
    try {
      const { folder, filename, base64Data } = req.body;
      if (!folder || !filename || !base64Data) {
        return res.status(400).json({ error: 'Missing required fields' });
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
