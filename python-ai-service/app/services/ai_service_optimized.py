"""Optimized AI service with caching, memory management, and performance optimization."""

import asyncio
import time
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
import openai
import anthropic
from loguru import logger
import psutil
import gc
from memory_profiler import profile
import json
import numpy as np

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
from app.services.cache_service import cache_service
from app.services.vector_service_optimized import optimized_vector_service


class OptimizedAIService:
    """High-performance AI service with advanced caching and memory management."""
    
    def __init__(self):
        """Initialize optimized AI service."""
        # API clients
        self.openai_client = None
        self.anthropic_client = None
        
        # Performance optimizations
        self.executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="ai")
        self.conversation_memory: Dict[str, List[Dict[str, Any]]] = {}
        self.max_conversation_length = 10  # Sliding window for memory efficiency
        
        # Model response caching
        self.model_cache_ttl = 1800  # 30 minutes
        self.conversation_cache_ttl = 7200  # 2 hours
        
        # Performance metrics
        self.metrics = {
            'response_times': [],
            'cache_hits': 0,
            'cache_misses': 0,
            'memory_usage': [],
            'conversation_contexts': 0
        }
        
        # Memory management
        self.gc_threshold = 512 * 1024 * 1024  # 512MB
        self.last_gc_time = time.time()
        self.gc_interval = 300  # 5 minutes
        
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize AI API clients."""
        try:
            # Initialize OpenAI client
            if hasattr(settings, 'openai_api_key') and settings.openai_api_key:
                self.openai_client = openai.OpenAI(api_key=settings.openai_api_key)
                logger.info("OpenAI client initialized")
            
            # Initialize Anthropic client
            if hasattr(settings, 'anthropic_api_key') and settings.anthropic_api_key:
                self.anthropic_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
                logger.info("Anthropic client initialized")
                
        except Exception as e:
            logger.error(f"Error initializing AI clients: {e}")
    
    async def _check_memory_usage(self):
        """Monitor and manage memory usage."""
        try:
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024
            
            self.metrics['memory_usage'].append(memory_mb)
            
            # Keep only recent memory measurements
            if len(self.metrics['memory_usage']) > 100:
                self.metrics['memory_usage'] = self.metrics['memory_usage'][-50:]
            
            # Trigger garbage collection if memory usage is high
            current_time = time.time()
            if (memory_mb > self.gc_threshold / (1024 * 1024) or 
                current_time - self.last_gc_time > self.gc_interval):
                
                await self._cleanup_memory()
                self.last_gc_time = current_time
                
        except Exception as e:
            logger.error(f"Error checking memory usage: {e}")
    
    async def _cleanup_memory(self):
        """Clean up memory by removing old conversations and forcing GC."""
        try:
            # Clean up old conversations (keep only last 50 sessions)
            if len(self.conversation_memory) > 50:
                sorted_sessions = sorted(
                    self.conversation_memory.items(),
                    key=lambda x: x[1][-1].get('timestamp', 0) if x[1] else 0
                )
                # Keep only the 30 most recent
                recent_sessions = dict(sorted_sessions[-30:])
                self.conversation_memory = recent_sessions
                
                logger.debug(f"Cleaned up old conversations, keeping {len(recent_sessions)} sessions")
            
            # Force garbage collection
            collected = gc.collect()
            logger.debug(f"Garbage collection freed {collected} objects")
            
        except Exception as e:
            logger.error(f"Error during memory cleanup: {e}")
    
    def _prune_conversation_context(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prune conversation context to maintain memory efficiency."""
        if len(messages) <= self.max_conversation_length:
            return messages
        
        # Keep system messages and last N user/assistant messages
        system_messages = [msg for msg in messages if msg.get('role') == 'system']
        non_system_messages = [msg for msg in messages if msg.get('role') != 'system']
        
        # Take the most recent non-system messages
        recent_messages = non_system_messages[-self.max_conversation_length:]
        
        return system_messages + recent_messages
    
    async def _get_cached_model_response(
        self,
        prompt: str,
        model_config: Dict[str, Any]
    ) -> Optional[str]:
        """Get cached model response."""
        try:
            response = await cache_service.get_model_response(prompt, model_config)
            if response:
                self.metrics['cache_hits'] += 1
                return response
            else:
                self.metrics['cache_misses'] += 1
                return None
                
        except Exception as e:
            logger.error(f"Error getting cached response: {e}")
            return None
    
    async def _cache_model_response(
        self,
        prompt: str,
        model_config: Dict[str, Any],
        response: str
    ):
        """Cache model response."""
        try:
            await cache_service.set_model_response(
                prompt, 
                model_config, 
                response, 
                ttl=self.model_cache_ttl
            )
        except Exception as e:
            logger.error(f"Error caching response: {e}")
    
    async def search_talents(self, criteria: TalentSearchCriteria) -> List[TalentSummary]:
        """Optimized talent search with caching."""
        start_time = time.time()
        
        try:
            # Build SQL query based on criteria (same as original but with optimizations)
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
            
            # Add filters (same logic as original)
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
            
            # Update metrics
            search_time = time.time() - start_time
            self.metrics['response_times'].append(search_time)
            
            return talents
            
        except Exception as e:
            logger.error(f"Error searching talents: {e}")
            return []
        finally:
            await self._check_memory_usage()
    
    async def get_talent_recommendations(
        self, 
        role_description: str,
        criteria: Optional[TalentSearchCriteria] = None
    ) -> List[TalentRecommendation]:
        """Get optimized AI-powered talent recommendations."""
        start_time = time.time()
        
        try:
            # Use vector search for better matching
            if optimized_vector_service.model_loaded:
                # Convert criteria to filters
                filters = {}
                if criteria:
                    if criteria.city:
                        filters['location'] = criteria.city
                    if criteria.gender:
                        filters['gender'] = criteria.gender
                    # Add age filters if available
                    # Note: This would need to be implemented based on criteria structure
                
                # Search using optimized vector service
                vector_results = await optimized_vector_service.search_similar_talents(
                    query=role_description,
                    filters=filters,
                    top_k=10
                )
                
                # Convert vector results to recommendations
                recommendations = []
                for result in vector_results:
                    # Create a talent summary from vector result
                    talent = TalentSummary(
                        id=result.get('talent_id', ''),
                        first_name='',
                        last_name='',
                        display_name=result.get('name', ''),
                        gender=result.get('gender', ''),
                        age=int(result.get('age', 0)) if result.get('age') else 0,
                        current_city=result.get('location', ''),
                        current_state='',
                        profile_image_url='',
                        rating=0.0,
                        is_verified=False,
                        experience_level='',
                        availability_status='AVAILABLE',
                        languages=[],
                        key_skills=result.get('skills', [])
                    )
                    
                    # Generate AI analysis with caching
                    analysis = await self._get_ai_analysis(talent, role_description, result.get('score', 0))
                    
                    recommendation = TalentRecommendation(
                        talent=talent,
                        match_score=int(result.get('score', 0) * 100),
                        match_reasons=analysis.get('reasons', []),
                        strengths=analysis.get('strengths', []),
                        considerations=analysis.get('considerations', []),
                        ai_notes=analysis.get('notes')
                    )
                    
                    recommendations.append(recommendation)
                
                # Update metrics
                response_time = time.time() - start_time
                self.metrics['response_times'].append(response_time)
                
                return recommendations
            
            # Fallback to original implementation
            if not criteria:
                criteria = TalentSearchCriteria()
            
            talents = await self.search_talents(criteria)
            
            if not talents:
                return []
            
            recommendations = []
            for talent in talents[:10]:  # Process top 10 matches
                analysis = await self._get_ai_analysis(talent, role_description)
                
                recommendation = TalentRecommendation(
                    talent=talent,
                    match_score=analysis.get('match_score', 75),
                    match_reasons=analysis.get('reasons', []),
                    strengths=analysis.get('strengths', []),
                    considerations=analysis.get('considerations', []),
                    ai_notes=analysis.get('notes')
                )
                
                recommendations.append(recommendation)
            
            # Sort by match score
            recommendations.sort(key=lambda x: x.match_score, reverse=True)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            return []
        finally:
            await self._check_memory_usage()
    
    async def _get_ai_analysis(
        self, 
        talent: TalentSummary, 
        role_description: str, 
        vector_score: float = 0
    ) -> Dict[str, Any]:
        """Get AI analysis with caching."""
        try:
            # Create prompt
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
            
            model_config = {
                'model': getattr(settings, 'openai_model', 'gpt-3.5-turbo'),
                'temperature': 0.3
            }
            
            # Check cache first
            cached_response = await self._get_cached_model_response(prompt, model_config)
            if cached_response:
                try:
                    return json.loads(cached_response)
                except:
                    pass
            
            # Generate new analysis
            if self.openai_client:
                response = await asyncio.get_event_loop().run_in_executor(
                    self.executor,
                    self._call_openai_sync,
                    prompt,
                    model_config
                )
                
                if response:
                    await self._cache_model_response(prompt, model_config, response)
                    try:
                        return json.loads(response)
                    except:
                        pass
            
            # Fallback analysis
            base_score = max(75, int(vector_score * 100)) if vector_score > 0 else 75
            return {
                "match_score": base_score,
                "reasons": [
                    f"Experience level: {talent.experience_level}",
                    f"Located in {talent.current_city}",
                    f"Rating: {talent.rating}/5"
                ],
                "strengths": talent.key_skills[:3] if talent.key_skills else ["Experienced", "Professional", "Skilled"],
                "considerations": ["Schedule availability to be confirmed", "Rate negotiation required", "Portfolio review needed"]
            }
            
        except Exception as e:
            logger.error(f"Error in AI analysis: {e}")
            return {
                "match_score": 75,
                "reasons": ["Profile match"],
                "strengths": ["Professional"],
                "considerations": ["Review required"]
            }
    
    def _call_openai_sync(self, prompt: str, model_config: Dict[str, Any]) -> Optional[str]:
        """Call OpenAI API synchronously in thread pool."""
        try:
            response = self.openai_client.chat.completions.create(
                model=model_config['model'],
                messages=[
                    {"role": "system", "content": "You are a casting director AI assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=model_config.get('temperature', 0.3),
                response_format={"type": "json_object"}
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return None
    
    async def process_chat(self, request: ChatRequest) -> ChatResponse:
        """Process chat request with optimized caching and memory management."""
        start_time = time.time()
        
        try:
            session_id = getattr(request, 'session_id', 'default')
            
            # Get conversation context with caching
            conversation_context = await cache_service.get_conversation_context(session_id)
            if conversation_context is None:
                conversation_context = []
            
            # Add new messages to context
            for message in request.messages:
                conversation_context.append({
                    'role': message.role,
                    'content': message.content,
                    'timestamp': message.timestamp.isoformat() if message.timestamp else datetime.utcnow().isoformat()
                })
            
            # Prune conversation context for memory efficiency
            conversation_context = self._prune_conversation_context(conversation_context)
            
            # Check if the chat is about talent search
            is_talent_search = any(
                keyword in request.messages[-1].content.lower()
                for keyword in ['find', 'search', 'looking for', 'need', 'talent', 'actor', 'actress']
            )
            
            search_results = None
            
            if is_talent_search and hasattr(request, 'search_criteria') and request.search_criteria:
                # Use optimized vector search
                if optimized_vector_service.model_loaded:
                    role_description = request.messages[-1].content
                    
                    # Convert search criteria to filters
                    filters = {}
                    if request.search_criteria.city:
                        filters['location'] = request.search_criteria.city
                    if request.search_criteria.gender:
                        filters['gender'] = request.search_criteria.gender
                    
                    vector_results = await optimized_vector_service.search_similar_talents(
                        query=role_description,
                        filters=filters,
                        top_k=5
                    )
                    
                    # Convert to recommendations format
                    search_results = []
                    for result in vector_results:
                        talent = TalentSummary(
                            id=result.get('talent_id', ''),
                            first_name='',
                            last_name='',
                            display_name=result.get('name', ''),
                            gender=result.get('gender', ''),
                            age=int(result.get('age', 0)) if result.get('age') else 0,
                            current_city=result.get('location', ''),
                            current_state='',
                            profile_image_url='',
                            rating=0.0,
                            is_verified=False,
                            experience_level='',
                            availability_status='AVAILABLE',
                            languages=[],
                            key_skills=result.get('skills', [])
                        )
                        
                        recommendation = TalentRecommendation(
                            talent=talent,
                            match_score=int(result.get('score', 0) * 100),
                            match_reasons=[f"Match score: {result.get('score', 0):.2f}"],
                            strengths=result.get('skills', [])[:3],
                            considerations=["Contact for availability"],
                            ai_notes=None
                        )
                        search_results.append(recommendation)
                else:
                    # Fallback to regular search
                    recommendations = await self.get_talent_recommendations(
                        role_description=request.messages[-1].content,
                        criteria=request.search_criteria
                    )
                    search_results = recommendations[:5]
            
            # Generate AI response with caching
            ai_message = await self._generate_ai_response(conversation_context, search_results)
            
            # Update conversation context
            conversation_context.append({
                'role': 'assistant',
                'content': ai_message.content,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            # Cache updated conversation context
            await cache_service.set_conversation_context(
                session_id,
                conversation_context,
                ttl=self.conversation_cache_ttl
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
            
            # Update metrics
            response_time = time.time() - start_time
            self.metrics['response_times'].append(response_time)
            self.metrics['conversation_contexts'] = len(self.conversation_memory)
            
            return ChatResponse(
                message=ai_message,
                search_results=search_results,
                suggested_actions=suggested_actions,
                metadata={
                    "total_results": len(search_results) if search_results else 0,
                    "search_performed": is_talent_search,
                    "response_time_ms": round(response_time * 1000, 2),
                    "cache_hit": False  # Could track this more precisely
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
        finally:
            await self._check_memory_usage()
    
    async def _generate_ai_response(
        self, 
        conversation_context: List[Dict[str, Any]], 
        search_results: Optional[List] = None
    ) -> ChatMessage:
        """Generate AI response with caching."""
        try:
            # Create conversation prompt
            context_str = ""
            for msg in conversation_context[-5:]:  # Use last 5 messages for context
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                context_str += f"{role}: {content}\\n"
            
            # Add search results context
            if search_results:
                context_str += f"\\nFound {len(search_results)} matching talents. Top recommendations based on your criteria."
            
            model_config = {
                'model': getattr(settings, 'openai_model', 'gpt-3.5-turbo'),
                'temperature': 0.7
            }
            
            # Check cache
            cached_response = await self._get_cached_model_response(context_str, model_config)
            if cached_response:
                return ChatMessage(
                    role="assistant",
                    content=cached_response,
                    timestamp=datetime.utcnow()
                )
            
            # Generate new response
            if self.openai_client:
                messages = [{"role": msg.get('role', 'user'), "content": msg.get('content', '')} 
                           for msg in conversation_context[-5:]]
                
                if search_results:
                    messages.append({
                        "role": "system", 
                        "content": f"Found {len(search_results)} matching talents. Provide helpful guidance."
                    })
                
                response_content = await asyncio.get_event_loop().run_in_executor(
                    self.executor,
                    self._generate_response_sync,
                    messages,
                    model_config
                )
                
                if response_content:
                    await self._cache_model_response(context_str, model_config, response_content)
                    
                    return ChatMessage(
                        role="assistant",
                        content=response_content,
                        timestamp=datetime.utcnow()
                    )
            
            # Fallback response
            if search_results:
                content = f"Found {len(search_results)} talents matching your criteria. Review the recommendations to find the best fit for your project."
            else:
                content = "I can help you find the perfect talent for your project. Please provide more details about what you're looking for."
            
            return ChatMessage(
                role="assistant",
                content=content,
                timestamp=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            return ChatMessage(
                role="assistant",
                content="I'm here to help you find the perfect talent. What kind of role are you casting for?",
                timestamp=datetime.utcnow()
            )
    
    def _generate_response_sync(self, messages: List[Dict], model_config: Dict[str, Any]) -> Optional[str]:
        """Generate response synchronously in thread pool."""
        try:
            response = self.openai_client.chat.completions.create(
                model=model_config['model'],
                messages=messages,
                temperature=model_config.get('temperature', 0.7),
                max_tokens=model_config.get('max_tokens', 500)
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI response generation error: {e}")
            return None
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics."""
        try:
            # Calculate averages
            avg_response_time = np.mean(self.metrics['response_times']) if self.metrics['response_times'] else 0
            avg_memory_usage = np.mean(self.metrics['memory_usage']) if self.metrics['memory_usage'] else 0
            
            # Cache statistics
            cache_stats = cache_service.get_cache_stats()
            total_requests = self.metrics['cache_hits'] + self.metrics['cache_misses']
            hit_rate = (self.metrics['cache_hits'] / total_requests * 100) if total_requests > 0 else 0
            
            # Vector service metrics
            vector_metrics = optimized_vector_service.get_performance_metrics()
            
            return {
                'ai_service': {
                    'avg_response_time_ms': round(avg_response_time * 1000, 2),
                    'cache_hit_rate': round(hit_rate, 2),
                    'active_conversations': self.metrics['conversation_contexts'],
                    'avg_memory_usage_mb': round(avg_memory_usage, 2),
                    'total_requests': total_requests,
                    'openai_enabled': self.openai_client is not None,
                    'anthropic_enabled': self.anthropic_client is not None
                },
                'vector_service': vector_metrics,
                'cache_service': cache_stats,
                'system': {
                    'memory_mb': round(psutil.Process().memory_info().rss / 1024 / 1024, 2),
                    'cpu_percent': psutil.cpu_percent(),
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting performance metrics: {e}")
            return {'error': str(e)}
    
    async def close(self):
        """Clean up resources."""
        # Shutdown thread pool
        if self.executor:
            self.executor.shutdown(wait=True)
        
        # Close vector service
        await optimized_vector_service.close()
        
        logger.info("AI service closed")


# Create optimized singleton instance
optimized_ai_service = OptimizedAIService()