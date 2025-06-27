const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const axios = require('axios');

const url = 'https://drive.google.com/uc?id=1onC2WQkWOwAd-ywH9qvcRSCw2uotyplh&export=download';

(async () => {
  console.log('🚀 Iniciando navegador...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  console.log('🌐 Acessando link:', url);
  await page.goto(url, { waitUntil: 'networkidle2' });

  try {
    console.log('⏳ Esperando botão "Baixar de qualquer forma"...');
    await page.waitForSelector('a#uc-download-link', { timeout: 10000 });

    const downloadLink = await page.$eval('a#uc-download-link', el => el.href);
    console.log('✅ Link direto encontrado:', downloadLink);

    console.log('📥 Iniciando download via Axios...');
    const response = await axios.get(downloadLink, { responseType: 'stream' });

    const disposition = response.headers['content-disposition'] || '';
    const match = disposition.match(/filename="(.+?)"/);
    const filename = match ? match[1] : 'video_baixado.mp4';

    const writer = fs.createWriteStream(filename);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log('🎉 Download concluído:', filename);
  } catch (err) {
    console.error('❌ Erro durante o download:', err.message);
  } finally {
    await browser.close();
  }
})();
