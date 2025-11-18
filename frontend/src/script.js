// Aetheris
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

window.currentWtssResult = null;
let WTSS_COLLECTIONS_CACHE = [];

// ELEMENTOS DE INTERFACE

const sidebar = document.getElementById("sidebar");
const input = document.getElementById("tag-input");
const suggestionsBox = document.getElementById("suggestions");
const selectedTagsContainer = document.getElementById("selected-tags");
const infoPanel = document.getElementById("info-panel-right");

let selectedTags = [];
let selectedMarker;
let selectedArea;

// DADOS BASE

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

const ATTRIBUTE_INFO = {
  NDVI: {
    nome: "NDVI (Índice de Vegetação por Diferença Normalizada)",
    descricao:
      "Índice de vegetação calculado a partir das bandas do vermelho e do infravermelho próximo. Valores maiores indicam vegetação mais densa e saudável.",
    unidade: "adimensional (≈ -1 a 1)",
  },
  EVI: {
    nome: "EVI (Índice de Vegetação Realçado)",
    descricao:
      "Índice de vegetação que corrige alguns efeitos atmosféricos e influência do solo. Sensível principalmente à vegetação densa.",
    unidade: "adimensional (≈ -1 a 1)",
  },
  NBR: {
    nome: "NBR (Normalized Burn Ratio)",
    descricao:
      "Índice usado para detectar áreas queimadas, usando bandas de infravermelho próximo e infravermelho de ondas curtas.",
    unidade: "adimensional",
  },
  LST_DAY_1KM: {
    nome: "LST_Day_1km (Land Surface Temperature - Dia)",
    descricao:
      "Temperatura da superfície terrestre durante o dia, derivada de bandas térmicas.",
    unidade: "Kelvin (K) – geralmente convertida para °C.",
  },
  LST_NIGHT_1KM: {
    nome: "LST_Night_1km (Land Surface Temperature - Noite)",
    descricao:
      "Temperatura da superfície terrestre durante a noite, derivada de bandas térmicas.",
    unidade: "Kelvin (K) – geralmente convertida para °C.",
  },
  CLEAROB: {
    nome: "CLEAROB (Observações sem nuvem)",
    descricao:
      "Número de observações válidas (sem nuvem) usadas na composição daquele pixel.",
    unidade: "contagem (número de observações)",
  },
  TOTALOB: {
    nome: "TOTALOB (Total de observações)",
    descricao:
      "Total de observações disponíveis no período, incluindo com e sem nuvem.",
    unidade: "contagem (número de observações)",
  },
  SCL: {
    nome: "SCL (Scene Classification Layer)",
    descricao:
      "Camada de classificação de cena, indicando se o pixel é vegetação, solo exposto, nuvem, água, etc.",
    unidade: "categoria (código inteiro)",
  },
};

function getAttributeInfo(attribute) {
  if (!attribute) {
    return {
      nome: "Atributo não definido",
      descricao: "Nenhum atributo selecionado.",
      unidade: "-",
    };
  }

  const key = attribute.toUpperCase();

  // Tenta (NDVI, EVI, NBR...)
  if (ATTRIBUTE_INFO[key]) {
    return ATTRIBUTE_INFO[key];
  }

  if (/^B0?\d/i.test(key)) {
    return {
      nome: `Banda ${attribute}`,
      descricao:
        "Banda espectral original do sensor (por exemplo, azul, verde, vermelho ou infravermelho). A interpretação exata depende do satélite.",
      unidade: "reflectância escalada (adimensional)",
    };
  }

  if (key.includes("RED")) {
    return {
      nome: attribute,
      descricao:
        "Reflectância na região do vermelho do espectro eletromagnético.",
      unidade: "reflectância escalada (adimensional)",
    };
  }

  if (key.includes("NIR")) {
    return {
      nome: attribute,
      descricao:
        "Reflectância na região do infravermelho próximo, muito sensível à vegetação.",
      unidade: "reflectância escalada (adimensional)",
    };
  }

  if (key.includes("BAND5")) {
    return {
      nome: attribute,
      descricao: "Nome comum 'Blue'.",
      unidade: "reflectância escalada (adimensional)",
    };
  }
  
  if (key.includes("BAND6")) {
    return {
      nome: attribute,
      descricao: "Nome comum 'Green'.",
      unidade: "reflectância escalada (adimensional)",
    };
  }

  if (key.includes("BAND7")) {
    return {
      nome: attribute,
      descricao: "Nome comum 'Red'.",
      unidade: "reflectância escalada (adimensional)",
    };
  }

  if (key.includes("BAND8")) {
    return {
      nome: attribute,
      descricao: "Nome comum 'Nir'. Reflectância na região do infravermelho próximo, muito sensível à vegetação.",
      unidade: "reflectância escalada (adimensional)",
    };
  }
  
  if (key.includes("BLUE")) {
    return {
      nome: attribute,
      descricao: "Reflectância na região do azul do espectro.",
      unidade: "reflectância escalada (adimensional)",
    };
  }

  return {
    nome: attribute,
    descricao:
      "Atributo proveniente do produto original. Consulte a documentação técnica do dataset para detalhes específicos.",
    unidade: "ver documentação",
  };
}

