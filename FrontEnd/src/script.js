// ========================================================
// CONFIGURAÇÃO INICIAL E VARIÁVEIS GLOBAIS
// ========================================================
const BR_BOUNDS = [[-34.0, -74.0], [5.3, -34.0]];
const map = L.map('map', {
    maxBounds: BR_BOUNDS,
    maxBoundsViscosity: 2.0,
    minZoom: 5,
    maxZoom: 15
}).setView([-14.2, -51.9], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Referências aos elementos da UI
const sidebar = document.getElementById('sidebar');
const input = document.getElementById("tag-input");
const suggestionsBox = document.getElementById("suggestions");
const selectedTagsContainer = document.getElementById("selected-tags");
const infoPanel = document.getElementById("info-panel-right"); // NOVO: Referência ao painel direito

// Estado da aplicação
let selectedTags = [];
let selectedMarker;
let selectedArea;

// Constantes da aplicação
const allSuggestions = ["CBERS4A", "Landsat-8", "CBERS-2B", "GOES-19", "Sentinel-2", "MODIS Terra/Aqua", "Landsat series", "MODIS Aqua", "Sentinel-3 OLCI", "CBERS-4", "Estações meteorológicas / satélite", "CBERS WFI"];
const sateliteIdMap = {"CBERS4A": "cbers4a", "CBERS-4": "cbers4", "Landsat-8": "landsat8", "Sentinel-2": "sentinel2", "MODIS Terra/Aqua": "modis", "GOES-19": "goes16", "Landsat series": "landsat8"};
const productNameToPopularName = {'mosaic-cbers4a-paraiba-3m-1': 'CBERS-4A (Paraíba)', 'mosaic-cbers4-paraiba-3m-1': 'CBERS-4 (Paraíba)', 'AMZ1-WFI-L4-SR-1': 'Amazônia-1 (WFI)', 'LCC_L8_30_16D_STK_Cerrado-1': 'Landsat-8 (Cerrado 16D)', 'myd13q1-6.1': 'MODIS (NDVI/EVI 16D)', 'mosaic-s2-yanomami_territory-6m-1': 'Sentinel-2 (Yanomami 6M)', 'LANDSAT-16D-1': 'Landsat (Data Cube 16D)', 'S2-16D-2': 'Sentinel-2 (Data Cube 16D)', 'prec_merge_daily-1': 'Precipitação Diária', 'EtaCCDay_CMIP5-1': 'Modelo Climático (CMIP5)'};

// ========================================================
// NOVO: FUNÇÕES DO PAINEL DE INFORMAÇÕES
// ========================================================

function showInfoPanel(htmlContent) {
    if (!infoPanel) return;
    const closeButton = `<button class="info-panel-close" onclick="hideInfoPanel()">&times;</button>`;
    infoPanel.innerHTML = closeButton + htmlContent;
    infoPanel.classList.add('visible');
}

function hideInfoPanel() {
    if (!infoPanel) return;
    infoPanel.classList.remove('visible');
}

// ========================================================
// FUNÇÕES DE UI E LÓGICA
// ========================================================

window.toggleMenu = function() {
    sidebar.classList.toggle('ativo');
}

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

// --- Funções do Seletor de Tags ---
function showSuggestions(filter) {
    suggestionsBox.innerHTML = "";
    const filtered = allSuggestions.filter(item => item.toLowerCase().includes(filter) && !selectedTags.includes(item));
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
        tagEl.innerHTML = `${tag} <span class="remove" onclick="removeTag('${tag}')">&times;</span>`;
        selectedTagsContainer.appendChild(tagEl);
    });
}

// --- Funções de Gráfico e API ---
function applyScale(rawValue) {
    return rawValue * 0.0001;
}

