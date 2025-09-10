"""Configuration module for the Python AI service."""

from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, validator
import os
from pathlib import Path

# Get the base directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Server Configuration
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    debug: bool = Field(default=False, env="DEBUG")
    
    # Database
    database_url: str = Field(
        default="postgresql://postgres@localhost:5432/castmatch_db",
        env="DATABASE_URL"
    )
    
    # CORS
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001"],
        env="CORS_ORIGINS"
    )
    
    # OpenAI Configuration
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4-turbo-preview", env="OPENAI_MODEL")
    
    # Anthropic Configuration
    anthropic_api_key: Optional[str] = Field(default=None, env="ANTHROPIC_API_KEY")
    anthropic_model: str = Field(default="claude-3-opus-20240229", env="ANTHROPIC_MODEL")
    anthropic_haiku_model: str = Field(default="claude-3-haiku-20240307", env="ANTHROPIC_HAIKU_MODEL")
    anthropic_sonnet_model: str = Field(default="claude-3-sonnet-20240229", env="ANTHROPIC_SONNET_MODEL")
    
    # Pinecone Configuration
    pinecone_api_key: Optional[str] = Field(default=None, env="PINECONE_API_KEY")
    pinecone_environment: str = Field(default="us-east-1-aws", env="PINECONE_ENVIRONMENT")
    pinecone_index_name: str = Field(default="castmatch-talents", env="PINECONE_INDEX_NAME")
    pinecone_dimension: int = Field(default=1536, env="PINECONE_DIMENSION")
    
    # Redis Configuration
    redis_url: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    redis_stm_ttl: int = Field(default=1800, env="REDIS_STM_TTL")  # 30 minutes
    redis_max_stm_items: int = Field(default=7, env="REDIS_MAX_STM_ITEMS")
    
    # JWT Configuration
    secret_key: str = Field(
        default="your-secret-key-here",
        env="SECRET_KEY"
    )
    jwt_secret: str = Field(
        default="your-secret-key-here",
        env="JWT_SECRET"
    )
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    jwt_expiry_hours: int = Field(default=24, env="JWT_EXPIRY_HOURS")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # AI Service Configuration
    max_tokens: int = Field(default=2000, env="MAX_TOKENS")
    temperature: float = Field(default=0.7, env="TEMPERATURE")
    
    # Application Metadata
    app_name: str = "CastMatch AI Service"
    app_version: str = "1.0.0"
    api_prefix: str = "/api/v1"
    
    @validator("cors_origins", pre=True)
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string to list if needed."""
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except:
                return [origin.strip() for origin in v.split(",")]
        return v
    
    class Config:
        """Pydantic configuration."""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Create global settings instance
settings = Settings()