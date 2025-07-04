document.addEventListener('DOMContentLoaded', () => {
    // --- Seleção de Elementos ---
    const outputTypeSelect = document.getElementById('outputType');
    const improvementLevelSelect = document.getElementById('improvementLevel');
    const slideCountContainer = document.getElementById('slideCountContainer');
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const submitButton = document.getElementById('submitButton');
    const copyButton = document.getElementById('copyButton');
    const exportButton = document.getElementById('exportButton');
    const presentationStyleSelect = document.getElementById('presentationStyle');
    const logoUploadInput = document.getElementById('logoUpload');
    const loader = document.getElementById('loader');

    let generatedData = null;
    let uploadedLogoData = null;

    // --- Lógica de Interface Dinâmica ---
    function toggleSlideCountVisibility() {
        if (outputTypeSelect.value === 'presentation') {
            slideCountContainer.style.display = 'flex';
        } else {
            slideCountContainer.style.display = 'none';
        }
    }
    outputTypeSelect.addEventListener('change', toggleSlideCountVisibility);
    toggleSlideCountVisibility();

    // --- Evento de Upload de Logótipo ---
    logoUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            uploadedLogoData = null;
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedLogoData = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    // --- Evento Principal ---
    submitButton.addEventListener('click', async () => {
        const body = {
            inputText: inputText.value,
            outputType: outputTypeSelect.value,
            improvementLevel: improvementLevelSelect.value,
            slideCount: document.getElementById('slideCount').value,
            tone: document.getElementById('tone').value,
            audience: document.getElementById('audience').value,
        };

        if (!body.inputText.trim()) {
            alert('Por favor, forneça o texto de entrada.');
            return;
        }

        outputText.innerHTML = ''; 
        if (body.outputType === 'report') {
            outputText.classList.add('white-bg');
        } else {
            outputText.classList.remove('white-bg');
        }
        loader.style.display = 'block';
        copyButton.style.display = 'none';
        exportButton.style.display = 'none';
        submitButton.disabled = true;
        generatedData = null;

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro do servidor: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.slides && data.slides.length > 0) {
                generatedData = data.slides;
                renderOutput(generatedData, body.outputType);
                copyButton.style.display = 'block';
                exportButton.style.display = 'block';
            } else {
                throw new Error("A IA não conseguiu estruturar o conteúdo a partir do texto fornecido.");
            }

        } catch (error) {
            console.error('FALHA NO FRONTEND:', error);
            outputText.innerHTML = `<div class="error-box"><h4>Ocorreu um erro:</h4><p>${error.message}</p></div>`;
        } finally {
            loader.style.display = 'none';
            submitButton.disabled = false;
        }
    });

    // --- Funções de Renderização ---
    function renderOutput(slides, outputType) {
        outputText.innerHTML = '';
        if (!slides || !Array.isArray(slides)) return;

        slides.forEach(slide => {
            const slideContainer = document.createElement('div');
            slideContainer.className = (outputType === 'report') 
                ? 'report-slide-container' 
                : 'presentation-slide-container';
            
            slideContainer.innerHTML = `
                <h2 class="slide-title">${slide.titulo || 'Seção'}</h2>
                <h3 class="slide-subtitle">${slide.subtitulo || ''}</h3>
            `;

            const componentsContainer = document.createElement('div');
            componentsContainer.className = 'slide-components';
            
            if (slide.components && Array.isArray(slide.components)) {
                slide.components.forEach(component => {
                    const componentWrapper = document.createElement('div');
                    componentWrapper.className = 'component-wrapper';
                    
                    switch (component.type) {
                        case 'kpi_grid': componentWrapper.appendChild(renderKpiGrid(component.data)); break;
                        case 'chart': componentWrapper.appendChild(renderChart(component.data)); break;
                        case 'table': componentWrapper.appendChild(renderTable(component.data)); break;
                        case 'insights_grid': componentWrapper.appendChild(renderInsightsGrid(component.data)); break;
                        case 'summary': componentWrapper.appendChild(renderSummary(component.data)); break;
                        case 'text_with_image': componentWrapper.appendChild(renderTextWithImage(component.data)); break;
                    }
                    componentsContainer.appendChild(componentWrapper);
                });
            }
            slideContainer.appendChild(componentsContainer);
            outputText.appendChild(slideContainer);
        });
    }

    function renderKpiGrid(data) {
        const grid = document.createElement('div');
        grid.className = 'kpi-grid';
        if (!data || !Array.isArray(data)) return grid;
        data.forEach(kpi => {
            if (!kpi) return;
            const card = document.createElement('div');
            card.className = 'kpi-card';
            card.innerHTML = `<span class="kpi-label">${kpi.label || 'Métrica'}</span><span class="kpi-value">${kpi.value || 'N/A'}</span>`;
            grid.appendChild(card);
        });
        return grid;
    }

    function renderChart(data) {
        const container = document.createElement('div');
        container.className = 'chart-container';
        if (!data || !Array.isArray(data.labels) || !Array.isArray(data.values)) return container;
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: data.chartType === 'pie', labels: { color: '#333' } } }, scales: { y: { ticks: { color: '#555' }, grid: { color: '#eee' } }, x: { ticks: { color: '#555' }, grid: { color: '#eee' } } } };
        new Chart(canvas, { type: data.chartType || 'bar', data: { labels: data.labels, datasets: [{ data: data.values, backgroundColor: ['#5A67D8', '#4299E1', '#38B2AC', '#ED8936', '#ECC94B', '#F56565'] }] }, options: chartOptions });
        return container;
    }

    function renderTable(data) {
        const table = document.createElement('table');
        table.className = 'data-table';
        if (!data || !Array.isArray(data) || data.length === 0) return table;
        const thead = table.createTHead();
        const tbody = table.createTBody();
        const headerRow = thead.insertRow();
        (data[0] || []).forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText || '';
            headerRow.appendChild(th);
        });
        data.slice(1).forEach(rowData => {
            const row = tbody.insertRow();
            (rowData || []).forEach(cellData => {
                const cell = row.insertCell();
                cell.textContent = cellData || '';
            });
        });
        return table;
    }
    
    function renderInsightsGrid(data) {
        const grid = document.createElement('div');
        grid.className = 'insights-grid';
        if (!data || !Array.isArray(data)) return grid;
        data.forEach(insight => {
            if (!insight) return;
            const card = document.createElement('div');
            card.className = 'insight-card';
            card.innerHTML = `<h4>${insight.title || 'Insight'}</h4><p>${insight.text || 'Não foi possível extrair detalhes.'}</p>`;
            grid.appendChild(card);
        });
        return grid;
    }

    function renderSummary(data) {
        const summary = document.createElement('p');
        summary.className = 'summary-text';
        if (data && typeof data.text === 'string') { summary.textContent = data.text; }
        return summary;
    }
    
    function renderTextWithImage(data) {
        const container = document.createElement('div');
        container.className = 'text-with-image-container';
        if (!data) return container;

        if (data.ilustracao) {
            const image = document.createElement('img');
            image.src = data.ilustracao;
            image.className = 'slide-illustration';
            container.appendChild(image);
        }
        const text = document.createElement('p');
        text.className = 'summary-text';
        text.textContent = data.texto || '';
        container.appendChild(text);
        return container;
    }

    // --- Função de Exportação Completa ---
    async function exportToPptx() {
        if (!generatedData) return;

        const pres = new PptxGenJS();
        pres.layout = "LAYOUT_WIDE";
        const style = presentationStyleSelect.value;
        let theme = {};

        switch (style) {
            case 'Criativo': theme = { background: { color: "1A1A1A" }, titleColor: "FEA82F", subtitleColor: "9B59B6", textColor: "F1F1F1", fontFace: "Montserrat" }; break;
            case 'Minimalista': theme = { background: { color: "FFFFFF" }, titleColor: "222222", subtitleColor: "AAAAAA", textColor: "555555", fontFace: "Helvetica Light" }; break;
            case 'Acadêmico': theme = { background: { color: "FFFFFF" }, titleColor: "00205B", subtitleColor: "A50026", textColor: "000000", fontFace: "Garamond" }; break;
            default: theme = { background: { color: "FFFFFF" }, titleColor: "00407A", subtitleColor: "0066CC", textColor: "333333", fontFace: "Calibri" }; break;
        }

        const mainTitle = generatedData[0]?.titulo || "Apresentação";
        
        // Adiciona o slide mestre
        let masterObjects = [{ text: { text: mainTitle, options: { x: 0.5, y: 5.3, w: "50%", h: 0.25, fontFace: theme.fontFace, fontSize: 10, color: theme.subtitleColor } } }];
        if (uploadedLogoData) {
            masterObjects.push({ image: { data: uploadedLogoData, x: 12.3, y: 5.25, w: 0.5, h: 0.5 } });
        }
        pres.defineSlideMaster({ title: "MASTER_SLIDE", background: theme.background, objects: masterObjects });

        // Loop para criar cada slide
        for (const slideData of generatedData) {
            let pptxSlide = pres.addSlide({ masterName: "MASTER_SLIDE" });
            pptxSlide.addText(slideData.titulo || "Sem Título", { x: 0.5, y: 0.4, w: '90%', h: 0.75, fontSize: 36, bold: true, color: theme.titleColor, fontFace: theme.fontFace });
            pptxSlide.addText(slideData.subtitulo || "", { x: 0.5, y: 1.1, w: '90%', h: 0.5, fontSize: 20, color: theme.subtitleColor, fontFace: theme.fontFace });

            if (slideData.components && Array.isArray(slideData.components)) {
                for (const component of slideData.components) {
                    // A lógica de exportação para cada tipo de componente precisa ser implementada aqui
                    // Por exemplo:
                    if (component.type === 'text_with_image' && component.data) {
                        if(component.data.ilustracao) pptxSlide.addImage({ data: component.data.ilustracao, x: 0.5, y: 1.8, w: 5.5, h: 3.15 });
                        pptxSlide.addText(component.data.texto || "", { x: 6.5, y: 1.8, w: 6.3, h: 3.15, fontSize: 16, color: theme.textColor, fontFace: theme.fontFace, bullet: { indent: 20 } });
                    }
                    if (component.type === 'summary' && component.data) {
                        pptxSlide.addText(component.data.text, { x: 0.5, y: 1.8, w: '90%', h: 3, fontSize: 16, color: theme.textColor, fontFace: theme.fontFace });
                    }
                }
            }
        }

        pres.writeFile({ fileName: `mercuria-${style.toLowerCase()}.pptx` });
    }

    // --- Função de Copiar ---
    copyButton.addEventListener('click', () => { /* ... */ });

    exportButton.addEventListener('click', exportToPptx);
});
