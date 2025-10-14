import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import axios from 'axios';
import { connectToDatabase, getDb } from './database'; // Assumindo que './database' é o arquivo de conexão

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ATENÇÃO: CSP ATUALIZADA para permitir cdn.jsdelivr.net e corrigir erros de estilo/script.
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self' http://localhost:3000 https://unpkg.com https://data.inpe.br https://cdn.jsdelivr.net; script-src 'self' https://unpkg.com https://cdn.jsdelivr.net 'unsafe-inline'; style-src 'self' https://unpkg.com; img-src 'self' data: https://*.tile.openstreetmap.org;");
    next();
});

app.use(express.static(path.join(__dirname, '../../frontend')));

// ----------------------------------------------------------------------
// ROTA 1: STAC - Busca por Metadados e Detalhes do Produto
// ----------------------------------------------------------------------

app.get('/api/geodata', async (req: Request, res: Response) => {
    try {
        const lat = parseFloat(req.query.lat as string);
        const lng = parseFloat(req.query.lng as string);

        // sateliteIds são os IDs genéricos (platformId) enviados pelo frontend
        const sateliteIds = ((req.query.satelites as string) || '').split(',').filter(id => id !== '');

        if (isNaN(lat) || isNaN(lng)) {
            return res.status(400).json({ error: 'Latitude e Longitude inválidas.' });
        }

        console.log(`[STAC] Buscando dados para Lat: ${lat}, Lng: ${lng}`);

        const stacApiUrl = 'https://data.inpe.br/bdc/stac/v1/search';

        // 1. Requisição STAC: Busca Features que interceptam o ponto
        const stacResponse = await axios.post(stacApiUrl, {
            "intersects": {
                "type": "Point",
                "coordinates": [lng, lat]
            },
            "limit": 500
        });

        const features = stacResponse.data.features;
        const availableCollections = [...new Set(features.map((feature: any) => feature.collection))];

        if (availableCollections.length === 0) {
            console.log('[STAC] Nenhuma feature encontrada no INPE para este ponto.');
            return res.json([]);
        }
        
        console.log('[STAC] Coleções disponíveis no ponto:', availableCollections);


        // 2. Filtro no DB: Encontra produtos que o usuário filtrou E que estão disponíveis no ponto
        const db = getDb();
        const productsCollection = db.collection('stac');

        let query: any = {};
        
        // Filtro B (Essencial): Garante que a coleção encontrada na STAC está no DB
        query.productName = { $in: availableCollections };
        
        if (sateliteIds.length > 0) {
            query = {
                $and: [
                    { productName: { $in: availableCollections } }, 
                    { platformId: { $in: sateliteIds } }            
                ]
            };
        }

        const productDetails = await productsCollection.find(query).toArray();

        console.log('[DB] Produtos encontrados (filtrados):', productDetails.map(p => p.productName));

        res.json(productDetails);

    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            console.error('[STAC ERROR] Status:', error.response.status);
            return res.status(error.response.status).json({ 
                error: 'Erro ao consultar API STAC (INPE).'
            });
        }
        console.error('Erro no processamento da requisição /api/geodata:', error);
        res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
});


// ----------------------------------------------------------------------
// ROTA 2: WTSS - Extração de Série Temporal de Ponto
// ----------------------------------------------------------------------

app.get('/api/timeseries', async (req: Request, res: Response) => {
    try {
        const lat = parseFloat(req.query.lat as string);
        const lng = parseFloat(req.query.lng as string);
        const coverage = req.query.coverage as string;     
        
        let start_date = req.query.start_date as string | undefined; 
        let end_date = req.query.end_date as string | undefined;     

        if (isNaN(lat) || isNaN(lng) || !coverage) {
            return res.status(400).json({ error: 'Latitude, Longitude e Coverage são parâmetros obrigatórios.' });
        }

        const db = getDb();
        const productsCollection = db.collection('stac');
        
        const productDetail = await productsCollection.findOne({ productName: coverage });

        if (!productDetail || !productDetail.variables || productDetail.variables.length === 0) {
             return res.status(400).json({ 
                 error: `Detalhes do produto ${coverage} não encontrados ou sem variáveis válidas no DB.`,
                 details: 'Verifique se o produto possui o campo "variables" no MongoDB.'
             });
        }
        
        const validBandNames: string[] = productDetail.variables
             .map((v: any) => v.name || v.id)
             .filter((name: string): name is string => typeof name === 'string' && name.trim().length > 0);
        
        console.log('[WTSS DEBUG] Todas as bandas válidas encontradas no DB:', validBandNames); 

        if (validBandNames.length === 0) {
             return res.status(400).json({ 
                 error: `O produto ${coverage} não possui bandas/atributos válidos para a API WTSS.`,
             });
        }

        let requestedBandsArray: string[] = validBandNames.slice(0, 1);

        const bandsQuery = req.query.bands as string;
        if (bandsQuery) {
            const bandsArray = bandsQuery.split(',').map(b => b.trim()).filter(b => b); 
            
            if (bandsArray.length > 0) {
                if (bandsArray.every(b => validBandNames.includes(b))) {
                    requestedBandsArray = bandsArray;
                }
            }
        }
        
        if (!start_date || !end_date) {
            const today = new Date();
            const oneYearAgo = new Date();
            oneYearAgo.setDate(today.getDate() - 365);

            const formatDate = (date: Date) => date.toISOString().split('T')[0];

            end_date = formatDate(today);
            start_date = formatDate(oneYearAgo);
            
            console.log(`[WTSS] Usando datas padrão: ${start_date} a ${end_date}`);
        }
        
        console.log(`[WTSS] Buscando série temporal para Coverage: ${coverage}, Lat: ${lat}, Lng: ${lng}`);
        console.log(`[WTSS] Usando atributos: ${requestedBandsArray.join(',')}`);

        const wtssApiUrl = 'https://data.inpe.br/bdc/wtss/v4/time_series';

        // Transforma o array de bandas em uma string
        const params = {
            'coverage': coverage,
            'latitude': lat,
            'longitude': lng,
            'attributes': requestedBandsArray.join(','), // Converte o array em "banda1,banda2"
            'start_date': start_date, 
            'end_date': end_date,    
        };

        const wtssResponse = await axios.get(wtssApiUrl, { params });

        res.json(wtssResponse.data);

    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            console.error('[WTSS ERROR] Status:', error.response.status);
            console.error('[WTSS ERROR] Data:', error.response.data);
            return res.status(error.response.status).json({ 
                error: 'Erro ao extrair série temporal da WTSS.', 
                details: error.response.data 
            });
        }
        
        console.error('Erro no processamento da requisição /api/timeseries:', error);
        res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
    }
});


// Inicia a conexão com o DB e, em seguida, o servidor
connectToDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Falha ao conectar com o banco de dados. Servidor não iniciado.', err);
    process.exit(1);
});
