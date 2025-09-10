"""NLP service for casting-specific features and intent recognition."""

import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
from loguru import logger
import spacy
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate

from app.core.config import settings
from app.services.claude_service import claude_service, ClaudeModel


class CastingIntent(Enum):
    """Types of casting-related intents."""
    SEARCH_TALENT = "search_talent"
    SCHEDULE_AUDITION = "schedule_audition"
    CREATE_SHORTLIST = "create_shortlist"
    VIEW_PROFILE = "view_profile"
    COMPARE_TALENTS = "compare_talents"
    REQUEST_SELF_TAPE = "request_self_tape"
    CHECK_AVAILABILITY = "check_availability"
    ANALYZE_SCRIPT = "analyze_script"
    GET_RECOMMENDATIONS = "get_recommendations"
    GENERAL_QUERY = "general_query"


class EntityType(Enum):
    """Types of entities in casting context."""
    ACTOR_NAME = "actor_name"
    SKILL = "skill"
    LANGUAGE = "language"
    AGE_RANGE = "age_range"
    GENDER = "gender"
    LOCATION = "location"
    DATE = "date"
    ROLE_TYPE = "role_type"
    PROJECT_NAME = "project_name"
    EXPERIENCE_LEVEL = "experience_level"


class NLPService:
    """Service for NLP processing in casting context."""
    
    def __init__(self):
        """Initialize NLP models and services."""
        # Load spaCy model for entity recognition
        try:
            self.nlp = spacy.load("en_core_web_sm")
            logger.info("Loaded spaCy model")
        except:
            logger.warning("spaCy model not found, using basic NLP")
            self.nlp = None
        
        # Initialize text splitter for long documents
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=2000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        
        # Intent patterns
        self.intent_patterns = self._initialize_intent_patterns()
        
        # Entity patterns
        self.entity_patterns = self._initialize_entity_patterns()
    
    def _initialize_intent_patterns(self) -> Dict[CastingIntent, List[str]]:
        """Initialize regex patterns for intent recognition."""
        return {
            CastingIntent.SEARCH_TALENT: [
                r"(find|search|look for|need|looking for|show me)\s+(talent|actor|actress|artist|performer)",
                r"(who can|anyone who|someone who)\s+(play|act|perform)",
                r"(need|want|require)\s+.*(for|to play|as)"
            ],
            CastingIntent.SCHEDULE_AUDITION: [
                r"(schedule|book|arrange|set up|plan)\s+(an?\s+)?(audition|casting|meeting)",
                r"(when can|available for|free for)\s+(audition|casting)",
                r"(audition|casting)\s+(time|date|slot|schedule)"
            ],
            CastingIntent.CREATE_SHORTLIST: [
                r"(create|make|build|prepare)\s+(a\s+)?(shortlist|short list|list)",
                r"(add to|put in|include in)\s+(shortlist|list)",
                r"(shortlist|select|pick)\s+(talent|actor|actress)"
            ],
            CastingIntent.VIEW_PROFILE: [
                r"(show|view|see|display|check)\s+.*(profile|portfolio|details|information)",
                r"(tell me|what about|info on|details of)\s+",
                r"(more about|know about|learn about)"
            ],
            CastingIntent.COMPARE_TALENTS: [
                r"(compare|versus|vs|difference between|choose between)",
                r"(which|who)\s+(is better|should I choose|to select)",
                r"(pros and cons|advantages|comparison)"
            ],
            CastingIntent.REQUEST_SELF_TAPE: [
                r"(request|ask for|need|want)\s+.*(self[\s-]?tape|audition tape|video)",
                r"(send|submit|provide)\s+.*(self[\s-]?tape|audition video)",
                r"(self[\s-]?tape|audition tape)\s+(request|needed)"
            ],
            CastingIntent.CHECK_AVAILABILITY: [
                r"(is|are)\s+.*(available|free|busy)",
                r"(availability|schedule|calendar)\s+(of|for)",
                r"(when|what dates)\s+.*(available|free)"
            ],
            CastingIntent.ANALYZE_SCRIPT: [
                r"(analyze|review|check|read)\s+.*(script|screenplay|scene)",
                r"(script|screenplay)\s+(analysis|breakdown|requirements)",
                r"(character|role)\s+(requirements|needs|description)"
            ],
            CastingIntent.GET_RECOMMENDATIONS: [
                r"(recommend|suggest|who should|best for)",
                r"(recommendations|suggestions)\s+(for|about)",
                r"(who would be|suitable for|perfect for)"
            ]
        }
    
    def _initialize_entity_patterns(self) -> Dict[EntityType, List[str]]:
        """Initialize patterns for entity extraction."""
        return {
            EntityType.GENDER: [
                r"\b(male|female|man|woman|boy|girl|actor|actress)\b",
                r"\b(he|she|him|her)\b"
            ],
            EntityType.AGE_RANGE: [
                r"\b(\d{1,2})[\s-]?(?:to|-)[\s-]?(\d{1,2})\s*(?:years?|yrs?)?\b",
                r"\b(\d{1,2})\s*(?:years?\s*old|yrs?\s*old)\b",
                r"\b(twenties|thirties|forties|fifties|teens|teenager)\b"
            ],
            EntityType.SKILL: [
                r"\b(singing|dancing|martial arts|comedy|drama|action|stunts)\b",
                r"\b(hindi|english|marathi|gujarati|tamil|telugu)\s+(?:speaking|fluent)\b",
                r"\b(trained in|skilled in|experienced in)\s+(\w+)\b"
            ],
            EntityType.LOCATION: [
                r"\b(mumbai|delhi|bangalore|chennai|kolkata|hyderabad|pune)\b",
                r"\b(maharashtra|karnataka|tamil nadu|delhi ncr|gujarat)\b"
            ],
            EntityType.EXPERIENCE_LEVEL: [
                r"\b(fresher|newcomer|experienced|veteran|senior|junior)\b",
                r"\b(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?experience\b"
            ],
            EntityType.ROLE_TYPE: [
                r"\b(lead|main|supporting|cameo|guest|parallel lead)\b",
                r"\b(hero|heroine|villain|comedian|character actor)\b",
                r"\b(protagonist|antagonist|romantic lead)\b"
            ]
        }
    
    async def recognize_intent(
        self,
        text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Tuple[CastingIntent, float]:
        """
        Recognize the intent from user input.
        
        Args:
            text: User input text
            context: Optional conversation context
            
        Returns:
            Tuple of (intent, confidence_score)
        """
        text_lower = text.lower()
        
        # Check each intent pattern
        intent_scores = {}
        
        for intent, patterns in self.intent_patterns.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    score += 1
            
            if score > 0:
                intent_scores[intent] = score
        
        # If no pattern matches, use Claude for intent classification
        if not intent_scores:
            intent, confidence = await self._classify_intent_with_ai(text, context)
            return intent, confidence
        
        # Return intent with highest score
        best_intent = max(intent_scores, key=intent_scores.get)
        confidence = min(intent_scores[best_intent] / 3.0, 1.0)  # Normalize confidence
        
        return best_intent, confidence
    
    async def extract_entities(
        self,
        text: str,
        entity_types: Optional[List[EntityType]] = None
    ) -> Dict[EntityType, List[Any]]:
        """
        Extract entities from text.
        
        Args:
            text: Input text
            entity_types: Specific entity types to extract
            
        Returns:
            Dictionary of extracted entities
        """
        entities = {}
        text_lower = text.lower()
        
        # Use all entity types if not specified
        if not entity_types:
            entity_types = list(EntityType)
        
        # Extract using patterns
        for entity_type in entity_types:
            if entity_type in self.entity_patterns:
                extracted = []
                
                for pattern in self.entity_patterns[entity_type]:
                    matches = re.findall(pattern, text_lower)
                    extracted.extend(matches)
                
                if extracted:
                    entities[entity_type] = list(set(extracted))  # Remove duplicates
        
        # Extract names using spaCy if available
        if self.nlp and EntityType.ACTOR_NAME in entity_types:
            doc = self.nlp(text)
            person_names = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
            if person_names:
                entities[EntityType.ACTOR_NAME] = person_names
        
        # Extract dates
        if EntityType.DATE in entity_types:
            dates = self._extract_dates(text)
            if dates:
                entities[EntityType.DATE] = dates
        
        # Post-process entities
        entities = self._post_process_entities(entities)
        
        return entities
    
    def _extract_dates(self, text: str) -> List[str]:
        """Extract date references from text."""
        dates = []
        
        # Common date patterns
        date_patterns = [
            r"\b(today|tomorrow|yesterday)\b",
            r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
            r"\b(next|this|last)\s+(week|month|monday|tuesday|wednesday|thursday|friday)\b",
            r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b",
            r"\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b"
        ]
        
        for pattern in date_patterns:
            matches = re.findall(pattern, text.lower())
            dates.extend(matches)
        
        return dates
    
    def _post_process_entities(self, entities: Dict) -> Dict:
        """Post-process extracted entities."""
        processed = {}
        
        for entity_type, values in entities.items():
            if entity_type == EntityType.AGE_RANGE:
                # Convert age strings to ranges
                age_ranges = []
                for value in values:
                    if isinstance(value, tuple) and len(value) == 2:
                        age_ranges.append((int(value[0]), int(value[1])))
                    elif isinstance(value, str) and value.isdigit():
                        age = int(value)
                        age_ranges.append((age - 2, age + 2))  # ±2 years range
                    elif isinstance(value, str):
                        # Convert words to age ranges
                        age_map = {
                            "teens": (13, 19),
                            "teenager": (13, 19),
                            "twenties": (20, 29),
                            "thirties": (30, 39),
                            "forties": (40, 49),
                            "fifties": (50, 59)
                        }
                        if value in age_map:
                            age_ranges.append(age_map[value])
                
                if age_ranges:
                    processed[entity_type] = age_ranges
            
            elif entity_type == EntityType.GENDER:
                # Normalize gender values
                gender_map = {
                    "male": "MALE",
                    "man": "MALE",
                    "boy": "MALE",
                    "actor": "MALE",
                    "he": "MALE",
                    "him": "MALE",
                    "female": "FEMALE",
                    "woman": "FEMALE",
                    "girl": "FEMALE",
                    "actress": "FEMALE",
                    "she": "FEMALE",
                    "her": "FEMALE"
                }
                
                genders = []
                for value in values:
                    if isinstance(value, str) and value in gender_map:
                        genders.append(gender_map[value])
                
                if genders:
                    processed[entity_type] = list(set(genders))
            
            else:
                processed[entity_type] = values
        
        return processed
    
    async def _classify_intent_with_ai(
        self,
        text: str,
        context: Optional[Dict] = None
    ) -> Tuple[CastingIntent, float]:
        """Use AI to classify intent when patterns don't match."""
        prompt = f"""Classify the following casting-related query into one of these intents:
        - search_talent: Looking for actors/talents
        - schedule_audition: Booking audition times
        - create_shortlist: Making a list of selected talents
        - view_profile: Viewing talent details
        - compare_talents: Comparing different actors
        - request_self_tape: Asking for audition videos
        - check_availability: Checking if talent is available
        - analyze_script: Script analysis for casting
        - get_recommendations: Asking for talent suggestions
        - general_query: General casting questions

        Query: {text}
        
        Return only the intent name and confidence (0-1) as: intent_name|confidence"""
        
        response, _ = await claude_service.generate_response(
            messages=[{"role": "user", "content": prompt}],
            model=ClaudeModel.HAIKU,
            temperature=0.1,
            max_tokens=50
        )
        
        try:
            intent_str, confidence_str = response.strip().split("|")
            intent = CastingIntent[intent_str.upper()]
            confidence = float(confidence_str)
            return intent, confidence
        except:
            return CastingIntent.GENERAL_QUERY, 0.5
    
    async def generate_casting_query(
        self,
        entities: Dict[EntityType, List[Any]],
        intent: CastingIntent
    ) -> Dict[str, Any]:
        """
        Generate structured casting query from entities and intent.
        
        Args:
            entities: Extracted entities
            intent: Recognized intent
            
        Returns:
            Structured query for database/search
        """
        query = {
            "intent": intent.value,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Map entities to query parameters
        if EntityType.GENDER in entities:
            query["gender"] = entities[EntityType.GENDER][0]
        
        if EntityType.AGE_RANGE in entities:
            age_range = entities[EntityType.AGE_RANGE][0]
            if isinstance(age_range, tuple):
                query["age_min"] = age_range[0]
                query["age_max"] = age_range[1]
        
        if EntityType.LOCATION in entities:
            locations = entities[EntityType.LOCATION]
            query["city"] = locations[0] if locations else None
        
        if EntityType.SKILL in entities:
            query["skills"] = entities[EntityType.SKILL]
        
        if EntityType.LANGUAGE in entities:
            query["languages"] = entities[EntityType.LANGUAGE]
        
        if EntityType.EXPERIENCE_LEVEL in entities:
            query["experience_level"] = entities[EntityType.EXPERIENCE_LEVEL][0]
        
        if EntityType.ROLE_TYPE in entities:
            query["role_type"] = entities[EntityType.ROLE_TYPE][0]
        
        if EntityType.ACTOR_NAME in entities:
            query["actor_names"] = entities[EntityType.ACTOR_NAME]
        
        if EntityType.DATE in entities:
            query["dates"] = entities[EntityType.DATE]
        
        return query
    
    async def extract_character_traits(
        self,
        character_description: str
    ) -> Dict[str, Any]:
        """
        Extract character traits from a description.
        
        Args:
            character_description: Text describing a character
            
        Returns:
            Extracted character traits
        """
        traits = {
            "personality": [],
            "physical": [],
            "skills": [],
            "background": [],
            "relationships": []
        }
        
        # Personality trait patterns
        personality_keywords = [
            "confident", "shy", "aggressive", "kind", "ruthless", "compassionate",
            "intelligent", "naive", "cunning", "honest", "deceptive", "charismatic",
            "introverted", "extroverted", "ambitious", "humble", "arrogant"
        ]
        
        # Physical trait patterns
        physical_keywords = [
            "tall", "short", "athletic", "slim", "muscular", "young", "old",
            "beautiful", "handsome", "rugged", "elegant", "casual"
        ]
        
        # Skill keywords
        skill_keywords = [
            "fighter", "dancer", "singer", "musician", "athlete", "academic",
            "businessman", "doctor", "lawyer", "engineer", "artist"
        ]
        
        text_lower = character_description.lower()
        
        # Extract traits
        for keyword in personality_keywords:
            if keyword in text_lower:
                traits["personality"].append(keyword)
        
        for keyword in physical_keywords:
            if keyword in text_lower:
                traits["physical"].append(keyword)
        
        for keyword in skill_keywords:
            if keyword in text_lower:
                traits["skills"].append(keyword)
        
        # Extract age if mentioned
        age_match = re.search(r"(\d{1,2})[\s-]?(?:years?[\s-]?old|yrs?)", text_lower)
        if age_match:
            traits["age"] = int(age_match.group(1))
        
        # Extract gender
        if any(word in text_lower for word in ["male", "man", "boy", "he", "his"]):
            traits["gender"] = "MALE"
        elif any(word in text_lower for word in ["female", "woman", "girl", "she", "her"]):
            traits["gender"] = "FEMALE"
        
        return traits
    
    async def match_talent_to_character(
        self,
        character_traits: Dict[str, Any],
        talent_profile: Dict[str, Any]
    ) -> float:
        """
        Calculate match score between character requirements and talent profile.
        
        Args:
            character_traits: Extracted character traits
            talent_profile: Talent profile data
            
        Returns:
            Match score (0-1)
        """
        score = 0.0
        weights = {
            "gender": 0.2,
            "age": 0.15,
            "skills": 0.25,
            "personality": 0.2,
            "physical": 0.1,
            "experience": 0.1
        }
        
        # Gender match
        if "gender" in character_traits and "gender" in talent_profile:
            if character_traits["gender"] == talent_profile["gender"]:
                score += weights["gender"]
        
        # Age match
        if "age" in character_traits and "age" in talent_profile:
            age_diff = abs(character_traits["age"] - talent_profile["age"])
            if age_diff <= 2:
                score += weights["age"]
            elif age_diff <= 5:
                score += weights["age"] * 0.5
        
        # Skills match
        if "skills" in character_traits and "skills" in talent_profile:
            char_skills = set(character_traits["skills"])
            talent_skills = set(talent_profile.get("skills", []))
            
            if char_skills and talent_skills:
                overlap = len(char_skills & talent_skills)
                skill_score = overlap / len(char_skills)
                score += weights["skills"] * skill_score
        
        # Add base score for verified and experienced talents
        if talent_profile.get("isVerified"):
            score += 0.05
        
        if talent_profile.get("experienceLevel") in ["EXPERIENCED", "VETERAN"]:
            score += weights["experience"]
        
        # Normalize score to 0-1 range
        return min(score / sum(weights.values()), 1.0)


class ChemistryPredictor:
    """Service for predicting chemistry between actors."""
    
    async def predict_chemistry(
        self,
        actor1_profile: Dict[str, Any],
        actor2_profile: Dict[str, Any],
        scene_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Predict chemistry between two actors.
        
        Args:
            actor1_profile: First actor's profile
            actor2_profile: Second actor's profile
            scene_type: Type of scene (romantic, action, comedy, etc.)
            
        Returns:
            Chemistry prediction with score and insights
        """
        # Factors affecting chemistry
        factors = {
            "age_compatibility": self._calculate_age_compatibility(
                actor1_profile.get("age"),
                actor2_profile.get("age")
            ),
            "experience_balance": self._calculate_experience_balance(
                actor1_profile.get("experienceLevel"),
                actor2_profile.get("experienceLevel")
            ),
            "language_overlap": self._calculate_language_overlap(
                actor1_profile.get("languages", []),
                actor2_profile.get("languages", [])
            ),
            "style_compatibility": self._calculate_style_compatibility(
                actor1_profile.get("actingStyle"),
                actor2_profile.get("actingStyle")
            ),
            "previous_collaboration": self._check_previous_collaboration(
                actor1_profile.get("id"),
                actor2_profile.get("id")
            )
        }
        
        # Calculate overall chemistry score
        chemistry_score = sum(factors.values()) / len(factors)
        
        # Generate insights
        insights = []
        
        if factors["age_compatibility"] > 0.8:
            insights.append("Good age compatibility for the roles")
        
        if factors["experience_balance"] > 0.7:
            insights.append("Balanced experience levels create good dynamic")
        
        if factors["language_overlap"] > 0.8:
            insights.append("Strong language compatibility")
        
        # Scene-specific adjustments
        if scene_type:
            scene_factor = self._get_scene_factor(scene_type, actor1_profile, actor2_profile)
            chemistry_score = (chemistry_score * 0.7) + (scene_factor * 0.3)
            
            if scene_factor > 0.8:
                insights.append(f"Well-suited for {scene_type} scenes")
        
        # Recommendations
        recommendations = []
        if chemistry_score > 0.8:
            recommendations.append("Highly recommended for screen test together")
        elif chemistry_score > 0.6:
            recommendations.append("Good potential, recommend chemistry reading")
        else:
            recommendations.append("May need workshops to build chemistry")
        
        return {
            "chemistry_score": round(chemistry_score * 100, 1),
            "factors": factors,
            "insights": insights,
            "recommendations": recommendations,
            "scene_compatibility": {
                "romantic": self._get_scene_factor("romantic", actor1_profile, actor2_profile),
                "comedy": self._get_scene_factor("comedy", actor1_profile, actor2_profile),
                "drama": self._get_scene_factor("drama", actor1_profile, actor2_profile),
                "action": self._get_scene_factor("action", actor1_profile, actor2_profile)
            }
        }
    
    def _calculate_age_compatibility(self, age1: Optional[int], age2: Optional[int]) -> float:
        """Calculate age compatibility score."""
        if not age1 or not age2:
            return 0.5  # Neutral if age unknown
        
        age_diff = abs(age1 - age2)
        
        if age_diff <= 5:
            return 1.0
        elif age_diff <= 10:
            return 0.8
        elif age_diff <= 15:
            return 0.6
        else:
            return 0.4
    
    def _calculate_experience_balance(self, exp1: str, exp2: str) -> float:
        """Calculate experience balance score."""
        exp_levels = {
            "FRESHER": 1,
            "INTERMEDIATE": 2,
            "EXPERIENCED": 3,
            "VETERAN": 4
        }
        
        level1 = exp_levels.get(exp1, 2)
        level2 = exp_levels.get(exp2, 2)
        
        diff = abs(level1 - level2)
        
        if diff == 0:
            return 0.9  # Same level
        elif diff == 1:
            return 1.0  # Slight difference is good
        elif diff == 2:
            return 0.7  # Moderate difference
        else:
            return 0.5  # Large difference
    
    def _calculate_language_overlap(self, langs1: List[str], langs2: List[str]) -> float:
        """Calculate language overlap score."""
        if not langs1 or not langs2:
            return 0.5
        
        common = set(langs1) & set(langs2)
        total = set(langs1) | set(langs2)
        
        if not total:
            return 0.5
        
        return len(common) / len(total)
    
    def _calculate_style_compatibility(self, style1: Optional[str], style2: Optional[str]) -> float:
        """Calculate acting style compatibility."""
        if not style1 or not style2:
            return 0.6  # Unknown styles
        
        # Similar styles work well
        if style1 == style2:
            return 0.9
        
        # Complementary styles
        complementary = {
            ("method", "natural"): 0.8,
            ("theatrical", "realistic"): 0.7,
            ("comedic", "dramatic"): 0.75
        }
        
        for pair, score in complementary.items():
            if (style1, style2) in [pair, pair[::-1]]:
                return score
        
        return 0.6  # Default compatibility
    
    def _check_previous_collaboration(self, id1: str, id2: str) -> float:
        """Check if actors have worked together before."""
        # This would query collaboration history
        # For now, return neutral score
        return 0.5
    
    def _get_scene_factor(
        self,
        scene_type: str,
        profile1: Dict[str, Any],
        profile2: Dict[str, Any]
    ) -> float:
        """Calculate compatibility for specific scene type."""
        if scene_type == "romantic":
            # Age and chemistry important
            age_factor = self._calculate_age_compatibility(
                profile1.get("age"),
                profile2.get("age")
            )
            return age_factor * 0.8 + 0.2
        
        elif scene_type == "comedy":
            # Timing and style important
            if "comedy" in str(profile1.get("skills", [])).lower() and \
               "comedy" in str(profile2.get("skills", [])).lower():
                return 0.9
            return 0.6
        
        elif scene_type == "action":
            # Physical fitness important
            if all(p.get("physicalFitness") == "athletic" for p in [profile1, profile2]):
                return 0.9
            return 0.7
        
        else:  # Drama
            # Experience and depth important
            exp_factor = self._calculate_experience_balance(
                profile1.get("experienceLevel"),
                profile2.get("experienceLevel")
            )
            return exp_factor
    

# Global NLP service instances
nlp_service = NLPService()
chemistry_predictor = ChemistryPredictor()