// CONTROLE DO SIDEBAR

window.toggleMenu = function () {
  sidebar.classList.toggle("ativo");
};

// SELEÇÃO NO MAPA

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

// TAG SELECTOR (filtros de satélite)

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

// ABAS DO PAINEL DIREITO (STAC / WTSS)

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

/* STAC - CHARTS / API */

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

// WTSS - LÓGICA MULTI-ESTÁGIO E COMPARAÇÃO

//  Helper: "NDVI,EVI" -> ["NDVI","EVI"]
function parseAttributesList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// WTSS único atributo
async function fetchWTSSSingleAttr(
  coverage,
  lat,
  lon,
  startISO,
  endISO,
  attribute
) {
  const baseUrl = "https://data.inpe.br/bdc/wtss/v4/";
  const url = `${baseUrl}time_series?coverage=${encodeURIComponent(
    coverage
  )}&attributes=${encodeURIComponent(
    attribute
  )}&start_date=${encodeURIComponent(startISO)}&end_date=${encodeURIComponent(
    endISO
  )}&latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}`;

  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error("WTSS status " + r.status);
    const j = await r.json();
    const attrs =
      j && j.result && Array.isArray(j.result.attributes)
        ? j.result.attributes
        : [];
    const found = attrs.find((a) => a.attribute === attribute);
    const values = found && Array.isArray(found.values) ? found.values : [];
    const timeline =
      j && j.result && Array.isArray(j.result.timeline)
        ? j.result.timeline
        : [];
    return { source: "WTSS", attribute, values, timeline };
  } catch (e) {
    console.error("[WTSS] erro single attr:", e);
    return { source: "WTSS", attribute, values: [], timeline: [] };
  }
}

