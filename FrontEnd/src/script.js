// ================================
// MAPA - Configuração do Leaflet
// ================================

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
  maxZoom: 19,                   // Zoom máximo suportado pelos tiles
  attribution: '© OpenStreetMap' // Créditos obrigatórios da fonte do mapa
}).addTo(map);                   // Adiciona a camada ao mapa

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
