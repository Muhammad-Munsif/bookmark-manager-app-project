# backend/app.py
from fastapi import FastAPI, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from database import database, get_db
from config import settings
from models import (
    UserCreate, UserLogin, BookmarkCreate, BookmarkUpdate, 
    BookmarkResponse, Category, Priority
)
from auth import AuthService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await database.connect()
    print("🚀 Bookmark Vault API Started")
    yield
    # Shutdown
    await database.disconnect()

app = FastAPI(
    title="Bookmark Vault API",
    description="Secure Bookmark Manager with Authentication",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== AUTHENTICATION ROUTES ====================

@app.post("/api/auth/register", status_code=201)
async def register(user_data: UserCreate):
    """Register new user"""
    user = await AuthService.create_user(
        username=user_data.username,
        password=user_data.password,
        email=user_data.email
    )
    
    if not user:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )
    
    # Create access token
    access_token = AuthService.create_access_token({
        "sub": user["username"],
        "user_id": str(user["_id"])
    })
    
    return {
        "success": True,
        "message": "User created successfully",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user.get("email"),
            "created_at": user["created_at"].isoformat()
        }
    }

@app.post("/api/auth/login")
async def login(user_data: UserLogin):
    """Login user"""
    user = await AuthService.authenticate_user(user_data.username, user_data.password)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )
    
    # Update last login
    await database.db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Create access token
    access_token = AuthService.create_access_token({
        "sub": user["username"],
        "user_id": str(user["_id"])
    })
    
    return {
        "success": True,
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user.get("email"),
            "preferences": user.get("preferences", {})
        }
    }

@app.get("/api/auth/verify")
async def verify_token(token: str):
    """Verify JWT token"""
    try:
        user = await AuthService.get_current_user(token)
        return {"success": True, "user": user}
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== BOOKMARK ROUTES ====================

@app.get("/api/bookmarks")
async def get_bookmarks(
    token: str = Query(...),
    category: Optional[Category] = None,
    priority: Optional[Priority] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """Get all bookmarks for user"""
    # Verify user
    current_user = await AuthService.get_current_user(token)
    
    # Build query
    query = {"user_id": current_user["id"], "is_archived": False}
    
    if category:
        query["category"] = category
    if priority:
        query["priority"] = priority
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search]}}
        ]
    
    # Get bookmarks
    cursor = database.db.bookmarks.find(query).sort("created_at", -1).skip(skip).limit(limit)
    bookmarks = await cursor.to_list(length=limit)
    
    return {
        "success": True,
        "bookmarks": [
            {
                "id": str(b["_id"]),
                "title": b["title"],
                "url": b["url"],
                "category": b["category"],
                "priority": b["priority"],
                "description": b.get("description", ""),
                "tags": b.get("tags", []),
                "created_at": b["created_at"].isoformat(),
                "updated_at": b["updated_at"].isoformat(),
                "clicks": b.get("clicks", 0)
            }
            for b in bookmarks
        ],
        "total": len(bookmarks)
    }

