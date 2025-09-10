"""Conversation API routes with Claude integration and streaming support."""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import StreamingResponse
from typing import Dict, Any, Optional, List, AsyncGenerator
from pydantic import BaseModel, Field
from datetime import datetime
from loguru import logger
import json
import asyncio
import uuid

from app.services.claude_service import claude_service, ClaudeModel
from app.services.memory_service import memory_consolidation as memory_service
from app.services.conversation_intelligence import conversation_intelligence, Intent
from app.core.config import settings
from app.utils.auth import get_current_user
from app.utils.rate_limiter import rate_limit


# Pydantic models for request/response
class ConversationMessage(BaseModel):
    """Single message in a conversation."""
    role: str = Field(..., description="Message role (user/assistant/system)")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = Field(None, description="Message timestamp")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ConversationRequest(BaseModel):
    """Request for conversation endpoint."""
    message: str = Field(..., description="User message")
    conversation_id: Optional[str] = Field(None, description="Conversation ID for context")
    context_type: Optional[str] = Field("general", description="Context type (casting/talent/script)")
    streaming: bool = Field(False, description="Enable streaming response")
    model_preference: Optional[str] = Field(None, description="Preferred Claude model")
    temperature: float = Field(0.7, ge=0, le=1, description="Response creativity")
    max_tokens: int = Field(2000, ge=100, le=8000, description="Maximum response tokens")
    inject_memories: bool = Field(True, description="Inject relevant memories")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ConversationResponse(BaseModel):
    """Response from conversation endpoint."""
    response: str = Field(..., description="AI response")
    conversation_id: str = Field(..., description="Conversation ID")
    message_id: str = Field(..., description="Message ID")
    model_used: str = Field(..., description="Claude model used")
    tokens_used: Dict[str, int] = Field(..., description="Token usage")
    response_time_ms: int = Field(..., description="Response time in milliseconds")
    memories_used: Optional[List[Dict]] = Field(None, description="Memories injected")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class IntentRecognition(BaseModel):
    """Intent recognition result."""
    intent: str = Field(..., description="Recognized intent")
    confidence: float = Field(..., description="Confidence score (0-1)")
    entities: Dict[str, Any] = Field(default_factory=dict, description="Extracted entities")
    context_needed: List[str] = Field(default_factory=list, description="Required context")


# Create router
router = APIRouter(prefix="/api/v1/conversation", tags=["conversation"])


