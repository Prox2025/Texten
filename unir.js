name: Montar vídeo do Google Drive

on:
  workflow_dispatch:
    inputs:
      # inputs opcionais se quiser deixar pra usar no workflow, mas não obrigatórios

jobs:
  montar-video:
    runs-on: ubuntu-latest

    steps:
      - name: Clonar o repositório
        uses: actions/checkout@v4

      - name: Criar arquivo chave.json a partir do segredo
        run: echo '${{ secrets.GOOGLE_CREDENTIAL_JSON }}' > chave.json

      - name: Instalar dependências
        run: |
          sudo apt update
          sudo apt install -y ffmpeg nodejs npm
          npm install googleapis

      - name: Executar script unir.js
        run: node unir.js
        env:
          KEYFILE: chave.json
          INPUTFILE: input.json

      - name: Upload do vídeo final
        uses: actions/upload-artifact@v4
        with:
          name: video-final
          path: video_unido.mp4
