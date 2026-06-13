# backend/auth.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from config import settings
from database import database
from bson import ObjectId
from fastapi import HTTPException, status

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash password"""
        return pwd_context.hash(password)
    
    @staticmethod
    def create_access_token(data: dict) -> str:
        """Create JWT token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    async def authenticate_user(username: str, password: str):
        """Authenticate user"""
        user = await database.db.users.find_one({"username": username})
        if not user:
            return None
        if not AuthService.verify_password(password, user["password_hash"]):
            return None
        return user
    
    @staticmethod
    async def create_user(username: str, password: str, email: str = None):
        """Create new user"""
        # Check if user exists
        existing = await database.db.users.find_one({"username": username})
        if existing:
            return None
        
        user_data = {
            "username": username,
            "email": email,
            "password_hash": AuthService.get_password_hash(password),
            "created_at": datetime.utcnow(),
            "is_active": True,
            "preferences": {"theme": "light", "notifications": True}
        }
        
        result = await database.db.users.insert_one(user_data)
        user_data["_id"] = result.inserted_id
        return user_data
    
    @staticmethod
    async def get_current_user(token: str):
        """Get current user from token"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
            
            user = await database.db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            return {
                "id": str(user["_id"]),
                "username": user["username"],
                "email": user.get("email"),
                "preferences": user.get("preferences", {})
            }
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")