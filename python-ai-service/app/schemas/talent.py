"""Pydantic schemas for talent-related data."""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class Gender(str, Enum):
    """Gender enumeration."""
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY"


class ExperienceLevel(str, Enum):
    """Experience level enumeration."""
    FRESHER = "FRESHER"
    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    EXPERIENCED = "EXPERIENCED"
    EXPERT = "EXPERT"
    VETERAN = "VETERAN"


class AvailabilityStatus(str, Enum):
    """Availability status enumeration."""
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    PARTIALLY_AVAILABLE = "PARTIALLY_AVAILABLE"
    NOT_AVAILABLE = "NOT_AVAILABLE"
    ON_PROJECT = "ON_PROJECT"


class TalentBase(BaseModel):
    """Base talent schema."""
    first_name: str = Field(..., description="Talent's first name")
    last_name: str = Field(..., description="Talent's last name")
    display_name: Optional[str] = Field(None, description="Display name or stage name")
    gender: Gender = Field(..., description="Gender")
    date_of_birth: datetime = Field(..., description="Date of birth")
    email: str = Field(..., description="Email address")
    phone: str = Field(..., description="Phone number")
    current_city: str = Field(..., description="Current city")
    current_state: str = Field(..., description="Current state")


class TalentPhysicalAttributes(BaseModel):
    """Physical attributes schema."""
    height: Optional[float] = Field(None, description="Height in centimeters")
    weight: Optional[float] = Field(None, description="Weight in kilograms")
    eye_color: Optional[str] = None
    hair_color: Optional[str] = None
    hair_length: Optional[str] = None
    body_type: Optional[str] = None
    skin_tone: Optional[str] = None
    ethnicity: Optional[str] = None


class TalentSkills(BaseModel):
    """Skills and specializations schema."""
    acting_skills: List[str] = Field(default_factory=list, description="Acting skills")
    dance_skills: List[str] = Field(default_factory=list, description="Dance skills")
    martial_arts: List[str] = Field(default_factory=list, description="Martial arts skills")
    musical_instruments: List[str] = Field(default_factory=list, description="Musical instruments")
    singing_skills: List[str] = Field(default_factory=list, description="Singing skills")
    languages: List[str] = Field(default_factory=list, description="Languages spoken")
    dialects: List[str] = Field(default_factory=list, description="Dialects")
    accents: List[str] = Field(default_factory=list, description="Accents")
    special_skills: List[str] = Field(default_factory=list, description="Special skills")


class TalentSearchCriteria(BaseModel):
    """Search criteria for finding talents."""
    query: Optional[str] = Field(None, description="Free text search query")
    gender: Optional[Gender] = None
    age_min: Optional[int] = Field(None, ge=0, le=100)
    age_max: Optional[int] = Field(None, ge=0, le=100)
    height_min: Optional[float] = Field(None, ge=0)
    height_max: Optional[float] = Field(None, ge=0)
    weight_min: Optional[float] = Field(None, ge=0)
    weight_max: Optional[float] = Field(None, ge=0)
    languages: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    city: Optional[str] = None
    state: Optional[str] = None
    experience_level: Optional[ExperienceLevel] = None
    availability_status: Optional[AvailabilityStatus] = None
    is_verified: Optional[bool] = None
    min_rating: Optional[float] = Field(None, ge=0, le=5)
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class TalentSummary(BaseModel):
    """Talent summary for search results."""
    id: str
    first_name: str
    last_name: str
    display_name: Optional[str]
    gender: Gender
    age: int
    current_city: str
    current_state: str
    profile_image_url: Optional[str]
    rating: float
    is_verified: bool
    experience_level: ExperienceLevel
    availability_status: AvailabilityStatus
    languages: List[str]
    key_skills: List[str]
    match_score: Optional[float] = Field(None, description="AI-calculated match score")


class TalentDetail(TalentBase):
    """Detailed talent information."""
    id: str
    bio: Optional[str]
    years_of_experience: int
    physical_attributes: TalentPhysicalAttributes
    skills: TalentSkills
    profile_image_url: Optional[str]
    portfolio_urls: List[str]
    instagram_handle: Optional[str]
    rating: float
    total_reviews: int
    is_verified: bool
    experience_level: ExperienceLevel
    availability_status: AvailabilityStatus
    profile_completeness: str
    profile_score: float
    ai_generated_summary: Optional[str]


class TalentRecommendation(BaseModel):
    """AI-powered talent recommendation."""
    talent: TalentSummary
    match_score: float = Field(..., ge=0, le=100, description="Match percentage")
    match_reasons: List[str] = Field(..., description="Reasons for recommendation")
    strengths: List[str] = Field(..., description="Key strengths for the role")
    considerations: List[str] = Field(..., description="Points to consider")
    ai_notes: Optional[str] = Field(None, description="AI-generated notes")


class SearchResponse(BaseModel):
    """Response for talent search."""
    talents: List[TalentSummary]
    total_count: int
    has_more: bool
    search_criteria: TalentSearchCriteria
    ai_insights: Optional[Dict[str, Any]] = None


class ChatMessage(BaseModel):
    """Chat message schema."""
    role: str = Field(..., description="Message role (user/assistant/system)")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    """Request for AI chat."""
    messages: List[ChatMessage]
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")
    search_criteria: Optional[TalentSearchCriteria] = None
    temperature: float = Field(default=0.7, ge=0, le=1)
    max_tokens: int = Field(default=2000, ge=100, le=4000)


class ChatResponse(BaseModel):
    """Response from AI chat."""
    message: ChatMessage
    search_results: Optional[List[TalentRecommendation]] = None
    suggested_actions: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None