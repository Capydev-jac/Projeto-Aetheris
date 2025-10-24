
// ==============================
// Aetheris - Script Unificado
// Mapa + STAC + WTSS (com autoescala e exportação de gráficos)
// ==============================

// --------------------------------------
// MAPA (Leaflet)
// --------------------------------------
const BR_BOUNDS = [[-34.0, -74.0], [5.3, -34.0]];
const map = L.map('map', {
    maxBounds: BR_BOUNDS,
    maxBoundsViscosity: 2.0,
    minZoom: 3,
    maxZoom: 15
}).setView([-14.2, -51.9], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Variáveis de estado global para o novo sistema WTSS
window.currentWtssResult = null;
let WTSS_COLLECTIONS_CACHE = []; // Cache para coleções disponíveis

// --------------------------------------
// ELEMENTOS DE INTERFACE
// --------------------------------------
const sidebar = document.getElementById('sidebar');
const input = document.getElementById("tag-input");
const suggestionsBox = document.getElementById("suggestions");
const selectedTagsContainer = document.getElementById("selected-tags");
const infoPanel = document.getElementById("info-panel-right");

let selectedTags = [];
let selectedMarker;
let selectedArea;

// --------------------------------------
// DADOS BASE
// --------------------------------------
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

// WTSS Config & Fallback Centralizado
const FALLBACK_ATTRIBUTES_MAP = {
    'CBERS4-MUX-2M-1': [
        'NDVI', 'EVI', 'BAND5', 'BAND6', 'BAND7', 'BAND8', 'CMASK',
        'CLEAROB', 'TOTALOB', 'PROVENANCE',
    ],
    'CBERS4-WFI-16D-2': [
        'NDVI', 'EVI', 'BAND13', 'BAND14', 'BAND15', 'BAND16',
        'CMASK', 'CLEAROB', 'TOTALOB', 'PROVENANCE', 'DATASOURCE'
    ],
    'CBERS-WFI-8D-1': [
        'NDVI', 'EVI', 'BAND13', 'BAND14', 'BAND15', 'BAND16',
        'CMASK', 'CLEAROB', 'TOTALOB', 'PROVENANCE', 'DATASOURCE'
    ],
    'LANDSAT-16D-1': [
        'NDVI', 'EVI', 'blue', 'green', 'red', 'nir08', 'swir16', 'swir22',
        'coastal', 'qa_pixel', 'CLEAROB', 'TOTALOB', 'PROVENANCE', 'DATASOURCE'
    ],
    'mod11a2-6.1': [
        'LST_Day_1km', 'QC_Day', 'Day_view_time', 'Day_view_angl', "Clear_sky_days",
        "LST_Night_1km", "QC_Night", "Night_view_time", "Night_view_angl", "Emis_31",
        "Clear_sky_nights", "Emis_32"
    ],
    'mod13q1-6.1': [
        'NDVI', 'EVI', 'VI_Quality', 'composite_day_of_the_year', 'pixel_reliability', 'blue_reflectance', 'red_reflectance', 'NIR_reflectance',
        'MIR_reflectance', 'view_zenith_angle', 'sun_zenith_angle', "relative_azimuth_angle"
    ],
    'myd11a2-6.1': [
        'LST_Day_1km', 'QC_Day', 'Day_view_time', 'Day_view_angl', 'LST_Night_1km', 'QC_Night', 'Night_view_time', 'Night_view_angl',
        'Emis_31', 'Emis_32', 'Clear_sky_days', 'Clear_sky_nights'
    ],
    'myd13q1-6.1': [
        'NDVI', 'EVI', 'blue_reflectance', 'red_reflectance', 'NIR_reflectance', 'VI_Quality', 'view_zenith_angle', 'composite_day_of_the_year',
        'pixel_reliability', 'MIR_reflectance', 'sun_zenith_angle', "relative_azimuth_angle"
    ],
    'S2-16D-2': [
        'CLEAROB', 'TOTALOB', 'PROVENANCE', 'SCL', 'B01', 'B02', 'B04', 'B08', 'B8A', 'B09',
        'B03', 'B11', 'B12', 'EVI', 'NDVI', 'NBR', 'B05', 'B06', 'B07'
    ]
};
const WTSS_REFERENCE_COVERAGE = 'LANDSAT-16D-1';

// --------------------------------------
// CONTROLE DO SIDEBAR
// --------------------------------------
window.toggleMenu = function () {
    sidebar.classList.toggle('ativo');
};

// --------------------------------------
// SELEÇÃO NO MAPA
// --------------------------------------
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

// --------------------------------------
// TAG SELECTOR (filtros de satélite)
// --------------------------------------
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

// --------------------------------------
// ABAS DO PAINEL DIREITO (STAC / WTSS)
// --------------------------------------
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

// --------------------------------------
/* STAC - CHARTS / API */
// --------------------------------------
function applyScale(rawValue) {
    return rawValue * 0.0001;
}

window.fetchTimeSeriesAndPlot = async function (lat, lng, coverage, band, friendlyName) {
    const tempContent = `<div class="satelite-popup-header"><strong>Carregando Série Temporal STAC...</strong></div><p>Produto: ${friendlyName}</p><p>Aguarde...</p>`;
    showInfoPanelSTAC(tempContent);

    try {
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

    // 1) Monta os datasets primeiro
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

    // 2) Autoescala do eixo Y depois dos datasets
    const allY = chartDatasets.flatMap(d => d.data.map(p => p.y).filter(v => v !== null && v !== undefined));
    let yMin = -2.0, yMax = 1.5;
    if (allY.length) {
        const minV = Math.min(...allY);
        const maxV = Math.max(...allY);
        const pad = Math.max((maxV - minV) * 0.1, 0.1);
        yMin = minV - pad;
        yMax = maxV + pad;
    }

    const panelHtml = `
        <div class="chart-popup-content">
            <div class="satelite-popup-header"><strong>Série Temporal STAC: ${title}</strong></div>
            <p>Atributos: ${bands.join(', ')}</p>
            <hr class="satelite-popup-divider">
            <div class="stac-canvas-wrapper"><canvas id="${chartId}"></canvas></div>
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
                color: '#0001',
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: 'month', tooltipFormat: 'dd MMM yyyy' },
                        title: { display: true, text: 'Data', color: '#0001' },
                        ticks: { color: '#0001' },
                        grid: { color: 'rgba(0, 0, 0, 1)' }
                    },
                    y: {
                        title: { display: true, text: 'Valor (Escala aplicada)', color: '#0001' },
                        ticks: { color: '#0001' },
                        grid: { color: 'rgba(0,0,0,1)' },
                        min: yMin,
                        max: yMax
                    }
                }
            }
        });
    }, 500);
}

// --------------------------------------
// WTSS - LÓGICA MULTI-ESTÁGIO E COMPARAÇÃO
// --------------------------------------
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

        const collectionDetails = [];
        for (const name of availableCoverages) {
            try {
                const detailUrl = `${baseUrl}${name}`;
                const detailResponse = await fetch(detailUrl);

                if (detailResponse.ok) {
                    const details = await detailResponse.json();

                    let availableAttributes = details.attributes?.map(attr => attr.attribute) ?? [];

                    // Fallback de atributos quando o endpoint não retorna
                    if (availableAttributes.length === 0) {
                        const fallbackList = FALLBACK_ATTRIBUTES_MAP[name];
                        if (fallbackList) {
                            availableAttributes = fallbackList;
                        }
                    }

                    if (availableAttributes.length > 0) {
                        collectionDetails.push({
                            title: name,
                            start_date: details.timeline?.[0],
                            end_date: details.timeline?.[details.timeline.length - 1],
                            availableAttributes
                        });
                    }
                }
            } catch (e) {
                // Ignora coleções que falharam no detalhe
            }
        }

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

// ESTÁGIO 1: Seleção da Coleção
window.showWTSSElectionPanel = async function (lat, lng) {
    const result = await listWTSSTitleAndAttributes(lat, lng);
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

            <button onclick="exportAllWTSSCharts()" class="action-button secondary-button wtss-full-width-button export-button-spacing">
                ⬇️ Exportar Gráficos WTSS
            </button>

            <button onclick="clearWTSSEmpilhados(window.currentWtssResult)" class="action-button secondary-button wtss-full-width-button">
                Limpar Todos os Gráficos
            </button>
            <br>
        </div>
        <div id="wtss-graph-area"></div>
    `;

    document.getElementById('wtss-tab').innerHTML = panelContent;
    document.getElementById('wtss-tab').style.overflowY = 'auto';
    showTab('wtss-tab');
};

// ESTÁGIO 2: Seleção de Atributos
window.showWTSSAttributeSelection = function (collectionTitle, lat, lng) {
    const collection = WTSS_COLLECTIONS_CACHE.find(c => c.title === collectionTitle);
    if (!collection) {
        window.showWTSSElectionPanel(lat, lng);
        return;
    }

    const defaultAttribute = collection.availableAttributes.find(attr => attr.toUpperCase().includes('NDVI')) || collection.availableAttributes[0];
    const attributeSelector = `
        <select id="wtss-attribute-select" class="wtss-full-width-select">
            ${collection.availableAttributes.map(attr =>
        `<option value="${attr}" ${attr === defaultAttribute ? 'selected' : ''}>${attr}</option>`).join('')}
        </select>
    `;

    const now = new Date();
    const date01YearsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const calculated_start_date = date01YearsAgo.toISOString().split('T')[0];
    const calculated_end_date = now.toISOString().split('T')[0];

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
            <br>
            <button onclick="exportAllWTSSCharts()" class="action-button secondary-button wtss-full-width-button">
                Exportar Gráficos WTSS
            </button>
            <hr class="satelite-popup-divider wtss-divider">
        </div>
    `;

    document.getElementById('wtss-controls-panel').outerHTML = controlsPanelHTML;
    document.getElementById('wtss-tab').scrollTop = 0;
};

// Limpa gráficos empilhados
window.clearWTSSEmpilhados = function () {
    const graphArea = document.getElementById('wtss-graph-area');
    if (graphArea) {
        graphArea.innerHTML = '';
    }
}

// Busca série temporal WTSS e plota
window.fetchWTSSTimeSeriesAndPlot = async function (lat, lon, coverage, attribute) {
    const friendlyName = `WTSS - ${coverage} (${attribute})`;

    const graphArea = document.getElementById('wtss-graph-area');
    if (!graphArea) {
        console.error("Área de gráfico WTSS não encontrada.");
        return;
    }

    const tempContent = `<div class="satelite-popup-header"><strong>Carregando Série Temporal WTSS...</strong></div><p>Atributo: ${attribute}</p><p>Aguarde...</p>`;
    graphArea.insertAdjacentHTML('beforeend', `<div id="wtss-loading-message">${tempContent}</div>`);
    document.getElementById('wtss-tab').scrollTop = 0;

    try {
        const baseUrl = "https://data.inpe.br/bdc/wtss/v4/";

        const now = new Date();
        const date01YearsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const calculated_end_date = now.toISOString().split('T')[0];
        const calculated_start_date = date01YearsAgo.toISOString().split('T')[0];

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

        createWTSSTimeSeriesChart(friendlyName, attrData.values, timeSeriesData.result.timeline, attribute, coverage);

    } catch (error) {
        console.error('Erro ao plotar série temporal WTSS:', error);

        const loadingMessage = document.getElementById('wtss-loading-message');
        if (loadingMessage) loadingMessage.remove();

        document.getElementById('wtss-graph-area').insertAdjacentHTML('beforeend', `<div class="wtss-error-message wtss-error-margin"><strong>Erro WTSS:</strong> ${error.message}</div>`);
    }
};

// Cria gráfico WTSS (acordeão) com autoescala Y
function createWTSSTimeSeriesChart(title, values, timeline, attribute, coverage) {
    const uniqueId = `chart-${coverage}-${attribute}-${Date.now()}`;

    const graphArea = document.getElementById('wtss-graph-area');
    if (!graphArea) return; 

    const loadingMessage = document.getElementById('wtss-loading-message');
    if (loadingMessage) loadingMessage.remove();

    const chartBlock = document.createElement('div');
    chartBlock.id = uniqueId;
    chartBlock.classList.add('wtss-chart-block'); 
    
    chartBlock.innerHTML = `
        <details id="details-${uniqueId}" class="wtss-details-container" ontoggle="if(this.open) plotChartInAcordeon('${uniqueId}', '${title}', '${attribute}')">
            <summary class="wtss-summary-header">
                🛰️ ${title} (${attribute})
            </summary>
            <div class="wtss-panel wtss-chart-container-border">
                <p><b>Atributo:</b> ${attribute}</p>
                <hr class="satelite-popup-divider">
                <div class="wtss-canvas-wrapper">
                    <canvas id="canvas-${uniqueId}"></canvas>
                </div>
                <p class="chart-footer stac-chart-footer">Valores reais (escala padrão aplicada).</p>
            </div>
        </details>
    `;

    graphArea.appendChild(chartBlock);
    document.getElementById('wtss-tab').scrollTop = 0; 
    
    window[`wtss_data_${uniqueId}`] = { values, timeline, attribute, coverage };

    window.plotChartInAcordeon = function(id, title, attribute) {
        const data = window[`wtss_data_${id}`];
        if (!data) return;

        const ctx = document.getElementById(`canvas-${id}`);
        if (ctx && !ctx._chart) { 
            const chartDatasets = [{
                label: attribute,
                data: data.timeline.map((date, i) => ({ x: date, y: (data.values[i] !== undefined && data.values[i] !== null) ? applyScale(data.values[i]) : null })),
                borderColor: attribute.toUpperCase().includes('NDVI') ? 'green' : 'blue',
                borderWidth: 2,
                fill: false,
                pointRadius: 3
            }];

            // Autoescala Y (WTSS)
            const ys = (data?.values || [])
                .map(v => (v !== undefined && v !== null) ? applyScale(v) : null)
                .filter(v => v !== null);

            let ymin = -2.5, ymax = 2.5;
            if (ys.length) {
                const minV = Math.min(...ys);
                const maxV = Math.max(...ys);
                const pad = Math.max((maxV - minV) * 0.1, 0.1);
                ymin = minV - pad;
                ymax = maxV + pad;
            }

            new Chart(ctx, {
                type: 'line',
                data: { labels: data.timeline, datasets: chartDatasets },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    color: '#111', 
                    scales: {
                        x: { 
                            type: 'time', 
                            time: { unit: 'month', tooltipFormat: 'dd MMM yyyy' }, 
                            title: { display: true, text: 'Data', color: '#111' },
                            ticks: { color: '#111' },
                            grid: { color: 'rgba(1, 1, 1, 1)' }
                        },
                        y: { 
                            title: { display: true, text: 'Valor (Escala aplicada)', color: '#111' }, 
                            ticks: { color: '#111' },
                            grid: { color: 'rgba(1, 1, 1, 1)' },
                            min: ymin, max: ymax
                        }
                    }
                }
            });
        }
    };
}

// --------------------------------------
// CLIQUE NO MAPA (STAC + WTSS)
// --------------------------------------
map.on('click', async function (e) {
    const { lat, lng } = e.latlng;

    hideInfoPanel();
    createSelectionVisuals(e.latlng);

    let pulse = L.circle(e.latlng, { radius: 5000, color: "#ff0000", fillColor: "#ff4d4d", fillOpacity: 0.25 }).addTo(map);
    setTimeout(() => { map.removeLayer(pulse); }, 600);

    showInfoPanelSTAC("<strong>📍 Ponto selecionado</strong><br>Buscando produtos STAC...");

    try {
        // STAC: apenas metadados
        const satelitesQuery = selectedTags.map(tag => sateliteIdMap[tag]).filter(id => id).join(',');
        const response = await fetch(`http://localhost:3000/api/geodata?lat=${lat}&lng=${lng}&satelites=${satelitesQuery}`);
        if (!response.ok) throw new Error(`Erro ao buscar metadados STAC: ${response.status}`);

        const data = await response.json();
        let panelContent = `<div class="satelite-popup-header"><strong>Resultados STAC:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</div><hr class="satelite-popup-divider">`;

        if (data.length > 0) {
            data.forEach(item => {
                const popularName = productNameToPopularName[item.productName] || item.productName;
                const availableBands = (item.variables || []).map(v => v.name || v.id).filter(Boolean);

                panelContent += `
                    <div class="product-info-block">
                        <strong class="product-title">🛰️ ${popularName}</strong>
                        <p class="product-description">${item.description || item.title || 'Sem descrição disponível.'}</p>
                        <p class="product-bands"><strong>Bandas:</strong> ${availableBands.join(', ') || 'N/A'}</p>
                    </div>`;
            });
        } else {
            panelContent += `<p>Nenhum produto STAC encontrado para os filtros ativos.</p>`;
        }

        showInfoPanelSTAC(panelContent);

        // WTSS: inicia seleção de coleções
        await showWTSSElectionPanel(lat, lng);

    } catch (error) {
        console.error('Erro geral no clique do mapa:', error);
        showInfoPanelSTAC(`<div class="text-error"><strong>Erro Geral:</strong> ${error.message}</div>`);

        // Ainda tenta inicializar o painel WTSS
        await showWTSSElectionPanel(lat, lng);
    }
});

