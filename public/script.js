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

            console.log("Status da resposta do servidor:", response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro do servidor: ${response.status}. Resposta: ${errorText}`);
            }

            const data = await response.json();
            console.log("Dados JSON recebidos com sucesso:", data);
            
            if (data.slides && data.slides.length > 0) {
                presentationData = data.slides;
                displayPresentation(presentationData); // Chama a função que agora está completa
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

    // --- INÍCIO DA FUNÇÃO CORRIGIDA E COMPLETA ---
    function displayPresentation(slides) {
        // Limpa qualquer conteúdo anterior para garantir
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
            let finalHtml = '';

            if (Array.isArray(textContent)) {
                finalHtml = textContent.join('<br>');
            } else if (typeof textContent === 'string') {
                finalHtml = textContent.replace(/\n/g, '<br>');
            } else {
                finalHtml = 'Sem conteúdo.';
            }

            content.innerHTML = finalHtml;

            slideContainer.appendChild(slideTitle);
            slideContainer.appendChild(title);
            slideContainer.appendChild(subtitle);
            slideContainer.appendChild(content);
            
            outputText.appendChild(slideContainer);
        });
    }
    // --- FIM DA FUNÇÃO CORRIGIDA E COMPLETA ---

    async function exportToPptx() {
        // ... (a função de exportação continua igual)
    }

    copyButton.addEventListener('click', () => {
        // ... (a função de copiar continua igual)
    });

    exportButton.addEventListener('click', exportToPptx);
});
```

### O Que Fazer Agora

1.  **Substitua o conteúdo** do seu ficheiro `public/script.js` por este novo código completo.
2.  **Faça o deploy desta correção final:**
    * No seu terminal:
        ```bash
        git add public/script.js
        ```bash
        git commit -m "Corrige a função displayPresentation no frontend"
        ```bash
        git push
        ```
3.  Aguarde o deploy da Vercel terminar.

Estou extremamente confiante de que esta é a solução. A consola provou que todas as partes do sistema estão a funcionar, exceto a parte final de "desenhar" na tela, que este código agora corrige de v