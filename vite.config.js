import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// ปลั๊กอินจัดการระบบอัปโหลดไฟล์จำลองบนฮาร์ดดิสก์เครื่องโลคอล
const uploadPlugin = () => ({
  name: 'upload-plugin',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/api/upload' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (!data.folder || !data.filename || !data.base64Data) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing required fields' }));
              return;
            }
            
            // แยกเนื้อหา base64 จาก prefix data URL
            const base64Content = data.base64Data.includes(';base64,') 
              ? data.base64Data.split(';base64,').pop() 
              : data.base64Data;
            const buffer = Buffer.from(base64Content, 'base64');
            
            // ที่อยู่ปลายทางในโฟลเดอร์ public/uploads/
            const targetDir = path.join(process.cwd(), 'public', 'uploads', data.folder);
            fs.mkdirSync(targetDir, { recursive: true });
            
            const targetPath = path.join(targetDir, data.filename);
            fs.writeFileSync(targetPath, buffer);
            
            const relativeUrl = `/uploads/${data.folder}/${data.filename}`;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ url: relativeUrl }));
          } catch (err) {
            console.error('Upload error in dev server:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });
      } else {
        next();
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), uploadPlugin()],
})

