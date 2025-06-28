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

  // Escutar respostas para capturar a URL real do download
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

    console.log("🖱️ Clicando no botão para iniciar download...");
    await page.click('#uc-download-link');

    console.log("⏳ Aguardando resposta de download...");
    // Espera até capturar o downloadUrl ou timeout em 10s
    const start = Date.now();
    while (!downloadUrl && (Date.now() - start) < 10000) {
      await new Promise(r => setTimeout(r, 200));
    }

    if (!downloadUrl) {
      throw new Error("❌ Não capturou URL de download na resposta.");
    }

    await browser.close();

    const pasta = path.join(__dirname, "stream");
    await fs.ensureDir(pasta);
    const nomeArquivo = path.join(pasta, `video_${Date.now()}.mp4`);

    console.log("⬇️ Baixando vídeo com Axios...");
    const response = await axios.get(downloadUrl, { responseType: 'stream' });
    const writer = fs.createWriteStream(nomeArquivo);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log(`✅ Vídeo salvo em: ${nomeArquivo}`);

  } catch (err) {
    console.error("❌ Erro:", err.message);
    await browser.close();
    process.exit(1);
  }
})();
