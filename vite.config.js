import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// ปลั๊กอินจัดการระบบอัปโหลดไฟล์จำลองบนฮาร์ดดิสก์เครื่องโลคอล
const uploadPlugin = () => ({
  name: 'upload-plugin',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
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
      } else if (req.url && req.url.startsWith('/api/line-richmenu')) {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', async () => {
          try {
            const urlObj = new URL(req.url, 'http://localhost');
            const query = Object.fromEntries(urlObj.searchParams.entries());
            let parsedBody = {};
            if (body) {
              try { parsedBody = JSON.parse(body); } catch {}
            }
            const mockReq = { query, body: parsedBody, method: req.method, url: req.url };
            const mockRes = {
              status(code) { res.statusCode = code; return this; },
              json(payload) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(payload));
                return this;
              }
            };
            const { default: handler } = await import('./api/line-richmenu.js');
            await handler(mockReq, mockRes);
          } catch (err) {
            console.error('Error in /api/line-richmenu dev middleware:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else if (req.url && req.url.startsWith('/api/call')) {
        try {
          const urlObj = new URL(req.url, 'http://localhost');
          const query = Object.fromEntries(urlObj.searchParams.entries());
          const mockReq = { query, method: req.method, url: req.url };
          const mockRes = {
            status(code) { res.statusCode = code; return this; },
            setHeader(name, value) { res.setHeader(name, value); return this; },
            send(html) { res.end(html); return this; },
            end(html) { res.end(html); return this; }
          };
          const { default: handler } = await import('./api/call.js');
          await handler(mockReq, mockRes);
        } catch (err) {
          console.error('Error in /api/call dev middleware:', err);
          res.statusCode = 500;
          res.end(err.message);
        }
      } else if (req.url && req.url.startsWith('/api/link')) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const urlObj = new URL(req.url, 'http://localhost');
            const query = Object.fromEntries(urlObj.searchParams.entries());
            let parsedBody = {};
            if (body) {
              try { parsedBody = JSON.parse(body); } catch {}
            }
            const mockReq = { query, body: parsedBody, method: req.method, url: req.url, headers: req.headers };
            const mockRes = {
              status(code) { res.statusCode = code; return this; },
              setHeader(name, value) { res.setHeader(name, value); return this; },
              json(payload) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(payload));
                return this;
              },
              end(data) { res.end(data); return this; }
            };
            const { default: handler } = await import('./api/link.js');
            await handler(mockReq, mockRes);
          } catch (err) {
            console.error('Error in /api/link dev middleware:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
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

