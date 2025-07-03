// server.js

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
        const { text, tone, audience, slideCount } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'O texto base é obrigatório.' });
        }

        // ETAPA 1: Gerar o texto dos slides (sem alterações)
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

        // --- INÍCIO DA MUDANÇA ---
        // ETAPA 2.A: Gerar uma imagem de capa impactante
        console.log('Etapa 2.A: Gerando imagem de capa...');
        let coverImageUrl = null;
        try {
            const coverImagePrompt = `Uma imagem de capa de apresentação cinematográfica e dramática sobre o tema: "${text}". Estilo de arte digital, sem texto.`;
            const coverImageResponse = await openai.images.generate({
                model: "dall-e-3",
                prompt: coverImagePrompt,
                n: 1,
                size: "1792x1024", // Widescreen para a capa
                quality: "hd",
                response_format: "b64_json",
            });
            const b64Json = coverImageResponse.data[0].b64_json;
            coverImageUrl = `data:image/png;base64,${b64Json}`;
            console.log('... Imagem de capa gerada com sucesso!');
        } catch (coverError) {
            console.error('... ERRO ao gerar imagem de capa:', coverError.message);
        }

        // ETAPA 2.B: Gerar as ilustrações para os slides de conteúdo
        console.log('Etapa 2.B: Gerando ilustrações dos slides...');
        const slidesWithImages = [];
        for (const slide of slides) {
            const imageContext = `${slide.titulo} - ${slide.subtitulo || ''}`;
            const imagePrompt = `Uma ilustração vetorial minimalista e conceitual sobre o tema: "${imageContext}". Fundo branco. Importante: a imagem não deve conter nenhum tipo de texto, letras ou palavras.`;
            
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
        
        // Envia a imagem de capa juntamente com os slides
        res.json({ coverImage: coverImageUrl, slides: slidesWithImages });
        // --- FIM DA MUDANÇA ---

    } catch (error) {
        console.error("Erro geral no backend:", error);
        res.status(500).json({ error: 'Falha ao gerar a apresentação.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
