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

  // Esperar um tempo a mais para garantir o carregamento
  await page.waitForTimeout(3000);

  // 🔍 Debug: Exibir HTML da página carregada
  const pageContent = await page.content();
  console.log('📄 Conteúdo da página carregada:\n');
  console.log(pageContent.slice(0, 1000) + '...'); // Só exibe os 1000 primeiros caracteres

  try {
    // ⏳ Tenta capturar o botão de download
    const link = await page.evaluate(() => {
      const btn = document.querySelector('a#uc-download-link');
      return btn ? btn.href : null;
    });

    if (!link) throw new Error('Link de download direto não encontrado.');

    console.log('✅ Link direto encontrado:', link);

    const filename = 'video_baixado.mp4';
    console.log('💾 Iniciando download com módulo HTTPS...');

    const file = fs.createWriteStream(filename);
    https.get(link, response => {
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
    console.error('❌ Erro ao extrair o link direto:', err.message);
  } finally {
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
  }
})();
