import express from 'express';
import path from 'path';
import { google } from 'googleapis';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

const getOAuth2Client = (req?: express.Request) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET;
  
  let appUrl = process.env.APP_URL;
  if (!appUrl && req) {
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    if (host) {
      appUrl = `${protocol}://${host}`;
    }
  }

  // Remove trailing slash to prevent redirect_uri_mismatch
  appUrl = appUrl?.replace(/\/$/, '');

  if (!clientId || !clientSecret || !appUrl) {
    throw new Error('OAuth configuration missing');
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${appUrl}/api/oauth/callback`
  );
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || !!process.env.VERCEL,
  sameSite: 'lax' as const,
  path: '/'
};

app.get('/api/auth/url', (req, res) => {
  try {
    const oauth2Client = getOAuth2Client(req);
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/spreadsheets'],
      prompt: 'consent'
    });
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- ۱. این روت جدید را دقیقاً بالای app.get('/api/oauth/callback') اضافه کنید ---
app.post('/api/auth/set-cookie', (req, res) => {
  const tokens = req.body.tokens;
  res.cookie('auth_token', JSON.stringify(tokens), {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
  res.json({ success: true });
});

app.get('/api/oauth/callback', async (req, res) => {
  const code = req.query.code as string;
  try {
    const oauth2Client = getOAuth2Client(req);
    const { tokens } = await oauth2Client.getToken(code);
    
    if (tokens.id_token) {
      delete tokens.id_token;
    }
    
    // ارسال یک صفحه لودینگ که کوکی را از داخل خود مرورگر (برای دور زدن اپل) ذخیره میکند
    res.status(200).send(`
      <html dir="rtl">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta charset="utf-8">
          <title>در حال ورود...</title>
          <style>
            body { font-family: Tahoma, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f8fafc; color: #334155; margin: 0; }
            .loader { border: 4px solid #e2e8f0; border-top: 4px solid #2563eb; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 16px; margin-left: auto; margin-right: auto;}
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div style="text-align: center;">
            <div class="loader"></div>
            <h3>تایید نهایی امنیتی...</h3>
            <p>لطفاً چند لحظه صبر کنید</p>
          </div>
          <script>
            // ارسال توکن به سرور خودمان با ریکوئست داخلی تا آیفون کوکی را مسدود نکند
            fetch('/api/auth/set-cookie', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tokens: ${JSON.stringify(tokens)} })
            }).then(function() {
              window.location.href = '/'; // بازگشت به نرمافزار
            }).catch(function(err) {
              document.body.innerHTML = '<h3 style="color:red;">خطا در ارتباط. لطفا صفحه را رفرش کنید.</h3>';
            });
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed: ' + error.message);
  }
});

app.get('/api/auth/status', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  const token = req.cookies.auth_token;
  if (token) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token', cookieOptions);
  res.json({ success: true });
});

app.get('/api/sheets/:spreadsheetId', async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const tokens = JSON.parse(token);
    const oauth2Client = getOAuth2Client(req);
    oauth2Client.setCredentials(tokens);

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const spreadsheetId = req.params.spreadsheetId;
    
    // First, get the spreadsheet to find the first sheet's name
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title'
    });
    
    const sheetTitle = spreadsheet.data.sheets?.[0]?.properties?.title;
    
    if (!sheetTitle) {
      throw new Error('No sheets found in spreadsheet');
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetTitle,
    });

    res.json(response.data.values);
  } catch (error: any) {
    if (!(error.message && error.message.includes('insufficient authentication scopes'))) { console.error('Sheets API Error:', error); }
    if (error.message && error.message.includes('insufficient authentication scopes')) { res.clearCookie('auth_token', cookieOptions); return res.status(403).json({ error: 'دسترسی به گوگل شیت نیاز به تایید مجدد دارد. لطفا دوباره وارد شوید.' }); } res.status(500).json({ error: error.message || 'Failed to fetch sheet' });
  }
});

app.get('/api/sheets/:spreadsheetId/logs', async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const tokens = JSON.parse(token);
    const oauth2Client = getOAuth2Client(req);
    oauth2Client.setCredentials(tokens);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const spreadsheetId = req.params.spreadsheetId;

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'System_Logs',
      });
      res.json(response.data.values || []);
    } catch (e: any) {
      if (e.message.includes('Unable to parse range')) {
        // Sheet does not exist
        res.json([]);
      } else {
        throw e;
      }
    }
  } catch (error: any) {
    if (!(error.message && error.message.includes('insufficient authentication scopes'))) { console.error('Sheets Logs GET API Error:', error); }
    if (error.message && error.message.includes('insufficient authentication scopes')) { res.clearCookie('auth_token', cookieOptions); return res.status(403).json({ error: 'دسترسی به گوگل شیت نیاز به تایید مجدد دارد. لطفا دوباره وارد شوید.' }); } res.status(500).json({ error: error.message || 'Failed to fetch logs' });
  }
});

app.post('/api/sheets/:spreadsheetId/logs', async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const tokens = JSON.parse(token);
    const oauth2Client = getOAuth2Client(req);
    oauth2Client.setCredentials(tokens);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const spreadsheetId = req.params.spreadsheetId;
    const { action, code, name, price } = req.body;

    const timestamp = new Date().toLocaleString('fa-IR');
    
    // Check if System_Logs exists, create if not
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const hasLogsSheet = spreadsheet.data.sheets?.some(s => s.properties?.title === 'System_Logs');
    
    if (!hasLogsSheet) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: 'System_Logs' }
            }
          }]
        }
      });
      // Add headers
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'System_Logs',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['تاریخ و ساعت', 'نوع عملیات', 'کد کالا', 'نام کالا', 'قیمت فروش نهایی']]
        }
      });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'System_Logs',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timestamp, action, code, name, price]]
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    if (!(error.message && error.message.includes('insufficient authentication scopes'))) { console.error('Sheets Logs POST API Error:', error); }
    if (error.message && error.message.includes('insufficient authentication scopes')) { res.clearCookie('auth_token', cookieOptions); return res.status(403).json({ error: 'دسترسی به گوگل شیت نیاز به تایید مجدد دارد. لطفا دوباره وارد شوید.' }); } res.status(500).json({ error: error.message || 'Failed to append log' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only start the server if not running on Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
