"""Advanced conversation intelligence with intent recognition and entity extraction."""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from loguru import logger
import re
import json
from enum import Enum
from dataclasses import dataclass
# Temporarily disabled for Python 3.13 compatibility
# import spacy
# from transformers import pipeline
# from sentence_transformers import SentenceTransformer

from app.core.config import settings


class Intent(Enum):
    """Conversation intents for casting domain."""
    SEARCH_TALENT = "search_talent"
    VIEW_PROFILE = "view_profile"
    SCHEDULE_AUDITION = "schedule_audition"
    ANALYZE_SCRIPT = "analyze_script"
    CHECK_AVAILABILITY = "check_availability"
    DISCUSS_BUDGET = "discuss_budget"
    REQUEST_RECOMMENDATION = "request_recommendation"
    COMPARE_TALENTS = "compare_talents"
    CONTRACT_NEGOTIATION = "contract_negotiation"
    GENERAL_INQUIRY = "general_inquiry"
    FEEDBACK_SUBMISSION = "feedback_submission"
    TECHNICAL_SUPPORT = "technical_support"


@dataclass
class ExtractedEntity:
    """Extracted entity from conversation."""
    entity_type: str
    value: Any
    confidence: float
    context: Optional[str] = None


@dataclass
class ConversationContext:
    """Context for ongoing conversation."""
    intent: Intent
    entities: List[ExtractedEntity]
    sentiment: str
    urgency: str
    domain: str
    confidence: float
    metadata: Dict[str, Any]


