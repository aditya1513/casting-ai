"""Script analysis service for extracting character information and requirements."""

import re
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from loguru import logger
import spacy
from collections import Counter
from dataclasses import dataclass
import openai
from app.core.config import settings


@dataclass
class Character:
    """Represents a character extracted from a script."""
    name: str
    description: str
    traits: List[str]
    emotions: List[str]
    age_range: Optional[Tuple[int, int]]
    gender: Optional[str]
    importance: str  # 'lead', 'supporting', 'minor'
    dialogue_count: int
    scene_appearances: int
    relationships: List[str]


class ScriptAnalysisService:
    """Service for analyzing scripts and extracting character information."""
    
    def __init__(self):
        """Initialize the script analysis service."""
        self.nlp = None
        self.openai_client = None
        
    async def initialize(self):
        """Initialize NLP models and services."""
        try:
            # Load spaCy model
            logger.info("Loading spaCy NLP model...")
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except OSError:
                logger.warning("spaCy model not found, downloading...")
                import subprocess
                subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"])
                self.nlp = spacy.load("en_core_web_sm")
            
            logger.info("NLP model loaded successfully")
            
            # Initialize OpenAI client if API key is available
            if settings.openai_api_key:
                openai.api_key = settings.openai_api_key
                self.openai_client = openai
                logger.info("OpenAI client initialized")
            
        except Exception as e:
            logger.error(f"Error initializing script analysis service: {e}")
    
    async def analyze_script(self, script_text: str) -> Dict[str, Any]:
        """
        Analyze a script and extract character information.
        
        Args:
            script_text: The full text of the script
            
        Returns:
            Dictionary containing character analysis and requirements
        """
        try:
            # Extract basic script structure
            scenes = self._extract_scenes(script_text)
            characters = self._extract_characters(script_text)
            dialogues = self._extract_dialogues(script_text)
            
            # Analyze each character
            character_analyses = []
            for char_name in characters:
                char_dialogues = [d for d in dialogues if d['character'] == char_name]
                char_scenes = [s for s in scenes if char_name in s['text']]
                
                character = await self._analyze_character(
                    char_name,
                    char_dialogues,
                    char_scenes,
                    script_text
                )
                character_analyses.append(character)
            
            # Extract overall themes and requirements
            themes = await self._extract_themes(script_text)
            setting = self._extract_setting(script_text)
            genre = self._detect_genre(script_text)
            
            # Generate casting requirements
            casting_requirements = await self._generate_casting_requirements(
                character_analyses,
                themes,
                setting,
                genre
            )
            
            return {
                'characters': [self._character_to_dict(c) for c in character_analyses],
                'themes': themes,
                'setting': setting,
                'genre': genre,
                'casting_requirements': casting_requirements,
                'total_scenes': len(scenes),
                'total_characters': len(characters)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing script: {e}")
            return {
                'error': str(e),
                'characters': [],
                'themes': [],
                'setting': 'Unknown',
                'genre': 'Unknown',
                'casting_requirements': []
            }
    
    def _extract_scenes(self, script_text: str) -> List[Dict[str, Any]]:
        """Extract scenes from the script."""
        scenes = []
        
        # Common scene heading patterns
        scene_patterns = [
            r'(INT\.|EXT\.|INT/EXT\.|I/E\.)\s+[A-Z][A-Z\s\-]+',
            r'SCENE\s+\d+',
            r'^\d+\.\s+[A-Z]'
        ]
        
        lines = script_text.split('\n')
        current_scene = None
        scene_text = []
        
        for line in lines:
            # Check if this is a new scene
            is_scene_heading = False
            for pattern in scene_patterns:
                if re.match(pattern, line.strip()):
                    # Save previous scene
                    if current_scene:
                        scenes.append({
                            'heading': current_scene,
                            'text': '\n'.join(scene_text)
                        })
                    
                    # Start new scene
                    current_scene = line.strip()
                    scene_text = []
                    is_scene_heading = True
                    break
            
            if not is_scene_heading and current_scene:
                scene_text.append(line)
        
        # Save last scene
        if current_scene:
            scenes.append({
                'heading': current_scene,
                'text': '\n'.join(scene_text)
            })
        
        return scenes
    
    def _extract_characters(self, script_text: str) -> List[str]:
        """Extract character names from the script."""
        characters = set()
        
        # Pattern for character names (usually in caps before dialogue)
        char_pattern = r'^([A-Z][A-Z\s\.]+)(?:\s*\([^\)]+\))?\s*$'
        
        lines = script_text.split('\n')
        for i, line in enumerate(lines):
            match = re.match(char_pattern, line.strip())
            if match and i + 1 < len(lines):
                # Check if next line looks like dialogue
                next_line = lines[i + 1].strip()
                if next_line and not next_line.isupper():
                    char_name = match.group(1).strip()
                    # Clean up character name
                    char_name = re.sub(r'\s+', ' ', char_name)
                    char_name = char_name.rstrip('.')
                    characters.add(char_name)
        
        return list(characters)
    
    def _extract_dialogues(self, script_text: str) -> List[Dict[str, str]]:
        """Extract dialogues from the script."""
        dialogues = []
        
        lines = script_text.split('\n')
        current_character = None
        current_dialogue = []
        
        for line in lines:
            # Check if this is a character name
            if line.strip() and line.strip().isupper() and not line.startswith(('INT.', 'EXT.')):
                # Save previous dialogue
                if current_character and current_dialogue:
                    dialogues.append({
                        'character': current_character,
                        'text': ' '.join(current_dialogue)
                    })
                
                # Start new dialogue
                current_character = line.strip().rstrip('.')
                current_dialogue = []
            
            elif current_character and line.strip():
                # This is dialogue text
                if not line.strip().startswith('(') or not line.strip().endswith(')'):
                    current_dialogue.append(line.strip())
        
        # Save last dialogue
        if current_character and current_dialogue:
            dialogues.append({
                'character': current_character,
                'text': ' '.join(current_dialogue)
            })
        
        return dialogues
    
    async def _analyze_character(
        self,
        name: str,
        dialogues: List[Dict[str, str]],
        scenes: List[Dict[str, Any]],
        full_script: str
    ) -> Character:
        """Analyze a specific character."""
        
        # Combine all character dialogues
        all_dialogue = ' '.join([d['text'] for d in dialogues])
        
        # Extract traits and emotions using NLP
        traits = self._extract_personality_traits(all_dialogue)
        emotions = self._extract_emotions(all_dialogue)
        
        # Determine importance based on dialogue count and scene appearances
        dialogue_count = len(dialogues)
        scene_count = len(scenes)
        
        if dialogue_count > 50 or scene_count > 10:
            importance = 'lead'
        elif dialogue_count > 20 or scene_count > 5:
            importance = 'supporting'
        else:
            importance = 'minor'
        
        # Try to extract age and gender from context
        age_range = self._extract_age_range(full_script, name)
        gender = self._extract_gender(full_script, name)
        
        # Extract relationships
        relationships = self._extract_relationships(full_script, name)
        
        # Generate description using AI if available
        description = await self._generate_character_description(
            name, all_dialogue, traits, emotions
        )
        
        return Character(
            name=name,
            description=description,
            traits=traits,
            emotions=emotions,
            age_range=age_range,
            gender=gender,
            importance=importance,
            dialogue_count=dialogue_count,
            scene_appearances=scene_count,
            relationships=relationships
        )
    
    def _extract_personality_traits(self, dialogue: str) -> List[str]:
        """Extract personality traits from dialogue."""
        traits = []
        
        # Simple keyword-based extraction
        trait_keywords = {
            'confident': ['sure', 'certain', 'know', 'believe'],
            'aggressive': ['fight', 'attack', 'destroy', 'kill'],
            'caring': ['love', 'care', 'help', 'support'],
            'intelligent': ['think', 'understand', 'realize', 'analyze'],
            'humorous': ['joke', 'laugh', 'funny', 'hilarious'],
            'mysterious': ['secret', 'hidden', 'unknown', 'mystery'],
            'romantic': ['love', 'heart', 'kiss', 'darling'],
            'fearful': ['afraid', 'scared', 'fear', 'terrified']
        }
        
        dialogue_lower = dialogue.lower()
        for trait, keywords in trait_keywords.items():
            if any(keyword in dialogue_lower for keyword in keywords):
                traits.append(trait)
        
        # Use spaCy for more advanced analysis if available
        if self.nlp and dialogue:
            doc = self.nlp(dialogue[:5000])  # Limit text length
            
            # Extract adjectives that might indicate traits
            adjectives = [token.text for token in doc if token.pos_ == 'ADJ']
            trait_adjectives = ['brave', 'smart', 'kind', 'cruel', 'gentle', 'tough']
            
            for adj in adjectives:
                if adj.lower() in trait_adjectives and adj.lower() not in traits:
                    traits.append(adj.lower())
        
        return list(set(traits))[:5]  # Return top 5 unique traits
    
    def _extract_emotions(self, dialogue: str) -> List[str]:
        """Extract emotions from dialogue."""
        emotions = []
        
        emotion_keywords = {
            'happy': ['happy', 'joy', 'glad', 'pleased', 'delighted'],
            'sad': ['sad', 'cry', 'tears', 'sorrow', 'grief'],
            'angry': ['angry', 'mad', 'furious', 'rage', 'irritated'],
            'fearful': ['afraid', 'scared', 'terrified', 'frightened'],
            'surprised': ['surprised', 'shocked', 'amazed', 'astonished'],
            'disgusted': ['disgusted', 'revolted', 'repulsed']
        }
        
        dialogue_lower = dialogue.lower()
        emotion_counts = Counter()
        
        for emotion, keywords in emotion_keywords.items():
            count = sum(1 for keyword in keywords if keyword in dialogue_lower)
            if count > 0:
                emotion_counts[emotion] = count
        
        # Get top emotions
        emotions = [emotion for emotion, _ in emotion_counts.most_common(3)]
        
        return emotions
    
    def _extract_age_range(self, script: str, character_name: str) -> Optional[Tuple[int, int]]:
        """Try to extract age range for a character."""
        # Look for age mentions near character name
        patterns = [
            rf'{character_name}.*?(\d{{1,2}})\s*years?\s*old',
            rf'{character_name}.*?age\s*(\d{{1,2}})',
            rf'{character_name}.*?(early|mid|late)\s*(twenties|thirties|forties|fifties)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, script, re.IGNORECASE)
            if match:
                if match.group(1).isdigit():
                    age = int(match.group(1))
                    return (age - 2, age + 2)
                else:
                    # Handle descriptive ages
                    age_map = {
                        'early twenties': (20, 25),
                        'mid twenties': (24, 27),
                        'late twenties': (27, 30),
                        'early thirties': (30, 35),
                        'mid thirties': (34, 37),
                        'late thirties': (37, 40),
                        'early forties': (40, 45),
                        'mid forties': (44, 47),
                        'late forties': (47, 50),
                        'early fifties': (50, 55),
                        'mid fifties': (54, 57),
                        'late fifties': (57, 60)
                    }
                    
                    age_desc = f"{match.group(1)} {match.group(2)}".lower()
                    return age_map.get(age_desc)
        
        return None
    
    def _extract_gender(self, script: str, character_name: str) -> Optional[str]:
        """Try to extract gender for a character."""
        # Look for gender pronouns near character name
        text_around_char = ''
        
        # Find sentences mentioning the character
        sentences = script.split('.')
        for sentence in sentences:
            if character_name in sentence:
                text_around_char += sentence + ' '
        
        text_lower = text_around_char.lower()
        
        # Count gendered pronouns
        male_pronouns = len(re.findall(r'\b(he|him|his)\b', text_lower))
        female_pronouns = len(re.findall(r'\b(she|her|hers)\b', text_lower))
        
        if male_pronouns > female_pronouns * 2:
            return 'male'
        elif female_pronouns > male_pronouns * 2:
            return 'female'
        
        return None
    
    def _extract_relationships(self, script: str, character_name: str) -> List[str]:
        """Extract relationships for a character."""
        relationships = []
        
        # Look for relationship keywords near character name
        relationship_patterns = [
            rf'{character_name}\'s\s+(wife|husband|partner|lover)',
            rf'(wife|husband|partner|lover)\s+of\s+{character_name}',
            rf'{character_name}\'s\s+(mother|father|son|daughter|brother|sister)',
            rf'{character_name}\s+and\s+([A-Z][A-Za-z]+)\s+(kiss|embrace|love)'
        ]
        
        for pattern in relationship_patterns:
            matches = re.findall(pattern, script, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    relationships.extend([m for m in match if m and not m.lower() in ['and', 'the', 'a']])
                else:
                    relationships.append(match)
        
        return list(set(relationships))[:3]  # Return top 3 unique relationships
    
    async def _generate_character_description(
        self,
        name: str,
        dialogue: str,
        traits: List[str],
        emotions: List[str]
    ) -> str:
        """Generate a character description using AI."""
        if self.openai_client and dialogue:
            try:
                # Create a prompt for character description
                prompt = f"""Based on the following dialogue and traits, write a brief character description for {name}:

Traits: {', '.join(traits) if traits else 'Not specified'}
Emotions shown: {', '.join(emotions) if emotions else 'Not specified'}
Sample dialogue: "{dialogue[:500]}..."

Write a 2-3 sentence character description:"""
                
                response = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.openai_client.ChatCompletion.create(
                        model="gpt-3.5-turbo",
                        messages=[
                            {"role": "system", "content": "You are a casting director analyzing characters."},
                            {"role": "user", "content": prompt}
                        ],
                        max_tokens=100,
                        temperature=0.7
                    )
                )
                
                return response.choices[0].message.content.strip()
                
            except Exception as e:
                logger.error(f"Error generating character description: {e}")
        
        # Fallback description
        trait_str = f"with {', '.join(traits)} traits" if traits else ""
        emotion_str = f"showing {', '.join(emotions)}" if emotions else ""
        
        parts = [s for s in [trait_str, emotion_str] if s]
        if parts:
            return f"A character {' and '.join(parts)}."
        else:
            return f"{name} is a character in this script."
    
    async def _extract_themes(self, script: str) -> List[str]:
        """Extract themes from the script."""
        themes = []
        
        # Common theme keywords
        theme_keywords = {
            'love': ['love', 'romance', 'heart', 'kiss', 'passion'],
            'revenge': ['revenge', 'vengeance', 'payback', 'retribution'],
            'family': ['family', 'mother', 'father', 'children', 'home'],
            'friendship': ['friend', 'buddy', 'companion', 'loyalty'],
            'betrayal': ['betray', 'deceive', 'lie', 'cheat', 'backstab'],
            'redemption': ['redeem', 'forgive', 'second chance', 'apologize'],
            'power': ['power', 'control', 'dominate', 'rule', 'authority'],
            'survival': ['survive', 'alive', 'escape', 'danger', 'threat']
        }
        
        script_lower = script.lower()
        theme_counts = Counter()
        
        for theme, keywords in theme_keywords.items():
            count = sum(1 for keyword in keywords if keyword in script_lower)
            if count > 2:  # Theme should appear multiple times
                theme_counts[theme] = count
        
        # Get top themes
        themes = [theme for theme, _ in theme_counts.most_common(3)]
        
        return themes
    
    def _extract_setting(self, script: str) -> str:
        """Extract the primary setting of the script."""
        settings = []
        
        # Look for location indicators
        location_patterns = [
            r'(INT\.|EXT\.)\s+([A-Z][A-Z\s\-]+)',
            r'in\s+(Mumbai|Delhi|London|New York|Paris|[A-Z][a-z]+)'
        ]
        
        for pattern in location_patterns:
            matches = re.findall(pattern, script)
            for match in matches:
                if isinstance(match, tuple):
                    location = match[1] if len(match) > 1 else match[0]
                else:
                    location = match
                settings.append(location.strip())
        
        if settings:
            # Get most common setting
            setting_counts = Counter(settings)
            return setting_counts.most_common(1)[0][0]
        
        return "Contemporary"
    
    def _detect_genre(self, script: str) -> str:
        """Detect the genre of the script."""
        genre_keywords = {
            'comedy': ['laugh', 'joke', 'funny', 'hilarious', 'humor'],
            'drama': ['cry', 'tears', 'emotion', 'feel', 'heart'],
            'action': ['fight', 'chase', 'explosion', 'gun', 'battle'],
            'thriller': ['suspense', 'mystery', 'danger', 'threat', 'fear'],
            'romance': ['love', 'kiss', 'heart', 'romantic', 'passion'],
            'horror': ['scary', 'terrify', 'monster', 'evil', 'blood'],
            'sci-fi': ['alien', 'space', 'future', 'technology', 'robot']
        }
        
        script_lower = script.lower()
        genre_scores = Counter()
        
        for genre, keywords in genre_keywords.items():
            score = sum(1 for keyword in keywords if keyword in script_lower)
            if score > 0:
                genre_scores[genre] = score
        
        if genre_scores:
            return genre_scores.most_common(1)[0][0]
        
        return "drama"  # Default genre
    
    async def _generate_casting_requirements(
        self,
        characters: List[Character],
        themes: List[str],
        setting: str,
        genre: str
    ) -> List[Dict[str, Any]]:
        """Generate casting requirements based on analysis."""
        requirements = []
        
        for character in characters:
            req = {
                'character_name': character.name,
                'importance': character.importance,
                'gender': character.gender or 'any',
                'age_range': character.age_range or (20, 50),
                'required_skills': [],
                'preferred_traits': character.traits,
                'physical_requirements': [],
                'language_requirements': ['English'],  # Default
                'availability_needs': 'flexible'
            }
            
            # Add genre-specific skills
            if genre == 'action':
                req['required_skills'].extend(['stunt work', 'physical fitness'])
            elif genre == 'comedy':
                req['required_skills'].append('comedic timing')
            elif genre == 'musical':
                req['required_skills'].extend(['singing', 'dancing'])
            
            # Add setting-specific requirements
            if 'Mumbai' in setting or 'India' in setting:
                req['language_requirements'].append('Hindi')
            
            # Determine availability needs based on importance
            if character.importance == 'lead':
                req['availability_needs'] = 'full-time'
            elif character.importance == 'supporting':
                req['availability_needs'] = 'part-time'
            
            requirements.append(req)
        
        return requirements
    
    def _character_to_dict(self, character: Character) -> Dict[str, Any]:
        """Convert Character object to dictionary."""
        return {
            'name': character.name,
            'description': character.description,
            'traits': character.traits,
            'emotions': character.emotions,
            'age_range': character.age_range,
            'gender': character.gender,
            'importance': character.importance,
            'dialogue_count': character.dialogue_count,
            'scene_appearances': character.scene_appearances,
            'relationships': character.relationships
        }
    
    async def extract_role_requirements(self, role_description: str) -> Dict[str, Any]:
        """Extract requirements from a role description."""
        requirements = {
            'skills': [],
            'traits': [],
            'experience': None,
            'age_range': None,
            'gender': None,
            'languages': [],
            'location': None
        }
        
        # Extract skills
        skill_keywords = ['acting', 'dancing', 'singing', 'martial arts', 'comedy', 'drama']
        for skill in skill_keywords:
            if skill in role_description.lower():
                requirements['skills'].append(skill)
        
        # Extract age
        age_match = re.search(r'(\d{2})-(\d{2})\s*years?', role_description)
        if age_match:
            requirements['age_range'] = (int(age_match.group(1)), int(age_match.group(2)))
        
        # Extract gender
        if 'male' in role_description.lower() and 'female' not in role_description.lower():
            requirements['gender'] = 'male'
        elif 'female' in role_description.lower():
            requirements['gender'] = 'female'
        
        # Extract languages
        language_keywords = ['english', 'hindi', 'marathi', 'tamil', 'telugu', 'bengali']
        for lang in language_keywords:
            if lang in role_description.lower():
                requirements['languages'].append(lang.capitalize())
        
        # Extract location
        location_keywords = ['mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata']
        for loc in location_keywords:
            if loc in role_description.lower():
                requirements['location'] = loc.capitalize()
                break
        
        return requirements


# Create singleton instance
script_analysis_service = ScriptAnalysisService()