window.fetchTimeSeriesAndPlot = async function(lat, lng, coverage, band, friendlyName) {
    // ALTERADO: Usa o painel em vez do popup
    const tempContent = `<div class="satelite-popup-header"><strong>Carregando Série Temporal...</strong></div><p>Produto: ${friendlyName}</p><p>Aguarde...</p>`;
    showInfoPanel(tempContent);
    
    try {
        const bandQuery = band ? `&bands=${band}` : '';
        const response = await fetch(`http://localhost:3000/api/timeseries?lat=${lat}&lng=${lng}&coverage=${coverage}${bandQuery}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details?.description || `Erro ${response.status}`);
        }
        const data = await response.json();
        createChart(lat, lng, friendlyName, data); // Renomeado para evitar confusão
    } catch (error) {
        console.error('Erro ao plotar série temporal:', error);
        showInfoPanel(`<div class="satelite-popup-header" style="color: red;"><strong>Erro ao buscar dados:</strong></div><p>${error.message}</p>`);
    }
}

function createChart(lat, lng, title, timeSeriesData) {
    // ALTERADO: Usa o painel em vez do popup
    if (!timeSeriesData || !timeSeriesData.timeline || timeSeriesData.timeline.length === 0) {
        showInfoPanel(`<div class="satelite-popup-header"><strong>Série Temporal: ${title}</strong></div><p>Nenhum dado encontrado.</p>`);
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
        <div class="chart-popup-content" style="height: calc(100% - 40px);">
            <div class="satelite-popup-header"><strong>Série Temporal: ${title}</strong></div>
            <p>Atributos: ${bands.join(', ')}</p>
            <hr class="satelite-popup-divider">
            <div style="position: relative; height: 70%; width: 100%;">
                <canvas id="${chartId}"></canvas>
            </div>
            <p class="chart-footer" style="font-size: 0.7em; margin-top: 5px;">Valores reais (escala padrão aplicada). Max Y=1.0.</p>
        </div>`;
    
    showInfoPanel(panelHtml);

    // Adiciona um pequeno delay para garantir que o canvas está no DOM antes de renderizar o gráfico
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
    }, 150);
}

// ========================================================
// EVENTO PRINCIPAL: CLIQUE NO MAPA
// ========================================================

map.on('click', async function(e) {
    const { lat, lng } = e.latlng;
    
    hideInfoPanel();
    createSelectionVisuals(e.latlng);

    let pulse = L.circle(e.latlng, { radius: 5000, color: "#ff0000", fillColor: "#ff4d4d", fillOpacity: 0.25 }).addTo(map);
    setTimeout(() => { map.removeLayer(pulse); }, 600);

    // ALTERADO: Mostra o estado de "carregando" no painel
    showInfoPanel("<strong>📍 Ponto selecionado</strong><br>Buscando produtos STAC...");

    try {
        const satelitesQuery = selectedTags.map(tag => sateliteIdMap[tag]).filter(id => id).join(',');
        const response = await fetch(`http://localhost:3000/api/geodata?lat=${lat}&lng=${lng}&satelites=${satelitesQuery}`);
        if (!response.ok) throw new Error(`Erro ao buscar metadados: ${response.status}`);
        
        const data = await response.json();
        let panelContent = `<div class="satelite-popup-header"><strong>Resultados para:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</div><hr class="satelite-popup-divider">`;

        if (data.length > 0) {
            data.forEach(item => {
                const popularName = productNameToPopularName[item.productName] || item.productName;
                const availableBands = (item.variables || []).map(v => v.name || v.id).filter(Boolean);
                let bandsToRequest = availableBands.slice(0, 2).join(',');
                let buttonLabel = `Ver Série Temporal (${bandsToRequest || 'Padrão'})`;
                
                const actionButton = `<button onclick="fetchTimeSeriesAndPlot(${lat}, ${lng}, '${item.productName}', '${bandsToRequest}', '${popularName}')" class="action-button">${buttonLabel}</button>`;

                panelContent += `
                    <div class="product-info-block">
                        <strong>🛰️ ${popularName} (${item.productName})</strong>
                        <p class="text-xs text-gray-600">${item.description || 'Sem descrição.'}</p>
                        <p><small>Bandas: ${availableBands.join(', ') || 'N/A'}</small></p>
                        ${actionButton}
                    </div>`;
            });
        } else {
            panelContent += `<p>Nenhum produto encontrado para os filtros ativos nesta área.</p>`;
        }
        
        // ALTERADO: Atualiza o painel com o resultado final
        showInfoPanel(panelContent);

    } catch (error) {
        console.error('Houve um problema com a requisição de geodados:', error);
        // ALTERADO: Mostra o erro no painel
        showInfoPanel(`<div class="satelite-popup-header" style="color: red;"><strong>Erro na Requisição:</strong></div><p>${error.message}</p>`);
    }
});


// ========================================================
// INICIALIZAÇÃO DOS EVENT LISTENERS
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