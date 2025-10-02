// Coordenadas aproximadas da caixa que engloba o Brasil
const brasilBounds = [
    [-34.0, -74.0], // Ponto sudoeste (latitude, longitude)
    [5.3, -34.0]    // Ponto nordeste (latitude, longitude)
];

// Inicializa o mapa na div com id "map"
const map = L.map('map', {
    maxBounds: brasilBounds,
    maxBoundsViscosity: 2.0,
    minZoom: 5,
    maxZoom: 15
}).setView([-14.2, -51.9], 4);

// Adiciona a camada base do mapa (tiles) usando OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// ========================================================
// VARIÁVEIS GLOBAIS
// ========================================================

// Variáveis para o menu
const sidebar = document.getElementById('sidebar');

// Variáveis para o Tag Input
const input = document.getElementById("tag-input");
const suggestionsBox = document.getElementById("suggestions");
const selectedTagsContainer = document.getElementById("selected-tags");

// Lista de sugestões disponíveis
const allSuggestions = [
    "CBERS4A", "Landsat-8", "CBERS-2B", "GOES-19", "Sentinel-2", 
    "MODIS Terra/Aqua", "Landsat series", "MODIS Aqua", "Sentinel-3 OLCI", 
    "CBERS-4", "Estações meteorológicas / satélite", "CBERS WFI"
];
let selectedTags = [];

// Variáveis para Marcadores do Mapa
let selectedMarker; // Marcador do ponto clicado (círculo vermelho)
let selectedArea;   // Área de 20km (círculo transparente)
let activeMarkers = []; // Usado para armazenar o popup de metadados ou gráfico.

// Objeto para mapear o nome popular do frontend para o ID da plataforma no DB/Backend (usado no filtro do /api/geodata)
const sateliteIdMap = {
    "CBERS4A": "cbers4a",
    "CBERS-4": "cbers4",
    "Landsat-8": "landsat8",
    "Sentinel-2": "sentinel2",
    "MODIS Terra/Aqua": "modis",
    "GOES-19": "goes16",
    "Landsat series": "landsat8",
};

// Objeto para converter o nome técnico do produto (DB/WTSS) para o nome popular (usado na exibição)
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
    'EtaCCDay_CMIP5-1': 'Modelo Climático (CMIP5)',
};

// ========================================================
// FUNÇÕES DE MENU LATERAL (Corrigido para toggleMenu)
// ========================================================

/**
 * Alterna a visibilidade do menu lateral.
 */
window.toggleMenu = function() { // Exposto globalmente
    sidebar.classList.toggle('ativo');
}

// ========================================================
// FUNÇÕES DE TAG INPUT (Preservado)
// ========================================================

input.addEventListener("focus", () => {
    showSuggestions("");
});

input.addEventListener("input", () => {
    const value = input.value.toLowerCase();
    showSuggestions(value);
});

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        const value = input.value.trim();
        const match = allSuggestions.find(item => item.toLowerCase() === value.toLowerCase());
        if (match && !selectedTags.includes(match)) {
            selectTag(match);
        }
    }
});

