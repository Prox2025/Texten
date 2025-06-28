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

  console.log(`🌍 Acessando URL: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2" });

  try {
    console.log("⏳ Esperando link de download aparecer...");
    await page.waitForSelector('#uc-download-link', { timeout: 15000 });

    const linkReal = await page.$eval('#uc-download-link', el => el.href);

    if (!linkReal) {
      throw new Error("Link de download vazio.");
    }

    console.log(`✅ Link real de download encontrado: ${linkReal}`);

    await browser.close();

    // Criar pasta e preparar nome do arquivo
    const pasta = path.join(__dirname, "stream");
    await fs.ensureDir(pasta);
    const nomeArquivo = path.join(pasta, `video_${Date.now()}.mp4`);

    console.log("⬇️ Baixando vídeo...");

    const response = await axios.get(linkReal, { responseType: 'stream' });
    const writer = fs.createWriteStream(nomeArquivo);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log(`✅ Vídeo salvo em: ${nomeArquivo}`);
  } catch (err) {
    console.error("❌ Erro ao capturar o link de download:", err.message);
    await browser.close();
    process.exit(1);
  }
})();
