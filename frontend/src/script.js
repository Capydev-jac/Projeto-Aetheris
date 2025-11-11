// ==============================
// Aetheris - Script Unificado
// Mapa + STAC + WTSS (com autoescala e exportação de gráficos)
// ==============================

// --------------------------------------
// MAPA (Leaflet)
// --------------------------------------
const BR_BOUNDS = [
  [-34.0, -74.0],
  [5.3, -34.0],
];
const map = L.map("map", {
  maxBounds: BR_BOUNDS,
  maxBoundsViscosity: 2.0,
  minZoom: 3,
  maxZoom: 15,
}).setView([-14.2, -51.9], 4);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// Variáveis de estado global para o novo sistema WTSS
window.currentWtssResult = null;
let WTSS_COLLECTIONS_CACHE = []; // Cache para coleções disponíveis

// --------------------------------------
// ELEMENTOS DE INTERFACE
// --------------------------------------
const sidebar = document.getElementById("sidebar");
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
  "CBERS4A",
  "Landsat-2",
  "CBERS-2B",
  "GOES-19",
  "Sentinel-2",
  "Sentinel-1",
  "MODIS Terra/Aqua",
  "Landsat series",
  "MODIS Aqua",
  "Sentinel-3 OLCI",
  "CBERS-4",
  "Estações meteorológicas / satélite",
  "CBERS WFI",
];

const sateliteIdMap = {
  CBERS4A: "cbers4a",
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
  "CBERS WFI": "amazonia1",
};

const productNameToPopularName = {
  "mosaic-cbers4a-paraiba-3m-1": "CBERS-4A (Paraíba)",
  "mosaic-cbers4-paraiba-3m-1": "CBERS-4 (Paraíba)",
  "AMZ1-WFI-L4-SR-1": "Amazônia-1 (WFI)",
  "LCC_L8_30_16D_STK_Cerrado-1": "Landsat-8 (Cerrado 16D)",
  "myd13q1-6.1": "MODIS (NDVI/EVI 16D)",
  "mosaic-s2-yanomami_territory-6m-1": "Sentinel-2 (Yanomami 6M)",
  "LANDSAT-16D-1": "Landsat (Data Cube 16D)",
  "S2-16D-2": "Sentinel-2 (Data Cube 16D)",
  "prec_merge_daily-1": "Precipitação Diária",
  "EtaCCDay_CMIP5-1": "Modelo Climático (CMIP5)",
};

// WTSS Config & Fallback Centralizado
const FALLBACK_ATTRIBUTES_MAP = {
  "CBERS4-MUX-2M-1": [
    "NDVI",
    "EVI",
    "BAND5",
    "BAND6",
    "BAND7",
    "BAND8",
    "CMASK",
    "CLEAROB",
    "TOTALOB",
    "PROVENANCE",
  ],
  "CBERS4-WFI-16D-2": [
    "NDVI",
    "EVI",
    "BAND13",
    "BAND14",
    "BAND15",
    "BAND16",
    "CMASK",
    "CLEAROB",
    "TOTALOB",
    "PROVENANCE",
    "DATASOURCE",
  ],
  "CBERS-WFI-8D-1": [
    "NDVI",
    "EVI",
    "BAND13",
    "BAND14",
    "BAND15",
    "BAND16",
    "CMASK",
    "CLEAROB",
    "TOTALOB",
    "PROVENANCE",
    "DATASOURCE",
  ],
  "LANDSAT-16D-1": [
    "NDVI",
    "EVI",
    "blue",
    "green",
    "red",
    "nir08",
    "swir16",
    "swir22",
    "coastal",
    "qa_pixel",
    "CLEAROB",
    "TOTALOB",
    "PROVENANCE",
    "DATASOURCE",
  ],
  "mod11a2-6.1": [
    "LST_Day_1km",
    "QC_Day",
    "Day_view_time",
    "Day_view_angl",
    "Clear_sky_days",
    "LST_Night_1km",
    "QC_Night",
    "Night_view_time",
    "Night_view_angl",
    "Emis_31",
    "Clear_sky_nights",
    "Emis_32",
  ],
  "mod13q1-6.1": [
    "NDVI",
    "EVI",
    "VI_Quality",
    "composite_day_of_the_year",
    "pixel_reliability",
    "blue_reflectance",
    "red_reflectance",
    "NIR_reflectance",
    "MIR_reflectance",
    "view_zenith_angle",
    "sun_zenith_angle",
    "relative_azimuth_angle",
  ],
  "myd11a2-6.1": [
    "LST_Day_1km",
    "QC_Day",
    "Day_view_time",
    "Day_view_angl",
    "LST_Night_1km",
    "QC_Night",
    "Night_view_time",
    "Night_view_angl",
    "Emis_31",
    "Emis_32",
    "Clear_sky_days",
    "Clear_sky_nights",
  ],
  "myd13q1-6.1": [
    "NDVI",
    "EVI",
    "blue_reflectance",
    "red_reflectance",
    "NIR_reflectance",
    "VI_Quality",
    "view_zenith_angle",
    "composite_day_of_the_year",
    "pixel_reliability",
    "MIR_reflectance",
    "sun_zenith_angle",
    "relative_azimuth_angle",
  ],
  "S2-16D-2": [
    "CLEAROB",
    "TOTALOB",
    "PROVENANCE",
    "SCL",
    "B01",
    "B02",
    "B04",
    "B08",
    "B8A",
    "B09",
    "B03",
    "B11",
    "B12",
    "EVI",
    "NDVI",
    "NBR",
    "B05",
    "B06",
    "B07",
  ],
};
const WTSS_REFERENCE_COVERAGE = "LANDSAT-16D-1";

