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

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro do servidor: ${response.status}. Resposta: ${errorText}`);
            }

            const data = await response.json();
            
            if (data.slides && data.slides.length > 0) {
                presentationData = data.slides;
                displayPresentation(presentationData);
                copyButton.style.display = 'block';
                exportButton.style.display = 'block';
            } else {
                throw new Error("A resposta da IA foi recebida, mas não continha slides válidos.");
            }

        } catch (error) {
            console.error('FALHA CRÍTICA NO FRONTEND:', error);
            outputText.innerHTML = `<div style="color: #ff8a80; padding: 15px;"><h4>Ocorreu um erro ao processar a apresentação.</h4><p><strong>Detalhes:</strong> ${error.message}</p></div>`;
        } finally {
            loader.style.display = 'none';
            submitButton.disabled = false;
        }
    });

    function displayPresentation(slides) {
        outputText.innerHTML = '';
        slides.forEach((slide, index) => {
            const slideContainer = document.createElement('div');
            slideContainer.className = 'slide-content';

            if (slide.ilustracao) {
                const image = document.createElement('img');
                image.src = slide.ilustracao;
                image.alt = `Ilustração para: ${slide.titulo}`;
                image.className = 'slide-illustration';
                slideContainer.appendChild(image);
            }

            const slideTitle = document.createElement('h3');
            slideTitle.innerText = `Slide ${index + 1}`;
            
            const title = document.createElement('h4');
            title.innerText = slide.titulo || 'Sem Título';

            const subtitle = document.createElement('h5');
            subtitle.innerText = slide.subtitulo || 'Sem Subtítulo';

            const content = document.createElement('p');
            let textContent = slide.texto;
            let finalHtml = Array.isArray(textContent) ? textContent.join('<br>') : (typeof textContent === 'string' ? textContent.replace(/\n/g, '<br>') : 'Sem conteúdo.');
            content.innerHTML = finalHtml;

            slideContainer.appendChild(slideTitle);
            slideContainer.appendChild(title);
            slideContainer.appendChild(subtitle);
            slideContainer.appendChild(content);
            
            outputText.appendChild(slideContainer);
        });
    }

    // --- CORPO COMPLETO DA FUNÇÃO DE EXPORTAÇÃO ---
    async function exportToPptx() {
        if (!presentationData) return;

        const pres = new PptxGenJS();
        pres.layout = "LAYOUT_WIDE";
        const style = presentationStyleSelect.value;
        let theme = {};

        switch (style) {
            case 'Criativo':
                theme = { background: { color: "1A1A1A" }, titleColor: "FEA82F", subtitleColor: "9B59B6", textColor: "F1F1F1", fontFace: "Montserrat" };
                break;
            case 'Minimalista':
                theme = { background: { color: "FFFFFF" }, titleColor: "222222", subtitleColor: "AAAAAA", textColor: "555555", fontFace: "Helvetica Light" };
                break;
            case 'Acadêmico':
                theme = { background: { color: "FFFFFF" }, titleColor: "00205B", subtitleColor: "A50026", textColor: "000000", fontFace: "Garamond" };
                break;
            case 'Corporativo':
            default:
                theme = { background: { color: "FFFFFF" }, titleColor: "00407A", subtitleColor: "0066CC", textColor: "333333", fontFace: "Calibri" };
                break;
        }

        const presentationTitle = presentationData[0]?.titulo || "Apresentação";
        pres.defineSlideMaster({
            title: "MASTER_SLIDE",
            background: theme.background,
            objects: [
                { line: { x: 0.5, y: 5.2, w: 12.3, line: { color: theme.titleColor, width: 1 } } },
                { text: { text: presentationTitle, options: { x: 0.5, y: 5.3, w: "50%", h: 0.25, fontFace: theme.fontFace, fontSize: 10, color: theme.subtitleColor } } },
            ],
        });

        for (const [index, slideData] of presentationData.entries()) {
            let pptxSlide = pres.addSlide({ masterName: "MASTER_SLIDE" });
            pptxSlide.addText((index + 1).toString(), { x: 12.4, y: 5.3, w: 0.4, h: 0.25, align: 'right', fontFace: theme.fontFace, fontSize: 10, color: theme.subtitleColor });
            pptxSlide.addText(slideData.titulo || "Sem Título", { x: 0.5, y: 0.4, w: '90%', h: 0.75, fontSize: 36, bold: true, color: theme.titleColor, fontFace: theme.fontFace });
            pptxSlide.addText(slideData.subtitulo || "", { x: 0.5, y: 1.1, w: '90%', h: 0.5, fontSize: 20, color: theme.subtitleColor, fontFace: theme.fontFace, italic: (style !== 'Minimalista') });
            if (slideData.ilustracao) {
                pptxSlide.addImage({ data: slideData.ilustracao, x: 0.5, y: 1.8, w: 5.5, h: 3.15 });
            }
            let textContent = Array.isArray(slideData.texto) ? slideData.texto.join('\n') : slideData.texto;
            pptxSlide.addText(textContent || "", { x: 6.5, y: 1.8, w: 6.3, h: 3.15, fontSize: (style === 'Minimalista') ? 14 : 16, color: theme.textColor, fontFace: theme.fontFace, bullet: { indent: 20 }, valign: 'top' });
        }

        pres.writeFile({ fileName: `apresentacao-${style.toLowerCase()}.pptx` });
    }

    // --- CORPO COMPLETO DA FUNÇÃO DE COPIAR ---
    copyButton.addEventListener('click', () => {
        if (!presentationData) return;

        let fullText = '';
        presentationData.forEach((slide, index) => {
            fullText += `--- SLIDE ${index + 1} ---\n\n`;
            fullText += `Título: ${slide.titulo}\n`;
            fullText += `Subtítulo: ${slide.subtitulo}\n\n`;
            fullText += `Conteúdo:\n`;

            if (Array.isArray(slide.texto)) {
                fullText += slide.texto.join('\n');
            } else {
                fullText += slide.texto || '';
            }
            fullText += '\n\n\n';
        });
        
        navigator.clipboard.writeText(fullText.trim())
            .then(() => {
                copyButton.innerText = 'Copiado! ✅';
                setTimeout(() => {
                    copyButton.innerText = 'Copiar Tudo 📋';
                }, 2000);
            })
            .catch(err => {
                console.error('Erro ao copiar texto: ', err);
                alert('Não foi possível copiar o texto.');
            });
    });

    exportButton.addEventListener('click', exportToPptx);
});
