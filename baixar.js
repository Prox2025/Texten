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
    console.log("⏳ Esperando seletor de download...");
    await page.waitForSelector('#uc-download-link', { timeout: 15000 });

    console.log("📄 Extraindo HTML completo...");
    const html = await page.content();

    const match = html.match(/id="uc-download-link"\s+href="([^"]+)"/);
    if (!match || !match[1]) {
      throw new Error("❌ Link de download não encontrado no HTML.");
    }

    const linkParcial = match[1].replace(/&amp;/g, "&");
    const linkReal = `https://drive.google.com${linkParcial}`;

    console.log(`✅ Link real obtido: ${linkReal}`);

    await browser.close();

    const pasta = path.join(__dirname, "stream");
    await fs.ensureDir(pasta);
    const nomeArquivo = path.join(pasta, `video_${Date.now()}.mp4`);

    console.log("⬇️ Iniciando download...");
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
