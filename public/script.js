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

            // Adicionando um log para ver o status da resposta
            console.log("Status da resposta do servidor:", response.status, response.statusText);

            if (!response.ok) {
                // Tentamos ler o corpo do erro como texto, pois pode não ser JSON
                const errorText = await response.text();
                throw new Error(`Erro do servidor: ${response.status}. Resposta: ${errorText}`);
            }

            const data = await response.json();
            
            // Log para ver os dados recebidos
            console.log("Dados JSON recebidos com sucesso:", data);
            
            if (data.slides && data.slides.length > 0) {
                presentationData = data.slides;
                displayPresentation(presentationData);
                copyButton.style.display = 'block';
                exportButton.style.display = 'block';
            } else {
                throw new Error("A resposta da IA foi recebida, mas não continha slides válidos.");
            }

        } catch (error) {
            // --- INÍCIO DA CORREÇÃO DE DEPURAÇÃO ---
            // Agora, vamos mostrar o erro detalhado diretamente na tela.
            console.error('FALHA CRÍTICA NO FRONTEND:', error);
            outputText.innerHTML = `
                <div style="color: #ff8a80; padding: 15px;">
                    <h4>Ocorreu um erro ao processar a apresentação.</h4>
                    <p><strong>Detalhes do Erro:</strong></p>
                    <pre style="white-space: pre-wrap; word-wrap: break-word;">${error.message}</pre>
                    <p><strong>Stack Trace (para depuração):</strong></p>
                    <pre style="white-space: pre-wrap; word-wrap: break-word; font-size: 12px;">${error.stack}</pre>
                </div>
            `;
            // --- FIM DA CORREÇÃO DE DEPURAÇÃO ---
        } finally {
            loader.style.display = 'none';
            submitButton.disabled = false;
        }
    });

    function displayPresentation(slides) {
        // ... (esta função continua igual)
    }
    
    // ... (o resto do script.js continua igual)
});
