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

  // Suporta tanto ID como URL completa
  const url = videoId.startsWith("http") ? videoId : `https://drive.google.com/uc?id=${videoId}&export=download`;

  console.log("🚀 Iniciando Puppeteer...");
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.log(`🌍 Acessando URL: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2" });

  console.log("⏳ Aguardando 8 segundos para carregar a página...");
  await new Promise(resolve => setTimeout(resolve, 8000));

  let linkReal;

  try {
    const html = await page.content();

    // Regex para capturar link com id="uc-download-link"
    const match = html.match(/href="(\/uc\?export=download[^"]+)"/);

    if (match && match[1]) {
      const partial = match[1].replace(/&amp;/g, "&"); // Corrige &amp;
      linkReal = `https://drive.google.com${partial}`;
      console.log(`✅ Link real obtido via análise de HTML: ${linkReal}`);
    } else {
      console.error("❌ Link de download não encontrado no HTML.");
      await browser.close();
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Erro ao extrair link:", err.message);
    await browser.close();
    process.exit(1);
  }

  await browser.close();

  const pasta = path.join(__dirname, "stream");
  await fs.ensureDir(pasta);
  const nomeArquivo = path.join(pasta, `video_${Date.now()}.mp4`);

  console.log("⬇️ Iniciando download do vídeo...");
  try {
    const response = await axios.get(linkReal, { responseType: 'stream' });
    const writer = fs.createWriteStream(nomeArquivo);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log(`✅ Vídeo salvo em: ${nomeArquivo}`);
  } catch (erro) {
    console.error("❌ Erro ao baixar o vídeo:", erro.message);
  }
})();