// --------------------------------------
// CONTROLE DO SIDEBAR
// --------------------------------------
window.toggleMenu = function () {
  sidebar.classList.toggle("ativo");
};

// --------------------------------------
// SELEÇÃO NO MAPA
// --------------------------------------
function createSelectionVisuals(latlng) {
  if (selectedMarker) map.removeLayer(selectedMarker);
  if (selectedArea) map.removeLayer(selectedArea);

  selectedMarker = L.circleMarker(latlng, {
    radius: 10,
    color: "#ff0000",
    weight: 3,
    fillColor: "#ff4d4d",
    fillOpacity: 0.7,
  }).addTo(map);

  selectedArea = L.circle(latlng, {
    radius: 20000,
    color: "#ff0000",
    weight: 2,
    fillColor: "#ff4d4d",
    fillOpacity: 0.15,
  }).addTo(map);
}

// --------------------------------------
// TAG SELECTOR (filtros de satélite)
// --------------------------------------
function showSuggestions(filter) {
  suggestionsBox.innerHTML = "";
  const filtered = allSuggestions.filter(
    (item) =>
      item.toLowerCase().includes(filter) && !selectedTags.includes(item)
  );
  filtered.forEach((item) => {
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
  selectedTags = selectedTags.filter((t) => t !== tag);
  renderSelectedTags();
  showSuggestions(input.value);
};

function renderSelectedTags() {
  selectedTagsContainer.innerHTML = "";
  selectedTags.forEach((tag) => {
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
  document
    .querySelectorAll(".tab-button")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((tab) => tab.classList.remove("active"));
  document.querySelector(`[data-tab="${tabId}"]`).classList.add("active");
  document.getElementById(tabId).classList.add("active");
}

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => {
    const tabId = button.getAttribute("data-tab");
    showTab(tabId);
  });
});

function showInfoPanelSTAC(htmlContent) {
  const panel = document.getElementById("info-panel-right");
  const tab = document.getElementById("stac-tab");
  tab.innerHTML = htmlContent;
  panel.classList.add("visible");
  showTab("stac-tab");
}

function showInfoPanelWTSS(htmlContent) {
  const panel = document.getElementById("info-panel-right");
  const tab = document.getElementById("wtss-tab");
  tab.innerHTML = htmlContent;
  panel.classList.add("visible");
  showTab("wtss-tab");
}

function hideInfoPanel() {
  document.getElementById("info-panel-right").classList.remove("visible");
}

// --------------------------------------
/* STAC - CHARTS / API */
// --------------------------------------
function applyScale(rawValue) {
  return rawValue * 0.0001;
}

window.fetchTimeSeriesAndPlot = async function (
  lat,
  lng,
  coverage,
  band,
  friendlyName
) {
  const tempContent = `<div class="satelite-popup-header"><strong>Carregando Série Temporal STAC...</strong></div><p>Produto: ${friendlyName}</p><p>Aguarde...</p>`;
  showInfoPanelSTAC(tempContent);

  try {
    const bandQuery = band ? `&bands=${band}` : "";
    const response = await fetch(
      `http://localhost:3000/api/timeseries?lat=${lat}&lng=${lng}&coverage=${coverage}${bandQuery}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.details?.description ||
          `Erro ${response.status} na API Local.`
      );
    }

    const data = await response.json();

    if (!data || !data.timeline || data.timeline.length === 0) {
      console.warn(`STAC: API retornou dados vazios para ${coverage}.`, data);
      showInfoPanelSTAC(
        `<div class="satelite-popup-header"><strong>Série Temporal STAC: ${friendlyName}</strong></div><p>A API retornou dados, mas a série temporal está vazia (linha do tempo vazia).</p>`
      );
      return;
    }

    createChart(lat, lng, friendlyName, data);
  } catch (error) {
    console.error("Erro ao plotar série temporal STAC:", error);
    showInfoPanelSTAC(
      `<div class="satelite-popup-header text-error"><strong>Erro ao buscar dados:</strong></div><p>${error.message}</p>`
    );
  }
};

function createChart(lat, lng, title, timeSeriesData) {
  if (
    !timeSeriesData ||
    !timeSeriesData.timeline ||
    timeSeriesData.timeline.length === 0
  ) {
    showInfoPanelSTAC(
      `<div class="satelite-popup-header"><strong>Série Temporal STAC: ${title}</strong></div><p>Nenhum dado encontrado.</p>`
    );
    return;
  }

  const chartId = `chart-${Date.now()}`;
  const bands = timeSeriesData.attributes;

  // 1) Monta os datasets primeiro
  const chartDatasets = bands.map((band, index) => {
    const rawValues = timeSeriesData.values.map((v) => v[band]);
    const scaledData = rawValues.map((val) =>
      val !== undefined && val !== null ? applyScale(val) : null
    );
    let color = `hsl(${index * 60}, 70%, 50%)`;
    if (band.toUpperCase().includes("NDVI")) color = "rgba(0, 128, 0, 1)";
    else if (band.toUpperCase().includes("EVI")) color = "rgba(0, 0, 255, 1)";
    return {
      label: attribute,
      data: timeline.map((date, i) => ({
        x: date,
        y:
          values[i] !== undefined && values[i] !== null
            ? applyScale(values[i])
            : null,
      })),
      borderColor: band.toUpperCase().includes("NDVI")
        ? "rgba(0, 80, 0, 1)"
        : band.toUpperCase().includes("EVI")
        ? "rgba(50, 50, 150, 1)"
        : "#333333",
      borderWidth: 2,
      fill: false,
      tension: 0.1,
      pointRadius: 3,
    };
  });

  // 2) Autoescala do eixo Y depois dos datasets
  const allY = chartDatasets.flatMap((d) =>
    d.data.map((p) => p.y).filter((v) => v !== null && v !== undefined)
  );
  let yMin = -2.0,
    yMax = 1.5;
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
            <p>Atributos: ${bands.join(", ")}</p>
            <hr class="satelite-popup-divider">
            <div class="stac-canvas-wrapper"><canvas id="${chartId}"></canvas></div>
            <p class="chart-footer stac-chart-footer">Valores reais (escala padrão aplicada).</p>
        </div>`;

  showInfoPanelSTAC(panelHtml);

  setTimeout(() => {
    const ctx = document.getElementById(chartId);
    if (!ctx) return;

    new Chart(ctx, {
      type: "line",
      data: { datasets: chartDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        color: "#0001",
        scales: {
          x: {
            type: "time",
            time: { unit: "month", tooltipFormat: "dd MMM yyyy" },
            title: { display: true, text: "Data", color: "#0001" },
            ticks: { color: "#0001" },
            grid: { color: "rgba(0, 0, 0, 1)", borderDash: [2, 2] },
          },
          y: {
            title: {
              display: true,
              text: "Valor (Escala aplicada)",
              color: "#0001",
            },
            ticks: { color: "#0001" },
            grid: { color: "rgba(0,0,0,1)", borderDash: [2, 2] },
            min: yMin,
            max: yMax,
          },
        },
      },
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
    if (!listResponse.ok)
      throw new Error(`Erro ${listResponse.status} ao listar coberturas.`);

    const listData = await listResponse.json();
    const availableCoverages = listData.coverages || [];

    const collectionDetails = [];
    for (const name of availableCoverages) {
      try {
        const detailUrl = `${baseUrl}${name}`;
        const detailResponse = await fetch(detailUrl);

        if (detailResponse.ok) {
          const details = await detailResponse.json();

          let availableAttributes =
            details.attributes?.map((attr) => attr.attribute) ?? [];

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
              availableAttributes,
            });
          }
        }
      } catch (e) {
        // Ignora coleções que falharam no detalhe
      }
    }

    WTSS_COLLECTIONS_CACHE = collectionDetails;

    if (collectionDetails.length === 0) {
      throw new Error(
        "Nenhuma coleção WTSS funcional foi encontrada após filtragem."
      );
    }

    return { collections: collectionDetails, lat, lon };
  } catch (err) {
    console.error("Erro ao listar coleções WTSS:", err);
    return { error: err.message, collections: [], lat, lon };
  }
}

// ESTÁGIO 1 (REFACTOR): Seleção da Coleção e Atributo na MESMA ABA (permite plotar múltiplas séries para comparação)
function sanitizeId(text) {
  return text.replace(/[^a-z0-9]/gi, "_");
}

// Mantém função antiga como compatibilidade mínima (mas agora a seleção ocorre na mesma aba)
window.showWTSSElectionPanel = async function (lat, lng) {
  const result = await listWTSSTitleAndAttributes(lat, lng);
  window.currentWtssResult = { ...result, lat, lon: lng };

  if (result.error || !result.collections || result.collections.length === 0) {
    showInfoPanelWTSS(`
            <h3>📈 Catálogos WTSS</h3>
            <div class="wtss-error-message">
                <strong>Falha ao buscar catálogos.</strong>
                <p>Detalhes: ${
                  result.error || "Nenhuma coleção funcional encontrada."
                }</p>
            </div>
        `);
    return;
  }

  const now = new Date();
  const date01YearsAgo = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate()
  );
  const calculated_start_date = date01YearsAgo.toISOString().split("T")[0];
  const calculated_end_date = now.toISOString().split("T")[0];

  // Monta options de coleção (pode ajustar escaping se necessário)
  const collectionOptions = result.collections
    .map((col) => {
      // escape básico para evitar quebra de HTML
      const safeTitle = String(col.title)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      return `<option value="${safeTitle}">${safeTitle}</option>`;
    })
    .join("");

  // Conteúdo da aba: select de coleção + select de atributo + botões + área de gráficos
  const panelContent = `
        <div id="wtss-controls-panel" class="wtss-panel wtss-controls-sticky">
            <h3>WTSS — Seleção</h3>
            <p>Período solicitado: ${calculated_start_date} → ${calculated_end_date}</p>
            <hr class="satelite-popup-divider">

            <div class="wtss-selection-row">
                <label for="wtss-collection-select"><strong>Coleção</strong></label>
                <select id="wtss-collection-select" class="wtss-full-width-select">
                    ${collectionOptions}
                </select>
            </div>

            <div class="wtss-selection-row" style="margin-top:8px;">
                <label for="wtss-attribute-select"><strong>Atributo</strong></label>
                <select id="wtss-attribute-select" class="wtss-full-width-select"></select>
            </div>

            <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                <button id="wtss-plot-selected" class="action-button">▶️ Plotar</button>
                <button id="wtss-show-selected" class="action-button primary-button">🖥️ Mostrar Selecionados</button>
                <button id="wtss-export-all" class="action-button secondary-button">⬇️ Exportar Todos Gráficos</button>
                <button id="wtss-clear-all" class="action-button secondary-button">Limpar Todos os Gráficos</button>
            </div>

            <br>
            <small>Selecione uma coleção e um atributo. Clique em "Plotar" várias vezes para comparar diferentes séries. Use as caixas ao lado dos títulos para selecionar até 6 gráficos e clicar em "Mostrar Selecionados".</small>
        </div>

        <div id="wtss-graph-area"></div>
    `;

  const wtssTab = document.getElementById("wtss-tab");
  wtssTab.innerHTML = panelContent;
  wtssTab.style.overflowY = "auto";
  showTab("wtss-tab");

  // Referência às coleções para lookup (usar título original do result)
  const collectionsByTitle = {};
  result.collections.forEach((col) => {
    collectionsByTitle[col.title] = col;
  });

  const collSelect = document.getElementById("wtss-collection-select");
  const attrSelect = document.getElementById("wtss-attribute-select");
  const plotBtn = document.getElementById("wtss-plot-selected");
  const clearBtn = document.getElementById("wtss-clear-all");
  const exportBtn = document.getElementById("wtss-export-all");
  const showSelectedBtn = document.getElementById("wtss-show-selected");

  function populateAttributesFor(collectionTitleEscaped) {
    // encontra coleção original (desfazendo escape simples)
    const collectionTitle = collectionTitleEscaped
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"');
    const col = collectionsByTitle[collectionTitle];
    const attrs =
      col && col.availableAttributes && col.availableAttributes.length
        ? col.availableAttributes.slice()
        : [];
    const defaultIdx = attrs.findIndex((a) => a.toUpperCase().includes("NDVI"));
    attrSelect.innerHTML = attrs
      .map(
        (a, i) =>
          `<option value="${a}" ${
            i === (defaultIdx === -1 ? 0 : defaultIdx) ? "selected" : ""
          }>${a}</option>`
      )
      .join("");
  }

  if (collSelect.value) populateAttributesFor(collSelect.value);

  collSelect.addEventListener("change", () =>
    populateAttributesFor(collSelect.value)
  );

  plotBtn.addEventListener("click", () => {
    // reconstrói título original conforme collectionsByTitle keys
    const selectedEsc = collSelect.value;
    const selectedTitle = selectedEsc
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"');
    const coverage = selectedTitle;
    const attribute = attrSelect.value;
    if (!coverage || !attribute) {
      alert("Selecione coleção e atributo antes de plotar.");
      return;
    }
    fetchWTSSTimeSeriesAndPlot(lat, lng, coverage, attribute);
  });

  clearBtn.addEventListener("click", () => {
    const graphArea = document.getElementById("wtss-graph-area");
    if (graphArea) graphArea.innerHTML = "";
  });

  exportBtn.addEventListener("click", () => {
    if (typeof exportAllWTSSCharts === "function") exportAllWTSSCharts();
  });

  // botão que abre modal com os selecionados (max 6)
  showSelectedBtn.addEventListener("click", () => {
    if (typeof showSelectedWTSSInModal === "function")
      showSelectedWTSSInModal();
  });
};

// Busca série temporal WTSS e plota
window.fetchWTSSTimeSeriesAndPlot = async function (
  lat,
  lon,
  coverage,
  attribute
) {
  const baseUrl = "https://data.inpe.br/bdc/wtss/v4/";
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);
  const startISO = startDate.toISOString().split("T")[0];
  const endISO = new Date().toISOString().split("T")[0];

  const url = `${baseUrl}time_series?coverage=${encodeURIComponent(
    coverage
  )}&attributes=${encodeURIComponent(
    attribute
  )}&latitude=${lat}&longitude=${lon}&start_date=${startISO}&end_date=${endISO}`;

  const graphArea = document.getElementById("wtss-graph-area");
  const loadingId = "wtss-loading-message";
  if (graphArea) {
    const msg = document.createElement("div");
    msg.id = loadingId;
    msg.innerHTML = `<p>Carregando série WTSS: <strong>${coverage}</strong> / ${attribute} ...</p>`;
    graphArea.prepend(msg);
  }

  try {
    const resp = await fetch(url);
    if (!resp.ok)
      throw new Error(
        `Erro ${resp.status} ao buscar WTSS (${resp.statusText})`
      );
    const json = await resp.json();

    // Extrai timeline e valores
    const result = json.result || {};
    const attrs = result.attributes || [];
    const attrData = attrs.find((a) => a.attribute === attribute);
    const values = attrData?.values || [];
    const timeline = result.timeline || [];

    if (!values.length || !timeline.length) {
      throw new Error(`Nenhum dado encontrado para ${attribute}.`);
    }

    createWTSSTimeSeriesChart(
      `WTSS - ${coverage}`,
      values,
      timeline,
      attribute,
      coverage
    );
  } catch (err) {
    console.error("fetchWTSSTimeSeriesAndPlot erro:", err);
    showInfoPanelWTSS(
      `<div class="text-error"><strong>Erro ao buscar WTSS:</strong> ${err.message}</div>`
    );
  } finally {
    const lm = document.getElementById(loadingId);
    if (lm) lm.remove();
  }
};

// --------------------------------------
// Modal para exibir gráficos selecionados (máx 6)
// --------------------------------------
window.showSelectedWTSSInModal = function () {
  const checked = Array.from(
    document.querySelectorAll(".wtss-select-checkbox:checked")
  );
  if (checked.length === 0) {
    alert("Nenhum gráfico selecionado.");
    return;
  }
  if (checked.length > 6) {
    alert("Selecione no máximo 6 gráficos.");
    return;
  }

  // remove modal antigo se existir
  const existing = document.getElementById("wtss-modal-overlay");
  if (existing) existing.remove();

  // cria overlay/modal
  const overlay = document.createElement("div");
  overlay.id = "wtss-modal-overlay";
  overlay.style = `
        position:fixed; inset:0; background:rgba(0,0,0,0.6); display:flex;
        align-items:center; justify-content:center; z-index:9999;
    `;

  const modal = document.createElement("div");
  modal.id = "wtss-modal";
  modal.style = `
        background:#fff; width:90%; max-width:1200px; max-height:90%; overflow:auto;
        border-radius:8px; padding:12px; box-shadow:0 6px 24px rgba(0,0,0,0.4);
    `;

  const header = document.createElement("div");
  header.style =
    "display:flex; justify-content:space-between; align-items:center; gap:12px;";
  header.innerHTML = `<h3>Visualização — Gráficos Selecionados (${checked.length})</h3>`;
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Fechar ✖";
  closeBtn.className = "action-button secondary-button";
  header.appendChild(closeBtn);

  const grid = document.createElement("div");
  grid.style =
    "display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:12px; margin-top:12px;";

  modal.appendChild(header);
  modal.appendChild(grid);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // guardar para destruir depois
  window.wtss_modal_charts = [];

  // cria cada canvas e renderiza com os dados salvos
  checked.forEach((cb, idx) => {
    const id = cb.getAttribute("data-wtss-id");
    const dataObj = window[`wtss_data_${id}`];
    const title = dataObj ? `${dataObj.coverage} — ${dataObj.attribute}` : id;

    const card = document.createElement("div");
    card.style =
      "background:#fafafa; padding:8px; border-radius:6px; border:1px solid #eee;";
    card.innerHTML = `<div style="font-weight:600; margin-bottom:6px;">${title}</div><div style="height:260px;"><canvas id="modal-canvas-${id}"></canvas></div>`;
    grid.appendChild(card);

    // re-render chart
    if (dataObj) {
      const ctx = document.getElementById(`modal-canvas-${id}`);
      const chartData = dataObj.timeline.map((date, i) => ({
        x: date,
        y:
          dataObj.values[i] !== undefined && dataObj.values[i] !== null
            ? applyScale(dataObj.values[i])
            : null,
      }));

      const ys = chartData.map((p) => p.y).filter((v) => v !== null);
      let ymin = -2.0,
        ymax = 1.5;
      if (ys.length) {
        const minV = Math.min(...ys);
        const maxV = Math.max(...ys);
        const pad = Math.max((maxV - minV) * 0.1, 0.1);
        ymin = minV - pad;
        ymax = maxV + pad;
      }

      const chart = new Chart(ctx, {
        type: "line",
        data: {
          datasets: [
            {
              label: dataObj.attribute,
              data: chartData,
              borderColor: dataObj.attribute.toUpperCase().includes("NDVI")
                ? "green"
                : "blue",
              borderWidth: 2,
              fill: false,
              pointRadius: 2,
            },
          ],
        },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'month' },
                    grid: { color: '#111', borderDash: [2, 2] }
                },
                y: {
                    min: ymin,
                    max: ymax,
                    grid: { color: '#111', borderDash: [2, 2] }
                },
            },
          },
        });
      window.wtss_modal_charts.push(chart);
    } else {
      // se não há dados salvos, cria placeholder
      const ctx = document.getElementById(`modal-canvas-${id}`);
      new Chart(ctx, {
        type: "line",
        data: { datasets: [] },
        options: { responsive: true, maintainAspectRatio: false },
      });
    }
  });

  // fechar modal: destruir charts e remover overlay
  function closeModal() {
    if (window.wtss_modal_charts && window.wtss_modal_charts.length) {
      window.wtss_modal_charts.forEach((c) => {
        try {
          c.destroy();
        } catch (e) {}
      });
      window.wtss_modal_charts = [];
    }
    overlay.remove();
  }

  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) closeModal();
  });
};

