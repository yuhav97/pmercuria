// api/server.js

require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const path = require('path');
const { search } = require('duck-duck-scrape');

const app = express();
const port = process.env.PORT || 3000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) { console.error("ERRO: Chave da OpenAI não encontrada."); }

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

app.use(express.json({ limit: '10mb' }));

app.post('/api/generate', async (req, res) => {
    try {
        const { inputText, outputType, improvementLevel, slideCount, tone, audience } = req.body;
        if (!inputText) return res.status(400).json({ error: 'O texto de entrada é obrigatório.' });
        
        let systemPrompt = '';
        const userPrompt = `Texto de entrada ou Tema:\n\n${inputText}`;

        const improvementInstruction = (improvementLevel === 'enhance')
            ? `Além de estruturar, reescreva os textos (títulos, subtítulos, resumos, insights) para serem mais claros, impactantes e profissionais, aplicando um tom de voz **${tone}** para um público de **${audience}**.`
            : `Apenas estruture o conteúdo e corrija erros gramaticais, mantendo um tom de voz **${tone}** para um público de **${audience}**. Não altere o significado ou o estilo do texto original.`;

        if (outputType === 'report') {
            systemPrompt = `
                Você é um analista de dados e designer de informação. Sua tarefa é analisar o texto de um relatório e estruturá-lo em um formato JSON visual.
                ${improvementInstruction}
                REGRAS:
                1. Identifique as diferentes seções: resumos, KPIs, dados para gráficos, tabelas e insights.
                2. Sua resposta DEVE ser um objeto JSON com a chave "slides", que é um array de objetos. Cada objeto "slide" agrupa componentes relacionados.
                3. Cada "slide" deve ter "titulo", "subtitulo" e um array de "components".
            `;
        } else { // 'presentation'
            const planPrompt = `Dado o tema "${inputText}", crie um esboço para uma apresentação de ${slideCount} slides. A resposta DEVE ser um objeto JSON com a chave "slide_outline", um array de ${slideCount} objetos, cada um com "titulo" e "subtitulo".`;
            const planCompletion = await openai.chat.completions.create({
                messages: [{ role: 'system', content: planPrompt }], model: 'gpt-4o-mini', response_format: { type: "json_object" },
            });
            const plan = JSON.parse(planCompletion.choices[0].message.content);

            systemPrompt = `
                Você é um especialista em criar apresentações. Para cada tópico no "Esboço dos Slides" abaixo, escreva o conteúdo textual.
                ${improvementInstruction}
                REGRAS:
                1. Sua resposta DEVE ser um objeto JSON com a chave "slides", que é um array de objetos.
                2. Cada objeto no array deve ter "titulo", "subtitulo" (do esboço), e um array "components" contendo um único componente do tipo "text_with_image".
                3. O componente "text_with_image" deve ter "data" com as chaves "texto" (um parágrafo ou bullet points) e "image_prompt" (uma descrição curta para uma ilustração).
            `;
            const synthesisUserPrompt = `Esboço dos Slides (preencha este esboço):\n${JSON.stringify(plan.slide_outline, null, 2)}`;
            const synthesisCompletion = await openai.chat.completions.create({
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: synthesisUserPrompt }], model: 'gpt-4o', response_format: { type: "json_object" },
            });
            let finalData = JSON.parse(synthesisCompletion.choices[0].message.content);

            if (finalData.slides) {
                for (const slide of finalData.slides) {
                    const component = slide.components[0];
                    if (component && component.type === 'text_with_image') {
                        const imagePrompt = component.data.image_prompt;
                        try {
                            const imageResponse = await openai.images.generate({
                                model: "dall-e-3", prompt: `Ilustração vetorial minimalista: ${imagePrompt}. Fundo branco, sem texto.`, n: 1, size: "1024x1024", response_format: "b64_json",
                            });
                            component.data.ilustracao = `data:image/png;base64,${imageResponse.data[0].b64_json}`;
                        } catch (imgError) {
                            console.error(`Erro ao gerar imagem para: ${imagePrompt}`);
                            component.data.ilustracao = null;
                        }
                    }
                }
            }
            return res.json(finalData);
        }

        const completion = await openai.chat.completions.create({
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], model: 'gpt-4o', response_format: { type: "json_object" },
        });
        const structuredData = JSON.parse(completion.choices[0].message.content);
        res.json(structuredData);

    } catch (error) {
        console.error("Erro detalhado no backend:", error);
        res.status(500).json({ error: `Ocorreu uma falha no servidor. Detalhes: ${error.message}` });
    }
});

const publicPath = path.resolve(__dirname, '../public');
app.use(express.static(publicPath));
app.get('/app', (req, res) => { res.sendFile(path.join(publicPath, 'app.html')); });
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) { return res.status(404).send('API route not found.'); }
    res.sendFile(path.join(publicPath, 'index.html'));
});

// --- INÍCIO DA SOLUÇÃO FINAL ---
// Esta verificação permite que o servidor inicie localmente para testes,
// mas não interfere com o ambiente da Vercel em produção.
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Servidor de desenvolvimento rodando em http://localhost:${port}`);
  });
}

// Exporta a app para a Vercel
module.exports = app;
// --- FIM DA SOLUÇÃO FINAL ---