class ConversationIntelligence:
    """Advanced NLP-based conversation understanding."""
    
    def __init__(self):
        """Initialize NLP models and patterns."""
        self.nlp_model = None
        self.sentiment_analyzer = None
        self.sentence_encoder = None
        self.intent_patterns = self._load_intent_patterns()
        self.entity_patterns = self._load_entity_patterns()
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize NLP models with fallback handling."""
        # Temporarily disabled for Python 3.13 compatibility
        # Models will be loaded once Python version is downgraded
        self.nlp_model = None
        self.sentiment_analyzer = None
        self.sentence_encoder = None
        logger.warning("NLP models disabled due to Python 3.13 compatibility issues")
    
    def _load_intent_patterns(self) -> Dict[Intent, Dict[str, Any]]:
        """Load intent recognition patterns."""
        return {
            Intent.SEARCH_TALENT: {
                "keywords": ["find", "search", "looking for", "need", "require", "seeking", "want"],
                "entities": ["actor", "actress", "talent", "artist", "performer", "model"],
                "patterns": [
                    r"(?:find|search|looking for|need)\s+(?:an?\s+)?(?:actor|actress|talent)",
                    r"(?:need|require|want)\s+someone\s+(?:who|that|for)",
                    r"casting\s+for\s+(?:a|an|the)\s+\w+"
                ],
                "examples": [
                    "I need an actor for my web series",
                    "Looking for female talent aged 25-30",
                    "Find me someone who can speak Hindi and English"
                ]
            },
            Intent.ANALYZE_SCRIPT: {
                "keywords": ["script", "analyze", "breakdown", "extract", "identify"],
                "entities": ["character", "role", "scene", "dialogue"],
                "patterns": [
                    r"analyze\s+(?:the\s+)?script",
                    r"breakdown\s+(?:of\s+)?characters",
                    r"extract\s+(?:character|role)\s+requirements"
                ],
                "examples": [
                    "Analyze this script for casting",
                    "Break down the character requirements",
                    "What roles need to be cast?"
                ]
            },
            Intent.SCHEDULE_AUDITION: {
                "keywords": ["schedule", "book", "arrange", "audition", "meeting", "appointment"],
                "entities": ["date", "time", "location", "talent_name"],
                "patterns": [
                    r"schedule\s+(?:an?\s+)?audition",
                    r"book\s+(?:a\s+)?(?:meeting|appointment)",
                    r"arrange\s+(?:for\s+)?(?:audition|screen test)"
                ],
                "examples": [
                    "Schedule an audition for tomorrow",
                    "Book Priya for a screen test",
                    "Arrange auditions for next week"
                ]
            },
            Intent.CHECK_AVAILABILITY: {
                "keywords": ["available", "free", "availability", "when", "dates"],
                "entities": ["talent_name", "date_range", "project_duration"],
                "patterns": [
                    r"(?:is|are)\s+\w+\s+available",
                    r"check\s+availability",
                    r"when\s+(?:is|are)\s+\w+\s+free"
                ],
                "examples": [
                    "Is Raj available next month?",
                    "Check Priya's availability for June",
                    "When is the actor free?"
                ]
            },
            Intent.DISCUSS_BUDGET: {
                "keywords": ["budget", "cost", "rate", "fee", "payment", "compensation"],
                "entities": ["amount", "currency", "payment_terms"],
                "patterns": [
                    r"(?:what|how much)\s+(?:is|are)\s+(?:the\s+)?(?:rate|fee|cost)",
                    r"budget\s+(?:for|of)\s+",
                    r"compensation\s+(?:package|structure)"
                ],
                "examples": [
                    "What's the budget for this role?",
                    "Discuss payment terms",
                    "Actor's fee structure"
                ]
            }
        }
    
    def _load_entity_patterns(self) -> Dict[str, List[str]]:
        """Load entity extraction patterns."""
        return {
            "age": [
                r"(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\s*(?:years?)?",
                r"(?:age|aged)\s*(\d{1,2})",
                r"(?:early|mid|late)\s*(?:twenties|thirties|forties|fifties)"
            ],
            "gender": [
                r"\b(male|female|man|woman|boy|girl|non-binary)\b",
                r"\b(actor|actress)\b",
                r"\b(he|she|they)\b"
            ],
            "location": [
                r"\b(Mumbai|Delhi|Bangalore|Chennai|Kolkata|Hyderabad|Pune|Gurgaon)\b",
                r"\b(Maharashtra|Karnataka|Tamil Nadu|West Bengal|Telangana)\b"
            ],
            "language": [
                r"\b(Hindi|English|Marathi|Tamil|Telugu|Bengali|Gujarati|Punjabi|Malayalam|Kannada)\b",
                r"(?:speak|fluent in|knows)\s+(\w+)"
            ],
            "skills": [
                r"\b(dance|dancing|sing|singing|martial arts|horse riding|swimming|driving)\b",
                r"(?:trained in|experience in|skilled at)\s+(\w+)"
            ],
            "experience": [
                r"(\d+)\s*(?:\+)?\s*years?\s*(?:of\s*)?experience",
                r"(fresher|newcomer|experienced|veteran|seasoned)"
            ],
            "project_type": [
                r"\b(film|movie|web series|OTT|advertisement|ad film|commercial|theater|play)\b",
                r"(feature film|short film|documentary|music video)"
            ],
            "date": [
                r"(today|tomorrow|next week|next month)",
                r"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)",
                r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})",
                r"(January|February|March|April|May|June|July|August|September|October|November|December)"
            ]
        }
    
    async def analyze_message(
        self,
        message: str,
        conversation_history: Optional[List[Dict]] = None
    ) -> ConversationContext:
        """
        Analyze a message to extract intent and entities.
        
        Args:
            message: User message to analyze
            conversation_history: Previous conversation messages
            
        Returns:
            ConversationContext with extracted information
        """
        # Preprocess message
        message_lower = message.lower()
        
        # Extract intent
        intent, intent_confidence = await self._extract_intent(message_lower)
        
        # Extract entities
        entities = await self._extract_entities(message)
        
        # Analyze sentiment
        sentiment = await self._analyze_sentiment(message)
        
        # Determine urgency
        urgency = self._determine_urgency(message_lower)
        
        # Identify domain
        domain = self._identify_domain(message_lower)
        
        # Build context
        context = ConversationContext(
            intent=intent,
            entities=entities,
            sentiment=sentiment,
            urgency=urgency,
            domain=domain,
            confidence=intent_confidence,
            metadata={
                "message_length": len(message),
                "has_history": bool(conversation_history),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        # Enhance with conversation history if available
        if conversation_history:
            context = await self._enhance_with_history(context, conversation_history)
        
        return context
    
    async def _extract_intent(self, message: str) -> Tuple[Intent, float]:
        """Extract primary intent from message."""
        best_intent = Intent.GENERAL_INQUIRY
        best_score = 0.0
        
        # Keyword-based matching
        for intent, config in self.intent_patterns.items():
            score = 0.0
            
            # Check keywords
            keyword_matches = sum(1 for kw in config["keywords"] if kw in message)
            if keyword_matches > 0:
                score += keyword_matches / len(config["keywords"]) * 0.4
            
            # Check entities
            entity_matches = sum(1 for ent in config["entities"] if ent in message)
            if entity_matches > 0:
                score += entity_matches / len(config["entities"]) * 0.3
            
            # Check regex patterns
            pattern_matches = sum(1 for pattern in config["patterns"] 
                                if re.search(pattern, message, re.IGNORECASE))
            if pattern_matches > 0:
                score += pattern_matches / len(config["patterns"]) * 0.3
            
            if score > best_score:
                best_score = score
                best_intent = intent
        
        # Use semantic similarity if encoder available
        if self.sentence_encoder and best_score < 0.5:
            try:
                intent_embeddings = {}
                for intent, config in self.intent_patterns.items():
                    if "examples" in config:
                        examples = config["examples"]
                        embeddings = self.sentence_encoder.encode(examples)
                        intent_embeddings[intent] = embeddings.mean(axis=0)
                
                message_embedding = self.sentence_encoder.encode([message])[0]
                
                for intent, intent_embedding in intent_embeddings.items():
                    similarity = np.dot(message_embedding, intent_embedding) / (
                        np.linalg.norm(message_embedding) * np.linalg.norm(intent_embedding)
                    )
                    if similarity > best_score:
                        best_score = similarity
                        best_intent = intent
            except Exception as e:
                logger.error(f"Error in semantic similarity: {e}")
        
        # Ensure minimum confidence
        if best_score < 0.2:
            best_intent = Intent.GENERAL_INQUIRY
            best_score = 0.5
        
        return best_intent, min(best_score, 1.0)
    
    async def _extract_entities(self, message: str) -> List[ExtractedEntity]:
        """Extract entities from message."""
        entities = []
        
        # Pattern-based extraction
        for entity_type, patterns in self.entity_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, message, re.IGNORECASE)
                for match in matches:
                    value = match.group(0)
                    if match.groups():
                        value = match.groups()[0] if len(match.groups()) == 1 else match.groups()
                    
                    entities.append(ExtractedEntity(
                        entity_type=entity_type,
                        value=value,
                        confidence=0.8,
                        context=message[max(0, match.start()-20):min(len(message), match.end()+20)]
                    ))
        
        # NLP model-based extraction if available
        if self.nlp_model:
            try:
                doc = self.nlp_model(message)
                
                # Named entities
                for ent in doc.ents:
                    entity_type = self._map_spacy_entity(ent.label_)
                    if entity_type:
                        entities.append(ExtractedEntity(
                            entity_type=entity_type,
                            value=ent.text,
                            confidence=0.9,
                            context=None
                        ))
                
                # Additional extraction based on POS tags
                for token in doc:
                    if token.pos_ == "PROPN" and token.text not in [e.value for e in entities]:
                        # Likely a name
                        entities.append(ExtractedEntity(
                            entity_type="name",
                            value=token.text,
                            confidence=0.6,
                            context=None
                        ))
            except Exception as e:
                logger.error(f"Error in NLP entity extraction: {e}")
        
        # Deduplicate entities
        unique_entities = {}
        for entity in entities:
            key = f"{entity.entity_type}:{entity.value}"
            if key not in unique_entities or entity.confidence > unique_entities[key].confidence:
                unique_entities[key] = entity
        
        return list(unique_entities.values())
    
    def _map_spacy_entity(self, label: str) -> Optional[str]:
        """Map spaCy entity labels to our entity types."""
        mapping = {
            "PERSON": "talent_name",
            "DATE": "date",
            "TIME": "time",
            "GPE": "location",
            "LOC": "location",
            "MONEY": "amount",
            "CARDINAL": "number",
            "LANGUAGE": "language",
            "ORG": "organization"
        }
        return mapping.get(label)
    
    async def _analyze_sentiment(self, message: str) -> str:
        """Analyze sentiment of the message."""
        if self.sentiment_analyzer:
            try:
                result = self.sentiment_analyzer(message[:512])[0]  # Limit length
                sentiment = result["label"].lower()
                confidence = result["score"]
                
                if confidence < 0.6:
                    return "neutral"
                return sentiment
            except Exception as e:
                logger.error(f"Error in sentiment analysis: {e}")
        
        # Fallback to keyword-based sentiment
        positive_words = ["great", "excellent", "perfect", "good", "wonderful", "amazing", "love"]
        negative_words = ["bad", "terrible", "awful", "hate", "poor", "disappointing", "problem"]
        
        positive_count = sum(1 for word in positive_words if word in message.lower())
        negative_count = sum(1 for word in negative_words if word in message.lower())
        
        if positive_count > negative_count:
            return "positive"
        elif negative_count > positive_count:
            return "negative"
        else:
            return "neutral"
    
    def _determine_urgency(self, message: str) -> str:
        """Determine urgency level of the request."""
        urgent_keywords = ["urgent", "asap", "immediately", "today", "now", "emergency", "critical"]
        moderate_keywords = ["soon", "this week", "tomorrow", "quickly"]
        
        if any(keyword in message for keyword in urgent_keywords):
            return "high"
        elif any(keyword in message for keyword in moderate_keywords):
            return "medium"
        else:
            return "normal"
    
    def _identify_domain(self, message: str) -> str:
        """Identify the domain context of the message."""
        domains = {
            "ott": ["netflix", "amazon", "hotstar", "zee5", "sonyliv", "web series", "streaming"],
            "bollywood": ["film", "movie", "cinema", "bollywood", "feature"],
            "advertising": ["ad", "commercial", "advertisement", "brand", "tvc"],
            "theater": ["play", "theater", "theatre", "stage", "drama"],
            "regional": ["tamil", "telugu", "bengali", "marathi", "malayalam", "kannada"]
        }
        
        for domain, keywords in domains.items():
            if any(keyword in message for keyword in keywords):
                return domain
        
        return "general"
    
    async def _enhance_with_history(
        self,
        context: ConversationContext,
        history: List[Dict]
    ) -> ConversationContext:
        """Enhance context using conversation history."""
        # Look for context clues in history
        for msg in history[-3:]:  # Last 3 messages
            if msg.get("role") == "user":
                # Check for entities mentioned in previous messages
                prev_entities = await self._extract_entities(msg.get("content", ""))
                
                # Merge with current entities (avoid duplicates)
                current_entity_values = {e.value for e in context.entities}
                for entity in prev_entities:
                    if entity.value not in current_entity_values:
                        entity.confidence *= 0.7  # Lower confidence for historical entities
                        context.entities.append(entity)
        
        # Update metadata
        context.metadata["history_length"] = len(history)
        context.metadata["conversation_continuity"] = True
        
        return context
    
    def generate_clarification_questions(
        self,
        context: ConversationContext
    ) -> List[str]:
        """Generate clarification questions based on missing information."""
        questions = []
        
        if context.intent == Intent.SEARCH_TALENT:
            # Check what's missing
            entity_types = {e.entity_type for e in context.entities}
            
            if "age" not in entity_types:
                questions.append("What age range are you looking for?")
            if "gender" not in entity_types:
                questions.append("Are you looking for male or female talent?")
            if "location" not in entity_types:
                questions.append("Where should the talent be based?")
            if "skills" not in entity_types:
                questions.append("Are there any specific skills required?")
            
        elif context.intent == Intent.SCHEDULE_AUDITION:
            entity_types = {e.entity_type for e in context.entities}
            
            if "date" not in entity_types:
                questions.append("When would you like to schedule the audition?")
            if "talent_name" not in entity_types:
                questions.append("Which talent would you like to audition?")
            if "location" not in entity_types:
                questions.append("Where should the audition take place?")
        
        return questions[:3]  # Limit to 3 questions


# Global instance
import numpy as np
conversation_intelligence = ConversationIntelligence()