// --------------------------------------
// CLIQUE NO MAPA (STAC + WTSS)
// --------------------------------------
map.on("click", async function (e) {
  const { lat, lng } = e.latlng;

  hideInfoPanel();
  createSelectionVisuals(e.latlng);

  let pulse = L.circle(e.latlng, {
    radius: 5000,
    color: "#ff0000",
    fillColor: "#ff4d4d",
    fillOpacity: 0.25,
  }).addTo(map);
  setTimeout(() => {
    map.removeLayer(pulse);
  }, 600);

  showInfoPanelSTAC(
    "<strong>📍 Ponto selecionado</strong><br>Buscando produtos STAC..."
  );

  try {
    // STAC: apenas metadados
    const satelitesQuery = selectedTags
      .map((tag) => sateliteIdMap[tag])
      .filter((id) => id)
      .join(",");
    const response = await fetch(
      `http://localhost:3000/api/geodata?lat=${lat}&lng=${lng}&satelites=${satelitesQuery}`
    );
    if (!response.ok)
      throw new Error(`Erro ao buscar metadados STAC: ${response.status}`);

    const data = await response.json();
    let panelContent = `<div class="satelite-popup-header"><strong>Resultados STAC:</strong> ${lat.toFixed(
      4
    )}, ${lng.toFixed(4)}</div><hr class="satelite-popup-divider">`;

    if (data.length > 0) {
      panelContent += `<div class="stac-accordion">`;
      data.forEach((item, idx) => {
        const popularName =
          productNameToPopularName[item.productName] || item.productName;
        const availableBands = (item.variables || [])
          .map((v) => v.name || v.id)
          .filter(Boolean);

        panelContent += `
                    <details class="stac-accordion-item" ${
                      idx === 0 ? "open" : ""
                    }>
                        <summary>
                            <strong>🛰️ ${popularName}</strong>
                        </summary>
                        <div class="product-info-block">
                            <p class="product-description">${
                              item.description ||
                              item.title ||
                              "Sem descrição disponível."
                            }</p>
                            <p class="product-bands"><strong>Bandas:</strong> ${
                              availableBands.join(", ") || "N/A"
                            }</p>
                        </div>
                    </details>
                `;
      });
      panelContent += `</div>`;
    } else {
      panelContent += `<p>Nenhum produto STAC encontrado para os filtros ativos.</p>`;
    }

    showInfoPanelSTAC(panelContent);

    // WTSS: inicia seleção de coleções
    await showWTSSElectionPanel(lat, lng);
  } catch (error) {
    console.error("Erro geral no clique do mapa:", error);
    showInfoPanelSTAC(
      `<div class="text-error"><strong>Erro Geral:</strong> ${error.message}</div>`
    );

    // Ainda tenta inicializar o painel WTSS
    await showWTSSElectionPanel(lat, lng);
  }
});

