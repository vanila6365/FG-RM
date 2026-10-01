export default async function handler(req: any, res: any) {
  // CORS configuration for Vercel Serverless Function
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed. Use POST.' });
  }

  const { url, method, data } = req.body || {};
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

    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = await response.json();
      return res.status(200).json(json);
    } else {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return res.status(200).json(json);
      } catch {
        if (text.includes('does not exist') || text.includes('file you have requested') || response.status === 404) {
          return res.status(404).json({
            success: false,
            message: 'ลิงก์เว็บแอปนี้ไม่มีอยู่จริงบน Google (Google 404: File not found) ลิงก์นี้ถูกลบไปแล้วหรือยังไม่ได้ Deploy ให้สร้างการ Deploy ใหม่ใน Google Sheets แล้วนำลิงก์ใหม่มาวางค่ะ'
          });
        }
        if (text.includes('<!DOCTYPE html>') || text.includes('<html') || text.includes('Google Accounts')) {
          return res.status(400).json({
            success: false,
            message: 'Google Apps Script ส่งกลับหน้า HTML เข้าสู่ระบบ กรุณาตรวจสอบการตั้งค่า Deploy (Execute as: Me, Who has access: Anyone)'
          });
        }
        return res.status(response.status).send(text);
      }
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch from Google Sheets: ${error.message}`
    });
  }
}
