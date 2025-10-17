// ========================================================
// CONFIGURAÇÃO INICIAL E VARIÁVEIS GLOBAIS
// ========================================================
const BR_BOUNDS = [[-34.0, -74.0], [5.3, -34.0]];
const map = L.map('map', {
    maxBounds: BR_BOUNDS,
    maxBoundsViscosity: 2.0,
    minZoom: 1,
    maxZoom: 15
}).setView([-14.2, -51.9], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Variáveis de estado global para o novo sistema WTSS
window.currentWtssResult = null;
let WTSS_COLLECTIONS_CACHE = []; // Cache para coleções disponíveis

// ========================================================
// ELEMENTOS DE INTERFACE
// ========================================================
const sidebar = document.getElementById('sidebar');
const input = document.getElementById("tag-input");
const suggestionsBox = document.getElementById("suggestions");
const selectedTagsContainer = document.getElementById("selected-tags");
const infoPanel = document.getElementById("info-panel-right");

let selectedTags = [];
let selectedMarker;
let selectedArea;

// ========================================================
// DADOS BASE
// ========================================================
const allSuggestions = [
    "CBERS4A", "Landsat-2", "CBERS-2B", "GOES-19", "Sentinel-2",
    "Sentinel-1", "MODIS Terra/Aqua", "Landsat series", "MODIS Aqua",
    "Sentinel-3 OLCI", "CBERS-4", "Estações meteorológicas / satélite", "CBERS WFI"
];

const sateliteIdMap = {
    "CBERS4A": "cbers4a",
    "CBERS-4": "cbers4",
    "Landsat-2": "landsat-2",
    "Landsat series": "landsat-2",
    "Sentinel-2": "sentinel2",
    "Sentinel-1": "sentinel1",
    "MODIS Terra/Aqua": "modis",
    "GOES-19": "goes16",
    "MODIS Aqua": "modis",
    "Sentinel-3 OLCI": "sentinel3",
    "CBERS-2B": "cbers2b",
    "Estações meteorológicas / satélite": "EtaCCDay_CMIP5-1",
    "CBERS WFI": "amazonia1"
};

const productNameToPopularName = {
    'mosaic-cbers4a-paraiba-3m-1': 'CBERS-4A (Paraíba)',
    'mosaic-cbers4-paraiba-3m-1': 'CBERS-4 (Paraíba)',
    'AMZ1-WFI-L4-SR-1': 'Amazônia-1 (WFI)',
    'LCC_L8_30_16D_STK_Cerrado-1': 'Landsat-8 (Cerrado 16D)',
    'myd13q1-6.1': 'MODIS (NDVI/EVI 16D)',
    'mosaic-s2-yanomami_territory-6m-1': 'Sentinel-2 (Yanomami 6M)',
    'LANDSAT-16D-1': 'Landsat (Data Cube 16D)',
    'S2-16D-2': 'Sentinel-2 (Data Cube 16D)',
    'prec_merge_daily-1': 'Precipitação Diária',
    'EtaCCDay_CMIP5-1': 'Modelo Climático (CMIP5)'
};

// Substitua o seu bloco WTSS Config & Fallback por este:
// ========================================================
// WTSS Config & Fallback Centralizado
// ========================================================
const FALLBACK_ATTRIBUTES_MAP = {
    'CBERS4-MUX-2M-1': [
        'NDVI', 'EVI', 'blue', 'green', 'red', 'nir08', 'swir16', 'swir22', 
        'coastal', 'qa_pixel', 'CLEAROB', 'TOTALOB', 'PROVENANCE', 'DATASOURCE'
    ],
    'CBERS4-WFI-16D-2': [
        'NDVI', 'EVI', 'blue', 'green', 'red', 'nir08', 'swir16', 'swir22', 
        'coastal', 'qa_pixel', 'CLEAROB', 'TOTALOB', 'PROVENANCE', 'DATASOURCE'
    ],
    'CBERS-WFI-8D-1': [
        'NDVI', 'EVI', 'blue', 'green', 'red', 'nir08', 'swir16', 'swir22', 
        'coastal', 'qa_pixel', 'CLEAROB', 'TOTALOB', 'PROVENANCE', 'DATASOURCE' 
    ],
    'LANDSAT-16D-1': [
        'NDVI', 'EVI', 'blue', 'green', 'red', 'nir08', 'swir16', 'swir22', 
        'coastal', 'qa_pixel', 'CLEAROB', 'TOTALOB', 'PROVENANCE', 'DATASOURCE'
    ],
    'mod11a2-6.1': [ 
        'LST_Day_1km', 'LST_Night_1km', 'QC_Day', 'QC_Night'
    ],
    'mod13q1-6.1': [
        'NDVI', 'EVI', 'blue', 'green', 'red', 'nir08', 'swir16', 'swir22', 
        'pixel_reliability', 'VI_Quality', 'DetailedQA'
    ],
    'myd13q1-6.1': [ // MODIS Aqua NDVI/EVI 16D
        'NDVI', 'EVI', 'blue', 'green', 'red', 'nir08', 'swir16', 'swir22', 
        'pixel_reliability', 'VI_Quality', 'DetailedQA'
    ],
    'S2-16D-2': [
        'NDVI', 'EVI', 'blue', 'green', 'red', 'nir08', 'swir16', 'swir22', 
        'qa_pixel', 'cloud_mask', 'snow_mask', 'water_mask'
    ]
};


// ========================================================
// CONTROLE DO SIDEBAR
// ========================================================
window.toggleMenu = function () {
    sidebar.classList.toggle('ativo');
};

// ========================================================
// FUNÇÕES DE SELEÇÃO NO MAPA
// ========================================================
function createSelectionVisuals(latlng) {
    if (selectedMarker) map.removeLayer(selectedMarker);
    if (selectedArea) map.removeLayer(selectedArea);

    selectedMarker = L.circleMarker(latlng, {
        radius: 10, color: "#ff0000", weight: 3, fillColor: "#ff4d4d", fillOpacity: 0.7
    }).addTo(map);

    selectedArea = L.circle(latlng, {
        radius: 20000, color: "#ff0000", weight: 2, fillColor: "#ff4d4d", fillOpacity: 0.15
    }).addTo(map);
}
// ========================================================
// TUTORIAL INTERATIVO AO INICIAR O SITE
// ========================================================
const tutorialOverlay = document.getElementById('tutorial-overlay');
const tutorialNextBtn = document.getElementById('tutorial-next');

// Passos do tutorial
const tutorialSteps = [
  {
    text: "🌍 Este é o mapa interativo do Aetheris. Clique em qualquer ponto para explorar dados de satélites.",
  },
  {
    text: "🔍 Use o campo de busca na lateral para selecionar os satélites ou produtos que deseja visualizar.",
  },
  {
    text: "📊 Após clicar no mapa, o painel à direita mostrará os produtos disponíveis e séries temporais.",
  },
  {
    text: "✅ Dica: Clique nas bandas para ver gráficos de NDVI e EVI ao longo do tempo.",
  },
  {
    text: "✨ Pronto! Agora explore o mapa livremente. Divirta-se com o Aetheris!",
  }
];

let currentStep = 0;

// Mostra o tutorial só na primeira visita
if (!localStorage.getItem("tutorialCompleted")) {
  tutorialOverlay.classList.remove("hidden");
  updateTutorialStep();
}

tutorialNextBtn.addEventListener("click", () => {
  currentStep++;
  if (currentStep < tutorialSteps.length) {
    updateTutorialStep();
  } else {
    tutorialOverlay.classList.add("hidden");
    localStorage.setItem("tutorialCompleted", "true"); // não mostrar de novo
}})
function updateTutorialStep() {
    const box = tutorialOverlay.querySelector(".tutorial-box");
    box.querySelector("p").innerHTML = tutorialSteps[currentStep].text;
    tutorialNextBtn.textContent = currentStep === tutorialSteps.length - 1 ? "Concluir ✅" : "Próximo ➤";
  }

// ========================================================
// TAG SELECTOR (filtros de satélite)
// ========================================================
function showSuggestions(filter) {
    suggestionsBox.innerHTML = "";
    const filtered = allSuggestions.filter(item =>
        item.toLowerCase().includes(filter) && !selectedTags.includes(item)
    );
    filtered.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        li.addEventListener("click", () => selectTag(item));
        suggestionsBox.appendChild(li);
    });
    suggestionsBox.style.display = filtered.length ? "block" : "none";
}