// --------------------------------------
// EVENTOS DE INPUT
// --------------------------------------
input.addEventListener("focus", () => showSuggestions(""));
input.addEventListener("input", () =>
  showSuggestions(input.value.toLowerCase())
);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const value = input.value.trim();
    const match = allSuggestions.find(
      (item) => item.toLowerCase() === value.toLowerCase()
    );
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
{ text: "🌍 Bem-vindo ao Aetheris! Esta plataforma visualiza dados de séries temporais do Brazil Data Cube. Clique em qualquer ponto do mapa para começar." },
    { text: "🔍 **Passo 1: Seleção Inicial.** Após clicar no mapa, o painel WTSS à direita mostrará as coleções disponíveis. Comece selecionando a primeira Coleção e o Atributo (ex: NDVI)." },
    { text: "▶️ **Passo 2: Plotar.** Clique em '▶️ Plotar Série Temporal'. O gráfico será adicionado à área inferior do painel." },
    { text: "🖥️ **Passo 3: Comparação (A Chave!).** Para comparar, selecione **outra Coleção/Atributo** e clique em '▶️ Plotar' novamente." },
    { text: "✅ **Passo 4: Visualizar Lado a Lado.** Para visualizar os gráficos lado a lado e compará-los de forma limpa, use o botão '🖥️ Mostrar Selecionados' no painel de controle." },
    { text: "⬇️ **Passo 5: Exportar.** Você pode usar o botão 'Exportar Todos Gráficos' para baixar um arquivo .zip com todas as suas séries plotadas em PNG." },
    { text: "✨ Pronto! Use o filtro de satélites na barra lateral e o botão 'Limpar Gráficos' para gerenciar sua análise." }
];

