import express from 'express';
import path from 'path';
import { google } from 'googleapis';

const app = express();
const PORT = 3000;

app.use(express.json());

const getGoogleAuth = () => {
  const client_email = process.env.GOOGLE_CLIENT_EMAIL;
  const private_key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!client_email || !private_key) {
    throw new Error('Google authentication configuration is missing. Please set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.');
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email,
      private_key,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

app.get('/api/sheets/:spreadsheetId', async (req, res) => {
  try {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
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
    console.error('Sheets API Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch sheet' });
  }
});

app.get('/api/sheets/:spreadsheetId/logs', async (req, res) => {
  try {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
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
    console.error('Sheets Logs GET API Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch logs' });
  }
});

app.post('/api/sheets/:spreadsheetId/logs', async (req, res) => {
  try {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
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
    console.error('Sheets Logs POST API Error:', error);
    res.status(500).json({ error: error.message || 'Failed to append log' });
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