function selectTag(tag) {
    selectedTags.push(tag);
    input.value = "";
    suggestionsBox.innerHTML = "";
    renderSelectedTags();
    input.focus();
}

window.removeTag = function (tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    renderSelectedTags();
    showSuggestions(input.value);
};

function renderSelectedTags() {
    selectedTagsContainer.innerHTML = "";
    selectedTags.forEach(tag => {
        const tagEl = document.createElement("div");
        tagEl.classList.add("tag");
        tagEl.innerHTML = `${tag} <span class="remove" onclick="removeTag('${tag}')">&times;</span>`;
        selectedTagsContainer.appendChild(tagEl);
    });
}

// ========================================================
// ABAS DO PAINEL DIREITO (STAC / WTSS)
// ========================================================
function showTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        showTab(tabId);
    });
});

function showInfoPanelSTAC(htmlContent) {
    const panel = document.getElementById('info-panel-right');
    const tab = document.getElementById('stac-tab');
    tab.innerHTML = htmlContent;
    panel.classList.add('visible');
    showTab('stac-tab');
}

function showInfoPanelWTSS(htmlContent) {
    const panel = document.getElementById('info-panel-right');
    const tab = document.getElementById('wtss-tab');
    tab.innerHTML = htmlContent;
    panel.classList.add('visible');
    showTab('wtss-tab');
}

