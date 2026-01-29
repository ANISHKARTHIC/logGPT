from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.database import Database
from pymongo.errors import ServerSelectionTimeoutError
from typing import Optional
from .config import settings


class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    database: Optional[Database] = None


db = MongoDB()


async def connect_to_mongo():
    """Create database connection."""
    try:
        db.client = AsyncIOMotorClient(
            settings.mongodb_url,
            serverSelectionTimeoutMS=5000
        )
        db.database = db.client[settings.database_name]
        
        # Verify connection
        await db.client.admin.command('ping')
        
        # Create indexes
        await create_indexes()
        
        print(f"✅ Connected to MongoDB: {settings.database_name}")
    except ServerSelectionTimeoutError as e:
        print(f"❌ Failed to connect to MongoDB at {settings.mongodb_url}")
        print(f"   Error: {e}")
        print(f"   Please ensure MongoDB is running or update MONGODB_URL in .env")
        raise


async def close_mongo_connection():
    """Close database connection."""
    if db.client:
        db.client.close()
        print("Closed MongoDB connection")


async def create_indexes():
    """Create database indexes for optimal performance."""
    # Users collection indexes
    await db.database.users.create_index("email", unique=True)
    await db.database.users.create_index("role")
    
    # Components collection indexes
    await db.database.components.create_index("name")
    await db.database.components.create_index("category")
    await db.database.components.create_index("status")
    await db.database.components.create_index([("name", "text"), ("description", "text")])
    
    # Transactions collection indexes
    await db.database.transactions.create_index("user_id")
    await db.database.transactions.create_index("component_id")
    await db.database.transactions.create_index("status")
    await db.database.transactions.create_index("issue_date")
    await db.database.transactions.create_index("due_date")
    
    # Chat history indexes
    await db.database.chat_history.create_index("user_id")
    await db.database.chat_history.create_index("created_at")


def get_database() -> Database:
    """Get database instance."""
    return db.database
