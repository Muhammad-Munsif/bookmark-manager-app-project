// backend/test-connection.js
const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
    try {
        console.log('🔄 Testing MongoDB connection...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected successfully!');

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        console.log('\n📚 Collections in bookmark_vault:');
        if (collections.length === 0) {
            console.log('   ⚠️ No collections yet. Run your backend to create them.');
        } else {
            collections.forEach(c => console.log(`   - ${c.name}`));
        }

        console.log('\n✅ Database is ready!');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    }
}

testConnection(); 