// --------------------------------------
// EVENTOS DE INPUT
// --------------------------------------
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

// --------------------------------------
// TUTORIAL INTERATIVO AO INICIAR O SITE
// --------------------------------------
const tutorialSteps = [
  { text: "🌍 Este é o mapa interativo do Aetheris. Clique em qualquer ponto para explorar dados de satélites." },
  { text: "🔍 Use o campo de busca na lateral para selecionar os satélites ou produtos que deseja visualizar." },
  { text: "📊 Após clicar no mapa, o painel à direita mostrará os produtos disponíveis e séries temporais." },
  { text: "✅ Dica: Clique nas bandas para ver gráficos de NDVI e EVI ao longo do tempo." },
  { text: "✨ Pronto! Agora explore o mapa livremente. Divirta-se com o Aetheris!" }
];

let currentStep = 0;
const tutorialOverlay = document.getElementById('tutorial-overlay');
const tutorialNextBtn = document.getElementById('tutorial-next');
const showTutorialBtn = document.getElementById('show-tutorial');

function updateTutorialStep() {
    if (!tutorialOverlay || currentStep >= tutorialSteps.length) return;
    const box = tutorialOverlay.querySelector(".tutorial-box");
    box.querySelector("p").innerHTML = tutorialSteps[currentStep].text;
    tutorialNextBtn.textContent = currentStep === tutorialSteps.length - 1 ? "Concluir ✅" : "Próximo ➤";
}

