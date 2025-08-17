const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

let uri = process.env.MONGODB_URI;

if (!uri) {
  uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.c4omkoj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectMongo() {
  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    console.log('Pinged your deployment. You successfully connected to MongoDB!');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

module.exports = { client, connectMongo }; 