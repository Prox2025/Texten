const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');

(async () => {
  try {
    const url = process.env.DRIVE_URL;
    console.log('🌐 Acessando: ' + url);

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    await page.waitForSelector('#uc-download-link', { timeout: 10000 });
    const downloadLink = await page.$eval('#uc-download-link', el => el.href);

    console.log('✅ Link extraído: ' + downloadLink);

    const response = await page.goto(downloadLink, { waitUntil: 'networkidle2' });
    const finalUrl = response.url();

    console.log('🎯 Link final: ' + finalUrl);

    const writer = fs.createWriteStream('video.mp4');
    const videoResponse = await axios({
      method: 'get',
      url: finalUrl,
      responseType: 'stream'
    });

    videoResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log('📥 Vídeo salvo como video.mp4');

    await browser.close();
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    process.exit(1);
  }
})();
