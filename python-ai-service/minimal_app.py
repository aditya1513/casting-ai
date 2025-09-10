"""Minimal version of the AI service for testing."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="CastMatch AI Service - Minimal",
    version="1.0.0",
    description="Minimal AI-powered talent search service"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root() -> Dict[str, str]:
    """Root endpoint."""
    return {
        "message": "Welcome to CastMatch AI Service (Minimal)",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "CastMatch AI Service - Minimal",
        "version": "1.0.0",
        "python_version": "3.12"
    }

@app.post("/chat")
async def simple_chat(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simple chat endpoint for backend integration.
    """
    try:
        message = request.get("message", "")
        user_id = request.get("user_id", "anonymous")
        session_id = request.get("session_id", "default")
        
        print(f"Processing chat from user {user_id}: {message[:100]}...")
        
        # Simple echo response for now
        return {
            "message": f"I received your message: '{message}'. AI capabilities are loading...",
            "talents": [],
            "suggestions": [
                "Try: 'Find actors in Mumbai aged 25-35'",
                "Or: 'Show me experienced dancers'",
                "Or: 'Recommend actors for a romantic comedy'"
            ],
            "action_type": "general",
            "service": "python-ai-service-minimal",
            "status": "success"
        }
        
    except Exception as e:
        print(f"Error in simple chat: {e}")
        return {
            "message": f"I received your message: {message}. There was an error, but I'm working on it!",
            "talents": [],
            "suggestions": ["Please try again"],
            "action_type": "error",
            "service": "python-ai-service-minimal", 
            "status": "error",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(
        "minimal_app:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )