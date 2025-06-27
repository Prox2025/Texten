const axios = require('axios');
const fs = require('fs');
const path = require('path');

const FILE_ID = '1onC2WQkWOwAd-ywH9qvcRSCw2uotyplh';
const URL_BASE = `https://drive.google.com/uc?export=download&id=${FILE_ID}`;

async function downloadFile() {
  try {
    console.log(`Iniciando requisição para: ${URL_BASE}`);

    const response = await axios.get(URL_BASE, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      maxRedirects: 5,  // permitir redirecionamentos
      validateStatus: status => status >= 200 && status < 400,
      responseType: 'text',
    });

    console.log(`Resposta inicial recebida com status: ${response.status}`);

    const data = response.data;

    // Se a resposta parecer HTML e tiver token confirm, tenta extrair
    if (typeof data === 'string' && data.includes('confirm=')) {
      const confirmMatch = data.match(/confirm=([0-9A-Za-z_-]+)&/);

      if (confirmMatch) {
        const confirm = confirmMatch[1];
        const downloadUrl = `https://drive.google.com/uc?export=download&confirm=${confirm}&id=${FILE_ID}`;

        console.log('Token confirm encontrado:', confirm);
        console.log('URL final para download:', downloadUrl);

        await saveFile(downloadUrl);
        return;
      }
    }

    // Se não achou token confirm, tenta salvar diretamente (arquivo pequeno)
    console.log('Não encontrou token confirm, tentando salvar download direto...');
    await saveFile(URL_BASE);

  } catch (err) {
    console.error('Erro na função downloadFile:', err.message);
    process.exit(1);
  }
}

async function saveFile(url) {
  console.log(`Iniciando download do arquivo a partir de: ${url}`);

  const writer = fs.createWriteStream(path.resolve(__dirname, 'video_drive.mp4'));

  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
    });

    console.log(`Download iniciando com status: ${response.status}`);

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log('Download concluído: video_drive.mp4');
  } catch (err) {
    console.error('Erro ao salvar o arquivo:', err.message);
    process.exit(1);
  }
}

downloadFile();
