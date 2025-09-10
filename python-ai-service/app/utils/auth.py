"""Authentication utilities for API endpoints."""

from fastapi import HTTPException, Header, Depends
from typing import Optional, Dict
from jose import jwt, JWTError
from datetime import datetime, timedelta
from loguru import logger

from app.core.config import settings


class AuthService:
    """Handle authentication and JWT validation."""
    
    def __init__(self):
        self.secret_key = settings.secret_key or "your-secret-key-change-in-production"
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 60 * 24  # 24 hours
    
    def create_access_token(self, data: Dict) -> str:
        """Create a JWT access token."""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({"exp": expire})
        
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """Verify and decode a JWT token."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError as e:
            logger.error(f"JWT verification failed: {e}")
            return None
    
    async def get_current_user(self, authorization: Optional[str] = Header(None)) -> Optional[Dict]:
        """Get current user from JWT token in Authorization header."""
        if not authorization:
            # Allow anonymous access for some endpoints
            return None
        
        if not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = authorization.replace("Bearer ", "")
        payload = self.verify_token(token)
        
        if not payload:
            raise HTTPException(
                status_code=401,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role", "user")
        }


# Initialize auth service
auth_service = AuthService()


# Dependency for protected routes
async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[Dict]:
    """FastAPI dependency to get current user."""
    return await auth_service.get_current_user(authorization)


async def require_auth(current_user: Optional[Dict] = Depends(get_current_user)) -> Dict:
    """FastAPI dependency to require authentication."""
    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


async def require_role(role: str):
    """FastAPI dependency to require specific role."""
    async def role_checker(current_user: Dict = Depends(require_auth)) -> Dict:
        if current_user.get("role") != role and current_user.get("role") != "admin":
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required role: {role}"
            )
        return current_user
    return role_checker