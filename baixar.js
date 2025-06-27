const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const https = require('https');

const url = 'https://drive.google.com/uc?id=1onC2WQkWOwAd-ywH9qvcRSCw2uotyplh&export=download';

(async () => {
  console.log('🚀 Iniciando Puppeteer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  console.log('🌍 Acessando URL:', url);
  await page.goto(url, { waitUntil: 'networkidle2' });

  try {
    console.log('🔍 Procurando botão "Baixar de qualquer forma"...');
    await page.waitForSelector('a#uc-download-link', { timeout: 10000 });

    const directLink = await page.$eval('a#uc-download-link', el => el.href);
    console.log('✅ Link direto obtido:', directLink);

    const filename = 'video_baixado.mp4';
    console.log('💾 Iniciando download com módulo HTTPS...');

    const file = fs.createWriteStream(filename);
    https.get(directLink, response => {
      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloaded = 0;

      response.on('data', chunk => {
        downloaded += chunk.length;
        const percent = totalSize ? ((downloaded / totalSize) * 100).toFixed(2) : '...';
        process.stdout.write(`📦 Baixando... ${percent}%\r`);
      });

      response.pipe(file);

      file.on('finish', () => {
        console.log(`\n✅ Download finalizado: ${filename}`);
        file.close();
      });

    }).on('error', err => {
      fs.unlink(filename, () => {});
      console.error('❌ Erro no download:', err.message);
    });

  } catch (err) {
    console.error('❌ Erro no processo:', err.message);
  } finally {
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
  }
})();