async function fetchSTACSingleAttr(
  coverage,
  lat,
  lon,
  startISO,
  endISO,
  attribute
) {
  try {
    const url = `http://localhost:3000/api/timeseries?lat=${encodeURIComponent(
      lat
    )}&lng=${encodeURIComponent(lon)}&coverage=${encodeURIComponent(
      coverage
    )}&bands=${encodeURIComponent(attribute)}&start=${encodeURIComponent(
      startISO
    )}&end=${encodeURIComponent(endISO)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("STAC status " + r.status);
    const j = await r.json();
    const attrs = Array.isArray(j.attributes) ? j.attributes : [];
    const timeline = Array.isArray(j.timeline) ? j.timeline : [];
    let values = [];
    if (attrs.includes(attribute) && Array.isArray(j.values)) {
      values = j.values.map((v) =>
        v && v[attribute] != null ? v[attribute] : null
      );
    }
    return { source: "STAC", attribute, values, timeline };
  } catch (e) {
    console.error("[STAC] erro single attr:", e);
    return { source: "STAC", attribute, values: [], timeline: [] };
  }
}

async function fetchAnySingleAttr(
  coverage,
  lat,
  lon,
  startISO,
  endISO,
  attribute
) {
  const wtss = await fetchWTSSSingleAttr(
    coverage,
    lat,
    lon,
    startISO,
    endISO,
    attribute
  );
  if (wtss.values && wtss.values.length) return wtss;
  const stac = await fetchSTACSingleAttr(
    coverage,
    lat,
    lon,
    startISO,
    endISO,
    attribute
  );
  return stac;
}

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

          // Fallback de atributos
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

// Seleção da Coleção e Atributo na mesma aba
function sanitizeId(text) {
  return text.replace(/[^a-z0-9]/gi, "_");
}

// === Helper: lê seleções
function getSelectedWTSSAttributes() {
  const sel = document.getElementById("wtss-attribute-select");
  if (!sel) return "";
  if (sel.multiple) {
    const values = Array.from(sel.selectedOptions)
      .map((o) => o.value)
      .filter(Boolean);
    if (!values.length && sel.options.length > 0) {
      values.push(sel.options[0].value);
    }
    return values.join(",");
  }
  return sel.value || "";
}

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

  // Monta options de coleção
  const collectionOptions = result.collections
    .map((col) => {
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
          <label for="wtss-attribute-select"><strong>Atributos</strong></label>
          <select id="wtss-attribute-select" class="wtss-full-width-select" multiple
              title="Segure Ctrl (Windows/Linux) ou ⌘ Command (Mac) para selecionar mais de um."></select>
          <p style="margin: 6px 0 0; font-size: 0.85em; opacity: 0.9;">
            💡 <b>Dica:</b> para selecionar <u>mais de um</u> atributo, mantenha pressionado <b>Ctrl</b> (Windows/Linux) ou <b>⌘ Command</b> (Mac) ao clicar nas opções.
          </p>
      </div>

      <!-- CAIXA DE LEGENDA DOS ATRIBUTOS -->
      <div id="wtss-attribute-info" class="wtss-attribute-info-box" style="margin-top:8px; padding:6px 8px; border-radius:6px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); font-size:0.85em;">
        <p style="margin:0; opacity:0.9;">Selecione um atributo para ver a descrição aqui.</p>
      </div>

      <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          <button id="wtss-plot-selected" class="action-button">▶️ Plotar</button>
          <button id="wtss-clear-all" class="action-button secondary-button">Limpar Todos os Gráficos</button>
      </div>

      <br>
  
  </div>

  <button id="wtss-show-selected" class="action-button primary-button">🖥️ Mostrar Selecionados</button><br>
<button id="wtss-select-first-six" class="action-button" style="background-color: #ffc107; border-color: #ffc107; color: #333;">✅ Selecionar 6 Primeiros</button>  <div id="wtss-graph-area"></div>
`;

  const wtssTab = document.getElementById("wtss-tab");
  wtssTab.innerHTML = panelContent;
  wtssTab.style.overflowY = "auto";
  showTab("wtss-tab");

  const collectionsByTitle = {};
  result.collections.forEach((col) => {
    collectionsByTitle[col.title] = col;
  });

  const collSelect = document.getElementById("wtss-collection-select");
  const attrSelect = document.getElementById("wtss-attribute-select");
  const plotBtn = document.getElementById("wtss-plot-selected");
  const clearBtn = document.getElementById("wtss-clear-all");
  const showSelectedBtn = document.getElementById("wtss-show-selected");
  const selectFirstSixBtn = document.getElementById("wtss-select-first-six");

  function updateAttributeInfoBox() {
    const box = document.getElementById("wtss-attribute-info");
    if (!box) return;

    const csv = getSelectedWTSSAttributes();
    if (!csv) {
      box.innerHTML =
        '<p style="margin:0; opacity:0.9;">Selecione um atributo para ver a descrição aqui.</p>';
      return;
    }

    const attrs = parseAttributesList(csv);

    if (attrs.length === 1) {
      const info = getAttributeInfo(attrs[0]);
      box.innerHTML = `
      <p style="margin:0 0 4px;"><strong>${info.nome}</strong></p>
      <p style="margin:0 0 2px; font-size:0.85em; opacity:0.9;">${info.descricao}</p>
      <p style="margin:0; font-size:0.8em; opacity:0.7;"><b>Unidade:</b> ${info.unidade}</p>
    `;
    } else {
      const listHtml = attrs
        .map((a) => {
          const i = getAttributeInfo(a);
          return `<li><b>${i.nome}:</b> ${i.descricao}</li>`;
        })
        .join("");
      box.innerHTML = `
      <p style="margin:0 0 4px;"><strong>Atributos selecionados:</strong></p>
      <ul style="margin:0 0 0 18px; padding:0; font-size:0.85em; opacity:0.9;">
        ${listHtml}
      </ul>
    `;
    }
  }

  function populateAttributesFor(collectionTitleEscaped) {
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

    updateAttributeInfoBox();
  }

  if (collSelect.value) {
    populateAttributesFor(collSelect.value);
  }

  collSelect.addEventListener("change", () =>
    populateAttributesFor(collSelect.value)
  );

  attrSelect.addEventListener("change", updateAttributeInfoBox);

  plotBtn.addEventListener("click", () => {
    const selectedEsc = collSelect.value;
    const selectedTitle = selectedEsc
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"');
    const coverage = selectedTitle;
    const attributeCsv = getSelectedWTSSAttributes();
    if (!coverage || !attributeCsv) {
      alert("Selecione coleção e pelo menos um atributo antes de plotar.");
      return;
    }
    fetchWTSSTimeSeriesAndPlot(lat, lng, coverage, attributeCsv);
  });

  clearBtn.addEventListener("click", () => {
    const graphArea = document.getElementById("wtss-graph-area");
    if (graphArea) graphArea.innerHTML = "";
  });

  showSelectedBtn.addEventListener("click", () => {
    if (typeof showSelectedWTSSInModal === "function")
      showSelectedWTSSInModal();
  });
  // NOVO: Listener para o botão de Selecionar 6 Primeiros
  if (selectFirstSixBtn) {
    selectFirstSixBtn.addEventListener("click", window.selectFirstSixCharts);
  }
};

// Busca série temporal WTSS
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

  const graphArea = document.getElementById("wtss-graph-area");
  const loadingId = "wtss-loading-message";
  if (graphArea) {
    const msg = document.createElement("div");
    msg.id = loadingId;
    msg.innerHTML = `<p>Carregando série WTSS: <strong>${coverage}</strong> / ${attribute} ...</p>`;
    graphArea.prepend(msg);
  }

  // MULTI-ATRIBUTOS
  const requestedAttrs = parseAttributesList(attribute);
  if (requestedAttrs.length > 1) {
    const promises = requestedAttrs.map((attr) =>
      fetchAnySingleAttr(coverage, lat, lon, startISO, endISO, attr)
    );

    try {
      const results = await Promise.all(promises);
      const mapAttrToValues = {};

      const candidateTimelines = results
        .map((r) => ({
          attr: r.attribute,
          tl: r.timeline || [],
          len: (r.timeline || []).length,
        }))
        .filter((o) => o.len > 0);

      const refTimeline = candidateTimelines.length
        ? candidateTimelines.reduce((a, b) => (a.len <= b.len ? a : b)).tl
        : [];

      results.forEach((r) => {
        if (Array.isArray(r.values) && r.values.length) {
          const cut = refTimeline.length
            ? r.values.slice(0, refTimeline.length)
            : r.values;
          mapAttrToValues[r.attribute] = cut;
        }
      });

      if (Object.keys(mapAttrToValues).length) {
        createWTSSTimeSeriesChartMulti(
          `WTSS - ${coverage}`,
          mapAttrToValues,
          refTimeline,
          requestedAttrs,
          coverage
        );
        const loadingMessage = document.getElementById(loadingId);
        if (loadingMessage) loadingMessage.remove();
        return;
      }
    } catch (e) {
      console.error(
        "[WTSS multi] falha nas requisições múltiplas (WTSS/STAC):",
        e
      );
    }
  }
  // FIM MULTI-ATRIBUTOS

  const url = `${baseUrl}time_series?coverage=${encodeURIComponent(
    coverage
  )}&attributes=${encodeURIComponent(
    attribute
  )}&latitude=${lat}&longitude=${lon}&start_date=${startISO}&end_date=${endISO}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok)
      throw new Error(
        `Erro ${resp.status} ao buscar WTSS (${resp.statusText})`
      );
    const json = await resp.json();
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
// FUNÇÃO: Seleciona as primeiras 6 checkboxes plotadas
// --------------------------------------
window.selectFirstSixCharts = function() {
    const checkboxes = document.querySelectorAll(".wtss-select-checkbox");
    
    // 1. Limpa todas as seleções existentes primeiro
    checkboxes.forEach(cb => {
        cb.checked = false;
        // Simula o evento change para atualizar a classe 'selected' no bloco
        cb.closest('.wtss-chart-block')?.classList.remove('selected'); 
    });

    const chartsToSelect = [];
    
    // 2. Coleta os primeiros 6
    for (let i = 0; i < Math.min(checkboxes.length, 6); i++) {
        chartsToSelect.push(checkboxes[i]);
    }
    
    // 3. Marca os selecionados
    chartsToSelect.forEach(cb => {
        cb.checked = true;
        cb.closest('.wtss-chart-block')?.classList.add('selected');
    });

    if (checkboxes.length > 6) {
        alert(`Foram plotados ${checkboxes.length} gráficos. Apenas os 6 primeiros foram selecionados para comparação.`);
    } else if (checkboxes.length > 0) {
        // Notificação mais suave para mostrar que a seleção ocorreu
        // Pode ser aprimorada, mas alert simples serve por enquanto
        const total = checkboxes.length;
        alert(`${total} gráfico(s) selecionado(s) e pronto(s) para visualização. Clique em "🖥️ Mostrar Selecionados".`);
    } else {
        alert("Nenhum gráfico plotado ainda para ser selecionado.");
    }
};

// Modal para exibir gráficos selecionados (com legenda)

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

  const existing = document.getElementById("wtss-modal-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "wtss-modal-overlay";

  const modal = document.createElement("div");
  modal.id = "wtss-modal";

  const header = document.createElement("div");
  header.className = "wtss-modal-header";
  header.innerHTML = `<h3>Visualização — Gráficos Selecionados (${checked.length})</h3>`;

  const titleDiv = document.createElement("div");
  titleDiv.innerHTML = `<h3>Visualização — Gráficos Selecionados (${checked.length})</h3>`;
  header.appendChild(titleDiv);

  const controlsDiv = document.createElement("div");
  controlsDiv.style = "display:flex; gap:8px;"; // NOVO: Botão de Exportação no Modal

  const exportModalBtn = document.createElement("button");
  exportModalBtn.textContent = "⬇️ Exportar PNG/ZIP";
  exportModalBtn.className = "action-button primary-button";
  controlsDiv.appendChild(exportModalBtn);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Fechar ✖";
  closeBtn.className = "action-button secondary-button";
  controlsDiv.appendChild(closeBtn);

  header.appendChild(controlsDiv);

  const grid = document.createElement("div");
  grid.style =
    "display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:12px; margin-top:12px;";

  modal.appendChild(header);
  modal.appendChild(grid);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  window.wtss_modal_charts = [];

  checked.forEach((cb) => {
    const id = cb.getAttribute("data-wtss-id");
    const dataObj = window[`wtss_data_${id}`];

    let cardTitle = id;
    if (dataObj) {
      if (dataObj.multi) {
        // multi-atributo
        cardTitle = `${dataObj.coverage} — ${dataObj.attributes.join(", ")}`;
      } else {
        cardTitle = `${dataObj.coverage} — ${dataObj.attribute}`;
      }
    }

    // MONTA A LEGENDA (legendHtml)

    let legendHtml = "";
    if (dataObj) {
      if (dataObj.multi && Array.isArray(dataObj.attributes)) {
        const blocks = dataObj.attributes.map((attr) => {
          const info = getAttributeInfo(attr);
          return `
            <div class="wtss-modal-legend-item">
              <strong>${info.nome}</strong><br>
              <small><b>Atributo:</b> ${attr}</small><br>
              <span>${info.descricao}</span><br>
              <small class="wtss-modal-legend-unit"><i>Unidade:</i> ${info.unidade}</small>
            </div>
          `;
        });
        legendHtml = `
          <div class="wtss-modal-legend">
            ${blocks.join("")}
          </div>
        `;
      } else if (!dataObj.multi && dataObj.attribute) {
        const info = getAttributeInfo(dataObj.attribute);
        legendHtml = `
          <div class="wtss-modal-legend">
            <div class="wtss-modal-legend-item">
              <strong>${info.nome}</strong><br>
              <small><b>Atributo:</b> ${dataObj.attribute}</small><br>
              <span>${info.descricao}</span><br>
              <small class="wtss-modal-legend-unit"><i>Unidade:</i> ${info.unidade}</small>
            </div>
          </div>
        `;
      }
    }

    const card = document.createElement("div");
    card.className = "wtss-modal-card";

    card.innerHTML = `
      <div class="wtss-modal-card-title">${cardTitle}</div>
      <div class="wtss-modal-canvas-wrapper">
        <canvas id="modal-canvas-${id}"></canvas>
      </div>
      ${legendHtml}
    `;
    grid.appendChild(card);

    const ctx = document.getElementById(`modal-canvas-${id}`);

    if (!dataObj) {
      new Chart(ctx, {
        type: "line",
        data: { datasets: [] },
        options: { responsive: true, maintainAspectRatio: false },
      });
      return;
    }

    if (!dataObj.multi) {
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
              type: "time",
              time: { unit: "month" },
              grid: { color: "#111", borderDash: [2, 2] },
            },
            y: {
              min: ymin,
              max: ymax,
              grid: { color: "#111", borderDash: [2, 2] },
            },
          },
        },
      });
      window.wtss_modal_charts.push(chart);
      return;
    }

    // MULTI-ATRIBUTO
    const timeline = Array.isArray(dataObj.timeline) ? dataObj.timeline : [];
    const attributes = dataObj.attributes || [];
    const mapAttrToValues = dataObj.attrValuesMap || {};

    let minLen = timeline.length;
    attributes.forEach((attr) => {
      const arr = mapAttrToValues[attr] || [];
      minLen = minLen ? Math.min(minLen, arr.length) : arr.length;
    });

    if (!minLen) {
      new Chart(ctx, {
        type: "line",
        data: { datasets: [] },
        options: { responsive: true, maintainAspectRatio: false },
      });
      return;
    }

    const labels = timeline.slice(0, minLen);

    const datasets = attributes.map((attr, index) => {
      const raw = (mapAttrToValues[attr] || []).slice(0, minLen);
      const scaled = raw.map((v) =>
        v !== undefined && v !== null
          ? typeof applyScale === "function"
            ? applyScale(v)
            : v
          : null
      );

      let color = "hsl(" + ((index * 60) % 360) + ", 70%, 50%)";
      const U = String(attr).toUpperCase();
      if (U.includes("NDVI")) color = "rgba(0, 128, 0, 1)";
      else if (U.includes("EVI")) color = "rgba(0, 0, 255, 1)";

      return {
        label: attr,
        data: scaled,
        borderColor: color,
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 2,
      };
    });

    const allY = [];
    datasets.forEach((ds) =>
      ds.data.forEach((y) => {
        if (y != null) allY.push(y);
      })
    );
    let ymin = -2.5,
      ymax = 2.5;
    if (allY.length) {
      const minV = Math.min.apply(Math, allY);
      const maxV = Math.max.apply(Math, allY);
      const pad = Math.max((maxV - minV) * 0.1, 0.1);
      ymin = minV - pad;
      ymax = maxV + pad;
    }

    const chart = new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: true,
        scales: {
          x: {
            type: "time",
            time: { unit: "month" },
            grid: { color: "#111", borderDash: [2, 2] },
          },
          y: {
            min: ymin,
            max: ymax,
            grid: { color: "#111", borderDash: [2, 2] },
          },
        },
      },
    });
    window.wtss_modal_charts.push(chart);
  });

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
  exportModalBtn.addEventListener("click", exportModalCharts);
};

// CLIQUE NO MAPA (STAC + WTSS)

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

    await showWTSSElectionPanel(lat, lng);
  }
  pointHistory.unshift({ lat, lng, timestamp: Date.now() });
  if (pointHistory.length > 12) pointHistory.pop();
  updateHistoryList();
});

// EVENTOS DE INPUT

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

// TUTORIAL INTERATIVO AO INICIAR O SITE

const tutorialSteps = [
  {
    text: "🌍 Bem-vindo ao Aetheris! Esta plataforma visualiza dados de séries temporais do Brazil Data Cube. Clique em qualquer ponto do mapa para começar.",
  },
  {
    text: "🔍 **Passo 1: Seleção Inicial.** Após clicar no mapa, o painel WTSS à direita mostrará as coleções disponíveis. Comece selecionando a primeira Coleção e o Atributo (ex: NDVI).",
  },
  {
    text: "▶️ **Passo 2: Plotar.** Clique em '▶️ Plotar Série Temporal'. O gráfico será adicionado à área inferior do painel.",
  },
  {
    text: "🖥️ **Passo 3: Comparação (A Chave!).** Para comparar, selecione **outra Coleção/Atributo** e clique em '▶️ Plotar' novamente.",
  },
  {
    text: "✅ **Passo 4: Visualizar Lado a Lado.** Para visualizar os gráficos lado a lado e compará-los de forma limpa, use o botão '🖥️ Mostrar Selecionados' no painel de controle.",
  },
  {
 text: "⬇️ **Passo 5: Exportar.** Você pode usar o botão 'Exportar PNG/ZIP' para baixar um arquivo .zip com todas as suas séries plotadas em PNG.",  },
  {
    text: "✨ Pronto! Use o filtro de satélites na barra lateral e o botão 'Limpar Gráficos' para gerenciar sua análise.",
  },
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

// EXPORTAÇÃO DE GRÁFICOS WTSS (ZIP com PNGs)

async function exportAllWTSSCharts() {
  const canvases = document.querySelectorAll("#wtss-tab canvas");
  if (canvases.length === 0) {
    alert("Nenhum gráfico WTSS para exportar.");
    return;
  }

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
/**
 * NOVO: Função para exportar os gráficos que estão no modal de comparação.
 */
async function exportModalCharts() {
  if (!window.wtss_modal_charts || window.wtss_modal_charts.length === 0) {
    alert("Nenhum gráfico no modal para exportar.");
    return;
  }

  // Garante que JSZip esteja carregado
  if (typeof JSZip === "undefined") {
    await loadJSZip();
  }

  alert("Preparando exportação dos gráficos de comparação... Aguarde.");

  const zip = new JSZip();

  window.wtss_modal_charts.forEach((chart, index) => {
    try {
      const canvas = chart.canvas;
      const id = canvas.id.replace("modal-canvas-", "");

      // Tenta criar um nome descritivo a partir dos dados salvos
      const dataObj = window[`wtss_data_${id}`];
      let name = `chart-modal-${id}`;
      if (dataObj) {
        if (dataObj.multi) {
          name = `${dataObj.coverage}_${dataObj.attributes.join("-")}`;
        } else {
          name = `${dataObj.coverage}_${dataObj.attribute}`;
        }
      }

      const imgData = canvas.toDataURL("image/png");
      const base64 = imgData.split(",")[1];

      zip.file(`wtss_modal_${index + 1}_${sanitizeId(name)}.png`, base64, {
        base64: true,
      });
    } catch (e) {
      console.error("Erro ao exportar gráfico do modal:", e);
    }
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "wtss_graficos_comparacao.zip";
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

function createWTSSTimeSeriesChart(
  title,
  values,
  timeline,
  attribute,
  coverage
) {
  const uniqueId = sanitizeId(`chart-${coverage}-${attribute}-${Date.now()}`);
  const graphArea = document.getElementById("wtss-graph-area");
  if (!graphArea) return;

  const loadingMessage = document.getElementById("wtss-loading-message");
  if (loadingMessage) loadingMessage.remove();

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
        </details>
    `;

  graphArea.appendChild(chartBlock);

  const closeBtn = chartBlock.querySelector(".wtss-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const canvas = chartBlock.querySelector(`#canvas-${uniqueId}`);
      if (canvas && canvas._chart) {
        try {
          canvas._chart.destroy();
        } catch (e) {}
      }
      try {
        delete window[`wtss_data_${uniqueId}`];
      } catch (e) {}
      chartBlock.remove();
    });
  }

  document.getElementById("wtss-tab").scrollTop = 0;

  const checkbox = chartBlock.querySelector(".wtss-select-checkbox");
  if (checkbox) {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) chartBlock.classList.add("selected");
      else chartBlock.classList.remove("selected");
    });
    const summary = chartBlock.querySelector("summary");
    if (summary) {
      summary.addEventListener("click", (ev) => {
        const targetIsInput = ev.target.closest("input") !== null;
        if (!targetIsInput) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event("change"));
        }
      });
    }
  }

  window[`wtss_data_${uniqueId}`] = { values, timeline, attribute, coverage };

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