@app.post("/api/bookmarks", status_code=201)
async def create_bookmark(
    bookmark: BookmarkCreate,
    token: str = Query(...)
):
    """Create new bookmark"""
    current_user = await AuthService.get_current_user(token)
    
    # Check for duplicate
    existing = await database.db.bookmarks.find_one({
        "user_id": current_user["id"],
        "url": str(bookmark.url)
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Bookmark already exists")
    
    bookmark_data = bookmark.dict()
    bookmark_data.update({
        "user_id": current_user["id"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "clicks": 0,
        "is_archived": False
    })
    
    result = await database.db.bookmarks.insert_one(bookmark_data)
    
    return {
        "success": True,
        "message": "Bookmark created successfully",
        "bookmark": {
            "id": str(result.inserted_id),
            **bookmark_data,
            "created_at": bookmark_data["created_at"].isoformat(),
            "updated_at": bookmark_data["updated_at"].isoformat()
        }
    }

@app.put("/api/bookmarks/{bookmark_id}")
async def update_bookmark(
    bookmark_id: str,
    bookmark_update: BookmarkUpdate,
    token: str = Query(...)
):
    """Update bookmark"""
    current_user = await AuthService.get_current_user(token)
    
    # Prepare update data
    update_data = {k: v for k, v in bookmark_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Update bookmark
    result = await database.db.bookmarks.update_one(
        {"_id": ObjectId(bookmark_id), "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    return {
        "success": True,
        "message": "Bookmark updated successfully"
    }

@app.delete("/api/bookmarks/{bookmark_id}")
async def delete_bookmark(
    bookmark_id: str,
    token: str = Query(...)
):
    """Delete bookmark"""
    current_user = await AuthService.get_current_user(token)
    
    result = await database.db.bookmarks.delete_one({
        "_id": ObjectId(bookmark_id),
        "user_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    return {
        "success": True,
        "message": "Bookmark deleted successfully"
    }

@app.post("/api/bookmarks/{bookmark_id}/click")
async def increment_click(
    bookmark_id: str,
    token: str = Query(...)
):
    """Increment bookmark click count"""
    current_user = await AuthService.get_current_user(token)
    
    result = await database.db.bookmarks.update_one(
        {"_id": ObjectId(bookmark_id), "user_id": current_user["id"]},
        {"$inc": {"clicks": 1}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    return {"success": True, "message": "Click recorded"}

@app.get("/api/bookmarks/stats")
async def get_stats(token: str = Query(...)):
    """Get bookmark statistics"""
    current_user = await AuthService.get_current_user(token)
    
    pipeline = [
        {"$match": {"user_id": current_user["id"], "is_archived": False}},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "categories": {"$push": "$category"},
            "priorities": {"$push": "$priority"}
        }}
    ]
    
    result = await database.db.bookmarks.aggregate(pipeline).to_list(length=1)
    
    if not result:
        return {
            "success": True,
            "stats": {
                "total": 0,
                "work": 0,
                "personal": 0,
                "learning": 0,
                "entertainment": 0,
                "high_priority": 0,
                "medium_priority": 0,
                "low_priority": 0
            }
        }
    
    stats = result[0]
    categories = stats.get("categories", [])
    priorities = stats.get("priorities", [])
    
    return {
        "success": True,
        "stats": {
            "total": stats.get("total", 0),
            "work": categories.count("work"),
            "personal": categories.count("personal"),
            "learning": categories.count("learning"),
            "entertainment": categories.count("entertainment"),
            "high_priority": priorities.count("high"),
            "medium_priority": priorities.count("medium"),
            "low_priority": priorities.count("low")
        }
    }

@app.post("/api/bookmarks/import")
async def import_bookmarks(
    bookmarks: List[dict],
    token: str = Query(...)
):
    """Import multiple bookmarks"""
    current_user = await AuthService.get_current_user(token)
    
    imported_count = 0
    for bm in bookmarks:
        # Check if already exists
        existing = await database.db.bookmarks.find_one({
            "user_id": current_user["id"],
            "url": bm.get("url")
        })
        
        if not existing and bm.get("title") and bm.get("url"):
            bookmark_data = {
                "user_id": current_user["id"],
                "title": bm["title"],
                "url": bm["url"],
                "category": bm.get("category", "personal"),
                "priority": bm.get("priority", "medium"),
                "description": bm.get("description", ""),
                "tags": bm.get("tags", []),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "clicks": 0,
                "is_archived": False
            }
            
            await database.db.bookmarks.insert_one(bookmark_data)
            imported_count += 1
    
    return {
        "success": True,
        "message": f"Imported {imported_count} bookmarks",
        "imported_count": imported_count
    }

@app.get("/")
async def root():
    return {
        "name": "Bookmark Vault API",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs"
    }