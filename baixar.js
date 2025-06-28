const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

(async () => {
  const entrada = process.argv[2];
  if (!entrada) {
    console.error("❌ Nenhum ID ou URL fornecido.");
    process.exit(1);
  }

  const url = entrada.startsWith("http") ? entrada : `https://drive.google.com/uc?id=${entrada}&export=download`;

  console.log("🚀 Iniciando Puppeteer...");
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();

  let downloadUrl = null;

  page.on('response', async (response) => {
    const headers = response.headers();
    if (headers['content-disposition'] && headers['content-disposition'].includes('attachment')) {
      downloadUrl = response.url();
      console.log(`⚡ Capturada URL de download: ${downloadUrl}`);
    }
  });

  console.log(`🌍 Acessando URL: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2" });

  try {
    console.log("⏳ Aguardando botão de download...");
    await page.waitForSelector('#uc-download-link', { timeout: 15000 });

    console.log("🖱️ Clicando no botão de download...");
    await page.click('#uc-download-link');

    console.log("⏳ Aguardando resposta de download...");
    const start = Date.now();
    while (!downloadUrl && (Date.now() - start) < 10000) {
      await new Promise(r => setTimeout(r, 200));
    }

    if (!downloadUrl) throw new Error("❌ Link não capturado.");

    await browser.close();

    const pasta = path.join(__dirname, "stream");
    await fs.ensureDir(pasta);
    const nomeArquivo = path.join(pasta, `video_${Date.now()}.mp4`);

    console.log("⬇️ Baixando vídeo...");
    const response = await axios.get(downloadUrl, { responseType: 'stream' });
    const writer = fs.createWriteStream(nomeArquivo);

    let totalBytes = 0;
    response.data.on('data', chunk => totalBytes += chunk.length);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const tamanhoMB = (totalBytes / (1024 * 1024)).toFixed(2);
    console.log(`✅ Vídeo salvo: ${nomeArquivo}`);
    console.log(`📦 Tamanho: ${tamanhoMB} MB`);
    console.log(`🔗 Link direto (navegador): ${downloadUrl}`);
  } catch (err) {
    console.error("❌ Erro:", err.message);
    await browser.close();
    process.exit(1);
  }
})();
