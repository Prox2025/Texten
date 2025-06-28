const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

(async () => {
  const input = process.argv[2];

  // Suporte para link completo ou apenas ID
  const videoId = input.includes("id=") ? new URL(input).searchParams.get("id") : input;

  if (!videoId) {
    console.error("❌ Nenhum ID de vídeo fornecido.");
    process.exit(1);
  }

  const url = `https://drive.google.com/uc?id=${videoId}&export=download`;

  console.log("🚀 Iniciando Puppeteer...");
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });

  console.log("🔍 Procurando link de confirmação...");

  // Busca um link com texto parecido com "Download anyway" (baixe mesmo assim)
  const linkReal = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a"));
    const match = anchors.find(a =>
      a.textContent?.toLowerCase().includes("download") || a.textContent?.includes("Baixe")
    );
    return match ? match.href : null;
  });

  if (!linkReal) {
    console.error("❌ Não foi possível encontrar o botão de download real.");
    process.exit(1);
  }

  console.log(`✅ Link real encontrado: ${linkReal}`);

  await browser.close();

  const pasta = path.join(__dirname, "stream");
  await fs.ensureDir(pasta);
  const nomeArquivo = path.join(pasta, `video_${Date.now()}.mp4`);

  console.log("⬇️ Baixando vídeo...");
  const response = await axios.get(linkReal, {
    responseType: 'stream'
  });

  const writer = fs.createWriteStream(nomeArquivo);
  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  console.log(`✅ Vídeo salvo em: ${nomeArquivo}`);
})();
