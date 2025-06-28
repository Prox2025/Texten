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

  console.log(`🌍 Acessando URL: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2" });

  console.log("⏳ Aguardando 8 segundos para carregar a página...");
  await new Promise(resolve => setTimeout(resolve, 8000)); // substituição correta

  // Tentar clicar no botão de confirmação de download, se existir
  try {
    const confirmSelector = 'a#uc-download-link, button[jsname="LgbsSe"]';
    const button = await page.$(confirmSelector);
    if (button) {
      console.log("🔘 Botão de confirmação encontrado, clicando...");
      await button.click();
      console.log("⏳ Aguardando mais 4 segundos após o clique...");
      await new Promise(resolve => setTimeout(resolve, 4000));
    } else {
      console.log("⚠️ Nenhum botão de confirmação encontrado, tentando obter o link direto...");
    }
  } catch (err) {
    console.log("⚠️ Erro ao tentar interagir com o botão:", err.message);
  }

  // Tentar capturar o link real de download
  let linkReal;
  try {
    linkReal = await page.$eval('#uc-download-link', el => el.href);
    console.log(`✅ Link real obtido: ${linkReal}`);
  } catch {
    console.error("❌ Não foi possível capturar o link real de download.");
    await browser.close();
    process.exit(1);
  }

  await browser.close();

  // Criar pasta para salvar o vídeo
  const pasta = path.join(__dirname, "stream");
  await fs.ensureDir(pasta);

  const nomeArquivo = path.join(pasta, `video_${Date.now()}.mp4`);
  console.log("⬇️ Iniciando download do vídeo...");

  try {
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
  } catch (erro) {
    console.error("❌ Erro ao baixar o vídeo:", erro.message);
  }
})();
