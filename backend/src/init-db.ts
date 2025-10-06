import axios from 'axios';
import { MongoClient } from 'mongodb';
 
const STAC_COLLECTIONS_URL = 'https://data.inpe.br/bdc/stac/v1/collections';
const WTSS_BASE_URL = 'https://data.inpe.br/bdc/wtss/v4/';
const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'aetheris_db';
 
const platformMapping: { [key: string]: string } = {
    // ... Mantenha o que já funciona (S2, GOES, etc.)
 
    // Novas adições/ajustes para Landsat:
   // Ajuste CRÍTICO para Landsat: USE APENAS 'landsat' como ID DE PLATAFORMA.
   
    'LANDSAT': 'landsat-2', // Captura coleções que contêm 'LANDSAT' no nome (ex: 'LANDSAT-16D-1')
    'L8': 'landsat-2', // Para Landsat 8
 
    // ... Outras entradas (CBERS, MODIS, etc.)
    'SENTINEL-1': 'sentinel1',
    'S2': 'sentinel2',
    'S2_MSI': 'sentinel2',
    'GOES': 'goes16',
    'sentinel-3': 'sentinel3',
    'CB4': 'cbers4',
    'MOD13': 'modis',
    'MYD13': 'modis',
    'CB2B': 'cbers2b',
    'AMZ1': 'amazonia1',
    'ETA': 'EtaCCDay_CMIP5-1',
};
 
function inferPlatformId(collectionId: string): string | null {
    const id = collectionId.toUpperCase();
    for (const [key, value] of Object.entries(platformMapping)) {
        if (id.includes(key.toUpperCase())) {
            return value;
        }
    }
    return null;
}
 
async function initializeDatabase() {
    console.log('Iniciando script de inicialização do banco de dados...');
    const client = new MongoClient(MONGO_URL);
 
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        console.log(`Conectado ao MongoDB. Usando o banco de dados: ${DB_NAME}`);
 
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
 
        // --- Lógica de Sincronização STAC ---
        console.log('Iniciando sincronização dos produtos de dados STAC...');
        const stacCollection = db.collection('stac');
        const stacResponse = await axios.get(STAC_COLLECTIONS_URL);
        const stacCollections = stacResponse.data.collections;
        console.log(`Encontradas ${stacCollections.length} coleções na API STAC.`);
        await stacCollection.deleteMany({});
        console.log('Coleção "stac" limpa para receber dados atualizados.');
 
        const newStacProducts = [];
        for (const collection of stacCollections) {
            try {
                const detailUrl = `https://data.inpe.br/bdc/stac/v1/collections/${collection.id}`;
                const detailResponse = await axios.get(detailUrl);
                const collectionDetails = detailResponse.data;
                const productToInsert = { ...collectionDetails };
                productToInsert.productName = collectionDetails.id;
                productToInsert.platformId = inferPlatformId(collection.id);
                productToInsert.variables = collectionDetails.properties?.['eo:bands'] || collectionDetails['cube:dimensions']?.bands?.values || [];
                newStacProducts.push(productToInsert);
            } catch (e) {
                console.error(`Falha ao buscar detalhes STAC para ${collection.id}. Pulando.`);
            }
        }
        if (newStacProducts.length > 0) {
            await stacCollection.insertMany(newStacProducts);
            console.log(`Sincronização STAC concluída! ${newStacProducts.length} produtos inseridos.`);
        }
 
        // --- Lógica de Sincronização WTSS ---
        console.log('\nIniciando sincronização dos produtos de dados WTSS...');
        const wtssCollection = db.collection('wtss');
        await wtssCollection.deleteMany({});
        console.log('Coleção "wtss" limpa para receber dados atualizados.');
 
        const listCoveragesUrl = `${WTSS_BASE_URL}list_coverages`;
        const coveragesResponse = await axios.get(listCoveragesUrl);
        const coverages = coveragesResponse.data.coverages;
        console.log(`Encontradas ${coverages.length} coberturas na API WTSS.`);
 
        const newWtssProducts = [];
        for (const coverageName of coverages) {
            try {
                console.log(`Buscando detalhes WTSS para: ${coverageName}`);
 
                // A URL correta é a base + o nome da cobertura, sem "describe_coverage".
                const detailUrl = `${WTSS_BASE_URL}${coverageName}`;
 
                const detailResponse = await axios.get(detailUrl);
                const coverageDetails = detailResponse.data;
                newWtssProducts.push(coverageDetails);
 
            } catch (e) {
                console.error(`Falha ao buscar detalhes WTSS para ${coverageName}. Pulando.`);
            }
        }
 
        if (newWtssProducts.length > 0) {
            await wtssCollection.insertMany(newWtssProducts);
            console.log(`Sincronização WTSS concluída! ${newWtssProducts.length} produtos inseridos.`);
        }
 
    } catch (error) {
        console.error('Ocorreu um erro durante a inicialização:', error);
    } finally {
        await client.close();
        console.log('Conexão com o MongoDB fechada. Script finalizado.');
    }
}
 
initializeDatabase();
 
