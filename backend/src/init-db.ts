import axios from 'axios';
import { MongoClient } from 'mongodb';

const INPE_COLLECTIONS_URL = 'https://data.inpe.br/bdc/stac/v1/collections';
const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'aetheris_db';

async function initializeDatabase() {
  console.log('Iniciando script de inicialização do banco de dados...');
  const client = new MongoClient(MONGO_URL);

  try {
    //Conexão com o MongoDB
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Conectado ao MongoDB. Usando o banco de dados: ${DB_NAME}`);

    //Bloco para verificar e criar coleções
    const requiredCollections = ['data_products', 'location_cache', 'timeseries_cache'];
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

    //Lógica de Sincronização
    console.log('Iniciando sincronização dos produtos de dados...');
    const productsCollection = db.collection('data_products');
    
    const initialResponse = await axios.get(INPE_COLLECTIONS_URL);
    const collections = initialResponse.data.collections;
    console.log(`Encontradas ${collections.length} coleções na API do INPE.`);

    await productsCollection.deleteMany({});
    console.log('Coleção "data_products" limpa para receber dados atualizados.');

    const newProducts = [];
    for (const collection of collections) {
      try {
        const detailUrl = `https://data.inpe.br/bdc/stac/v1/collections/${collection.id}`;
        const detailResponse = await axios.get(detailUrl);
        const collectionDetails = detailResponse.data;
        
        const detailedBands = collectionDetails.properties?.['eo:bands'] || collectionDetails['cube:dimensions']?.bands?.values || [];

        newProducts.push({
          productName: collectionDetails.id,
          friendlyName: collectionDetails.title || collectionDetails.id,
          description: collectionDetails.description,
          variables: detailedBands 
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