// Gráfico WTSS com múltiplos atributos
function createWTSSTimeSeriesChartMulti(
  title,
  attrValuesMap,
  timeline,
  attributes,
  coverage
) {
  const uniqueId = sanitizeId(`chart-multi-${coverage}-${Date.now()}`);
  const graphArea = document.getElementById("wtss-graph-area");
  if (!graphArea) return;

  const loadingMessage = document.getElementById("wtss-loading-message");
  if (loadingMessage) loadingMessage.remove();

  const chartBlock = document.createElement("div");
  chartBlock.id = uniqueId;
  chartBlock.classList.add("wtss-chart-block");

  chartBlock.innerHTML = `
    <details id="details-${uniqueId}" class="wtss-details-container"
      ontoggle="if(this.open) plotMultiChartInAcordeon('${uniqueId}')">
      <summary class="wtss-summary-header">
        <label style="display:inline-flex;align-items:center;gap:8px;">
          <input type="checkbox" class="wtss-select-checkbox" data-wtss-id="${uniqueId}">
          <span>🛰️ ${title} <small style="color:#666; margin-left:6px;">(${attributes.join(
    ", "
  )})</small></span>
        </label>
        <button type="button" class="wtss-close-btn" title="Fechar este gráfico" aria-label="Fechar">×</button>
      </summary>
    </details>
  `;

  graphArea.appendChild(chartBlock);
  document.getElementById("wtss-tab").scrollTop = 0;

  window["wtss_multi_" + uniqueId] = {
    attrValuesMap,
    timeline,
    attributes,
    coverage,
  };
  window["wtss_data_" + uniqueId] = {
    multi: true,
    attrValuesMap,
    timeline,
    attributes,
    coverage,
  };

  const det = document.getElementById("details-" + uniqueId);
  if (det) det.open = true;
  plotMultiChartInAcordeon(uniqueId);

  const closeBtn = chartBlock.querySelector(".wtss-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const canvas = chartBlock.querySelector(`#canvas-${uniqueId}`);
      if (canvas && canvas._chart) {
        try {
          canvas._chart.destroy();
        } catch (e) {}
      }
      try {
        delete window["wtss_multi_" + uniqueId];
        delete window["wtss_data_" + uniqueId];
      } catch (e) {}
      chartBlock.remove();
    });
  }

  const checkbox = chartBlock.querySelector(".wtss-select-checkbox");
  if (checkbox) {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) chartBlock.classList.add("selected");
      else chartBlock.classList.remove("selected");
    });
    const summary = chartBlock.querySelector("summary");
    if (summary) {
      summary.addEventListener("click", (ev) => {
        const targetIsInput = ev.target.closest("input") !== null;
        if (!targetIsInput) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event("change"));
        }
      });
    }
  }
}