let currentStep = 0;
const tutorialOverlay = document.getElementById("tutorial-overlay");
const tutorialNextBtn = document.getElementById("tutorial-next");
const tutorialBackBtn = document.getElementById("tutorial-back");
const tutorialCloseBtn = document.getElementById("tutorial-close");
const showTutorialBtn = document.getElementById("show-tutorial");

function closeTutorial() {
  if (tutorialOverlay) {
    tutorialOverlay.classList.add("hidden");
    localStorage.setItem("tutorialCompleted", "true");
  }
}

function updateTutorialStep() {
  if (!tutorialOverlay || currentStep >= tutorialSteps.length) return;
  const box = tutorialOverlay.querySelector(".tutorial-box");
  box.querySelector("p").innerHTML = tutorialSteps[currentStep].text;

  tutorialNextBtn.textContent =
    currentStep === tutorialSteps.length - 1 ? "Concluir ✅" : "Próximo ➤";

  if (currentStep === 0) {
    tutorialBackBtn.classList.add("hidden");
  } else {
    tutorialBackBtn.classList.remove("hidden");
  }
}

window.showTutorial = function () {
  if (tutorialOverlay) {
    tutorialOverlay.classList.remove("hidden");
    currentStep = 0;
    updateTutorialStep();
  }
};

