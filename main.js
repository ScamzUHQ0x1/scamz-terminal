const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const axios = require('axios');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'src/assets/icon.ico'),
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

ipcMain.on('minimize-app', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

ipcMain.on('maximize-app', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('close-app', () => {
  app.quit();
});

ipcMain.on('run-nmap', (event, target) => {
  const cleanTarget = target.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  
  exec(`nmap -F -Pn -T4 ${cleanTarget}`, (error, stdout, stderr) => {
    if (error) {
      event.reply('nmap-result', `Error: ${error.message}`);
      return;
    }
    event.reply('nmap-result', stdout || stderr);
  });
});

ipcMain.on('run-xss-check', async (event, target) => {
  const payloads = [
    '<script>alert(1)</script>', 
    '<img src=x onerror=alert(1)>', 
    '"><svg/onload=alert(1)>'
  ];
  
  const targetUrl = target.startsWith('http') ? target : `http://${target}`;
  
  for (let payload of payloads) {
    try {
      const baseUrl = targetUrl.split('?')[0];
      const paramName = targetUrl.includes('?') ? targetUrl.split('?')[1].split('=')[0] : 'q';
      const testUrl = `${baseUrl}?${paramName}=${encodeURIComponent(payload)}`;
      
      const response = await axios.get(testUrl, { 
        timeout: 5000,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      const responseString = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      const reflected = responseString.includes(payload);
      
      event.reply('xss-result', {
        payload: payload,
        target: testUrl,
        reflected: reflected,
        vulnerable: reflected
      });
    } catch (err) {
      event.reply('xss-result', {
        payload: payload,
        target: targetUrl,
        reflected: false,
        vulnerable: false,
        error: true
      });
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});