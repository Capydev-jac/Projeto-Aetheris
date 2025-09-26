import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import axios from 'axios';
import { connectToDatabase, getDb } from './database';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Adiciona a configuração de Content-Security-Policy para permitir recursos externos
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self' http://localhost:3000 https://unpkg.com https://data.inpe.br; script-src 'self' https://unpkg.com 'unsafe-inline'; style-src 'self' https://unpkg.com; img-src 'self' data: https://*.tile.openstreetmap.org;");
  next();
});
// Use apenas express.static para servir todos os arquivos estáticos.
// Ele servirá o 'index.html' automaticamente.
app.use(express.static(path.join(__dirname, '../../frontEnd/src')));

// Rota principal para buscar dados geoespaciais e de satélites
app.get('/api/geodata', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    // Pega a lista de IDs de satélites da URL
    const sateliteIds = (req.query.satelites as string)?.split(',');

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Latitude e Longitude inválidas.' });
    }

    console.log(`Buscando dados para Lat: ${lat}, Lng: ${lng}`);

    const stacApiUrl = 'https://data.inpe.br/bdc/stac/v1/search';

    // A busca na API do INPE é feita para a localização
    const stacResponse = await axios.post(stacApiUrl, {
      "intersects": {
        "type": "Point",
        "coordinates": [lng, lat]
      }
    });

    const features = stacResponse.data.features;
    if (features.length === 0) {
      return res.json([]);
    }

    const uniqueCollections = [...new Set(features.map((feature: any) => feature.collection))];
    console.log('Coleções encontradas (sem filtro):', uniqueCollections);

    // Objeto de mapeamento para traduzir IDs do front-end para nomes do MongoDB
    const productNameMap: { [key: string]: string } = {
      'cbers4a': 'mosaic-cbers4a-paraiba-3m-1',
      'cbers4': 'mosaic-cbers4-paraiba-3m-1',
      'amazonia1': 'AMZ1-WFI-L4-SR-1',
      'landsat8': 'LCC_L8_30_16D_STK_Cerrado-1',
      'modis': 'myd13q1-6.1',
      'sentinel2': 'mosaic-s2-yanomami_territory-6m-1',
      // Adicionando o GOES
      'goes': 'GOES16-C01-ABI-L2-CM-N'
    };

    // Converte os IDs do front-end para os nomes de produtos do MongoDB
    let dbProductNames: string[] = [];
    if (sateliteIds && sateliteIds.length > 0 && sateliteIds[0] !== '') {
      dbProductNames = sateliteIds.map(id => productNameMap[id]).filter((name): name is string => Boolean(name));
    }

    const db = getDb();
    const productsCollection = db.collection('data_products');

    let query = {};

    // Adiciona a lógica de filtro se houver nomes de produtos válidos para buscar
    if (dbProductNames.length > 0) {
      query = { productName: { $in: dbProductNames } };
    }

    const productDetails = await productsCollection.find(query).toArray();

    console.log('Detalhes encontrados no DB:', productDetails);

    res.json(productDetails);

  } catch (error) {
    console.error('Erro no processamento da requisição:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

// Inicia a conexão com o DB e, em seguida, o servidor
connectToDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
});
