import axios from 'axios';
import { MongoClient } from 'mongodb';

const INPE_COLLECTIONS_URL = 'https://data.inpe.br/bdc/stac/v1/collections';
const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'aetheris_db';

/**
 * Mapeamento simples para vincular o ID da Coleção STAC a um ID de plataforma genérico.
 * Isso resolve o problema de filtro no frontend/server.
 * Você pode expandir esta lista conforme necessário.
 */
const platformMapping: { [key: string]: string } = {
    // Landsat
    'L8': 'landsat8', 
    'LANDSAT_8': 'landsat8',
    'LCC_L8': 'landsat8',
    // Sentinel
    'S2': 'sentinel2',
    'SENTINEL_2': 'sentinel2',
    'S2_MSI': 'sentinel2',
    // CBERS
    'CB4A': 'cbers4a',
    'CB4': 'cbers4',
    // MODIS
    'MOD13': 'modis',
    'MYD13': 'modis',
    // GOES
    'GOES': 'goes16', // Ajustado para ser mais específico se necessário
};

/**
 * Tenta inferir o ID da plataforma (sateliteId) com base no ID da coleção STAC.
 */
function inferPlatformId(collectionId: string): string | null {
    const id = collectionId.toUpperCase();
    for (const [key, value] of Object.entries(platformMapping)) {
        if (id.includes(key.toUpperCase())) {
            return value;
        }
    }
    return null; // Retorna null se não houver correspondência
}


async function initializeDatabase() {
    console.log('Iniciando script de inicialização do banco de dados...');
    const client = new MongoClient(MONGO_URL);

    try {
        // Conexão com o MongoDB
        await client.connect();
        const db = client.db(DB_NAME);
        console.log(`Conectado ao MongoDB. Usando o banco de dados: ${DB_NAME}`);

        // Bloco para verificar e criar coleções
        const requiredCollections = ['stac', 'location_cache', 'wtss'];
        const existingCollections = await db.listCollections().toArray();
        const existingCollectionNames = existingCollections.map(c => c.name);

        for (const collectionName of requiredCollections) {
            if (!existingCollectionNames.includes(collectionName)) {
                await db.createCollection(collectionName);
                console.log(`Coleção "${collectionName}" criada com sucesso.`);
            } else {
                console.log(`Coleção "${collectionName}" já existe. Pulando criação.`);
            }
        }

        // Lógica de Sincronização
        console.log('Iniciando sincronização dos produtos de dados...');
        const productsCollection = db.collection('stac');
        
        const initialResponse = await axios.get(INPE_COLLECTIONS_URL);
        const collections = initialResponse.data.collections;
        console.log(`Encontradas ${collections.length} coleções na API do INPE.`);

        await productsCollection.deleteMany({});
        console.log('Coleção "stac" limpa para receber dados atualizados.');

        const newProducts = [];
        for (const collection of collections) {
            try {
                const detailUrl = `https://data.inpe.br/bdc/stac/v1/collections/${collection.id}`;
                const detailResponse = await axios.get(detailUrl);
                const collectionDetails = detailResponse.data;
                
                // Tenta inferir o ID da plataforma para o filtro do frontend
                const platformId = inferPlatformId(collection.id);
                
                // Extrai as bandas/variáveis
                const detailedBands = collectionDetails.properties?.['eo:bands'] || collectionDetails['cube:dimensions']?.bands?.values || [];

                newProducts.push({
                    productName: collectionDetails.id,
                    friendlyName: collectionDetails.title || collectionDetails.id,
                    description: collectionDetails.description,
                    variables: detailedBands,
                    // 🟢 NOVO CAMPO: Usado para vincular filtros de tags do usuário.
                    platformId: platformId 
                });
            } catch (e) {
                console.error(`Falha ao buscar detalhes para ${collection.id}. Pulando.`);
            }
        }

        if (newProducts.length > 0) {
            await productsCollection.insertMany(newProducts);
            console.log(`Sincronização concluída! ${newProducts.length} produtos detalhados foram inseridos.`);
        } else {
            console.log('Nenhum produto para inserir.');
        }

    } catch (error) {
        console.error('Ocorreu um erro durante a inicialização:', error);
    } finally {
        await client.close();
        console.log('Conexão com o MongoDB fechada. Script finalizado.');
    }
}

initializeDatabase();
