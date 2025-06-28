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
  
  // Espera 8 segundos para garantir carregamento completo
  console.log("⏳ Aguardando 8 segundos para carregar a página...");
  await page.waitForTimeout(8000);

  // Tenta clicar no botão de confirmação de download, se existir
  try {
    const confirmButtonSelector = 'a#uc-download-link, button[jsname="LgbsSe"]'; 
    const button = await page.$(confirmButtonSelector);
    if (button) {
      console.log("🔘 Botão de confirmação encontrado, clicando...");
      await button.click();
      // Espera carregar o link real após clicar
      await page.waitForTimeout(4000);
    } else {
      console.log("⚠️ Botão de confirmação não encontrado, tentando continuar...");
    }
  } catch (e) {
    console.log("⚠️ Erro ao tentar clicar no botão de confirmação:", e.message);
  }

  // Agora tenta pegar o link real para download
  let linkReal;
  try {
    // Pode mudar conforme a estrutura da página, tente selecionar o link direto
    linkReal = await page.$eval('#uc-download-link', el => el.href);
    console.log(`✅ Link real encontrado: ${linkReal}`);
  } catch {
    // Se não encontrar o seletor, tenta pegar o link direto da página (ou uma alternativa)
    console.error("❌ Não foi possível encontrar o link real de download na página.");
    await browser.close();
    process.exit(1);
  }

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
