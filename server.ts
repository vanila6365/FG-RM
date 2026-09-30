import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // API Proxy Route to Google Sheets Apps Script Web App
  // This bypasses browser CORS, multi-login account, and local network issues completely!
  app.post('/api/proxy-sheets', async (req, res) => {
    const { url, method, data } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'Missing URL parameter' });
    }

    try {
      const options: RequestInit = {
        method: method || 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (method === 'POST' && data) {
        options.body = JSON.stringify(data);
      }

      console.log(`[Proxy] Forwarding ${method || 'GET'} request to: ${url}`);
      const response = await fetch(url, options);
      
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        return res.json(json);
      } else {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          return res.json(json);
        } catch {
          // If response contains HTML login or error page, give descriptive error
          if (text.includes('<!DOCTYPE html>') || text.includes('<html') || text.includes('Google Accounts')) {
            if (text.includes('does not exist') || text.includes('file you have requested') || response.status === 404) {
              return res.status(404).json({
                success: false,
                message: 'ลิงก์เว็บแอปนี้ไม่มีอยู่จริงบน Google (Google 404: File not found) ลิงก์นี้อาจถูกลบไปแล้ว หรือตัวอักษรของลิงก์คัดลอกมาไม่ครบถ้วน กรุณาเปิด Google Sheets เพื่อสร้างการ Deploy (การทำให้ใช้งานได้) ตัวใหม่ แล้วคัดลอกลิงก์ที่ได้รับมาวางใหม่อีกครั้งค่ะ'
              });
            }
            return res.status(400).json({
              success: false,
              message: 'Google Apps Script returned an HTML page (likely a Google Account Login or Authorization requirement) instead of JSON data. Please verify your script deployment settings (Execute as: Me, Who has access: Anyone) or try redeploying.'
            });
          }
          return res.status(response.status).send(text);
        }
      }
    } catch (error: any) {
      console.error('[Proxy Error] Request failed:', error);
      return res.status(500).json({
        success: false,
        message: `Failed to fetch from Google Sheets: ${error.message}`
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    // Dev Mode: Mount Vite Dev Server Middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    
    app.use(vite.middlewares);
    
    // Serve index.html for any SPA routing
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await vite.transformIndexHtml(url, path.resolve(__dirname, 'index.html'));
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Production Mode: Serve static build from dist folder
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

createServer();
