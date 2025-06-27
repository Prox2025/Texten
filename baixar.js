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
  await page.goto(url, { waitUntil: 'networkidle0' });

  // Espera extra para garantir carregamento total
  await page.waitForTimeout(3000);

  console.log('🔎 Procurando links de download no HTML da página...');
  // Busca todos os links <a> com href contendo /uc?export=download&
  const possibleLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="/uc?export=download&"]'))
      .map(a => a.href);
  });

  if (possibleLinks.length === 0) {
    console.error('❌ Nenhum link de download encontrado na página!');
    await browser.close();
    process.exit(1);
  }

  console.log(`✅ Encontrados ${possibleLinks.length} link(s) de download:`);
  possibleLinks.forEach((link, i) => console.log(`  ${i + 1}: ${link}`));

  // Usaremos o primeiro link encontrado para download
  const directLink = possibleLinks[0];
  console.log('➡️ Usando o primeiro link para download:', directLink);

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
      browser.close();
    });

  }).on('error', err => {
    fs.unlink(filename, () => {});
    console.error('❌ Erro no download:', err.message);
    browser.close();
  });

})();
