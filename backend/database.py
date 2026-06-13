# backend/database.py
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None
    
    async def connect(self):
        """Connect to MongoDB"""
        try:
            self.client = AsyncIOMotorClient(settings.MONGODB_URL)
            self.db = self.client[settings.DATABASE_NAME]
            # Test connection
            await self.client.admin.command('ping')
            logger.info("✅ MongoDB connected successfully")
            
            # Create indexes
            await self.create_indexes()
            
        except Exception as e:
            logger.error(f"❌ MongoDB connection failed: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            logger.info("🔌 MongoDB disconnected")
    
    async def create_indexes(self):
        """Create database indexes for better performance"""
        try:
            # Users collection indexes
            await self.db.users.create_index("username", unique=True)
            await self.db.users.create_index("email", unique=True, sparse=True)
            
            # Bookmarks collection indexes
            await self.db.bookmarks.create_index([("user_id", 1), ("created_at", -1)])
            await self.db.bookmarks.create_index("category")
            await self.db.bookmarks.create_index("priority")
            await self.db.bookmarks.create_index([("user_id", 1), ("url", 1)], unique=True)
            
            logger.info("✅ Database indexes created")
        except Exception as e:
            logger.error(f"⚠️ Index creation warning: {e}")

# Global database instance
database = Database()

async def get_db():
    """Dependency to get database connection"""
    return database.db