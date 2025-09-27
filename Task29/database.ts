import { MongoClient, Db } from 'mongodb';

const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'aetheris_db';
let db: Db;

export const connectToDatabase = async () => {
  try {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    db = client.db(dbName);
    console.log('Conectado com sucesso ao MongoDB!');
  } catch (error) {
    console.error('Erro ao conectar com o MongoDB:', error);
    process.exit(1); // Encerra a aplicação se não conseguir conectar ao DB
  }
};

export const getDb = () => {
  if (!db) {
    throw new Error('A conexão com o banco de dados não foi inicializada.');
  }
  return db;
};