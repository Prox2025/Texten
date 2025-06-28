const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

(async () => {
  const videoId = process.argv[2];
  if (!videoId) {
    console.error("❌ Nenhum ID de vídeo fornecido.");
    process.exit(1);
  }

  const url = `https://drive.google.com/uc?id=${videoId}&export=download`;

  console.log("🚀 Iniciando Puppeteer...");
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  console.log("🔍 Procurando botão de confirmação...");
  const linkReal = await page.$eval('#uc-download-link', el => el.href);
  console.log(`✅ Link real encontrado: ${linkReal}`);

  await browser.close();

  // Criar pasta stream
  const pasta = path.join(__dirname, "stream");
  await fs.ensureDir(pasta);

  const nomeArquivo = path.join(pasta, `video_${Date.now()}.mp4`);
  console.log("⬇️ Baixando vídeo...");

  const response = await axios.get(linkReal, {
    responseType: 'stream',
  });

  const writer = fs.createWriteStream(nomeArquivo);
  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  console.log(`✅ Vídeo salvo em: ${nomeArquivo}`);
})();
