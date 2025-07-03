document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const submitButton = document.getElementById('submitButton');
    const copyButton = document.getElementById('copyButton');
    const exportButton = document.getElementById('exportButton');
    const toneSelect = document.getElementById('tone');
    const audienceSelect = document.getElementById('audience');
    const slideCountInput = document.getElementById('slideCount');
    const presentationStyleSelect = document.getElementById('presentationStyle');
    const loader = document.getElementById('loader');

    let presentationData = null;

    submitButton.addEventListener('click', async () => {
        // ... (a lógica de clique do submitButton continua exatamente a mesma)
        const text = inputText.value;
        const tone = toneSelect.value;
        const audience = audienceSelect.value;
        const slideCount = slideCountInput.value;
        const presentationStyle = presentationStyleSelect.value;

        if (!text.trim()) {
            alert('Por favor, insira um tema ou texto base.');
            return;
        }

        outputText.innerHTML = ''; 
        outputText.classList.remove('output-placeholder');
        loader.style.display = 'block';
        copyButton.style.display = 'none';
        exportButton.style.display = 'none';
        submitButton.disabled = true;
        presentationData = null;

        try {
            const response = await fetch('/api/revise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, tone, audience, slideCount, presentationStyle }),
            });

            if (!response.ok) throw new Error((await response.json()).error || 'Erro no servidor');

            const data = await response.json();
            
            if (data.slides && data.slides.length > 0) {
                presentationData = data.slides;
                displayPresentation(presentationData);
                copyButton.style.display = 'block';
                exportButton.style.display = 'block';
            } else {
                throw new Error("A resposta da IA não continha slides válidos.");
            }

        } catch (error) {
            console.error('Falha ao gerar apresentação:', error);
            outputText.innerText = `Ocorreu um erro: ${error.message}`;
        } finally {
            loader.style.display = 'none';
            submitButton.disabled = false;
        }
    });

    function displayPresentation(slides) { /* ... (esta função continua igual) ... */ }
    copyButton.addEventListener('click', () => { /* ... (esta função continua igual) ... */ });

    // --- FUNÇÃO DE EXPORTAÇÃO ATUALIZADA COM DESIGNS MELHORADOS ---
    async function exportToPptx() {
        if (!presentationData) return;

        const pres = new PptxGenJS();
        pres.layout = "LAYOUT_WIDE";

        const style = presentationStyleSelect.value;
        let theme = {};

        // Definição dos temas visuais
        switch (style) {
            case 'Criativo':
                theme = {
                    background: { color: "1A1A1A" }, // Fundo preto
                    titleColor: "FEA82F", // Laranja/Amarelo vibrante
                    subtitleColor: "9B59B6", // Roxo
                    textColor: "F1F1F1", // Branco suave
                    fontFace: "Montserrat"
                };
                break;
            case 'Minimalista':
                theme = {
                    background: { color: "FFFFFF" }, // Branco
                    titleColor: "222222", // Cinza muito escuro
                    subtitleColor: "AAAAAA", // Cinza claro
                    textColor: "555555", // Cinza médio
                    fontFace: "Helvetica Light"
                };
                break;
            case 'Acadêmico':
                theme = {
                    background: { color: "FFFFFF" },
                    titleColor: "00205B", // Azul escuro U. Penn
                    subtitleColor: "A50026", // Vermelho escuro U. Penn
                    textColor: "000000", // Preto
                    fontFace: "Garamond"
                };
                break;
            case 'Corporativo':
            default:
                theme = {
                    background: { color: "FFFFFF" },
                    titleColor: "00407A", // Azul corporativo escuro
                    subtitleColor: "0066CC", // Azul corporativo claro
                    textColor: "333333",
                    fontFace: "Calibri"
                };
                break;
        }

        // Adiciona um slide mestre para o rodapé (opcional, mas profissional)
        const presentationTitle = presentationData[0]?.titulo || "Apresentação";
        pres.defineSlideMaster({
            title: "MASTER_SLIDE",
            background: theme.background,
            objects: [
                {
                    line: {
                        x: 0.5, y: 5.2, w: 12.3,
                        line: { color: theme.titleColor, width: 1 }
                    },
                },
                {
                    text: {
                        text: presentationTitle,
                        options: { x: 0.5, y: 5.3, w: "50%", h: 0.25, fontFace: theme.fontFace, fontSize: 10, color: theme.subtitleColor },
                    },
                },
            ],
        });

        // Loop para criar cada slide
        for (const [index, slideData] of presentationData.entries()) {
            let pptxSlide = pres.addSlide({ masterName: "MASTER_SLIDE" });
            
            // Adiciona número do slide
            pptxSlide.addText((index + 1).toString(), {
                x: 12.4, y: 5.3, w: 0.4, h: 0.25,
                align: 'right', fontFace: theme.fontFace, fontSize: 10, color: theme.subtitleColor
            });

            // Adiciona Título
            pptxSlide.addText(slideData.titulo || "Sem Título", { 
                x: 0.5, y: 0.4, w: '90%', h: 0.75, 
                fontSize: 36, bold: true, color: theme.titleColor, fontFace: theme.fontFace
            });

            // Adiciona Subtítulo
            pptxSlide.addText(slideData.subtitulo || "", { 
                x: 0.5, y: 1.1, w: '90%', h: 0.5, 
                fontSize: 20, color: theme.subtitleColor, fontFace: theme.fontFace, italic: (style !== 'Minimalista')
            });

            // Adiciona Imagem
            if (slideData.ilustracao) {
                pptxSlide.addImage({ data: slideData.ilustracao, x: 0.5, y: 1.8, w: 5.5, h: 3.15 });
            }

            // Adiciona Texto Principal
            let textContent = Array.isArray(slideData.texto) ? slideData.texto.join('\n') : slideData.texto;
            pptxSlide.addText(textContent || "", {
                x: 6.5, y: 1.8, w: 6.3, h: 3.15,
                fontSize: (style === 'Minimalista') ? 14 : 16,
                color: theme.textColor,
                fontFace: theme.fontFace,
                bullet: { indent: 20 },
                valign: 'top'
            });
        }

        pres.writeFile({ fileName: `apresentacao-${style.toLowerCase()}.pptx` });
    }

    exportButton.addEventListener('click', exportToPptx);
});
