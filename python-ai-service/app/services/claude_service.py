"""Anthropic Claude integration service for CastMatch."""

import anthropic
from typing import List, Dict, Any, Optional, Tuple
from loguru import logger
import tiktoken
from datetime import datetime
import json
from enum import Enum

from app.core.config import settings
from app.services.prompt_builder import prompt_builder


class ClaudeModel(Enum):
    """Claude model selection based on task complexity."""
    HAIKU = "claude-3-haiku-20240307"  # Fast, lightweight tasks
    SONNET = "claude-3-sonnet-20240229"  # Balanced performance
    OPUS = "claude-3-opus-20240229"  # Complex reasoning


class ConversationManager:
    """Manages conversation context and token optimization."""
    
    def __init__(self, max_context_tokens: int = 100000):
        self.max_context_tokens = max_context_tokens
        self.conversations: Dict[str, List[Dict]] = {}
        
    def add_message(self, conversation_id: str, role: str, content: str) -> None:
        """Add a message to conversation history."""
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []
        
        self.conversations[conversation_id].append({
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Trim context if needed
        self._optimize_context(conversation_id)
    
    def get_context(self, conversation_id: str, max_messages: int = 20) -> List[Dict]:
        """Get optimized conversation context."""
        if conversation_id not in self.conversations:
            return []
        
        messages = self.conversations[conversation_id]
        return messages[-max_messages:] if len(messages) > max_messages else messages
    
    def _optimize_context(self, conversation_id: str) -> None:
        """Optimize context window by summarizing or trimming old messages."""
        messages = self.conversations[conversation_id]
        
        # Keep only last 50 messages for now (can be enhanced with summarization)
        if len(messages) > 50:
            # Keep system messages and last 40 messages
            system_msgs = [m for m in messages if m["role"] == "system"]
            recent_msgs = messages[-40:]
            self.conversations[conversation_id] = system_msgs + recent_msgs
    
    def clear_conversation(self, conversation_id: str) -> None:
        """Clear a conversation history."""
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]


class ClaudeService:
    """Service for interacting with Anthropic Claude API."""
    
    def __init__(self):
        """Initialize Claude service with API client."""
        if not settings.anthropic_api_key:
            logger.warning("Anthropic API key not configured")
            self.client = None
        else:
            self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
            logger.info("Claude service initialized successfully")
        
        self.conversation_manager = ConversationManager()
        self.token_tracker = TokenTracker()
    
    def select_model(self, task_complexity: str = "medium") -> ClaudeModel:
        """Select appropriate Claude model based on task complexity."""
        if task_complexity == "low":
            return ClaudeModel.HAIKU
        elif task_complexity == "high":
            return ClaudeModel.OPUS
        else:
            return ClaudeModel.SONNET
    
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        conversation_id: Optional[str] = None,
        model: Optional[ClaudeModel] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        system_prompt: Optional[str] = None
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Generate response using Claude API.
        
        Args:
            messages: List of message dictionaries
            conversation_id: Optional conversation ID for context management
            model: Claude model to use
            temperature: Response creativity (0-1)
            max_tokens: Maximum response tokens
            system_prompt: System prompt for context
            
        Returns:
            Tuple of (response_content, metadata)
        """
        try:
            if not self.client:
                return self._generate_fallback_response(messages)
            
            # Add conversation context if available
            if conversation_id:
                context_messages = self.conversation_manager.get_context(conversation_id)
                messages = context_messages + messages
            
            # Select model if not specified
            if not model:
                model = self._auto_select_model(messages)
            
            # Prepare system prompt
            if not system_prompt:
                system_prompt = self._get_default_system_prompt()
            
            # Make API call with retry logic
            response = await self._call_claude_api(
                messages=messages,
                model=model.value,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            # Track token usage
            token_usage = self._extract_token_usage(response)
            self.token_tracker.track_usage(model.value, token_usage)
            
            # Store in conversation history
            if conversation_id:
                self.conversation_manager.add_message(
                    conversation_id,
                    "assistant",
                    response.content[0].text
                )
            
            metadata = {
                "model": model.value,
                "tokens": token_usage,
                "conversation_id": conversation_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            return response.content[0].text, metadata
            
        except Exception as e:
            logger.error(f"Error generating Claude response: {e}")
            return self._generate_fallback_response(messages)
    
    async def _call_claude_api(
        self,
        messages: List[Dict],
        model: str,
        system_prompt: str,
        temperature: float,
        max_tokens: int,
        retries: int = 3
    ) -> Any:
        """Call Claude API with retry logic."""
        for attempt in range(retries):
            try:
                response = self.client.messages.create(
                    model=model,
                    system=system_prompt,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                return response
                
            except anthropic.RateLimitError as e:
                if attempt < retries - 1:
                    wait_time = 2 ** attempt
                    logger.warning(f"Rate limit hit, waiting {wait_time}s...")
                    await asyncio.sleep(wait_time)
                else:
                    raise e
            except Exception as e:
                logger.error(f"Claude API error: {e}")
                if attempt == retries - 1:
                    raise e
    
    def _auto_select_model(self, messages: List[Dict]) -> ClaudeModel:
        """Automatically select model based on conversation complexity."""
        # Simple heuristic based on message length and keywords
        total_length = sum(len(m.get("content", "")) for m in messages)
        
        complex_keywords = ["analyze", "complex", "detailed", "comprehensive", "strategy"]
        has_complex = any(
            keyword in m.get("content", "").lower() 
            for m in messages 
            for keyword in complex_keywords
        )
        
        if total_length > 5000 or has_complex:
            return ClaudeModel.OPUS
        elif total_length > 1000:
            return ClaudeModel.SONNET
        else:
            return ClaudeModel.HAIKU
    
    def _get_default_system_prompt(self) -> str:
        """Get default system prompt for casting assistant."""
        return """You are an AI casting director assistant for CastMatch, specializing in the Mumbai entertainment industry, particularly OTT platforms.

Your expertise includes:
- Deep understanding of Bollywood and Indian OTT content requirements
- Knowledge of acting techniques and talent evaluation
- Familiarity with Indian languages, especially Hindi and English
- Understanding of regional cinema and diverse talent pools
- Awareness of current trends in Indian streaming content

Your communication style:
- Professional yet approachable
- Culturally sensitive to Indian entertainment industry norms
- Use industry-specific terminology when appropriate
- Provide clear, actionable recommendations
- Support decisions with reasoning

When discussing talent:
- Focus on professional capabilities and suitability for roles
- Consider cultural fit and language skills
- Respect privacy and maintain ethical standards
- Promote inclusive casting practices
- Provide unbiased, merit-based recommendations

Remember: You're helping create compelling content for Indian audiences while promoting diversity and discovering new talent."""
    
    def _extract_token_usage(self, response: Any) -> Dict[str, int]:
        """Extract token usage from Claude response."""
        if hasattr(response, 'usage'):
            return {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens + response.usage.output_tokens
            }
        return {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
    
    def _generate_fallback_response(self, messages: List[Dict]) -> Tuple[str, Dict]:
        """Generate fallback response when Claude is unavailable."""
        last_message = messages[-1] if messages else {"content": ""}
        
        response = "I'm currently unable to process your request with advanced AI. However, I can help you search for talents using our database. Please specify your requirements such as age range, gender, location, skills, or languages."
        
        metadata = {
            "model": "fallback",
            "tokens": {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return response, metadata
    
    async def analyze_script(
        self,
        script_text: str,
        extract_characters: bool = True,
        extract_requirements: bool = True
    ) -> Dict[str, Any]:
        """
        Analyze a script to extract character information and casting requirements.
        
        Args:
            script_text: The script content
            extract_characters: Extract character descriptions
            extract_requirements: Extract casting requirements
            
        Returns:
            Dictionary with extracted information
        """
        prompt = f"""Analyze this script and extract casting information:

Script:
{script_text[:10000]}  # Limit to first 10k characters

Extract the following:
1. Character profiles (name, age range, gender, personality traits, key scenes)
2. Required skills (languages, special abilities, physical requirements)
3. Character relationships and chemistry requirements
4. Shooting locations mentioned
5. Overall tone and genre

Format the response as structured JSON."""

        messages = [{"role": "user", "content": prompt}]
        
        response, metadata = await self.generate_response(
            messages,
            model=ClaudeModel.OPUS,
            temperature=0.3,
            max_tokens=3000
        )
        
        try:
            # Parse JSON response
            analysis = json.loads(response)
        except:
            # Fallback to text response
            analysis = {"raw_analysis": response}
        
        return {
            "analysis": analysis,
            "metadata": metadata
        }


class TokenTracker:
    """Track token usage for cost optimization."""
    
    def __init__(self):
        self.usage_stats = {}
        self.cost_per_token = {
            ClaudeModel.HAIKU.value: {"input": 0.00025, "output": 0.00125},
            ClaudeModel.SONNET.value: {"input": 0.003, "output": 0.015},
            ClaudeModel.OPUS.value: {"input": 0.015, "output": 0.075}
        }
    
    def track_usage(self, model: str, tokens: Dict[str, int]) -> None:
        """Track token usage for a model."""
        if model not in self.usage_stats:
            self.usage_stats[model] = {
                "input_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 0,
                "requests": 0
            }
        
        self.usage_stats[model]["input_tokens"] += tokens.get("input_tokens", 0)
        self.usage_stats[model]["output_tokens"] += tokens.get("output_tokens", 0)
        self.usage_stats[model]["total_tokens"] += tokens.get("total_tokens", 0)
        self.usage_stats[model]["requests"] += 1
    
    def get_usage_report(self) -> Dict[str, Any]:
        """Get usage report with cost estimates."""
        report = {}
        
        for model, stats in self.usage_stats.items():
            if model in self.cost_per_token:
                input_cost = (stats["input_tokens"] / 1000) * self.cost_per_token[model]["input"]
                output_cost = (stats["output_tokens"] / 1000) * self.cost_per_token[model]["output"]
                total_cost = input_cost + output_cost
                
                report[model] = {
                    **stats,
                    "estimated_cost": {
                        "input": f"${input_cost:.4f}",
                        "output": f"${output_cost:.4f}",
                        "total": f"${total_cost:.4f}"
                    }
                }
        
        return report


# Global Claude service instance
import asyncio
claude_service = ClaudeService()