window.plotMultiChartInAcordeon = function (id) {
  const data = window["wtss_multi_" + id];
  if (!data) return;
  const canvas = document.getElementById("canvas-" + id);
  if (!canvas) return;

  if (canvas._chart) {
    try {
      canvas._chart.destroy();
    } catch (e) {}
  }

  let minLen = Array.isArray(data.timeline) ? data.timeline.length : 0;
  data.attributes.forEach(function (attr) {
    const arr = data.attrValuesMap[attr] || [];
    minLen = minLen ? Math.min(minLen, arr.length) : arr.length;
  });
  if (!minLen) {
    const area =
      canvas.closest(".wtss-panel") ||
      document.getElementById("wtss-graph-area");
    if (area) {
      area.insertAdjacentHTML(
        "beforeend",
        '<div class="wtss-error-margin"><strong>Obs.:</strong> Sem pontos válidos para a combinação atual (verifique datas/atributos).</div>'
      );
    }
    return;
  }

  const labels =
    Array.isArray(data.timeline) && data.timeline.length >= minLen
      ? data.timeline.slice(0, minLen)
      : [];

  const datasets = data.attributes.map(function (attr, index) {
    const raw = (data.attrValuesMap[attr] || []).slice(0, minLen);
    const scaled = raw.map(function (v) {
      return v !== undefined && v !== null
        ? typeof applyScale === "function"
          ? applyScale(v)
          : v
        : null;
    });

    let color = "hsl(" + ((index * 60) % 360) + ", 70%, 50%)";
    const U = String(attr).toUpperCase();
    if (U.includes("NDVI")) color = "rgba(0, 128, 0, 1)";
    else if (U.includes("EVI")) color = "rgba(0, 0, 255, 1)";

    return {
      label: attr,
      data: scaled,
      borderColor: color,
      borderWidth: 2,
      fill: false,
      tension: 0.1,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: "#fff",
      pointBorderColor: color,
      pointBorderWidth: 2,
    };
  });

  const allY = [];
  datasets.forEach(function (ds) {
    ds.data.forEach(function (y) {
      if (y != null) allY.push(y);
    });
  });
  let ymin = -2.5,
    ymax = 2.5;
  if (allY.length) {
    const minV = Math.min.apply(Math, allY);
    const maxV = Math.max.apply(Math, allY);
    const pad = Math.max((maxV - minV) * 0.1, 0.1);
    ymin = minV - pad;
    ymax = maxV + pad;
  }

  canvas._chart = new Chart(canvas, {
    type: "line",
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: true,
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          type: "time",
          time: { unit: "month", tooltipFormat: "dd MMM yyyy" },
        },
        y: { min: ymin, max: ymax },
      },
      interaction: { mode: "nearest", intersect: false },
    },
  });
};

