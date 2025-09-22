// Coordenadas aproximadas da caixa que engloba o Brasil
var brasilBounds = [
  [-34.0, -74.0], // Ponto sudoeste (latitude, longitude)
  [5.3, -34.0]    // Ponto nordeste (latitude, longitude)
];

// Inicializa o mapa na div com id "map"
var map = L.map('map', {
  maxBounds: brasilBounds,      // Limita o mapa para não sair do Brasil
  maxBoundsViscosity: 1.0,      // "Força" o usuário a não sair da área definida
  minZoom: 5,                    // Zoom mínimo permitido
  maxZoom: 15                    // Zoom máximo permitido
}).setView([-14.2, -51.9], 4);  // Define o centro inicial do mapa (aprox. centro do Brasil) e nível de zoom

// Adiciona a camada base do mapa (tiles) usando OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,                   // Zoom máximo da camada de tiles
  attribution: '© OpenStreetMap' // Créditos obrigatórios da fonte do mapa
}).addTo(map);                   // Adiciona essa camada ao mapa
