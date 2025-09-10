"""AI service for talent search and chat functionality."""

from typing import List, Dict, Any, Optional
import openai
import anthropic
from loguru import logger
from app.core.config import settings
from app.schemas.talent import (
    TalentSearchCriteria,
    TalentRecommendation,
    ChatRequest,
    ChatResponse,
    ChatMessage,
    TalentSummary
)
from app.database.connection import async_db
import json
from datetime import datetime


class AIService:
    """Service for AI-powered talent search and recommendations."""
    
    def __init__(self):
        """Initialize AI service with API clients."""
        # Initialize OpenAI client
        if settings.openai_api_key:
            openai.api_key = settings.openai_api_key
            self.openai_client = openai.OpenAI(api_key=settings.openai_api_key)
        else:
            self.openai_client = None
            
        # Initialize Anthropic client
        if settings.anthropic_api_key:
            self.anthropic_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        else:
            self.anthropic_client = None
    
    async def search_talents(self, criteria: TalentSearchCriteria) -> List[TalentSummary]:
        """
        Search for talents based on criteria.
        
        Args:
            criteria: Search criteria
            
        Returns:
            List of matching talents
        """
        try:
            # Build SQL query based on criteria
            query = """
                SELECT 
                    t.id,
                    t."firstName" as first_name,
                    t."lastName" as last_name,
                    t."displayName" as display_name,
                    t.gender,
                    DATE_PART('year', AGE(t."dateOfBirth")) as age,
                    t."currentCity" as current_city,
                    t."currentState" as current_state,
                    t."profileImageUrl" as profile_image_url,
                    t.rating,
                    t."isVerified" as is_verified,
                    t."experienceLevel" as experience_level,
                    t."availabilityStatus" as availability_status,
                    t.languages,
                    t."actingSkills" as key_skills
                FROM talents t
                WHERE 1=1
            """
            
            params = []
            param_count = 0
            
            # Add filters
            if criteria.gender:
                param_count += 1
                query += f" AND t.gender = ${param_count}"
                params.append(criteria.gender)
            
            if criteria.city:
                param_count += 1
                query += f" AND LOWER(t.\"currentCity\") = LOWER(${param_count})"
                params.append(criteria.city)
            
            if criteria.state:
                param_count += 1
                query += f" AND LOWER(t.\"currentState\") = LOWER(${param_count})"
                params.append(criteria.state)
            
            if criteria.is_verified is not None:
                param_count += 1
                query += f" AND t.\"isVerified\" = ${param_count}"
                params.append(criteria.is_verified)
            
            if criteria.availability_status:
                param_count += 1
                query += f" AND t.\"availabilityStatus\" = ${param_count}"
                params.append(criteria.availability_status)
            
            if criteria.experience_level:
                param_count += 1
                query += f" AND t.\"experienceLevel\" = ${param_count}"
                params.append(criteria.experience_level)
            
            if criteria.min_rating:
                param_count += 1
                query += f" AND t.rating >= ${param_count}"
                params.append(criteria.min_rating)
            
            # Add ordering and pagination
            query += " ORDER BY t.rating DESC, t.\"profileScore\" DESC"
            query += f" LIMIT {criteria.limit} OFFSET {criteria.offset}"
            
            # Execute query
            rows = await async_db.fetch_all(query, *params)
            
            # Convert to Pydantic models
            talents = []
            for row in rows:
                talent = TalentSummary(
                    id=row['id'],
                    first_name=row['first_name'],
                    last_name=row['last_name'],
                    display_name=row['display_name'],
                    gender=row['gender'],
                    age=int(row['age']) if row['age'] else 0,
                    current_city=row['current_city'],
                    current_state=row['current_state'],
                    profile_image_url=row['profile_image_url'],
                    rating=float(row['rating']) if row['rating'] else 0.0,
                    is_verified=bool(row['is_verified']),
                    experience_level=row['experience_level'] or 'FRESHER',
                    availability_status=row['availability_status'] or 'AVAILABLE',
                    languages=row['languages'] or [],
                    key_skills=row['key_skills'] or []
                )
                talents.append(talent)
            
            return talents
            
        except Exception as e:
            logger.error(f"Error searching talents: {e}")
            return []
    
    async def get_talent_recommendations(
        self, 
        role_description: str,
        criteria: Optional[TalentSearchCriteria] = None
    ) -> List[TalentRecommendation]:
        """
        Get AI-powered talent recommendations for a role.
        
        Args:
            role_description: Description of the role
            criteria: Optional search criteria
            
        Returns:
            List of talent recommendations
        """
        try:
            # First, get matching talents
            if not criteria:
                criteria = TalentSearchCriteria()
            
            talents = await self.search_talents(criteria)
            
            if not talents:
                return []
            
            # Use AI to rank and provide insights
            recommendations = []
            
            for talent in talents[:10]:  # Process top 10 matches
                # Generate match analysis using AI
                prompt = f"""
                Analyze the match between this talent and role:
                
                Role: {role_description}
                
                Talent Profile:
                - Name: {talent.first_name} {talent.last_name}
                - Age: {talent.age}
                - Location: {talent.current_city}, {talent.current_state}
                - Experience Level: {talent.experience_level}
                - Languages: {', '.join(talent.languages)}
                - Key Skills: {', '.join(talent.key_skills)}
                - Verified: {talent.is_verified}
                - Rating: {talent.rating}/5
                
                Provide:
                1. Match score (0-100)
                2. Top 3 reasons for recommendation
                3. Top 3 strengths for this role
                4. Top 3 considerations
                
                Return as JSON.
                """
                
                # Get AI analysis
                if self.openai_client:
                    response = self.openai_client.chat.completions.create(
                        model=settings.openai_model,
                        messages=[
                            {"role": "system", "content": "You are a casting director AI assistant."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.3,
                        response_format={"type": "json_object"}
                    )
                    
                    analysis = json.loads(response.choices[0].message.content)
                else:
                    # Fallback analysis without AI
                    analysis = {
                        "match_score": 75,
                        "reasons": [
                            f"Experience level: {talent.experience_level}",
                            f"Located in {talent.current_city}",
                            f"Rating: {talent.rating}/5"
                        ],
                        "strengths": talent.key_skills[:3] if talent.key_skills else ["Experienced", "Professional", "Skilled"],
                        "considerations": ["Schedule availability to be confirmed", "Rate negotiation required", "Portfolio review needed"]
                    }
                
                recommendation = TalentRecommendation(
                    talent=talent,
                    match_score=analysis.get("match_score", 75),
                    match_reasons=analysis.get("reasons", []),
                    strengths=analysis.get("strengths", []),
                    considerations=analysis.get("considerations", []),
                    ai_notes=analysis.get("notes")
                )
                
                recommendations.append(recommendation)
            
            # Sort by match score
            recommendations.sort(key=lambda x: x.match_score, reverse=True)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            return []
    
    async def process_chat(self, request: ChatRequest) -> ChatResponse:
        """
        Process chat request with AI.
        
        Args:
            request: Chat request
            
        Returns:
            Chat response with AI message
        """
        try:
            # Check if the chat is about talent search
            is_talent_search = any(
                keyword in request.messages[-1].content.lower()
                for keyword in ['find', 'search', 'looking for', 'need', 'talent', 'actor', 'actress']
            )
            
            search_results = None
            
            if is_talent_search and request.search_criteria:
                # Perform talent search
                talents = await self.search_talents(request.search_criteria)
                
                if talents:
                    # Get recommendations if role description is provided
                    role_description = request.messages[-1].content
                    recommendations = await self.get_talent_recommendations(
                        role_description,
                        request.search_criteria
                    )
                    search_results = recommendations[:5]  # Return top 5
            
            # Generate AI response
            if self.openai_client:
                messages = [
                    {"role": msg.role, "content": msg.content}
                    for msg in request.messages
                ]
                
                # Add context about search results
                if search_results:
                    context = f"\n\nFound {len(search_results)} matching talents. "
                    context += "Top recommendations based on your criteria."
                    messages.append({"role": "system", "content": context})
                
                response = self.openai_client.chat.completions.create(
                    model=settings.openai_model,
                    messages=messages,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens
                )
                
                ai_message = ChatMessage(
                    role="assistant",
                    content=response.choices[0].message.content,
                    timestamp=datetime.utcnow()
                )
            else:
                # Fallback response without AI
                if search_results:
                    content = f"Found {len(search_results)} talents matching your criteria. "
                    content += "Review the recommendations to find the best fit for your project."
                else:
                    content = "I can help you find the perfect talent for your project. Please provide more details about what you're looking for."
                
                ai_message = ChatMessage(
                    role="assistant",
                    content=content,
                    timestamp=datetime.utcnow()
                )
            
            # Suggest next actions
            suggested_actions = []
            if search_results:
                suggested_actions = [
                    "View detailed profiles",
                    "Schedule auditions",
                    "Request self-tapes",
                    "Check availability",
                    "Contact talents"
                ]
            else:
                suggested_actions = [
                    "Refine search criteria",
                    "Browse all talents",
                    "Post a casting call",
                    "Get AI recommendations"
                ]
            
            return ChatResponse(
                message=ai_message,
                search_results=search_results,
                suggested_actions=suggested_actions,
                metadata={
                    "total_results": len(search_results) if search_results else 0,
                    "search_performed": is_talent_search
                }
            )
            
        except Exception as e:
            logger.error(f"Error processing chat: {e}")
            
            error_message = ChatMessage(
                role="assistant",
                content="I encountered an error processing your request. Please try again or refine your search criteria.",
                timestamp=datetime.utcnow()
            )
            
            return ChatResponse(
                message=error_message,
                suggested_actions=["Try again", "Contact support"]
            )


# Create global AI service instance
ai_service = AIService()