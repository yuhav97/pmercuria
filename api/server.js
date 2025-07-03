// api/server.js

require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("ERRO CRÍTICO: A variável de ambiente OPENAI_API_KEY não foi encontrada.");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

app.use(express.json());

// Rota da API para gerar a apresentação
app.post('/api/revise', async (req, res) => {
    try {
        const { text, tone, audience, slideCount } = req.body;
        if (!text) return res.status(400).json({ error: 'O texto base é obrigatório.' });
        
        // ETAPA 1: Gerar o texto dos slides
        console.log('Etapa 1: Gerando texto dos slides...');
        const textPromptSystem = `
            Você é um especialista em criar conteúdo para apresentações. Sua tarefa é transformar um tema em slides.
            O tom de voz deve ser **${tone}** e o público-alvo é **${audience}**.
            Sua resposta DEVE ser um objeto JSON com a chave "slides".
            O array "slides" deve conter **exatamente ${slideCount} objetos**. Nem mais, nem menos.
            Cada objeto no array deve ter as chaves: "titulo", "subtitulo" e "texto".
            NÃO adicione nenhum texto fora do objeto JSON.
        `;
        const textPromptUser = `Tema: "${text}"`;

        const textCompletion = await openai.chat.completions.create({
            messages: [{ role: 'system', content: textPromptSystem }, { role: 'user', content: textPromptUser }],
            // --- INÍCIO DA ALTERAÇÃO ---
            model: 'gpt-3.5-turbo', // Alterado para o melhor modelo da família GPT-3
            // --- FIM DA ALTERAÇÃO ---
            response_format: { type: "json_object" },
        });

        const slideData = JSON.parse(textCompletion.choices[0].message.content);
        let slides = slideData.slides || [];
        
        // ETAPA 2.A: Gerar a imagem de capa
        console.log('Etapa 2.A: Gerando imagem de capa...');
        let coverImageUrl = null;
        try {
            const coverImagePrompt = `Uma imagem de capa de apresentação cinematográfica e dramática sobre o tema: "${text}". Estilo de arte digital, sem texto.`;
            const coverImageResponse = await openai.images.generate({
                model: "dall-e-3", prompt: coverImagePrompt, n: 1, size: "1792x1024", quality: "hd", response_format: "b64_json",
            });
            coverImageUrl = `data:image/png;base64,${coverImageResponse.data[0].b64_json}`;
            console.log('... Imagem de capa gerada com sucesso!');
        } catch (coverError) {
            console.error('... ERRO ao gerar imagem de capa:', coverError.message);
        }

        // ETAPA 2.B: Gerar as ilustrações dos slides
        console.log('Etapa 2.B: Gerando ilustrações dos slides...');
        const slidesWithImages = [];
        for (const slide of slides) {
            const imageContext = `${slide.titulo} - ${slide.subtitulo || ''}`;
            const imagePrompt = `Uma ilustração vetorial minimalista e conceitual sobre o tema: "${imageContext}". Fundo branco. Importante: a imagem não deve conter nenhum tipo de texto, letras ou palavras.`;
            
            try {
                const imageResponse = await openai.images.generate({
                    model: "dall-e-3", prompt: imagePrompt, n: 1, size: "1024x1024", quality: "standard", response_format: "b64_json", 
                });
                const imageUrl = `data:image/png;base64,${imageResponse.data[0].b64_json}`;
                slidesWithImages.push({ ...slide, ilustracao: imageUrl });
            } catch (imgError) {
                console.error(`  ... ERRO ao gerar imagem para o slide: "${slide.titulo}"`);
                slidesWithImages.push({ ...slide, ilustracao: null });
            }
        }
        
        res.json({ coverImage: coverImageUrl, slides: slidesWithImages });

    } catch (error) {
        console.error("Erro detalhado no backend:", error);

        if (error.status === 429) {
            return res.status(429).json({ 
                error: 'Limite de uso da API atingido. Por favor, verifique o seu plano e detalhes de faturação na sua conta da OpenAI.' 
            });
        }

        res.status(500).json({ error: `Ocorreu uma falha no servidor. Detalhes: ${error.message}` });
    }
});

// Lógica para servir os ficheiros estáticos e as páginas
const publicPath = path.resolve(__dirname, '../public');
app.use(express.static(publicPath));
app.get('/app', (req, res) => { res.sendFile(path.join(publicPath, 'app.html')); });
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) { return res.status(404).send('API route not found.'); }
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Lógica para iniciar o servidor localmente
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Servidor de desenvolvimento rodando em http://localhost:${port}`);
  });
}

// Exporta a app para a Vercel
module.exports = app;
