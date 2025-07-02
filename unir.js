const fs = require('fs');
const { spawn } = require('child_process');
const { google } = require('googleapis');

const keyFile = process.env.KEYFILE || 'chave.json';
const inputFile = process.env.INPUTFILE || 'input.json';
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

// Executa comando FFmpeg
function executarFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: 'inherit' });
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg falhou com código ${code}`));
    });
  });
}

// Autenticação Google Drive
async function autenticar() {
  const auth = new google.auth.GoogleAuth({ keyFile, scopes: SCOPES });
  return await auth.getClient();
}

// Baixa arquivo do Google Drive com tratamento de erro detalhado
async function baixarArquivo(fileId, destino, auth) {
  const drive = google.drive({ version: 'v3', auth });

  try {
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(destino);
      res.data.pipe(output);
      res.data.on('end', () => resolve());
      res.data.on('error', err => reject(new Error(`Erro no stream: ${err.message}`)));
    });

  } catch (error) {
    let mensagemErro = `Erro ao baixar o arquivo ${fileId} do Google Drive.\n`;

    if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText;
      mensagemErro += `Código HTTP: ${status} - ${statusText}\n`;

      if (error.response.data && typeof error.response.data === 'object') {
        const erroDetalhado = error.response.data.error;
        if (erroDetalhado) {
          mensagemErro += `Erro: ${erroDetalhado.message}\n`;
          if (erroDetalhado.errors && erroDetalhado.errors.length > 0) {
            mensagemErro += `Motivo: ${erroDetalhado.errors[0].reason}\n`;
          }
        }
      }
    } else {
      mensagemErro += `Mensagem: ${error.message}`;
    }

    throw new Error(mensagemErro);
  }
}

// Retorna duração de um vídeo
function obterDuracao(video) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      video
    ]);
    let output = '';
    ffprobe.stdout.on('data', chunk => output += chunk.toString());
    ffprobe.on('close', code => {
      if (code === 0) resolve(parseFloat(output.trim()));
      else reject(new Error('Erro ao obter duração com ffprobe'));
    });
  });
}

// Corta vídeo em duas partes
async function cortarVideo(input, out1, out2, meio) {
  await executarFFmpeg(['-i', input, '-t', meio.toString(), '-c', 'copy', out1]);
  await executarFFmpeg(['-i', input, '-ss', meio.toString(), '-c', 'copy', out2]);
}

// Reencoda vídeo para compatibilidade
async function reencode(input, output) {
  await executarFFmpeg([
    '-i', input,
    '-vf', 'scale=1280:720,fps=30',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-c:a', 'aac',
    output
  ]);
}

// Junta vídeos usando lista .txt
async function unirVideos(lista, saida) {
  const txt = 'list.txt';
  fs.writeFileSync(txt, lista.map(f => `file '${f}'`).join('\n'));
  await executarFFmpeg(['-f', 'concat', '-safe', '0', '-i', txt, '-c', 'copy', saida]);
}

// Execução principal
(async () => {
  try {
    console.log('🔑 Autenticando...');
    const auth = await autenticar();

    const dados = JSON.parse(fs.readFileSync(inputFile));
    const videoPrincipal = dados.video_principal;
    const extras = dados.videos_opcionais || [];

    console.log('⬇️ Baixando vídeo principal...');
    await baixarArquivo(videoPrincipal, 'principal.mp4', auth);

    console.log('⌛ Obtendo duração do vídeo principal...');
    const duracao = await obterDuracao('principal.mp4');
    const meio = duracao / 2;

    console.log('✂️ Cortando vídeo principal...');
    await cortarVideo('principal.mp4', 'parte1_raw.mp4', 'parte2_raw.mp4', meio);

    console.log('⚙️ Reencodando partes principais...');
    await reencode('parte1_raw.mp4', 'parte1.mp4');
    await reencode('parte2_raw.mp4', 'parte2.mp4');

    const intermediarios = [];
    for (let i = 0; i < extras.length; i++) {
      const id = extras[i];
      const raw = `extra${i}_raw.mp4`;
      const out = `extra${i}.mp4`;

      console.log(`⬇️ Baixando vídeo extra ${i + 1}: ${id}`);
      await baixarArquivo(id, raw, auth);

      console.log(`⚙️ Reencodando vídeo extra ${i + 1}...`);
      await reencode(raw, out);
      intermediarios.push(out);
    }

    const ordemFinal = ['parte1.mp4', ...intermediarios, 'parte2.mp4'];

    console.log('🎬 Unindo vídeos finais...');
    await unirVideos(ordemFinal, 'video_unido.mp4');

    const sizeMB = (fs.statSync('video_unido.mp4').size / 1024 / 1024).toFixed(2);
    console.log(`✅ Vídeo final criado: video_unido.mp4 (${sizeMB} MB)`);

  } catch (err) {
    console.error('❌ Erro:', err.message || err);
    process.exit(1);
  }
})();
