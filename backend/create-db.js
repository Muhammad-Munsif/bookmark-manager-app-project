// backend/create-db.js
const mongoose = require('mongoose');
require('dotenv').config();

async function createDatabase() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;

        // Create a test collection to initialize the database
        await db.createCollection('_init');
        console.log('✅ Database initialized');

        // Insert a test document
        await db.collection('_init').insertOne({
            created_at: new Date(),
            message: 'Database initialized successfully'
        });
        console.log('✅ Test document inserted');

        // Show all collections
        const collections = await db.listCollections().toArray();
        console.log('\n📚 Collections in bookmark_vault:');
        collections.forEach(c => console.log(`   - ${c.name}`));

        // Remove the test collection (optional)
        await db.collection('_init').drop();
        console.log('\n✅ Test collection removed');

        console.log('\n🎉 bookmark_vault database is now ready!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

createDatabase();