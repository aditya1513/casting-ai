"""Conversational search interface for natural language talent queries."""

import re
from typing import List, Dict, Any, Optional, Tuple
from loguru import logger
from datetime import datetime
import spacy
import json
from dataclasses import dataclass, asdict
from enum import Enum

from app.services.nlp_service import NLPService
from app.services.claude_service import ClaudeService


class SearchIntent(Enum):
    """Types of search intents."""
    FIND_SIMILAR = "find_similar"
    FIND_BY_CRITERIA = "find_by_criteria"
    COMPARATIVE = "comparative"
    REPLACEMENT = "replacement"
    DISCOVERY = "discovery"
    RECOMMENDATION = "recommendation"


@dataclass
class SearchCriteria:
    """Structured search criteria extracted from natural language."""
    intent: SearchIntent
    age_range: Optional[Tuple[int, int]] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    languages: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    experience_level: Optional[str] = None
    genres: Optional[List[str]] = None
    physical_attributes: Optional[Dict[str, Any]] = None
    budget_range: Optional[Tuple[float, float]] = None
    availability: Optional[str] = None
    similar_to: Optional[str] = None
    exclude: Optional[List[str]] = None
    production_house: Optional[str] = None
    must_have: Optional[List[str]] = None
    nice_to_have: Optional[List[str]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary, excluding None values."""
        result = asdict(self)
        result["intent"] = self.intent.value
        return {k: v for k, v in result.items() if v is not None}


class ConversationalSearch:
    """Natural language driven talent search system."""
    
    def __init__(self):
        """Initialize NLP components and search patterns."""
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except:
            logger.warning("Spacy model not loaded, using basic NLP")
            self.nlp = None
        
        self.nlp_service = NLPService()
        self.claude_service = ClaudeService()
        
        # Search patterns
        self.patterns = {
            "similar": r"(?:like|similar to|resembling|comparable to|in the style of)\s+(.+?)(?:\s+but|\s+with|\s*$)",
            "age": r"(?:aged?|between)\s+(\d+)(?:\s*-\s*|\s+to\s+|\s+and\s+)(\d+)|(\d+)\s*(?:year|yr)s?\s*old",
            "gender": r"\b(male|female|man|woman|actor|actress|hero|heroine)\b",
            "location": r"(?:from|based in|located in|living in)\s+([A-Za-z\s]+)",
            "language": r"(?:speaks?|fluent in|knows?)\s+([A-Za-z,\s]+)",
            "experience": r"(fresh|fresher|newcomer|experienced|veteran|senior|junior)",
            "genre": r"(?:for|in)\s+(romance|romantic|comedy|action|drama|thriller|horror|musical)",
            "height": r"(\d+(?:\.\d+)?)\s*(?:feet|ft|cm|meters?|m)\s*(?:tall)?",
            "budget": r"(?:budget|salary|fee)\s*(?:of|between|under|below|above)?\s*([\d,]+)(?:\s*(?:to|-)\s*([\d,]+))?",
            "production": r"(?:worked with|associated with|from)\s+(yrf|dharma|red chillies|t-series|eros)"
        }
        
        # Intent keywords
        self.intent_keywords = {
            SearchIntent.FIND_SIMILAR: ["like", "similar to", "resembling", "comparable"],
            SearchIntent.COMPARATIVE: ["but", "except", "however", "although"],
            SearchIntent.REPLACEMENT: ["replace", "instead of", "substitute for"],
            SearchIntent.DISCOVERY: ["find", "search", "looking for", "need"],
            SearchIntent.RECOMMENDATION: ["suggest", "recommend", "best", "top"]
        }
        
        # Mumbai film industry context
        self.industry_context = {
            "star_kids": ["ananya panday", "sara ali khan", "janhvi kapoor", "tiger shroff"],
            "production_houses": {
                "yrf": "Yash Raj Films",
                "dharma": "Dharma Productions",
                "red chillies": "Red Chillies Entertainment",
                "t-series": "T-Series",
                "eros": "Eros International"
            },
            "film_schools": ["ftii", "nsd", "whistling woods", "anupam kher academy"],
            "genres": {
                "romance": ["romantic", "love story", "rom-com"],
                "action": ["action", "stunts", "fight sequences"],
                "drama": ["drama", "emotional", "family"],
                "comedy": ["comedy", "comic", "humor", "funny"]
            }
        }
        
        # Conversation history for context
        self.conversation_history = []
    
    async def parse_natural_query(
        self,
        user_input: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Parse natural language query into structured search parameters.
        
        Args:
            user_input: Natural language search query
            context: Optional conversation context
            
        Returns:
            Parsed search parameters
        """
        try:
            # Clean and normalize input
            user_input = user_input.strip().lower()
            
            # Store in conversation history
            self.conversation_history.append({
                "query": user_input,
                "timestamp": datetime.utcnow().isoformat(),
                "context": context
            })
            
            # Extract search intent
            intent = await self.extract_search_intent(user_input)
            
            # Extract search criteria
            criteria = await self.identify_search_criteria(user_input)
            criteria.intent = intent
            
            # Handle comparative searches
            if "but" in user_input or "except" in user_input:
                criteria = await self.handle_comparative_search(user_input, criteria)
            
            # Apply context if available
            if context:
                criteria = self._apply_context(criteria, context)
            
            # Build search query
            search_query = {
                "intent": intent.value,
                "criteria": criteria.to_dict(),
                "original_query": user_input,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Parsed query: {user_input} -> {search_query}")
            return search_query
            
        except Exception as e:
            logger.error(f"Failed to parse natural query: {e}")
            return {
                "intent": SearchIntent.DISCOVERY.value,
                "criteria": {},
                "original_query": user_input,
                "error": str(e)
            }
    
    async def extract_search_intent(self, query: str) -> SearchIntent:
        """
        Extract the search intent from query.
        
        Args:
            query: User query
            
        Returns:
            Identified search intent
        """
        try:
            query_lower = query.lower()
            
            # Check for specific intent keywords
            for intent, keywords in self.intent_keywords.items():
                if any(keyword in query_lower for keyword in keywords):
                    return intent
            
            # Default to discovery
            return SearchIntent.DISCOVERY
            
        except Exception as e:
            logger.error(f"Failed to extract search intent: {e}")
            return SearchIntent.DISCOVERY
    
    async def identify_search_criteria(self, nlp_output: str) -> SearchCriteria:
        """
        Identify search criteria from NLP output.
        
        Args:
            nlp_output: Natural language query
            
        Returns:
            Extracted search criteria
        """
        try:
            criteria = SearchCriteria(intent=SearchIntent.DISCOVERY)
            
            # Extract age range
            age_match = re.search(self.patterns["age"], nlp_output)
            if age_match:
                if age_match.group(1) and age_match.group(2):
                    criteria.age_range = (int(age_match.group(1)), int(age_match.group(2)))
                elif age_match.group(3):
                    age = int(age_match.group(3))
                    criteria.age_range = (age - 2, age + 2)  # ±2 years tolerance
            
            # Extract gender
            gender_match = re.search(self.patterns["gender"], nlp_output)
            if gender_match:
                gender_term = gender_match.group(1).lower()
                if gender_term in ["male", "man", "actor", "hero"]:
                    criteria.gender = "male"
                elif gender_term in ["female", "woman", "actress", "heroine"]:
                    criteria.gender = "female"
            
            # Extract location
            location_match = re.search(self.patterns["location"], nlp_output)
            if location_match:
                criteria.location = location_match.group(1).strip().title()
            
            # Extract languages
            language_match = re.search(self.patterns["language"], nlp_output)
            if language_match:
                languages = language_match.group(1).split(",")
                criteria.languages = [lang.strip().title() for lang in languages]
            
            # Extract experience level
            exp_match = re.search(self.patterns["experience"], nlp_output)
            if exp_match:
                criteria.experience_level = exp_match.group(1)
            
            # Extract genres
            genre_matches = re.findall(self.patterns["genre"], nlp_output)
            if genre_matches:
                criteria.genres = list(set(genre_matches))
            
            # Extract similar to reference
            similar_match = re.search(self.patterns["similar"], nlp_output)
            if similar_match:
                criteria.similar_to = similar_match.group(1).strip().title()
            
            # Extract production house
            prod_match = re.search(self.patterns["production"], nlp_output, re.IGNORECASE)
            if prod_match:
                prod_key = prod_match.group(1).lower()
                criteria.production_house = self.industry_context["production_houses"].get(
                    prod_key, prod_match.group(1)
                )
            
            # Extract skills using NLP
            if self.nlp and "can" in nlp_output or "skill" in nlp_output:
                doc = self.nlp(nlp_output)
                skills = []
                for token in doc:
                    if token.pos_ == "VERB" and token.dep_ == "ROOT":
                        skills.append(token.text)
                if skills:
                    criteria.skills = skills
            
            # Extract physical attributes
            height_match = re.search(self.patterns["height"], nlp_output)
            if height_match:
                if not criteria.physical_attributes:
                    criteria.physical_attributes = {}
                criteria.physical_attributes["height"] = height_match.group(0)
            
            # Extract budget
            budget_match = re.search(self.patterns["budget"], nlp_output)
            if budget_match:
                min_budget = float(budget_match.group(1).replace(",", ""))
                max_budget = float(budget_match.group(2).replace(",", "")) if budget_match.group(2) else min_budget * 1.5
                criteria.budget_range = (min_budget, max_budget)
            
            # Extract availability
            if "available" in nlp_output:
                if "immediately" in nlp_output:
                    criteria.availability = "immediate"
                elif "next month" in nlp_output:
                    criteria.availability = "next_month"
                else:
                    criteria.availability = "available"
            
            return criteria
            
        except Exception as e:
            logger.error(f"Failed to identify search criteria: {e}")
            return SearchCriteria(intent=SearchIntent.DISCOVERY)
    
    async def handle_comparative_search(
        self,
        query: str,
        base_criteria: SearchCriteria
    ) -> SearchCriteria:
        """
        Handle comparative searches like "like X but younger".
        
        Args:
            query: Search query with comparison
            base_criteria: Base search criteria
            
        Returns:
            Modified search criteria
        """
        try:
            # Split on comparative words
            comparative_words = ["but", "except", "however", "although"]
            for word in comparative_words:
                if word in query:
                    parts = query.split(word)
                    if len(parts) == 2:
                        base_part = parts[0].strip()
                        modifier_part = parts[1].strip()
                        
                        # Extract base reference
                        similar_match = re.search(self.patterns["similar"], base_part)
                        if similar_match:
                            base_criteria.similar_to = similar_match.group(1).strip().title()
                        
                        # Apply modifiers
                        if "younger" in modifier_part:
                            if base_criteria.age_range:
                                base_criteria.age_range = (
                                    max(18, base_criteria.age_range[0] - 5),
                                    base_criteria.age_range[1] - 5
                                )
                        elif "older" in modifier_part:
                            if base_criteria.age_range:
                                base_criteria.age_range = (
                                    base_criteria.age_range[0] + 5,
                                    base_criteria.age_range[1] + 5
                                )
                        elif "taller" in modifier_part:
                            if not base_criteria.physical_attributes:
                                base_criteria.physical_attributes = {}
                            base_criteria.physical_attributes["height_preference"] = "taller"
                        elif "shorter" in modifier_part:
                            if not base_criteria.physical_attributes:
                                base_criteria.physical_attributes = {}
                            base_criteria.physical_attributes["height_preference"] = "shorter"
            
            return base_criteria
            
        except Exception as e:
            logger.error(f"Failed to handle comparative search: {e}")
            return base_criteria
    
    async def refine_search_iteratively(
        self,
        conversation: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Refine search based on conversation history.
        
        Args:
            conversation: List of conversation turns
            
        Returns:
            Refined search parameters
        """
        try:
            # Combine all criteria from conversation
            combined_criteria = SearchCriteria(intent=SearchIntent.DISCOVERY)
            
            for turn in conversation:
                if "criteria" in turn:
                    criteria_dict = turn["criteria"]
                    
                    # Merge criteria
                    for key, value in criteria_dict.items():
                        if hasattr(combined_criteria, key) and value is not None:
                            current_value = getattr(combined_criteria, key)
                            
                            # Handle list fields
                            if isinstance(value, list) and isinstance(current_value, list):
                                setattr(combined_criteria, key, list(set(current_value + value)))
                            # Handle dict fields
                            elif isinstance(value, dict) and isinstance(current_value, dict):
                                current_value.update(value)
                                setattr(combined_criteria, key, current_value)
                            # Override other fields
                            else:
                                setattr(combined_criteria, key, value)
            
            # Apply refinements based on user feedback
            if conversation and "feedback" in conversation[-1]:
                feedback = conversation[-1]["feedback"]
                combined_criteria = await self._apply_feedback(combined_criteria, feedback)
            
            return {
                "refined_criteria": combined_criteria.to_dict(),
                "conversation_turns": len(conversation),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to refine search iteratively: {e}")
            return {}
    
    async def explain_search_results(
        self,
        matches: List[Dict[str, Any]],
        criteria: SearchCriteria
    ) -> str:
        """
        Generate natural language explanation of search results.
        
        Args:
            matches: Search results
            criteria: Search criteria used
            
        Returns:
            Human-readable explanation
        """
        try:
            if not matches:
                return "No talents found matching your criteria. Try broadening your search parameters."
            
            explanation_parts = []
            
            # Explain search criteria
            criteria_explanation = "I searched for talents"
            if criteria.similar_to:
                criteria_explanation += f" similar to {criteria.similar_to}"
            if criteria.age_range:
                criteria_explanation += f" aged {criteria.age_range[0]}-{criteria.age_range[1]}"
            if criteria.gender:
                criteria_explanation += f", {criteria.gender}"
            if criteria.languages:
                criteria_explanation += f", speaking {', '.join(criteria.languages)}"
            if criteria.genres:
                criteria_explanation += f", experienced in {', '.join(criteria.genres)}"
            
            explanation_parts.append(criteria_explanation + ".")
            
            # Explain results
            explanation_parts.append(f"Found {len(matches)} matching talents.")
            
            # Highlight top matches
            if matches:
                top_match = matches[0]
                explanation_parts.append(
                    f"The best match is {top_match.get('name', 'Unknown')} "
                    f"with a {top_match.get('score', 0):.1%} match score."
                )
                
                # Explain why it's a good match
                if "match_explanation" in top_match:
                    explanation_parts.append(top_match["match_explanation"])
            
            # Add recommendations
            if len(matches) < 5:
                explanation_parts.append(
                    "To find more matches, consider relaxing some criteria "
                    "like age range or specific skills."
                )
            
            return " ".join(explanation_parts)
            
        except Exception as e:
            logger.error(f"Failed to explain search results: {e}")
            return "Search completed successfully."
    
    async def generate_search_suggestions(
        self,
        partial_query: str
    ) -> List[str]:
        """
        Generate search query suggestions.
        
        Args:
            partial_query: Partial search query
            
        Returns:
            List of suggested completions
        """
        try:
            suggestions = []
            
            # Common search templates
            templates = [
                "Find actors like {name}",
                "Young {gender} for romantic lead",
                "Theater-trained actors who can sing",
                "{gender} aged {age} for {genre}",
                "Actors from {location} who speak {language}",
                "Fresh faces for {genre} film",
                "Experienced actors worked with {production}"
            ]
            
            # Generate suggestions based on partial input
            partial_lower = partial_query.lower()
            
            if "find" in partial_lower or "search" in partial_lower:
                suggestions.extend([
                    f"{partial_query} actors like Shah Rukh Khan",
                    f"{partial_query} young female lead",
                    f"{partial_query} theater actors"
                ])
            elif "actor" in partial_lower or "actress" in partial_lower:
                suggestions.extend([
                    f"{partial_query} for romantic comedy",
                    f"{partial_query} aged 25-30",
                    f"{partial_query} who can dance"
                ])
            elif any(genre in partial_lower for genre in ["romantic", "action", "drama", "comedy"]):
                suggestions.extend([
                    f"{partial_query} lead role",
                    f"{partial_query} supporting role",
                    f"{partial_query} film in Mumbai"
                ])
            
            # Add industry-specific suggestions
            if not suggestions:
                suggestions = [
                    "Find fresh faces from FTII",
                    "Actors similar to Alia Bhatt",
                    "Male lead for YRF production",
                    "Theater actors who can sing and dance",
                    "Young actors for web series"
                ]
            
            return suggestions[:5]  # Return top 5 suggestions
            
        except Exception as e:
            logger.error(f"Failed to generate search suggestions: {e}")
            return []
    
    # Helper methods
    
    def _apply_context(
        self,
        criteria: SearchCriteria,
        context: Dict[str, Any]
    ) -> SearchCriteria:
        """Apply conversation context to search criteria."""
        try:
            # Apply user preferences
            if "preferences" in context:
                prefs = context["preferences"]
                if "preferred_genres" in prefs and not criteria.genres:
                    criteria.genres = prefs["preferred_genres"]
                if "preferred_location" in prefs and not criteria.location:
                    criteria.location = prefs["preferred_location"]
            
            # Apply project requirements
            if "project" in context:
                project = context["project"]
                if "budget" in project and not criteria.budget_range:
                    budget = project["budget"]
                    criteria.budget_range = (budget * 0.1, budget * 0.3)  # Typical talent budget range
                if "language" in project and not criteria.languages:
                    criteria.languages = [project["language"]]
            
            return criteria
            
        except Exception as e:
            logger.error(f"Failed to apply context: {e}")
            return criteria
    
    async def _apply_feedback(
        self,
        criteria: SearchCriteria,
        feedback: Dict[str, Any]
    ) -> SearchCriteria:
        """Apply user feedback to refine criteria."""
        try:
            # Handle positive feedback
            if feedback.get("liked"):
                for liked_feature in feedback["liked"]:
                    # Emphasize liked features
                    if "age" in liked_feature and criteria.age_range:
                        # Narrow age range
                        age_range = criteria.age_range
                        criteria.age_range = (age_range[0] + 1, age_range[1] - 1)
            
            # Handle negative feedback
            if feedback.get("disliked"):
                for disliked_feature in feedback["disliked"]:
                    # Adjust or remove disliked features
                    if "location" in disliked_feature:
                        criteria.exclude = criteria.exclude or []
                        criteria.exclude.append(criteria.location)
                        criteria.location = None
            
            return criteria
            
        except Exception as e:
            logger.error(f"Failed to apply feedback: {e}")
            return criteria