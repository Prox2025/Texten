const fs = require('fs');
const { spawn } = require('child_process');
const { google } = require('googleapis');

const keyFile = process.env.KEYFILE || 'chave.json';
const inputFile = process.env.INPUTFILE || 'input.json';
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

function executarFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: 'inherit' });
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(`FFmpeg falhou com código ${code}`);
    });
  });
}

async function autenticar() {
  const auth = new google.auth.GoogleAuth({ keyFile, scopes: SCOPES });
  return await auth.getClient();
}

async function baixarArquivo(fileId, destino, auth) {
  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });

  return new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(destino);
    res.data.pipe(dest);
    res.data.on('end', resolve);
    res.data.on('error', reject);
  });
}

function obterDuracao(video) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', video
    ]);
    let output = '';
    ffprobe.stdout.on('data', chunk => output += chunk.toString());
    ffprobe.on('close', code => {
      if (code === 0) resolve(parseFloat(output.trim()));
      else reject(`Erro ao obter duração`);
    });
  });
}

async function cortarVideo(input, out1, out2, meio) {
  await executarFFmpeg(['-i', input, '-t', `${meio}`, '-c', 'copy', out1]);
  await executarFFmpeg(['-i', input, '-ss', `${meio}`, '-c', 'copy', out2]);
}

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

async function unirVideos(lista, saida) {
  const txt = 'list.txt';
  fs.writeFileSync(txt, lista.map(f => `file '${f}'`).join('\n'));
  await executarFFmpeg(['-f', 'concat', '-safe', '0', '-i', txt, '-c', 'copy', saida]);
}

(async () => {
  const auth = await autenticar();
  const { video_principal, videos_opcionais } = JSON.parse(fs.readFileSync(inputFile));

  console.log('⬇️ Baixando vídeo principal...');
  await baixarArquivo(video_principal, 'principal.mp4', auth);

  const duracao = await obterDuracao('principal.mp4');
  const meio = duracao / 2;

  console.log('✂️ Cortando vídeo principal ao meio...');
  await cortarVideo('principal.mp4', 'parte1_raw.mp4', 'parte2_raw.mp4', meio);

  console.log('⚙️ Reencodando partes principais...');
  await reencode('parte1_raw.mp4', 'parte1.mp4');
  await reencode('parte2_raw.mp4', 'parte2.mp4');

  const intermediarios = [];
  let count = 0;
  for (const id of videos_opcionais) {
    const raw = `extra${count}_raw.mp4`;
    const final = `extra${count}.mp4`;
    console.log(`⬇️ Baixando vídeo opcional: ${id}`);
    await baixarArquivo(id, raw, auth);
    console.log(`⚙️ Reencodando ${raw}...`);
    await reencode(raw, final);
    intermediarios.push(final);
    count++;
  }

  const ordem = ['parte1.mp4', ...intermediarios, 'parte2.mp4'];
  console.log('🎬 Unindo todos os vídeos...');
  await unirVideos(ordem, 'video_unido.mp4');

  const size = fs.statSync('video_unido.mp4').size / 1024 / 1024;
  console.log(`✅ Finalizado: video_unido.mp4 (${size.toFixed(2)} MB)`);
})();