if (!localStorage.getItem("tutorialCompleted")) {
  tutorialOverlay.classList.remove("hidden");
  updateTutorialStep();
}

window.showTutorial = function() {
    if (tutorialOverlay) {
        tutorialOverlay.classList.remove("hidden");
        currentStep = 0; 
        updateTutorialStep();
    }
}

tutorialNextBtn.addEventListener("click", () => {
  currentStep++;
  if (currentStep < tutorialSteps.length) {
    updateTutorialStep();
    if (showTutorialBtn) {
        showTutorialBtn.addEventListener("click", window.showTutorial);
    }
  } else {
    tutorialOverlay.classList.add("hidden");
    localStorage.setItem("tutorialCompleted", "true");
  }
});

// --------------------------------------
// EXPORTAÇÃO DE GRÁFICOS WTSS (ZIP com PNGs)
// --------------------------------------
async function exportAllWTSSCharts() {
    const canvases = document.querySelectorAll('#wtss-tab canvas');
    if (canvases.length === 0) {
        alert("Nenhum gráfico WTSS para exportar.");
        return;
    }

    // Carrega JSZip dinamicamente se necessário
    if (typeof JSZip === "undefined") {
        await loadJSZip();
    }

    const zip = new JSZip();
    let index = 1;

    canvases.forEach(canvas => {
        const imgData = canvas.toDataURL("image/png");
        const base64 = imgData.split(',')[1];
        zip.file(`grafico_wtss_${index}.png`, base64, { base64: true });
        index++;
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "graficos_wtss.zip";
    link.click();
    URL.revokeObjectURL(link.href);
}

async function loadJSZip() {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}
