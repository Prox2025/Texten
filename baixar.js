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

  let linkReal = null;

  // Interceptar requisições
  page.on('request', (request) => {
    const reqUrl = request.url();
    if (reqUrl.includes("uc?export=download") && reqUrl.includes("confirm=") && reqUrl.includes("id=")) {
      linkReal = reqUrl;
    }
  });

  console.log(`🌍 Acessando URL: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2" });

  try {
    console.log("⏳ Aguardando botão de download...");
    await page.waitForSelector('#uc-download-link', { timeout: 15000 });

    console.log("🖱️ Clicando no botão de download...");
    await page.click('#uc-download-link');

    console.log("⏳ Aguardando interceptação da requisição...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    if (!linkReal) {
      throw new Error("⚠️ Link de download não foi interceptado.");
    }

    console.log(`✅ Link real interceptado: ${linkReal}`);
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
    console.error("❌ Erro:", err.message);
    await browser.close();
    process.exit(1);
  }
})();