tutorialNextBtn.addEventListener("click", () => {
  currentStep++;
  if (currentStep < tutorialSteps.length) {
    updateTutorialStep();
  } else {
    closeTutorial();
  }
});

tutorialBackBtn.addEventListener("click", () => {
  if (currentStep > 0) {
    currentStep--;
    updateTutorialStep();
  }
});

tutorialCloseBtn.addEventListener("click", closeTutorial);
tutorialOverlay.addEventListener("click", (e) => {
  if (e.target === tutorialOverlay) {
    closeTutorial();
  }
});

if (showTutorialBtn) {
  showTutorialBtn.addEventListener("click", window.showTutorial);
}

// --------------------------------------
// EXPORTAÇÃO DE GRÁFICOS WTSS (ZIP com PNGs)
// --------------------------------------
async function exportAllWTSSCharts() {
  const canvases = document.querySelectorAll("#wtss-tab canvas");
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

  canvases.forEach((canvas) => {
    const imgData = canvas.toDataURL("image/png");
    const base64 = imgData.split(",")[1];
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

function injectWTSSStyles() {
  if (document.getElementById("wtss-custom-styles")) return;
  const css = `
    /* Contêiner do bloco do gráfico */
    .wtss-chart-block {
      margin: 10px 0;
      border: 1px solid #e6e6e6;
      border-radius: 8px;
      padding: 6px;
      transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
      background: linear-gradient(180deg, #ffffff 0%, #fbfbfb 100%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      overflow: hidden;
    }
    .wtss-chart-block:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 24px rgba(0,0,0,0.08);
    }
    .wtss-chart-block.selected {
      border-color: #2e7d32;
      box-shadow: 0 12px 30px rgba(46,125,50,0.12);
      background: linear-gradient(180deg, #f6ffef 0%, #ffffff 100%);
    }

    /* Summary / cabeçalho */
    .wtss-summary-header {
      display:flex;
      align-items:center;
      gap:8px;
      padding:6px 4px;
      cursor: pointer;
    }
    .wtss-summary-header label { cursor: pointer; display:flex; align-items:center; gap:8px; }

    /* Checkbox customizado */
    .wtss-select-checkbox {
      -webkit-appearance: none;
      appearance: none;
      width:20px;
      height:20px;
      border-radius:4px;
      border:2px solid #cfcfcf;
      background:#fff;
      display:inline-block;
      vertical-align:middle;
      position:relative;
      transition: all 140ms ease;
      box-shadow: inset 0 -1px 0 rgba(0,0,0,0.03);
    }
    .wtss-select-checkbox:checked {
      background: linear-gradient(135deg,#4caf50,#2e7d32);
      border-color: #2e7d32;
      box-shadow: 0 4px 12px rgba(46,125,50,0.12);
    }
    .wtss-select-checkbox:checked::after{
      content: "✓";
      color: #fff;
      font-size:12px;
      position:absolute;
      left:3px;
      top:-1px;
      font-weight:700;
    }

    /* Canvas wrapper com altura fixa para manter layout */
    .wtss-canvas-wrapper { height:260px; display:block; }
    .wtss-panel { padding:8px 6px 12px 6px; background:transparent; }

    /* Pequeno destaque do título */
    .wtss-summary-header span { font-weight:600; color:#222; }
  `;
  const style = document.createElement("style");
  style.id = "wtss-custom-styles";
  style.innerHTML = css;
  document.head.appendChild(style);
}
injectWTSSStyles();
// ...existing code...

// ...existing code...
function createWTSSTimeSeriesChart(
  title,
  values,
  timeline,
  attribute,
  coverage
) {
  // sanitize unique id to safe HTML id
  const uniqueId = sanitizeId(`chart-${coverage}-${attribute}-${Date.now()}`);
  const graphArea = document.getElementById("wtss-graph-area");
  if (!graphArea) return;

  // Remove mensagem de carregamento, se existir
  const loadingMessage = document.getElementById("wtss-loading-message");
  if (loadingMessage) loadingMessage.remove();

  // Cria bloco HTML do gráfico WTSS (acordeão) com checkbox
  const chartBlock = document.createElement("div");
  chartBlock.id = uniqueId;
  chartBlock.classList.add("wtss-chart-block");
  chartBlock.innerHTML = `
        <details id="details-${uniqueId}" class="wtss-details-container"
            ontoggle="if(this.open) plotChartInAcordeon('${uniqueId}', '${title}', '${attribute}')">
           <summary class="wtss-summary-header">
  <label style="display:inline-flex;align-items:center;gap:8px;">
    <input type="checkbox" class="wtss-select-checkbox" data-wtss-id="${uniqueId}">
    <span>🛰️ ${title} <small style="color:#666; margin-left:6px;">(${attribute})</small></span>
  </label>
  <button type="button" class="wtss-close-btn" title="Fechar este gráfico" aria-label="Fechar">×</button>
</summary>
            <div class="wtss-panel wtss-chart-container-border">
                <p style="margin:6px 0;"><b>Atributo:</b> ${attribute}</p>
                <hr class="satelite-popup-divider">
                <div class="wtss-canvas-wrapper">
                    <canvas id="canvas-${uniqueId}"></canvas>
                </div>
                <p class="chart-footer stac-chart-footer" style="margin-top:8px;">
                    Valores reais (escala padrão aplicada).
                </p>
            </div>
        </details>
    `;

  graphArea.appendChild(chartBlock);

  // handler do botão fechar
const closeBtn = chartBlock.querySelector(".wtss-close-btn");
if (closeBtn) {
  closeBtn.addEventListener("click", (ev) => {
    ev.stopPropagation(); // não alterna o <details> nem o checkbox

    // destruir Chart.js se tiver sido criado
    const canvas = chartBlock.querySelector(`#canvas-${uniqueId}`);
    if (canvas && canvas._chart) {
      try { canvas._chart.destroy(); } catch (e) {}
    }

    // limpar referência temporária
    try { delete window[`wtss_data_${uniqueId}`]; } catch (e) {}

    // remover o bloco
    chartBlock.remove();
  });
}

  document.getElementById("wtss-tab").scrollTop = 0;

  // Interatividade visual: atualiza classe .selected quando checkbox muda
  const checkbox = chartBlock.querySelector(".wtss-select-checkbox");
  if (checkbox) {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) chartBlock.classList.add("selected");
      else chartBlock.classList.remove("selected");
    });
    // clique no header também alterna o checkbox (melhor UX)
    const summary = chartBlock.querySelector("summary");
    if (summary) {
      summary.addEventListener("click", (ev) => {
        // evita fechar o details ao clicar no checkbox/label
        const targetIsInput = ev.target.closest("input") !== null;
        if (!targetIsInput) {
          // toggle checkbox selection independentemente do detalhe aberto
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event("change"));
        }
      });
    }
  }

  // Guarda dados temporariamente no objeto global
  window[`wtss_data_${uniqueId}`] = { values, timeline, attribute, coverage };

  // Função que plota o gráfico dentro do acordeão
  window.plotChartInAcordeon = function (id, title, attribute) {
    const data = window[`wtss_data_${id}`];
    if (!data) return;

    const ctx = document.getElementById(`canvas-${id}`);
    if (ctx && !ctx._chart) {
      const chartData = data.timeline.map((date, i) => ({
        x: date,
        y:
          data.values[i] !== undefined && data.values[i] !== null
            ? applyScale(data.values[i])
            : null,
      }));

      // Autoescala Y
      const ys = chartData.map((p) => p.y).filter((v) => v !== null);
      let ymin = -2.0,
        ymax = 1.5;
      if (ys.length) {
        const minV = Math.min(...ys);
        const maxV = Math.max(...ys);
        const pad = Math.max((maxV - minV) * 0.1, 0.1);
        ymin = minV - pad;
        ymax = maxV + pad;
      }

      // Criação do gráfico Chart.js
      const chart = new Chart(ctx, {
        type: "line",
        data: {
          datasets: [
            {
              label: attribute,
              data: chartData,
              borderColor: attribute.toUpperCase().includes("NDVI")
                ? "green"
                : "blue",
              borderWidth: 2,
              fill: false,
              pointRadius: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          color: "#111",
          scales: {
            x: {
              type: "time",
              time: { unit: "month", tooltipFormat: "dd MMM yyyy" },
              title: { display: true, text: "Data", color: "#111" },
              ticks: { color: "#111" },
              grid: { color: "#111" },
            },
            y: {
              title: {
                display: true,
                text: "Valor (Escala aplicada)",
                color: "#111",
              },
              ticks: { color: "#111" },
              grid: { color: "#111" },
              min: ymin,
              max: ymax,
            },
          },
        },
      });
      canvas._chart = chart;
    
    }
  };

}
