"""Intelligent prompt building system for Claude with casting domain expertise."""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from loguru import logger
import json


class CastingPromptBuilder:
    """Build optimized prompts for Claude with casting domain context."""
    
    def __init__(self):
        self.domain_contexts = self._load_domain_contexts()
        self.role_templates = self._load_role_templates()
        self.industry_knowledge = self._load_industry_knowledge()
    
    def _load_domain_contexts(self) -> Dict[str, str]:
        """Load domain-specific context prompts."""
        return {
            "mumbai_ott": """You have deep expertise in Mumbai's OTT platform ecosystem including:
- Netflix India, Amazon Prime Video India, Disney+ Hotstar, Zee5, SonyLIV, MX Player
- Understanding of regional content preferences (Hindi, Marathi, Tamil, Telugu, etc.)
- Knowledge of production houses like Excel Entertainment, Dharma, Red Chillies, Clean Slate
- Awareness of current trends in Indian streaming content
- Understanding of Indian audience demographics and viewing patterns""",
            
            "bollywood": """You understand Bollywood's unique requirements:
- Traditional film production workflows and hierarchies
- Star system and established talent agencies
- Music, dance, and action sequence requirements
- Multi-location shooting schedules
- Festival release strategies and marketing approaches
- Union regulations and industry standards""",
            
            "regional_cinema": """You're familiar with regional Indian cinema:
- Language-specific markets (Tamil, Telugu, Bengali, Malayalam, Kannada, Punjabi)
- Regional production houses and their specialties
- Cross-industry talent movement and collaborations
- Dubbing and subtitle requirements
- Regional star systems and audience preferences""",
            
            "advertising": """You understand advertising and commercial casting:
- Quick turnaround requirements
- Brand representation considerations
- Model vs. actor requirements
- Usage rights and exclusivity clauses
- Rate cards and buyout structures""",
            
            "theater": """You appreciate theater and stage performance:
- Live performance skills vs. camera acting
- Voice projection and stage presence
- Classical training backgrounds (NSD, FTII, etc.)
- Adaptation from stage to screen
- Workshop and rehearsal processes""",
            
            "talent_discovery": """You focus on discovering new talent:
- Identifying raw potential and trainability
- Assessing camera presence and screen tests
- Understanding diverse backgrounds and experiences
- Recognizing unique qualities and USPs
- Development and grooming recommendations"""
        }
    
    def _load_role_templates(self) -> Dict[str, Dict[str, Any]]:
        """Load common role archetypes and their requirements."""
        return {
            "protagonist": {
                "traits": ["charismatic", "relatable", "strong screen presence"],
                "skills": ["emotional range", "dialogue delivery", "physical fitness"],
                "considerations": ["lead experience", "box office appeal", "social media following"]
            },
            "antagonist": {
                "traits": ["intense", "commanding", "memorable"],
                "skills": ["voice modulation", "physical presence", "emotional depth"],
                "considerations": ["ability to evoke fear/respect", "chemistry with protagonist"]
            },
            "comic_relief": {
                "traits": ["timing", "expressive", "likeable"],
                "skills": ["comedy timing", "improvisation", "physical comedy"],
                "considerations": ["ensemble work", "scene stealing without overshadowing"]
            },
            "romantic_lead": {
                "traits": ["attractive", "charming", "vulnerable"],
                "skills": ["chemistry building", "intimate scenes", "emotional authenticity"],
                "considerations": ["pairing compatibility", "age appropriateness", "audience appeal"]
            },
            "character_actor": {
                "traits": ["versatile", "transformative", "authentic"],
                "skills": ["dialect work", "physical transformation", "method acting"],
                "considerations": ["role diversity", "preparation time", "makeup requirements"]
            },
            "child_actor": {
                "traits": ["natural", "comfortable on set", "disciplined"],
                "skills": ["memorization", "following direction", "emotional availability"],
                "considerations": ["working hours", "guardian availability", "education schedule"]
            }
        }
    
    def _load_industry_knowledge(self) -> Dict[str, List[str]]:
        """Load industry-specific knowledge and terminology."""
        return {
            "acting_techniques": [
                "Method Acting", "Stanislavski System", "Meisner Technique",
                "Adler Technique", "Classical Training", "Improvisation"
            ],
            "production_terms": [
                "Call sheet", "Sides", "Cold reading", "Chemistry test",
                "Screen test", "Callback", "First look", "Final cut"
            ],
            "contract_terms": [
                "Pay or play", "Options", "Exclusivity", "Territory rights",
                "Backend participation", "Credit placement", "Publicity obligations"
            ],
            "union_guidelines": [
                "CINTAA", "FWICE", "Shift hours", "Overtime rates",
                "Child actor regulations", "Safety protocols"
            ],
            "platforms": [
                "Netflix", "Amazon Prime", "Disney+ Hotstar", "Zee5",
                "SonyLIV", "MX Player", "Voot", "Alt Balaji", "Jio Cinema"
            ]
        }
    
    def build_system_prompt(
        self,
        context_type: str = "general",
        specific_requirements: Optional[Dict[str, Any]] = None,
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Build an optimized system prompt for Claude.
        
        Args:
            context_type: Type of casting context (mumbai_ott, bollywood, etc.)
            specific_requirements: Specific requirements for this conversation
            user_preferences: User's known preferences and history
            
        Returns:
            Optimized system prompt
        """
        # Start with base prompt
        prompt = """You are an expert AI casting director for CastMatch, specializing in the Indian entertainment industry.

Your core competencies:
1. Talent evaluation and matching
2. Understanding role requirements and character nuances
3. Industry knowledge and best practices
4. Ethical and inclusive casting approaches
5. Budget and scheduling considerations

"""
        
        # Add domain context
        if context_type in self.domain_contexts:
            prompt += f"Domain Expertise:\n{self.domain_contexts[context_type]}\n\n"
        
        # Add specific requirements
        if specific_requirements:
            prompt += "Specific Focus Areas:\n"
            if "genre" in specific_requirements:
                prompt += f"- Genre: {specific_requirements['genre']}\n"
            if "budget_range" in specific_requirements:
                prompt += f"- Budget considerations: {specific_requirements['budget_range']}\n"
            if "timeline" in specific_requirements:
                prompt += f"- Timeline: {specific_requirements['timeline']}\n"
            if "languages" in specific_requirements:
                prompt += f"- Language requirements: {', '.join(specific_requirements['languages'])}\n"
            prompt += "\n"
        
        # Add user preferences
        if user_preferences:
            prompt += "User Preferences:\n"
            if "preferred_style" in user_preferences:
                prompt += f"- Communication style: {user_preferences['preferred_style']}\n"
            if "detail_level" in user_preferences:
                prompt += f"- Detail level: {user_preferences['detail_level']}\n"
            if "focus_areas" in user_preferences:
                prompt += f"- Focus on: {', '.join(user_preferences['focus_areas'])}\n"
            prompt += "\n"
        
        # Add behavioral guidelines
        prompt += """Communication Guidelines:
- Be professional yet approachable
- Provide specific, actionable recommendations
- Support suggestions with clear reasoning
- Consider practical constraints (budget, availability, location)
- Promote diversity and inclusive casting
- Respect privacy and confidentiality
- Use industry terminology appropriately
- Offer alternatives when first choices aren't available

Response Structure:
- Start with understanding confirmation
- Provide main recommendations
- Include supporting details
- Suggest next steps when appropriate
- Offer to clarify or explore alternatives"""
        
        return prompt
    
    def build_role_analysis_prompt(
        self,
        script_text: str,
        focus_character: Optional[str] = None
    ) -> str:
        """Build prompt for script/role analysis."""
        prompt = f"""Analyze this script for casting requirements:

Script:
{script_text[:8000]}  # Limit for token optimization

Please extract:
1. Character Profiles:
   - Name, age range, gender
   - Physical description
   - Personality traits
   - Character arc
   - Key relationships

2. Performance Requirements:
   - Acting skills needed
   - Special abilities (dance, martial arts, etc.)
   - Language requirements
   - Accent/dialect needs

3. Production Considerations:
   - Shooting locations
   - Schedule demands
   - Intimate scenes
   - Action sequences
   - Ensemble dynamics

4. Casting Priorities:
   - Lead vs. supporting roles
   - Chemistry requirements
   - Diversity considerations
   - Budget implications

"""
        
        if focus_character:
            prompt += f"\nPay special attention to the character: {focus_character}\n"
        
        prompt += """
Format your response as structured JSON with clear categories.
Include specific talent recommendations if applicable."""
        
        return prompt
    
    def build_talent_matching_prompt(
        self,
        role_requirements: Dict[str, Any],
        available_talents: List[Dict[str, Any]],
        matching_criteria: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build prompt for talent-role matching."""
        prompt = f"""Match talents to the following role:

Role Requirements:
{json.dumps(role_requirements, indent=2)}

Available Talents:
"""
        
        # Add talent summaries
        for i, talent in enumerate(available_talents[:20], 1):  # Limit to 20 for token optimization
            prompt += f"\n{i}. {talent.get('name', 'Unknown')} ({talent.get('age', 'N/A')} years, {talent.get('location', 'N/A')})"
            prompt += f"\n   Skills: {', '.join(talent.get('skills', []))}"
            prompt += f"\n   Experience: {talent.get('experience_summary', 'N/A')}"
            prompt += f"\n   Languages: {', '.join(talent.get('languages', []))}\n"
        
        if matching_criteria:
            prompt += f"\nMatching Criteria Priority:\n{json.dumps(matching_criteria, indent=2)}\n"
        
        prompt += """
Please provide:
1. Top 5 talent recommendations ranked by suitability
2. Match score (0-100) for each talent
3. Specific strengths for the role
4. Any concerns or considerations
5. Suggested audition pieces or tests

Format as a clear, structured response with reasoning for each recommendation."""
        
        return prompt
    
    def build_conversation_prompt(
        self,
        message: str,
        conversation_history: List[Dict[str, str]],
        intent: str,
        entities: Dict[str, Any]
    ) -> str:
        """Build prompt for conversation with context."""
        prompt = "Previous conversation context:\n"
        
        # Add relevant history (last 5 messages)
        for msg in conversation_history[-5:]:
            prompt += f"{msg['role']}: {msg['content']}\n"
        
        prompt += f"\nUser's current message: {message}\n"
        prompt += f"Detected intent: {intent}\n"
        
        if entities:
            prompt += f"Extracted information: {json.dumps(entities, indent=2)}\n"
        
        prompt += """
Please provide a helpful response that:
1. Addresses the user's specific query
2. Uses context from the conversation history
3. Provides actionable information
4. Offers relevant follow-up options
5. Maintains conversation continuity

Keep the response concise but comprehensive."""
        
        return prompt
    
    def optimize_for_model(
        self,
        prompt: str,
        model: str = "sonnet",
        max_tokens: int = 100000
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Optimize prompt for specific Claude model.
        
        Args:
            prompt: Original prompt
            model: Target model (haiku, sonnet, opus)
            max_tokens: Maximum token limit
            
        Returns:
            Optimized prompt and metadata
        """
        import tiktoken
        
        # Rough token estimation (Claude doesn't provide exact tokenizer)
        # Using OpenAI's tokenizer as approximation
        try:
            encoding = tiktoken.encoding_for_model("gpt-4")
            token_count = len(encoding.encode(prompt))
        except:
            # Fallback to character-based estimation
            token_count = len(prompt) // 4
        
        optimization_metadata = {
            "original_length": len(prompt),
            "estimated_tokens": token_count,
            "model": model,
            "optimizations_applied": []
        }
        
        # Model-specific optimizations
        if model == "haiku" and token_count > 32000:
            # Haiku: Aggressive optimization for speed
            prompt = self._compress_prompt(prompt, target_ratio=0.5)
            optimization_metadata["optimizations_applied"].append("aggressive_compression")
            
        elif model == "sonnet" and token_count > 75000:
            # Sonnet: Moderate optimization
            prompt = self._compress_prompt(prompt, target_ratio=0.7)
            optimization_metadata["optimizations_applied"].append("moderate_compression")
            
        elif model == "opus" and token_count > 150000:
            # Opus: Minimal optimization, preserve detail
            prompt = self._compress_prompt(prompt, target_ratio=0.85)
            optimization_metadata["optimizations_applied"].append("minimal_compression")
        
        # Add model-specific instructions
        if model == "haiku":
            prompt += "\n\nProvide a concise, focused response."
        elif model == "opus":
            prompt += "\n\nProvide a comprehensive, detailed analysis with nuanced insights."
        
        return prompt, optimization_metadata
    
    def _compress_prompt(self, prompt: str, target_ratio: float = 0.7) -> str:
        """Compress prompt while preserving key information."""
        lines = prompt.split('\n')
        
        # Priority order for preservation
        priority_keywords = [
            "must", "required", "essential", "critical",
            "important", "key", "focus", "priority"
        ]
        
        essential_lines = []
        optional_lines = []
        
        for line in lines:
            line_lower = line.lower()
            if any(keyword in line_lower for keyword in priority_keywords):
                essential_lines.append(line)
            else:
                optional_lines.append(line)
        
        # Always keep essential lines
        result = essential_lines
        
        # Add optional lines until we reach target ratio
        target_length = int(len(prompt) * target_ratio)
        current_length = sum(len(line) for line in essential_lines)
        
        for line in optional_lines:
            if current_length + len(line) < target_length:
                result.append(line)
                current_length += len(line)
            else:
                break
        
        return '\n'.join(result)


# Global instance
from typing import Tuple
prompt_builder = CastingPromptBuilder()