function hideInfoPanel() {
    document.getElementById('info-panel-right').classList.remove('visible');
}

// ========================================================
// FUNÇÕES DE CHART E API (STAC)
// ========================================================
function applyScale(rawValue) {
    return rawValue * 0.0001;
}

window.fetchTimeSeriesAndPlot = async function (lat, lng, coverage, band, friendlyName) {
    const tempContent = `<div class="satelite-popup-header"><strong>Carregando Série Temporal STAC...</strong></div><p>Produto: ${friendlyName}</p><p>Aguarde...</p>`;
    showInfoPanelSTAC(tempContent);

    try {
        // 'band' agora deve ser uma lista de bandas separadas por vírgula
        const bandQuery = band ? `&bands=${band}` : '';
        const response = await fetch(`http://localhost:3000/api/timeseries?lat=${lat}&lng=${lng}&coverage=${coverage}${bandQuery}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details?.description || `Erro ${response.status} na API Local.`);
        }

        const data = await response.json();

        if (!data || !data.timeline || data.timeline.length === 0) {
            console.warn(`STAC: API retornou dados vazios para ${coverage}.`, data);
            showInfoPanelSTAC(`<div class="satelite-popup-header"><strong>Série Temporal STAC: ${friendlyName}</strong></div><p>A API retornou dados, mas a série temporal está vazia (linha do tempo vazia).</p>`);
            return;
        }

        createChart(lat, lng, friendlyName, data);
    } catch (error) {
        console.error('Erro ao plotar série temporal STAC:', error);
        // Usando a classe CSS para erros
        showInfoPanelSTAC(`<div class="satelite-popup-header text-error"><strong>Erro ao buscar dados:</strong></div><p>${error.message}</p>`);
    }
};

function createChart(lat, lng, title, timeSeriesData) {
    if (!timeSeriesData || !timeSeriesData.timeline || timeSeriesData.timeline.length === 0) {
        showInfoPanelSTAC(`<div class="satelite-popup-header"><strong>Série Temporal STAC: ${title}</strong></div><p>Nenhum dado encontrado.</p>`);
        return;
    }

    const chartId = `chart-${Date.now()}`;
    const bands = timeSeriesData.attributes;
    const chartDatasets = bands.map((band, index) => {
        const rawValues = timeSeriesData.values.map(v => v[band]);
        const scaledData = rawValues.map(val => (val !== undefined && val !== null) ? applyScale(val) : null);
        let color = `hsl(${index * 60}, 70%, 50%)`;
        if (band.toUpperCase().includes('NDVI')) color = 'rgba(0, 128, 0, 1)';
        else if (band.toUpperCase().includes('EVI')) color = 'rgba(0, 0, 255, 1)';
        return {
            label: band,
            data: timeSeriesData.timeline.map((date, i) => ({ x: date, y: scaledData[i] })),
            borderColor: color,
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 3
        };
    });


    const panelHtml = `
        <div class="chart-popup-content">
            <div class="satelite-popup-header"><strong>Série Temporal STAC: ${title}</strong></div>
            <p>Atributos: ${bands.join(', ')}</p>
            <hr class="satelite-popup-divider">
            <div class="stac-canvas-wrapper"> <canvas id="${chartId}"></canvas>
            </div>
            <p class="chart-footer stac-chart-footer">Valores reais (escala padrão aplicada).</p>
        </div>`;

    showInfoPanelSTAC(panelHtml);

    setTimeout(() => {
        const ctx = document.getElementById(chartId);
        if (!ctx) return;
        new Chart(ctx, {
            type: 'line',
            data: { datasets: chartDatasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                parsing: false,
                scales: {
                    x: { type: 'time', time: { unit: 'month', tooltipFormat: 'dd MMM yyyy' }, title: { display: true, text: 'Data' } },
                    y: { title: { display: true, text: 'Valor (Escala aplicada)' }, min: -0.2, max: 1.05 }
                }
            }
        });
    }, 500);
}

// ========================================================
// WTSS - LÓGICA MULTI-ESTÁGIO E COMPARAÇÃO
// ========================================================

/**
 * ESTÁGIO 0: Busca e armazena em cache todas as coleções WTSS com atributos válidos.
 */
async function listWTSSTitleAndAttributes(lat, lon) {
    const baseUrl = "https://data.inpe.br/bdc/wtss/v4/";

    if (WTSS_COLLECTIONS_CACHE.length > 0) {
        return { collections: WTSS_COLLECTIONS_CACHE, lat, lon };
    }

    try {
        const listResponse = await fetch(`${baseUrl}list_coverages`);
        if (!listResponse.ok) throw new Error(`Erro ${listResponse.status} ao listar coberturas.`);

        const listData = await listResponse.json();
        const availableCoverages = listData.coverages || [];

        // ... (dentro da função listWTSSTitleAndAttributes)

        const collectionDetails = [];
        for (const name of availableCoverages) {
            try {
                const detailUrl = `${baseUrl}${name}`;
                const detailResponse = await fetch(detailUrl);
                
                if (detailResponse.ok) {
                    const details = await detailResponse.json();
                    
                    let availableAttributes = details.attributes?.map(attr => attr.attribute) ?? [];
                    
                    // CORREÇÃO ESSENCIAL: Tenta buscar a lista de atributos do mapa de fallback
                    if (availableAttributes.length === 0) {
                        const fallbackList = FALLBACK_ATTRIBUTES_MAP[name];
                        if (fallbackList) {
                            availableAttributes = fallbackList;
                            // console.warn(`WTSS: Usando FALLBACK para coleção: ${name}`);
                        }
                    }

                    if (availableAttributes.length > 0) {
                        collectionDetails.push({
                            title: name,
                            start_date: details.timeline[0],
                            end_date: details.timeline[details.timeline.length - 1],
                            availableAttributes: availableAttributes
                        });
                    }
                }
            } catch (e) {
                // Silenciosamente ignora coleções com falha na requisição de detalhe
            }
        }
        
// ... (continua com a definição do cache e o retorno)

        WTSS_COLLECTIONS_CACHE = collectionDetails;

        if (collectionDetails.length === 0) {
            throw new Error("Nenhuma coleção WTSS funcional foi encontrada após filtragem.");
        }

        return { collections: collectionDetails, lat, lon };

    } catch (err) {
        console.error("Erro ao listar coleções WTSS:", err);
        return { error: err.message, collections: [], lat, lon };
    }
}


// ESTÁGIO 1: Seleção da Coleção (Novo Painel de Entrada)
window.showWTSSElectionPanel = async function (lat, lng) {
    // 1. Busca os metadados (Estágio 0)
    const result = await listWTSSTitleAndAttributes(lat, lng);

    // Armazena o resultado globalmente para o botão de limpeza
    window.currentWtssResult = { ...result, lat, lon: lng };

    if (result.error || result.collections.length === 0) {
        showInfoPanelWTSS(`
            <h3>📈 Catálogos WTSS</h3>
            <div class="wtss-error-message">
                <strong>Falha ao buscar catálogos.</strong>
                <p>Detalhes: ${result.error || 'Nenhuma coleção funcional encontrada.'}</p>
            </div>
        `);
        return;
    }

    let panelContent = `
        <div id="wtss-controls-panel" class="wtss-panel wtss-controls-sticky">
            <h3>1. Escolha a Coleção</h3>
            <p>Selecione um catálogo para plotar:</p>
           <hr class="satelite-popup-divider">
            <div class="wtss-collection-list">
                ${result.collections.map(col => `
                    <div class="product-info-block product-selectable" 
                        onclick="showWTSSAttributeSelection('${col.title}', ${lat}, ${lng})">
                        <strong class="product-title">🛰️ ${col.title}</strong>
                        <p style="font-size: 0.8em;">Atributos: ${col.availableAttributes.slice(0, 3).join(', ')}${col.availableAttributes.length > 3 ? '...' : ''}</p>
                    </div>
                `).join('')}
            </div>
            <hr class="satelite-popup-divider wtss-divider">

            <button onclick="clearWTSSEmpilhados(window.currentWtssResult)" class="action-button secondary-button wtss-full-width-button">
                Limpar Todos os Gráficos
            </button>
        </div>
        <div id="wtss-graph-area"></div>
    `;

    // Sobrescreve o conteúdo da aba
    document.getElementById('wtss-tab').innerHTML = panelContent;
    document.getElementById('wtss-tab').style.overflowY = 'auto';

    // Garante que a aba esteja ativa e visível
    showTab('wtss-tab');
};


// ESTÁGIO 2: Seleção de Atributos
window.showWTSSAttributeSelection = function (collectionTitle, lat, lng) {
    const collection = WTSS_COLLECTIONS_CACHE.find(c => c.title === collectionTitle);

    if (!collection) {
        window.showWTSSElectionPanel(lat, lng); // Volta para a seleção
        return;
    }

    const defaultAttribute = collection.availableAttributes.find(attr => attr.toUpperCase().includes('NDVI')) || collection.availableAttributes[0];

    const attributeSelector = `
        <select id="wtss-attribute-select" class="wtss-full-width-select">
            ${collection.availableAttributes.map(attr =>
        `<option value="${attr}" ${attr === defaultAttribute ? 'selected' : ''}>${attr}</option>`
    ).join('')}
        </select>
    `;

    // --- CÁLCULO DE PERÍODO (01 ANOS) PARA EXIBIÇÃO NO PAINEL ---
    const now = new Date();
    const date01YearsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const calculated_start_date = date01YearsAgo.toISOString().split('T')[0];
    const calculated_end_date = now.toISOString().split('T')[0];
    // -----------------------------------------------------------

    const controlsPanelHTML = `
        <div id="wtss-controls-panel" class="wtss-panel wtss-controls-sticky">
            <h3>2. Escolha o Atributo</h3>
            <button onclick="showWTSSElectionPanel(${lat}, ${lng})" class="action-button secondary-button" style="width: 100%; margin-bottom: 10px;">
                ← Mudar Coleção
            </button>
            <p><b>Coleção:</b> ${collectionTitle}</p>
            <p><b>Período Solicitado:</b> ${calculated_start_date} → ${calculated_end_date}</p>
            <p><b>Atributo:</b> ${attributeSelector}</p>
            
            <button onclick="fetchWTSSTimeSeriesAndPlot(${lat}, ${lng}, '${collectionTitle}', document.getElementById('wtss-attribute-select').value)"
                class="action-button wtss-full-width-button plot-button-spacing">
                Plotar Série Temporal
            </button>
            <button onclick="clearWTSSEmpilhados(window.currentWtssResult)" class="action-button secondary-button wtss-full-width-button">
                Limpar Todos os Gráficos
            </button>
            <hr class="satelite-popup-divider wtss-divider">
        </div>
    `;

    // Apenas substitui a área de controle no topo (mantendo os gráficos abaixo)
    document.getElementById('wtss-controls-panel').outerHTML = controlsPanelHTML;
    document.getElementById('wtss-tab').scrollTop = 0;
};


// Função de limpeza de gráficos empilhados
window.clearWTSSEmpilhados = function () {
    // Apenas limpa a área dos gráficos, mantendo o painel de controle
    const graphArea = document.getElementById('wtss-graph-area');
    if (graphArea) {
        graphArea.innerHTML = '';
    }
}

// Função que busca a série temporal WTSS e plota o gráfico
window.fetchWTSSTimeSeriesAndPlot = async function (lat, lon, coverage, attribute) {
    const friendlyName = `WTSS - ${coverage} (${attribute})`;
    
    const graphArea = document.getElementById('wtss-graph-area');
    if (!graphArea) {
        console.error("Área de gráfico WTSS não encontrada.");
        return;
    }
    
    const tempContent = `<div class="satelite-popup-header"><strong>Carregando Série Temporal WTSS...</strong></div><p>Atributo: ${attribute}</p><p>Aguarde...</p>`;
    // Adiciona a mensagem de carregamento na área de gráficos
    graphArea.insertAdjacentHTML('beforeend', `<div id="wtss-loading-message">${tempContent}</div>`); 
    document.getElementById('wtss-tab').scrollTop = 0; 

    try {
        const baseUrl = "https://data.inpe.br/bdc/wtss/v4/";
        
        // --- LÓGICA DE CÁLCULO DE PERÍODO (1 ANO) ---
        const now = new Date();
        const date01YearsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const calculated_end_date = now.toISOString().split('T')[0]; 
        const calculated_start_date = date01YearsAgo.toISOString().split('T')[0];
        // ---------------------------------------------
        
        const timeSeriesUrl = `${baseUrl}time_series?coverage=${coverage}&attributes=${attribute}&start_date=${calculated_start_date}&end_date=${calculated_end_date}&latitude=${lat}&longitude=${lon}`;
        
        const timeSeriesResponse = await fetch(timeSeriesUrl);
        if (!timeSeriesResponse.ok) {
             const errorDetails = await timeSeriesResponse.text();
             throw new Error(`Erro ${timeSeriesResponse.status}. Detalhes: ${errorDetails.substring(0, 100)}...`);
        }
        
        const timeSeriesData = await timeSeriesResponse.json();
        
        const attributesResult = timeSeriesData.result?.attributes ?? [];
        const attrData = attributesResult.find(a => a.attribute === attribute);
        
        if (!attrData || !attrData.values || attrData.values.length === 0) {
             throw new Error(`Nenhum dado encontrado para o atributo ${attribute} no período ${calculated_start_date} a ${calculated_end_date}.`);
        }

        // Passa a timeline e o dado para a plotagem que empilha
        createWTSSTimeSeriesChart(friendlyName, attrData.values, timeSeriesData.result.timeline, attribute, coverage);
        
    } catch (error) {
        console.error('Erro ao plotar série temporal WTSS:', error);
        
        // Remove a mensagem de loading e mostra o erro
        const loadingMessage = document.getElementById('wtss-loading-message');
        if (loadingMessage) loadingMessage.remove();

        // CORREÇÃO: Removendo style="margin-top: 10px;"
        document.getElementById('wtss-graph-area').insertAdjacentHTML('beforeend', `<div class="wtss-error-message wtss-error-margin"><strong>Erro WTSS:</strong> ${error.message}</div>`);
    }
};

// Cria o gráfico para o WTSS (PLOTA E EMPILHA)
function createWTSSTimeSeriesChart(title, values, timeline, attribute, coverage) {
    // 1. Gera um ID ÚNICO para o novo bloco e o canvas
    const uniqueId = `chart-${coverage}-${attribute}-${Date.now()}`;
    
    const graphArea = document.getElementById('wtss-graph-area');
    if (!graphArea) return; // Garante que a área exista

    // 2. Remove a mensagem de loading
    const loadingMessage = document.getElementById('wtss-loading-message');
    if (loadingMessage) loadingMessage.remove();

    // 3. Cria o novo bloco HTML para o gráfico
    const chartBlock = document.createElement('div');
    chartBlock.id = uniqueId;
    chartBlock.classList.add('wtss-chart-block'); 
    
    // CORREÇÃO: Todos os estilos INLINE foram removidos
    chartBlock.innerHTML = `
        <div class="wtss-panel wtss-chart-container-border">
            <h3 class="wtss-chart-header">
                Série Temporal: ${title}
                <span class="remove remove-chart-btn" onclick="document.getElementById('${uniqueId}').remove()">&times;</span>
            </h3>
            <p><b>Atributo:</b> ${attribute}</p>
            <hr class="satelite-popup-divider">
            <div class="wtss-canvas-wrapper">
                <canvas id="canvas-${uniqueId}"></canvas>
            </div>
            <p class="chart-footer stac-chart-footer">Valores reais (escala padrão aplicada).</p>
        </div>
    `;

    // 4. ANEXA o novo bloco à área de gráficos
    graphArea.appendChild(chartBlock);
    
    // 5. Rola a aba para cima para mostrar o painel de controle
    document.getElementById('wtss-tab').scrollTop = 0; 

    // 6. Inicializa o gráfico no novo canvas
    setTimeout(() => {
        const ctx = document.getElementById(`canvas-${uniqueId}`);
        if (!ctx) return;
        
        const chartDatasets = [{
            label: attribute,
            data: timeline.map((date, i) => ({ x: date, y: (values[i] !== undefined && values[i] !== null) ? applyScale(values[i]) : null })),
            borderColor: attribute.toUpperCase().includes('NDVI') ? 'green' : 'blue',
            borderWidth: 2,
            fill: false,
            pointRadius: 3
        }];

        new Chart(ctx, {
            type: 'line',
            data: { labels: timeline, datasets: chartDatasets },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                    x: { type: 'time', time: { unit: 'month', tooltipFormat: 'dd MMM yyyy' }, title: { display: true, text: 'Data' } },
                    y: { title: { display: true, text: 'Valor (Escala aplicada)' }, min: -0.2, max: 1.05 } 
                }
            }
        });
        
    }, 500);
}



// ========================================================
// CLIQUE NO MAPA (STAC + WTSS) - LÓGICA DE INTERAÇÃO
// ========================================================
map.on('click', async function (e) {
    const { lat, lng } = e.latlng;

    hideInfoPanel();
    createSelectionVisuals(e.latlng);

    let pulse = L.circle(e.latlng, { radius: 5000, color: "#ff0000", fillColor: "#ff4d4d", fillOpacity: 0.25 }).addTo(map);
    setTimeout(() => { map.removeLayer(pulse); }, 600);

    showInfoPanelSTAC("<strong>📍 Ponto selecionado</strong><br>Buscando produtos STAC...");

    try {
        // --- LÓGICA STAC: APENAS METADADOS ---
        const satelitesQuery = selectedTags.map(tag => sateliteIdMap[tag]).filter(id => id).join(',');
        const response = await fetch(`http://localhost:3000/api/geodata?lat=${lat}&lng=${lng}&satelites=${satelitesQuery}`);
        if (!response.ok) throw new Error(`Erro ao buscar metadados STAC: ${response.status}`);

        const data = await response.json();
        let panelContent = `<div class="satelite-popup-header"><strong>Resultados STAC:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</div><hr class="satelite-popup-divider">`;

        if (data.length > 0) {
            data.forEach(item => {
                const popularName = productNameToPopularName[item.productName] || item.productName;
                const availableBands = (item.variables || []).map(v => v.name || v.id).filter(Boolean);

                // === STAC: APENAS METADADOS, SEM BOTÃO ===
                panelContent += `
                    <div class="product-info-block">
                        <strong class="product-title">🛰️ ${popularName}</strong>
                        <div class="product-details">
                            <p class="product-name">(${item.productName})</p>
                            <p class="product-description">${item.title || 'Sem descrição disponível.'}</p>
                            <p class="product-bands"><strong>Bandas:</strong> ${availableBands.join(', ') || 'N/A'}</p>
                        </div>
                    </div>`;
            });
        } else {
            panelContent += `<p>Nenhum produto STAC encontrado para os filtros ativos.</p>`;
        }

        showInfoPanelSTAC(panelContent);

        // --- LÓGICA WTSS CORRIGIDA: Inicia a seleção de coleções ---
        await showWTSSElectionPanel(lat, lng);

    } catch (error) {
        console.error('Erro geral no clique do mapa:', error);
        showInfoPanelSTAC(`<div class="text-error"><strong>Erro Geral:</strong> ${error.message}</div>`);

        // Tenta inicializar o painel WTSS mesmo após um erro STAC
        await showWTSSElectionPanel(lat, lng);
    }
});

// ========================================================
// EVENTOS DE INPUT
// ========================================================
input.addEventListener("focus", () => showSuggestions(""));
input.addEventListener("input", () => showSuggestions(input.value.toLowerCase()));
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        const value = input.value.trim();
        const match = allSuggestions.find(item => item.toLowerCase() === value.toLowerCase());
        if (match && !selectedTags.includes(match)) selectTag(match);
    }
});

document.addEventListener("click", function (e) {
    const wrapper = document.querySelector(".tag-selector");
    if (wrapper && !wrapper.contains(e.target)) {
        suggestionsBox.innerHTML = "";
    }
});