function showSuggestions(filter) {
    suggestionsBox.innerHTML = "";
    const filtered = allSuggestions.filter(item =>
        item.toLowerCase().includes(filter.toLowerCase()) &&
        !selectedTags.includes(item)
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

window.removeTag = function(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    renderSelectedTags();
    showSuggestions(input.value);
};

function renderSelectedTags() {
    selectedTagsContainer.innerHTML = "";
    selectedTags.forEach(tag => {
        const tagEl = document.createElement("div");
        tagEl.classList.add("tag");
        // Nota: removeTag está globalmente disponível graças ao 'window.'
        tagEl.innerHTML = `
            ${tag} <span class="remove" onclick="removeTag('${tag}')">&times;</span>
        `;
        selectedTagsContainer.appendChild(tagEl);
    });
}

document.addEventListener("click", function (e) {
    const target = e.target;
    const wrapper = document.querySelector(".tag-selector");
    if (wrapper && !wrapper.contains(target)) {
        suggestionsBox.innerHTML = "";
    }
});


// ========================================================
// FUNÇÕES WTSS E GRÁFICOS
// ========================================================

function applyScale(rawValue) {
    const SCALE_FACTOR = 0.0001; 
    return rawValue * SCALE_FACTOR;
}


/**
 * 🛰️ Chama a rota WTSS do backend para extrair a série temporal de um ponto e plota o gráfico.
 * * @param {number} lat - Latitude.
 * @param {number} lng - Longitude.
 * @param {string} coverage - O nome técnico da coleção.
 * @param {string} band - As bandas a serem solicitadas (pode ser string vazia para usar o padrão do backend).
 * @param {string} friendlyName - Nome amigável do produto.
 */
window.fetchTimeSeriesAndPlot = async function(lat, lng, coverage, band, friendlyName) {
    // 1. Fecha o popup de metadados
    map.closePopup();

    // 2. Cria um popup temporário para feedback ao usuário
    const tempPopupContent = `
        <div class="satelite-popup-header"><strong>Carregando Série Temporal...</strong></div>
        <p>Produto: ${friendlyName}</p>
        <p>Aguarde, extraindo dados do pixel via WTSS.</p>
    `;

    // Remove marcadores e áreas anteriores, mantendo apenas o ponto central
    if (selectedMarker) map.removeLayer(selectedMarker);
    if (selectedArea) map.removeLayer(selectedArea);
    activeMarkers.forEach(marker => map.removeLayer(marker));
    activeMarkers = [];
    
    selectedMarker = L.circleMarker([lat, lng], {
        radius: 10, color: "#ff0000", weight: 3, fillColor: "#ff4d4d", fillOpacity: 0.7
    }).addTo(map);

    selectedArea = L.circle([lat, lng], {
        radius: 20000, color: "#ff0000", weight: 2, fillColor: "#ff4d4d", fillOpacity: 0.15
    }).addTo(map);
    
    selectedMarker.bindPopup(tempPopupContent, { minWidth: 300 }).openPopup();

    const bandQuery = band ? `&bands=${band}` : '';

    try {
        const response = await fetch(`http://localhost:3000/api/timeseries?lat=${lat}&lng=${lng}&coverage=${coverage}${bandQuery}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details?.description || `Erro ${response.status}: Falha ao extrair série temporal.`);
        }
        
        const data = await response.json();
        
        // 3. Processa e Plota os dados
        createChartPopup(lat, lng, friendlyName, data);

    } catch (error) {
        console.error('Erro ao plotar série temporal:', error);
        
        selectedMarker.setPopupContent(`
            <div style="color: red;"><strong>Erro ao buscar dados:</strong></div>
            <p>${error.message}</p>
        `).openPopup();
    }
}


function createChartPopup(lat, lng, title, timeSeriesData) {
    // Adiciona verificação para o caso de a API retornar um objeto vazio
    if (!timeSeriesData || !timeSeriesData.timeline || timeSeriesData.timeline.length === 0) {
        selectedMarker.setPopupContent(`
            <div class="satelite-popup-header"><strong>Série Temporal: ${title}</strong></div>
            <p>Nenhum dado encontrado para o período e local selecionados.</p>
        `).openPopup();
        return;
    }

    const dates = timeSeriesData.timeline;
    const chartDatasets = [];
    const bands = timeSeriesData.attributes;

    bands.forEach((band, index) => {
        const rawValues = timeSeriesData.values.map(v => v[band]);
        
        const scaledData = rawValues.map(rawValue => rawValue !== undefined && rawValue !== null ? applyScale(rawValue) : null);

        let color;
        if (band.toUpperCase().includes('NDVI')) color = 'rgba(0, 128, 0, 1)';
        else if (band.toUpperCase().includes('EVI')) color = 'rgba(0, 0, 255, 1)';
        else if (band.toUpperCase().includes('PR')) color = 'rgba(0, 100, 255, 1)'; 
        else if (band.toUpperCase().includes('TAS')) color = 'rgba(255, 100, 0, 1)'; 
        else color = `hsl(${index * 60}, 70%, 50%)`;
        
        chartDatasets.push({
            label: band,
            data: dates.map((date, i) => ({ x: date, y: scaledData[i] })), // Dados formatados para Chart.js
            borderColor: color,
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            pointRadius: 3
        });
    });

    const chartId = `chart-${title.replace(/\s/g, '-')}-${Date.now()}`;
    // Estilos inline removidos e movidos para 'style.css' (classe .chart-popup-content)
    const popupHtml = `
        <div class="chart-popup-content">
            <div class="satelite-popup-header">
                <strong>Série Temporal: ${title}</strong>
            </div>
            <p>Atributos: ${bands.join(', ')}</p>
            <hr class="satelite-popup-divider">
            <canvas id="${chartId}" width="400" height="200"></canvas>
            <p class="chart-footer">Valores reais (escala padrão aplicada). Max Y=1.0.</p>
        </div>
    `;
    
    selectedMarker.setPopupContent(popupHtml, { 
        maxHeight: 400, 
        minWidth: 350,
        maxWidth: 450
    }).openPopup();
    
    selectedMarker.once('popupopen', () => {
        const ctx = document.getElementById(chartId);
        
        if (typeof Chart === 'undefined') {
            ctx.parentNode.innerHTML = 'ERRO: Chart.js não carregado. Verifique o index.html.';
            return;
        }

        new Chart(ctx, {
            type: 'line',
            data: {
                // Não usamos 'labels' aqui, pois os dados já contêm os objetos {x: date, y: value}
                datasets: chartDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                parsing: false, // Desabilitar o parsing padrão, pois os dados já estão no formato {x, y}
                scales: {
                    x: {
                        type: 'time',
                        time: { 
                            unit: 'month',
                            tooltipFormat: 'dd MMM yyyy' // Formato do tooltip
                        },
                        title: { display: true, text: 'Data' }
                    },
                    y: {
                        title: { display: true, text: 'Valor (Escala aplicada)' },
                        min: -0.2,
                        max: 1.05 
                    }
                }
            }
        });
    });
}

// ========================================================
// EVENTO PRINCIPAL: CLIQUE NO MAPA (Consolidado)
// ========================================================

map.on('click', async function(e) {
    const { lat, lng } = e.latlng;
    
    if (selectedMarker) map.removeLayer(selectedMarker);
    if (selectedArea) map.removeLayer(selectedArea);
    activeMarkers.forEach(marker => map.removeLayer(marker));
    activeMarkers = [];

    selectedMarker = L.circleMarker(e.latlng, {
        radius: 10, color: "#ff0000", weight: 3, fillColor: "#ff4d4d", fillOpacity: 0.7
    }).addTo(map);

    selectedArea = L.circle(e.latlng, {
        radius: 20000, color: "#ff0000", weight: 2, fillColor: "#ff4d4d", fillOpacity: 0.15
    }).addTo(map);

    let pulse = L.circle(e.latlng, {
        radius: 5000, color: "#ff0000", fillColor: "#ff4d4d", fillOpacity: 0.25
    }).addTo(map);
    setTimeout(() => { map.removeLayer(pulse); }, 600);

    const selectedSateliteIds = selectedTags
        .map(tag => sateliteIdMap[tag])
        .filter(id => id); 

    const satelitesQuery = selectedSateliteIds.join(',');

    selectedMarker.bindPopup("<strong>📍 Ponto selecionado</strong><br>Buscando produtos STAC...").openPopup();

    try {
        const response = await fetch(`http://localhost:3000/api/geodata?lat=${lat}&lng=${lng}&satelites=${satelitesQuery}`);
        if (!response.ok) {
            throw new Error(`Erro ao buscar metadados: ${response.status}`);
        }
        const data = await response.json();

        let popupContent = `
            <div class="satelite-popup-header">
                <strong>Resultados para:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}
            </div>
            <hr class="satelite-popup-divider">
        `;

        if (data.length > 0) {
            data.forEach(item => {
                const popularName = productNameToPopularName[item.productName] || item.productName;
                
                const availableBands = (item.variables || []).map(v => v.name || v.id).filter(Boolean);

                let bandsToRequest = '';
                let buttonLabel = 'Ver Série Temporal';

                if (availableBands.length > 0) {
                    bandsToRequest = availableBands.slice(0, 2).join(',');
                    buttonLabel += ` (${bandsToRequest})`;
                } else {
                    bandsToRequest = '';
                    buttonLabel += ' (Padrão)';
                }
                
                // Estilos inline removidos e substituídos pela classe 'action-button'
                const actionButton = `<button 
                    onclick="fetchTimeSeriesAndPlot(${lat}, ${lng}, '${item.productName}', '${bandsToRequest}', '${popularName}')"
                    class="action-button"
                >
                    ${buttonLabel}
                </button>`;

                popupContent += `
                    <div class="product-info-block">
                        <strong>🛰️ ${popularName} (${item.productName})</strong>
                        <p class="text-xs text-gray-600">${item.description || 'Sem descrição.'}</p>
                        <p><small>Bandas: ${availableBands.join(', ') || 'N/A'}</small></p>
                        ${actionButton}
                    </div>
                `;
            });
            
            selectedMarker.setPopupContent(popupContent, { 
                maxHeight: 300, 
                minWidth: 250 
            }).openPopup();

        } else {
            popupContent += `<p>Nenhum produto encontrado para os filtros ativos nesta área.</p>`;
            selectedMarker.setPopupContent(popupContent).openPopup();
        }

    } catch (error) {
        console.error('Houve um problema com a requisição de geodados:', error);
        
        selectedMarker.setPopupContent(`
            <div class="satelite-popup-header" style="color: red;">
                <strong>Erro na Requisição:</strong>
            </div>
            <p>Ocorreu um problema ao buscar os dados: ${error.message}</p>
        `).openPopup();
    }
});
