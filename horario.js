const puppeteer = require('puppeteer');

const SERVER_STATUS_URL = 'https://livestream.ct.ws/Google%20drive/live/status.php';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    await page.emulateTimezone('Africa/Maputo');

    console.log(`🌐 Acessando ${SERVER_STATUS_URL}`);
    await page.goto(SERVER_STATUS_URL, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Substitui page.waitForTimeout para compatibilidade
    await new Promise(resolve => setTimeout(resolve, 3000));

    const data = await page.evaluate(() => {
      const agora = new Date();
      return {
        hora: agora.toLocaleString('pt-PT', {
          timeZone: 'Africa/Maputo',
          hour12: false
        })
      };
    });

    console.log("🕒 Hora detectada no navegador:", data.hora);

    const resposta = await page.evaluate(async (payload) => {
      const res = await fetch(window.location.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const texto = await res.text();
      return { status: res.status, texto };
    }, data);

    console.log("✅ Resposta do servidor:", resposta);
    await browser.close();
  } catch (err) {
    console.error("❌ Erro:", err.message);
    await browser.close();
    process.exit(1);
  }
})();
