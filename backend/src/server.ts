import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import axios from 'axios';
import { connectToDatabase, getDb } from './database'; // Importa nossas funções do DB

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));

// Rota da API para buscar dados geoespaciais
app.get('/api/geodata', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Latitude e Longitude inválidas.' });
    }

    console.log(`Buscando dados para Lat: ${lat}, Lng: ${lng}`);

    const stacApiUrl = 'https://data.inpe.br/bdc/stac/v1/search';

    // A busca volta a ser aberta, sem o filtro de coleções
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

    const db = getDb();
    const productsCollection = db.collection('data_products');
    const productDetails = await productsCollection.find({ 
      productName: { $in: uniqueCollections } 
    }).toArray();

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