// server.js

// NOVO: Importa a função de injeção do Vercel Analytics
const { inject } = require('@vercel/analytics');

require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("ERRO: A variável de ambiente OPENAI_API_KEY não foi encontrada no seu arquivo .env.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

app.use(express.static('public'));
app.use(express.json());

app.post('/api/revise', async (req, res) => {
    try {
        const { text, tone, audience, slideCount, presentationStyle } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'O texto base é obrigatório.' });
        }

        // ETAPA 1: Gerar o texto dos slides
        const textPromptSystem = `
            Você é um especialista em criar conteúdo para apresentações. Sua tarefa é transformar um tema em ${slideCount} slides.
            O tom de voz deve ser **${tone}** e o público-alvo é **${audience}**.
            Sua resposta DEVE ser um objeto JSON com a chave "slides", contendo um array de objetos.
            Cada objeto deve ter as chaves: "titulo", "subtitulo" e "texto".
            NÃO adicione nenhum texto fora do objeto JSON.
        `;
        const textPromptUser = `Tema: "${text}"`;

        const textCompletion = await openai.chat.completions.create({
            messages: [{ role: 'system', content: textPromptSystem }, { role: 'user', content: textPromptUser }],
            model: 'gpt-4o-mini',
            response_format: { type: "json_object" },
        });

        const slideData = JSON.parse(textCompletion.choices[0].message.content);
        let slides = slideData.slides || [];

        // ETAPA 2: Gerar uma ilustração para cada slide
        const slidesWithImages = [];
        for (const slide of slides) {
            const imageContext = `${slide.titulo} - ${slide.subtitulo || ''}`;
            const imagePrompt = `Uma ilustração vetorial minimalista e conceitual sobre o tema: "${imageContext}". Fundo branco. Importante: a imagem não deve conter nenhum tipo de texto, letras ou palavras.`;
            
            console.log(`- Gerando imagem para: "${imageContext}"`);

            try {
                const imageResponse = await openai.images.generate({
                    model: "dall-e-3",
                    prompt: imagePrompt,
                    n: 1,
                    size: "1024x1024",
                    quality: "standard",
                    response_format: "b64_json", 
                });
                
                const b64Json = imageResponse.data[0].b64_json;
                const imageUrl = `data:image/png;base64,${b64Json}`;
                slidesWithImages.push({ ...slide, ilustracao: imageUrl });
            } catch (imgError) {
                console.error(`  ... ERRO ao gerar imagem para o slide: "${slide.titulo}"`);
                slidesWithImages.push({ ...slide, ilustracao: null });
            }
        }
        
        res.json({ slides: slidesWithImages });

    } catch (error) {
        console.error("Erro geral no backend:", error);
        res.status(500).json({ error: 'Falha ao gerar a apresentação.' });
    }
});

// NOVO: Injeta o script do Vercel Analytics antes de iniciar o servidor
inject();

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
