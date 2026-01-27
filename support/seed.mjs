import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
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

const helpDataContent = fs.readFileSync(
  path.join(__dirname, 'app/(internal)/data/help-data-local.ts'),
  'utf-8'
);

const match = helpDataContent.match(/export const helpData: Category\[\] = (\[[\s\S]*?\n\])/);
if (!match) {
  console.error('Could not parse help data');
  process.exit(1);
}

const helpDataStr = match[1]
  .replace(/id: "[^"]*",/g, '')
  .replace(/categoryId: "[^"]*",/g, '')
  .replace(/icon: "[^"]*"/g, 'icon: "Icon"');

const helpData = eval(helpDataStr);

async function seed() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'test';

  console.log('Connecting to MongoDB...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db(dbName);

    console.log('\nClearing existing collections...');
    await db.collection('categories').deleteMany({});
    await db.collection('articles').deleteMany({});
    console.log('✓ Collections cleared');

    console.log('\nSeeding categories and articles...');
    let totalArticles = 0;

    for (const cat of helpData) {
      const { insertedId } = await db.collection('categories').insertOne({
        title: cat.title,
        description: cat.description,
        icon: cat.icon || 'Icon'
      });
      console.log(`  ✓ Category: ${cat.title}`);

      for (const art of cat.articles) {
        await db.collection('articles').insertOne({
          title: art.title,
          content: art.content,
          categoryId: insertedId.toString()
        });
        totalArticles++;
      }
      console.log(`    - Added ${cat.articles.length} articles`);
    }

    console.log('\nCreating admin user...');
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await db.collection('users').updateOne(
        { email: adminEmail },
        {
          $set: {
            email: adminEmail,
            passwordHash: passwordHash,
            role: 'admin',
            createdAt: new Date().toISOString()
          }
        },
        { upsert: true }
      );
      console.log(`  ✓ Admin user: ${adminEmail}`);
    }

    const stats = {
      categories: await db.collection('categories').countDocuments(),
      articles: await db.collection('articles').countDocuments(),
      users: await db.collection('users').countDocuments()
    };

    console.log('\n' + '='.repeat(50));
    console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log(`Categories: ${stats.categories}`);
    console.log(`Articles:   ${stats.articles}`);
    console.log(`Users:      ${stats.users}`);
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ Error seeding database:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
