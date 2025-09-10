#!/usr/bin/env python3
"""Minimal FastAPI test to verify service startup."""

from fastapi import FastAPI
from loguru import logger

app = FastAPI(title="CastMatch AI Service - Minimal Test", version="1.0.0")

@app.get("/")
async def root():
    return {"status": "CastMatch AI Service is running!", "message": "Minimal test successful"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "castmatch-ai"}

@app.post("/chat")
async def chat(request: dict):
    message = request.get("message", "")
    return {
        "message": f"Hello! You said: '{message}'. This is a working AI service response!",
        "talents": [],
        "suggestions": [
            "Try: 'Show me actors in Mumbai aged 25-35'",
            "Or: 'Find female leads with dance experience'",
            "Or: 'Who's available for shooting next month?'"
        ],
        "action_type": "general",
        "service": "python-ai-service",
        "status": "success"
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting minimal FastAPI test")
    uvicorn.run(app, host="0.0.0.0", port=8001)