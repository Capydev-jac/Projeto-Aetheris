// Coordenadas aproximadas da caixa que engloba o Brasil
var brasilBounds = [
  [-34.0, -74.0], // Ponto sudoeste (latitude, longitude)
  [5.3, -34.0]    // Ponto nordeste (latitude, longitude)
];

// Inicializa o mapa na div com id "map"
var map = L.map('map', {
  maxBounds: brasilBounds,      // Limita o mapa para não sair do Brasil
  maxBoundsViscosity: 2.0,      // "Força" o usuário a não sair da área definida
  minZoom: 5,                   // Zoom mínimo permitido
  maxZoom: 15                   // Zoom máximo permitido
}).setView([-14.2, -51.9], 4);  // Define o centro inicial do mapa (aproximadamente o centro do Brasil) e o nível de zoom

// Adiciona a camada base do mapa (tiles) usando OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,   // Zoom máximo suportado pelos tiles
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
// ================================
// MENU LATERAL - Abertura/Fechamento
// ================================

// Abre o menu lateral
function abrirMenu() {
  document.getElementById("sidebar").classList.add("ativo");
  document.getElementById("menu-icon").style.display = "none";
}

// Fecha o menu lateral
function fecharMenu() {
  document.getElementById("sidebar").classList.remove("ativo");
  document.getElementById("menu-icon").style.display = "block";
}
// ================================
// ================================
// TAG INPUT - Sugestões e Seleção
// ================================

// Lista de sugestões disponíveis
const allSuggestions = [
  "CBERS4A",
  "Landsat-8",
  "CBERS-2B",
  "GOES-19",
  "Sentinel-2",
  "MODIS Terra/Aqua",
  "Landsat series",
  "MODIS Aqua",
  "Sentinel-3 OLCI",
  "CBERS-4",
  "Estações meteorológicas / satélite",
  "CBERS WFI"
];
// Elementos do DOM relacionados ao input de tags
const input = document.getElementById("tag-input");
const suggestionsBox = document.getElementById("suggestions");
const selectedTagsContainer = document.getElementById("selected-tags");

// Armazena as tags já selecionadas
let selectedTags = [];
// ================================
// EVENTOS DO INPUT
// ================================

// Ao focar no input, mostra todas as sugestões
input.addEventListener("focus", () => {
  showSuggestions(""); // Sem filtro
});

// Ao digitar no input, filtra sugestões
input.addEventListener("input", () => {
  const value = input.value.toLowerCase();
  showSuggestions(value);
});

// Ao pressionar "Enter", tenta adicionar a tag
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault(); // Previne envio de formulário, se houver

    const value = input.value.trim();
    const match = allSuggestions.find(item => item.toLowerCase() === value.toLowerCase());

    // Adiciona a tag somente se for uma sugestão válida e ainda não foi selecionada
    if (match && !selectedTags.includes(match)) {
      selectTag(match);
    }
  }
});
// ================================
// FUNÇÕES DE SUGESTÃO
// ================================

// Mostra as sugestões filtradas
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

  // Exibe ou oculta a caixa de sugestões
  suggestionsBox.style.display = filtered.length ? "block" : "none";
}

// Seleciona uma tag
function selectTag(tag) {
  selectedTags.push(tag);
  input.value = "";
  suggestionsBox.innerHTML = "";
  renderSelectedTags();
  input.focus(); // Mantém o foco no input
}

// Remove uma tag
function removeTag(tag) {
  selectedTags = selectedTags.filter(t => t !== tag);
  renderSelectedTags();
  showSuggestions(input.value); // Atualiza sugestões com base no input atual
}

// Atualiza a interface com as tags selecionadas
function renderSelectedTags() {
  selectedTagsContainer.innerHTML = "";

  selectedTags.forEach(tag => {
    const tagEl = document.createElement("div");
    tagEl.classList.add("tag");
    tagEl.innerHTML = `
      ${tag} <span class="remove" onclick="removeTag('${tag}')">&times;</span>
    `;
    selectedTagsContainer.appendChild(tagEl);
  });
}

// ================================
// EVENTO GLOBAL - Clique fora do input fecha sugestões
// ================================

