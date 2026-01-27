import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');

  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

loadEnv();

async function createIndexes() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'test';

  console.log('Connecting to MongoDB...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');

    const db = client.db(dbName);

    console.log('Creating indexes...\n');

    console.log('Categories collection:');
    await db.collection('categories').createIndex({ title: 1 }, { unique: true });
    console.log('  ✓ Index on title (unique)');

    console.log('\nArticles collection:');
    await db.collection('articles').createIndex({ categoryId: 1 });
    console.log('  ✓ Index on categoryId');
    await db.collection('articles').createIndex({ title: 1 });
    console.log('  ✓ Index on title');
    await db.collection('articles').createIndex({ title: 'text', content: 'text' });
    console.log('  ✓ Text index on title and content (for search)');

    console.log('\nUsers collection:');
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log('  ✓ Index on email (unique)');

    console.log('\n' + '='.repeat(50));
    console.log('ALL INDEXES CREATED SUCCESSFULLY!');
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ Error creating indexes:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createIndexes();