class ConversationHandler:
    """Handles conversation logic with Claude integration."""
    
    def __init__(self):
        self.active_conversations: Dict[str, Dict] = {}
        self.intent_patterns = self._load_intent_patterns()
    
    def _load_intent_patterns(self) -> Dict[str, List[str]]:
        """Load intent recognition patterns for casting domain."""
        return {
            "search_talent": ["find", "search", "looking for", "need", "actor", "actress", "talent"],
            "analyze_script": ["script", "analyze", "character", "role", "scene"],
            "schedule_audition": ["audition", "schedule", "book", "appointment", "meeting"],
            "view_profile": ["profile", "details", "information", "about", "bio"],
            "casting_recommendation": ["recommend", "suggest", "suitable", "match", "fit for"],
            "availability_check": ["available", "free", "when", "schedule", "dates"],
            "skill_query": ["skills", "languages", "experience", "trained in", "can do"],
            "budget_discussion": ["budget", "rate", "cost", "fee", "payment"],
            "contract_terms": ["contract", "terms", "agreement", "conditions"],
            "general_query": []  # Fallback
        }
    
    async def recognize_intent(self, message: str) -> IntentRecognition:
        """Recognize intent from user message."""
        message_lower = message.lower()
        
        best_intent = "general_query"
        best_confidence = 0.0
        entities = {}
        
        # Simple pattern matching (can be enhanced with NLP)
        for intent, patterns in self.intent_patterns.items():
            if not patterns:
                continue
            
            matches = sum(1 for pattern in patterns if pattern in message_lower)
            confidence = matches / len(patterns) if patterns else 0
            
            if confidence > best_confidence:
                best_confidence = confidence
                best_intent = intent
        
        # Extract entities based on intent
        if best_intent == "search_talent":
            # Extract age, gender, location, etc.
            entities = self._extract_talent_criteria(message)
        elif best_intent == "analyze_script":
            entities = {"requires_file_upload": True}
        
        # Determine required context
        context_needed = []
        if best_intent in ["schedule_audition", "availability_check"]:
            context_needed.append("calendar_access")
        if best_intent in ["budget_discussion", "contract_terms"]:
            context_needed.append("financial_authorization")
        
        return IntentRecognition(
            intent=best_intent,
            confidence=best_confidence if best_confidence > 0 else 0.5,
            entities=entities,
            context_needed=context_needed
        )
    
    def _extract_talent_criteria(self, message: str) -> Dict[str, Any]:
        """Extract talent search criteria from message."""
        criteria = {}
        
        # Age extraction (simple regex patterns)
        import re
        age_patterns = [
            r"(\d+)\s*-\s*(\d+)\s*years?",
            r"age\s*(\d+)\s*to\s*(\d+)",
            r"(\d+)\s*to\s*(\d+)\s*years?"
        ]
        
        for pattern in age_patterns:
            match = re.search(pattern, message.lower())
            if match:
                criteria["age_min"] = int(match.group(1))
                criteria["age_max"] = int(match.group(2))
                break
        
        # Gender extraction
        if "male" in message.lower() and "female" not in message.lower():
            criteria["gender"] = "male"
        elif "female" in message.lower():
            criteria["gender"] = "female"
        elif "actor" in message.lower() and "actress" not in message.lower():
            criteria["gender"] = "male"
        elif "actress" in message.lower():
            criteria["gender"] = "female"
        
        # Language extraction
        languages = ["hindi", "english", "marathi", "tamil", "telugu", "bengali", "punjabi"]
        found_languages = [lang for lang in languages if lang in message.lower()]
        if found_languages:
            criteria["languages"] = found_languages
        
        # Location extraction
        locations = ["mumbai", "delhi", "bangalore", "chennai", "kolkata", "hyderabad", "pune"]
        found_locations = [loc for loc in locations if loc in message.lower()]
        if found_locations:
            criteria["locations"] = found_locations
        
        return criteria
    
    def build_system_prompt(self, context_type: str, intent: Optional[str] = None) -> str:
        """Build dynamic system prompt based on context."""
        base_prompt = claude_service._get_default_system_prompt()
        
        context_prompts = {
            "casting": """
Focus on casting-specific queries:
- Talent matching and recommendations
- Role suitability assessment
- Availability coordination
- Budget and contract discussions
- Industry best practices""",
            
            "talent": """
Focus on talent profiles and capabilities:
- Skills and experience evaluation
- Portfolio and past work discussion
- Training and certifications
- Language proficiencies
- Special abilities and unique traits""",
            
            "script": """
Focus on script analysis and character requirements:
- Character trait extraction
- Scene complexity assessment
- Required skills identification
- Chemistry and relationship dynamics
- Production requirements"""
        }
        
        intent_prompts = {
            "search_talent": "Provide specific talent recommendations with clear reasoning for each suggestion.",
            "analyze_script": "Extract detailed character profiles and casting requirements from the script.",
            "schedule_audition": "Help coordinate audition scheduling with clear time slots and requirements.",
            "casting_recommendation": "Provide well-reasoned casting suggestions based on role requirements.",
            "availability_check": "Check and communicate talent availability clearly.",
            "budget_discussion": "Discuss budget considerations professionally while maintaining confidentiality.",
        }
        
        # Combine prompts
        final_prompt = base_prompt
        
        if context_type in context_prompts:
            final_prompt += f"\n\n{context_prompts[context_type]}"
        
        if intent and intent in intent_prompts:
            final_prompt += f"\n\nSpecific instruction: {intent_prompts[intent]}"
        
        return final_prompt
    
    async def process_conversation(
        self,
        request: ConversationRequest,
        user_id: Optional[str] = None
    ) -> ConversationResponse:
        """Process a conversation request with Claude."""
        start_time = datetime.utcnow()
        
        # Generate conversation ID if not provided
        if not request.conversation_id:
            request.conversation_id = str(uuid.uuid4())
        
        # Recognize intent
        intent_result = await self.recognize_intent(request.message)
        logger.info(f"Recognized intent: {intent_result.intent} (confidence: {intent_result.confidence})")
        
        # Build messages for Claude
        messages = [{"role": "user", "content": request.message}]
        
        # Inject relevant memories if enabled
        injected_memories = []
        if request.inject_memories and memory_service:
            try:
                # Get relevant memories from semantic search
                relevant_memories = await memory_service.search_semantic_memories(
                    query=request.message,
                    limit=3,
                    user_id=user_id
                )
                
                if relevant_memories:
                    memory_context = "\n\nRelevant context from previous conversations:\n"
                    for mem in relevant_memories:
                        memory_context += f"- {mem['content']} (relevance: {mem['similarity']:.2f})\n"
                    
                    # Add as system message
                    messages.insert(0, {
                        "role": "system",
                        "content": f"Use this context if relevant:{memory_context}"
                    })
                    
                    injected_memories = relevant_memories
                    logger.info(f"Injected {len(relevant_memories)} relevant memories")
            except Exception as e:
                logger.error(f"Failed to inject memories: {e}")
        
        # Build system prompt
        system_prompt = self.build_system_prompt(
            context_type=request.context_type,
            intent=intent_result.intent
        )
        
        # Select model
        model = None
        if request.model_preference:
            model_map = {
                "haiku": ClaudeModel.HAIKU,
                "sonnet": ClaudeModel.SONNET,
                "opus": ClaudeModel.OPUS
            }
            model = model_map.get(request.model_preference.lower())
        
        # Generate response
        try:
            response_text, metadata = await claude_service.generate_response(
                messages=messages,
                conversation_id=request.conversation_id,
                model=model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                system_prompt=system_prompt
            )
            
            # Store in short-term memory
            if memory_service:
                await memory_service.store_short_term_memory(
                    key=f"conv:{request.conversation_id}:latest",
                    value={
                        "user_message": request.message,
                        "ai_response": response_text,
                        "intent": intent_result.intent,
                        "timestamp": datetime.utcnow().isoformat()
                    },
                    ttl_seconds=1800  # 30 minutes
                )
                
                # Store in episodic memory for important conversations
                if intent_result.confidence > 0.7:
                    await memory_service.store_episodic_memory(
                        user_id=user_id or "anonymous",
                        content=f"Q: {request.message}\nA: {response_text}",
                        memory_type="conversation",
                        importance_score=intent_result.confidence,
                        metadata={
                            "intent": intent_result.intent,
                            "entities": intent_result.entities,
                            "context_type": request.context_type
                        }
                    )
            
            # Calculate response time
            response_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return ConversationResponse(
                response=response_text,
                conversation_id=request.conversation_id,
                message_id=str(uuid.uuid4()),
                model_used=metadata.get("model", "unknown"),
                tokens_used=metadata.get("tokens", {}),
                response_time_ms=response_time_ms,
                memories_used=injected_memories if injected_memories else None,
                metadata={
                    "intent": intent_result.intent,
                    "confidence": intent_result.confidence,
                    "entities": intent_result.entities,
                    **request.metadata
                }
            )
            
        except Exception as e:
            logger.error(f"Error processing conversation: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def stream_conversation(
        self,
        request: ConversationRequest,
        user_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Stream conversation response using Server-Sent Events."""
        try:
            # Process initial setup (intent recognition, memory injection)
            intent_result = await self.recognize_intent(request.message)
            
            # Build messages
            messages = [{"role": "user", "content": request.message}]
            
            # System prompt
            system_prompt = self.build_system_prompt(
                context_type=request.context_type,
                intent=intent_result.intent
            )
            
            # For now, simulate streaming with chunks
            # In production, use Claude's streaming API when available
            response = await self.process_conversation(request, user_id)
            
            # Stream response in chunks
            chunk_size = 50  # Characters per chunk
            response_text = response.response
            
            for i in range(0, len(response_text), chunk_size):
                chunk = response_text[i:i + chunk_size]
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                await asyncio.sleep(0.05)  # Small delay for streaming effect
            
            # Send completion signal
            yield f"data: {json.dumps({'done': True, 'metadata': response.metadata})}\n\n"
            
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"


# Initialize handler
conversation_handler = ConversationHandler()


# API Endpoints

@router.post("/chat", response_model=ConversationResponse)
@rate_limit(max_calls=30, time_window=60)  # 30 calls per minute
async def chat_endpoint(
    request: ConversationRequest,
    current_user: Optional[Dict] = Depends(get_current_user)
) -> ConversationResponse:
    """
    Process a chat message with Claude AI.
    
    Features:
    - Intent recognition for casting domain
    - Context-aware responses
    - Memory injection from previous conversations
    - Token optimization
    - Response time tracking
    """
    user_id = current_user.get("id") if current_user else None
    return await conversation_handler.process_conversation(request, user_id)


@router.post("/chat/stream")
@rate_limit(max_calls=10, time_window=60)  # Lower rate limit for streaming
async def stream_chat_endpoint(
    request: ConversationRequest,
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """
    Stream a chat response using Server-Sent Events.
    
    Provides real-time streaming of AI responses for better UX.
    """
    if not request.streaming:
        request.streaming = True
    
    user_id = current_user.get("id") if current_user else None
    
    return StreamingResponse(
        conversation_handler.stream_conversation(request, user_id),
        media_type="text/event-stream"
    )


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time bidirectional conversation.
    
    Supports:
    - Real-time message exchange
    - Typing indicators
    - Connection status
    - Error handling
    """
    await websocket.accept()
    conversation_id = str(uuid.uuid4())
    
    try:
        await websocket.send_json({
            "type": "connection",
            "conversation_id": conversation_id,
            "status": "connected"
        })
        
        while True:
            # Receive message
            data = await websocket.receive_json()
            
            # Send typing indicator
            await websocket.send_json({"type": "typing", "status": "started"})
            
            # Process message
            request = ConversationRequest(
                message=data.get("message", ""),
                conversation_id=conversation_id,
                context_type=data.get("context_type", "general"),
                temperature=data.get("temperature", 0.7)
            )
            
            response = await conversation_handler.process_conversation(request)
            
            # Send response
            await websocket.send_json({
                "type": "message",
                "response": response.response,
                "metadata": response.metadata
            })
            
            # Stop typing indicator
            await websocket.send_json({"type": "typing", "status": "stopped"})
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {conversation_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_json({"type": "error", "message": str(e)})
        await websocket.close()


@router.get("/conversation/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: Optional[Dict] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get conversation history by ID.
    
    Returns the full conversation context including all messages.
    """
    context = claude_service.conversation_manager.get_context(conversation_id)
    
    if not context:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {
        "conversation_id": conversation_id,
        "messages": context,
        "message_count": len(context)
    }


@router.delete("/conversation/{conversation_id}")
async def clear_conversation(
    conversation_id: str,
    current_user: Optional[Dict] = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Clear a conversation history.
    
    Removes all messages from the conversation context.
    """
    claude_service.conversation_manager.clear_conversation(conversation_id)
    
    return {
        "status": "success",
        "message": f"Conversation {conversation_id} cleared"
    }


@router.post("/analyze-script")
@rate_limit(max_calls=5, time_window=60)  # Limited due to complexity
async def analyze_script(
    script_text: str,
    extract_characters: bool = True,
    extract_requirements: bool = True,
    current_user: Optional[Dict] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Analyze a script to extract casting information.
    
    Extracts:
    - Character profiles
    - Required skills
    - Relationships
    - Shooting locations
    - Genre and tone
    """
    result = await claude_service.analyze_script(
        script_text=script_text,
        extract_characters=extract_characters,
        extract_requirements=extract_requirements
    )
    
    return result


@router.get("/intents")
async def get_supported_intents() -> Dict[str, List[str]]:
    """
    Get list of supported conversation intents.
    
    Returns all recognized intents for the casting domain.
    """
    return {
        "intents": list(conversation_handler.intent_patterns.keys()),
        "description": "Supported conversation intents for casting domain"
    }


@router.get("/usage-stats")
async def get_usage_statistics(
    current_user: Optional[Dict] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get token usage statistics and cost estimates.
    
    Provides insights into API usage and associated costs.
    """
    return claude_service.token_tracker.get_usage_report()