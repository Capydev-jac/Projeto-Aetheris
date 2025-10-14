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
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

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
// FUNÇÕES DE CHART E API
// ========================================================
function applyScale(rawValue) {
  return rawValue * 0.0001;
}

window.fetchTimeSeriesAndPlot = async function (lat, lng, coverage, band, friendlyName) {
  const tempContent = `<div class="satelite-popup-header"><strong>Carregando Série Temporal...</strong></div><p>Produto: ${friendlyName}</p><p>Aguarde...</p>`;
  showInfoPanelSTAC(tempContent);

  try {
    const bandQuery = band ? `&bands=${band}` : '';
    const response = await fetch(`http://localhost:3000/api/timeseries?lat=${lat}&lng=${lng}&coverage=${coverage}${bandQuery}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details?.description || `Erro ${response.status}`);
    }
    const data = await response.json();
    createChart(lat, lng, friendlyName, data);
  } catch (error) {
    console.error('Erro ao plotar série temporal:', error);
    showInfoPanelSTAC(`<div class="satelite-popup-header" style="color: red;"><strong>Erro ao buscar dados:</strong></div><p>${error.message}</p>`);
  }
};

function createChart(lat, lng, title, timeSeriesData) {
  if (!timeSeriesData || !timeSeriesData.timeline || timeSeriesData.timeline.length === 0) {
    showInfoPanelSTAC(`<div class="satelite-popup-header"><strong>Série Temporal: ${title}</strong></div><p>Nenhum dado encontrado.</p>`);
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
      <div class="satelite-popup-header"><strong>Série Temporal: ${title}</strong></div>
      <p>Atributos: ${bands.join(', ')}</p>
      <hr class="satelite-popup-divider">
      <div style="position: relative; height: 70%; width: 100%;">
        <canvas id="${chartId}"></canvas>
      </div>
      <p class="chart-footer" style="font-size: 0.7em;">Valores reais (escala padrão aplicada). Max Y=1.0.</p>
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
  }, 150);
}

// ========================================================
// WTSS: buscar e exibir dados na aba WTSS
// ========================================================
async function getWTSSData(lat, lon) {
  const baseUrl = "https://data.inpe.br/bdc/wtss/v4/";

  try {
    const response = await fetch(baseUrl);
    const data = await response.json();
    const datasetInfo = data.links.find(link => link.rel === "data");
    if (!datasetInfo) return null;

    const title = datasetInfo.title;
    const datasetResponse = await fetch(baseUrl + title);
    const datasetDetails = await datasetResponse.json();

    const timeline = datasetDetails.timeline;
    const start_date = timeline[0];
    const end_date = timeline[timeline.length - 1];

    const timeSeriesUrl = `${baseUrl}time_series?coverage=${title}&attributes=NDVI&start_date=${start_date}&end_date=${end_date}&latitude=${lat}&longitude=${lon}`;
    const timeSeriesResponse = await fetch(timeSeriesUrl);
    const timeSeriesData = await timeSeriesResponse.json();

    const ndviAttr = timeSeriesData.result.attributes.find(a => a.attribute === "NDVI");
    if (!ndviAttr) return null;

    return {
      title,
      start_date,
      end_date,
      ndviValues: ndviAttr.values,
      timeline
    };
  } catch (err) {
    console.error("Erro ao acessar WTSS:", err);
    return null;
  }
}

function createWTSSPanel(result) {
  const chartId = `wtss-chart-${Date.now()}`;
  const panelContent = `
    <div class="wtss-panel">
      <h3>${result.title}</h3>
      <p><b>Período:</b> ${result.start_date} → ${result.end_date}</p>
      <div style="height:200px;"><canvas id="${chartId}"></canvas></div>
      <p><b>NDVI:</b> ${result.ndviValues.join(', ')}</p>
    </div>
  `;
  showInfoPanelWTSS(panelContent);

  setTimeout(() => {
    const ctx = document.getElementById(chartId);
    if (!ctx) return;
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: result.timeline,
        datasets: [{
          label: 'NDVI',
          data: result.ndviValues,
          borderColor: 'green',
          borderWidth: 2,
          fill: false
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }, 300);
}

// ========================================================
// CLIQUE NO MAPA (STAC + WTSS)
// ========================================================
map.on('click', async function (e) {
  const { lat, lng } = e.latlng;

  hideInfoPanel();
  createSelectionVisuals(e.latlng);

  let pulse = L.circle(e.latlng, { radius: 5000, color: "#ff0000", fillColor: "#ff4d4d", fillOpacity: 0.25 }).addTo(map);
  setTimeout(() => { map.removeLayer(pulse); }, 600);

  showInfoPanelSTAC("<strong>📍 Ponto selecionado</strong><br>Buscando produtos STAC...");

  try {
    const satelitesQuery = selectedTags.map(tag => sateliteIdMap[tag]).filter(id => id).join(',');
    const response = await fetch(`http://localhost:3000/api/geodata?lat=${lat}&lng=${lng}&satelites=${satelitesQuery}`);
    if (!response.ok) throw new Error(`Erro ao buscar metadados: ${response.status}`);

    const data = await response.json();
    let panelContent = `<div class="satelite-popup-header"><strong>Resultados:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</div><hr class="satelite-popup-divider">`;

    if (data.length > 0) {
      data.forEach(item => {
        const popularName = productNameToPopularName[item.productName] || item.productName;
        const availableBands = (item.variables || []).map(v => v.name || v.id).filter(Boolean);
        let bandsToRequest = availableBands.slice(0, 2).join(',');
        let buttonLabel = `Ver Série Temporal (${bandsToRequest || 'Padrão'})`;

        const actionButton = `<button onclick="fetchTimeSeriesAndPlot(${lat}, ${lng}, '${item.productName}', '${bandsToRequest}', '${popularName}')" class="action-button">${buttonLabel}</button>`;

        panelContent += `
          <div class="product-info-block">
            <strong class="product-title">🛰️ ${popularName}</strong>
            <div class="product-details">
              <p class="product-name">(${item.productName})</p>
              <p class="product-description">${item.title || 'Sem descrição disponível.'}</p>
              <p class="product-bands"><strong>Bandas:</strong> ${availableBands.join(', ') || 'N/A'}</p>
            </div>
            ${actionButton}
          </div>`;
      });
    } else {
      panelContent += `<p>Nenhum produto encontrado para os filtros ativos.</p>`;
    }

    showInfoPanelSTAC(panelContent);

    const wtssResult = await getWTSSData(lat, lng);
    if (wtssResult) createWTSSPanel(wtssResult);

  } catch (error) {
    console.error('Erro ao buscar STAC:', error);
    showInfoPanelSTAC(`<div style="color:red;"><strong>Erro:</strong> ${error.message}</div>`);
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