// HISTÓRICO DE PONTOS FLUTUANTE (Funcionalidade)

let pointHistory = [];

function updateHistoryList() {
  const container = document.getElementById("history-list");
  const widget = document.getElementById("history-floating-widget");

  if (!container) return;

  container.innerHTML = "";

  if (pointHistory.length === 0) {
    container.innerHTML = `<div class="empty-history">Nenhum ponto selecionado ainda.</div>`;
    return;
  }

  pointHistory.forEach((p) => {
    const item = document.createElement("div");
    item.classList.add("history-item");
    item.innerHTML = `
      <div class="history-coords">
          <span class="history-icon">📌</span>
          <span>Lat: ${p.lat.toFixed(3)}<br>Lng: ${p.lng.toFixed(3)}</span>
      </div>
      <div class="history-time">
        ${new Date(p.timestamp).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    `;

    item.addEventListener("click", () => {
      map.setView([p.lat, p.lng], 5);
      createSelectionVisuals({ lat: p.lat, lng: p.lng });
      showInfoPanelSTAC(
        "<strong>📍 Ponto selecionado</strong><br>Buscando produtos STAC..."
      );
      showWTSSElectionPanel(p.lat, p.lng);
    });

    container.appendChild(item);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const widget = document.getElementById("history-floating-widget");
  const header = widget ? widget.querySelector(".widget-header") : null;
  const toggleBtn = document.getElementById("toggle-history-btn");
  const closeWidgetBtn = document.getElementById("close-history-widget");
  const clearBtn = document.getElementById("clear-history-btn");

  if (closeWidgetBtn && widget) {
    closeWidgetBtn.addEventListener("click", () => {
      widget.classList.add("hidden");
    });
  }

  if (toggleBtn && widget) {
    toggleBtn.addEventListener("click", () => {
      widget.classList.toggle("hidden");
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      pointHistory = [];
      updateHistoryList();
    });
  }

  if (widget && header) {
    makeDraggable(widget, header);
  }

  updateHistoryList();
});

function makeDraggable(widget, handle) {
  let startX = 0,
    startY = 0;
  let widgetX = 0,
    widgetY = 0;
  let isDragging = false;

  handle.addEventListener("mousedown", (e) => {
    isDragging = true;

    // Posição inicial do mouse
    startX = e.clientX;
    startY = e.clientY;

    const style = window.getComputedStyle(widget);
    const matrix = new DOMMatrixReadOnly(style.transform);

    widgetX = matrix.m41;
    widgetY = matrix.m42;

    handle.style.cursor = "grabbing";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    handle.style.cursor = "grab";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    widget.style.transform = `translate(${widgetX + dx}px, ${widgetY + dy}px)`;
  });
}


