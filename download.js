const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const fs = require('fs');
const path = require('path');

const FILE_ID = '1onC2WQkWOwAd-ywH9qvcRSCw2uotyplh';
const URL_BASE = `https://drive.google.com/uc?export=download&id=${FILE_ID}`;

const jar = new CookieJar();

async function downloadFile() {
  try {
    // Requisição inicial sem limitar redirecionamentos
    let response = await axios.get(URL_BASE, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      withCredentials: true,
      jar,
    });

    // Se o conteúdo for HTML com token confirm, extrai o token
    if (typeof response.data === 'string') {
      const html = response.data;
      const confirmMatch = html.match(/confirm=([0-9A-Za-z_-]+)&/);
      const confirm = confirmMatch ? confirmMatch[1] : null;

      if (confirm) {
        const downloadUrl = `https://drive.google.com/uc?export=download&confirm=${confirm}&id=${FILE_ID}`;
        console.log('Token confirm encontrado:', confirm);
        console.log('URL final de download:', downloadUrl);
        await saveFile(downloadUrl);
        return;
      }
    }

    // Se resposta já for o arquivo (stream)
    await saveFile(URL_BASE);

  } catch (error) {
    console.error('Erro ao baixar o arquivo:', error.message);
    process.exit(1);
  }
}

async function saveFile(url) {
  console.log('Iniciando download do arquivo...');
  const writer = fs.createWriteStream(path.resolve(__dirname, 'video_drive.mp4'));

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.log('Download concluído: video_drive.mp4');
      resolve();
    });
    writer.on('error', reject);
  });
}

downloadFile();
