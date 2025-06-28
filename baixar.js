const puppeteer = require("puppeteer");

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

  console.log("⏳ Aguardando 5 segundos para garantir carregamento...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log("📄 Extraindo conteúdo HTML...");
  const html = await page.content();

  console.log("🔍 Conteúdo da página:\n\n");
  console.log(html);

  await browser.close();
})();