document.addEventListener("click", function (e) {
  const target = e.target;
  const wrapper = document.querySelector(".tag-selector");

  // Se clicou fora do componente de tags, esconde as sugestões
  if (!wrapper.contains(target)) {
    suggestionsBox.innerHTML = "";
  }
});

// Objeto para armazenar as camadas de satélites
const markers = {};
let activeMarkers = [];

// Função para buscar dados do satélite e adicionar marcador
async function fetchsateliteData(sateliteId) {
    try {
        const response = await fetch(`http://localhost:3000/api/satelites/${sateliteId}`);
        if (!response.ok) {
            throw new Error(`Erro ao buscar dados: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Houve um problema com a sua requisição:', error);
        alert(`Houve um problema com a sua requisição para ${sateliteId}: ${error.message}`);
        return null;
    }
}

// Lidar com a seleção de satélites
document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', async (event) => {
        const sateliteId = event.target.id;
        if (event.target.checked) {
            const data = await fetchsateliteData(sateliteId);
            if (data) {
                const marker = L.marker([data.latitude, data.longitude]).addTo(map)
                    .bindPopup(`<b>${data.name}</b><br>Latitude: ${data.latitude}<br>Longitude: ${data.longitude}<br>Altitude: ${data.altitude} km`);
                
                markers[sateliteId] = marker;
                marker.openPopup();
            }
        } else {
            if (markers[sateliteId]) {
                map.removeLayer(markers[sateliteId]);
                delete markers[sateliteId];
            }
        }
    });
});

// Adicionar a nova funcionalidade de clique no mapa
map.on('click', async function(e) {
    const { lat, lng } = e.latlng;
    
    // Remover marcadores anteriores
    activeMarkers.forEach(marker => map.removeLayer(marker));
    activeMarkers = [];

    // Fazer a requisição para o back-end
    try {
        const response = await fetch(`http://localhost:3000/api/geodata?lat=${lat}&lng=${lng}`);
        if (!response.ok) {
            throw new Error(`Erro ao buscar dados geográficos: ${response.status}`);
        }
        const data = await response.json();

        if (data.length > 0) {
            let popupContent = `<b>Dados para as coordenadas ${lat.toFixed(2)}, ${lng.toFixed(2)}:</b><br><br>`;
            
            // Exibir as informações retornadas pela API
            data.forEach(item => {
                popupContent += `<b>Produto:</b> ${item.productName}<br>`;
                popupContent += `<b>Descrição:</b> ${item.description}<br><br>`;

                // Criar um novo marcador no local do clique
                const newMarker = L.marker([lat, lng]).addTo(map)
                    .bindPopup(popupContent)
                    .openPopup();
                
                activeMarkers.push(newMarker);
            });
        } else {
            // Se nenhum dado foi encontrado
            const notFoundMarker = L.marker([lat, lng]).addTo(map)
                .bindPopup(`Nenhum dado encontrado para esta área.`);
            
            activeMarkers.push(notFoundMarker);
        }

    } catch (error) {
        console.error('Houve um problema com a requisição de geodados:', error);
        alert(`Erro: ${error.message}`);
    }
});

// ================================
// MAPA - Clique para selecionar ponto com área
// ================================

// Grupo para armazenar marcador e área selecionada
let selectedMarker;
let selectedArea;

map.on("click", function (e) {
  // Remove marcador e área anteriores, se existirem
  if (selectedMarker) map.removeLayer(selectedMarker);
  if (selectedArea) map.removeLayer(selectedArea);

  // Adiciona marcador central
  selectedMarker = L.circleMarker(e.latlng, {
    radius: 10,
    color: "#ff0000",
    weight: 3,
    fillColor: "#ff4d4d",
    fillOpacity: 0.7
  }).addTo(map);

  // Área transparente em volta do ponto (raio em metros)
  selectedArea = L.circle(e.latlng, {
    radius: 20000,        // raio em metros (ex: 20 km)
    color: "#ff0000",
    weight: 2,
    fillColor: "#ff4d4d",
    fillOpacity: 0.15     // bem transparente
  }).addTo(map);

  // Pulso de destaque (efeito temporário)
  let pulse = L.circle(e.latlng, {
    radius: 5000,
    color: "#ff0000",
    fillColor: "#ff4d4d",
    fillOpacity: 0.25
  }).addTo(map);

  setTimeout(() => {
    map.removeLayer(pulse);
  }, 600);

  // Popup no ponto
  selectedMarker.bindPopup("📍 Ponto selecionado").openPopup();
});

// Use este objeto para converter o que vem do banco de volta para o nome que o usuário conhece.
const productNameToPopularName = {
    // Nome técnico: Nome popular
    'mosaic-cbers4a-paraiba-3m-1': 'CBERS-4A', 
    'mosaic-cbers4-paraiba-3m-1': 'CBERS-4',
    'AMZ1-WFI-L4-SR-1': 'Amazônia-1',
    'LCC_L8_30_16D_STK_Cerrado-1': 'Landsat-8',
    'myd13q1-6.1': 'MODIS Terra/Aqua',
    'mosaic-s2-yanomami_territory-6m-1': 'Sentinel-2',
    'GOES16-C01-ABI-L2-CM-N': 'GOES-19',
    'prec_merge_daily-1': 'Precipitação Diária (GPM-Merge)',
    'CB4-WFI-L4-DN-1': 'CBERS-4 WFI (L4)',
};

// Adicionar a nova funcionalidade de clique no mapa
map.on('click', async function(e) {
    const { lat, lng } = e.latlng;
    
    // Remover marcadores anteriores
    activeMarkers.forEach(marker => map.removeLayer(marker));
    activeMarkers = [];

    // Lógica para pegar as tags de satélites selecionadas
    const sateliteIdMap = {
        "CBERS4A": "cbers4a",
        "CBERS-4": "cbers4",
        "Landsat-8": "landsat8",
        "Sentinel-2": "sentinel2",
        "MODIS Terra/Aqua": "modis",
        "GOES-19": "goes", 
    };

    const selectedSateliteIds = selectedTags
        .map(tag => sateliteIdMap[tag])
        .filter(id => id); // Remove valores indefinidos

    const satelitesQuery = selectedSateliteIds.join(',');

    // Fazer a requisição para o back-end, incluindo os satélites selecionados
    try {
        const response = await fetch(`http://localhost:3000/api/geodata?lat=${lat}&lng=${lng}&satelites=${satelitesQuery}`);
        if (!response.ok) {
            throw new Error(`Erro ao buscar dados geográficos: ${response.status}`);
        }
        const data = await response.json();

        // Inicia o conteúdo do popup com as coordenadas
        let popupContent = `
            <div class="satelite-popup-header">
                <strong>Resultados para:</strong> ${lat.toFixed(2)}, ${lng.toFixed(2)}
            </div>
            <hr class="satelite-popup-divider">
        `;

        if (data.length > 0) {
            // Itera sobre os resultados para criar uma lista filtrada e limpa
            data.forEach(item => {
                // Tenta buscar o nome popular no mapeamento
                const popularName = productNameToPopularName[item.productName];
                
                // Define o título a ser exibido: usa o popularName se existir, senão usa o productName
                const displayTitle = popularName || item.productName;
                
                // Adiciona um bloco para cada produto encontrado
                popupContent += `
                    <div class="product-info-block">
                        <strong>🛰️ ${displayTitle}</strong>
                        <p>${item.description}</p>
                    </div>
                `;
            });

            // Cria e abre o novo marcador no local do clique
            const newMarker = L.marker([lat, lng]).addTo(map)
                .bindPopup(popupContent, { 
                    maxHeight: 300, 
                    minWidth: 250 
                }) // Define altura máxima para rolagem
                .openPopup();
            
            activeMarkers.push(newMarker);

        } else {
            popupContent += `<p>Nenhum produto encontrado para os filtros ativos nesta área.</p>`;
            
            const notFoundMarker = L.marker([lat, lng]).addTo(map)
                .bindPopup(popupContent)
                .openPopup();
            
            activeMarkers.push(notFoundMarker);
        }

    } catch (error) {
        console.error('Houve um problema com a requisição de geodados:', error);
        
        const errorMarker = L.marker([lat, lng]).addTo(map)
            .bindPopup(`
                <div class="satelite-popup-header" style="color: red;">
                    <strong>Erro na Requisição:</strong>
                </div>
                <p>Ocorreu um problema ao buscar os dados: ${error.message}</p>
            `)
            .openPopup();
        
        activeMarkers.push(errorMarker);
    }
});