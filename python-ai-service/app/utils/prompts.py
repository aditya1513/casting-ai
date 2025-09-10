"""Prompt templates and engineering for CastMatch AI."""

from typing import Dict, List, Any, Optional
from enum import Enum


class PromptContext(Enum):
    """Different contexts for prompt generation."""
    MUMBAI_OTT = "mumbai_ott"
    BOLLYWOOD = "bollywood"
    REGIONAL = "regional"
    INTERNATIONAL = "international"


class CastingPrompts:
    """Prompt templates for casting-related AI interactions."""
    
    # System prompts for different contexts
    SYSTEM_PROMPTS = {
        PromptContext.MUMBAI_OTT: """You are an expert casting director AI assistant specializing in Mumbai's OTT industry.

Your expertise includes:
- Deep knowledge of Indian streaming platforms (Netflix India, Amazon Prime Video India, Hotstar, Zee5, SonyLIV, MX Player, ALTBalaji, Voot)
- Understanding of OTT content trends: urban stories, youth-oriented narratives, bold themes, regional content
- Familiarity with Mumbai's talent pool and acting schools (FTII, NSD, Anupam Kher's Actor Prepares, Barry John Acting Studio)
- Knowledge of Indian languages: Hindi, English, Marathi, Gujarati, Punjabi, and South Indian languages
- Understanding of Indian cultural nuances, festivals, traditions, and social dynamics
- Awareness of OTT budget constraints vs traditional Bollywood productions
- Experience with digital-first actors and social media influencers transitioning to acting

Communication style:
- Use a mix of English and occasional Hindi terms (with translations)
- Reference popular OTT shows as examples (Sacred Games, The Family Man, Mirzapur, Made in Heaven, Scam 1992)
- Understand Mumbai's geography and production locations
- Be sensitive to regional diversity and representation
- Promote fresh talent alongside established actors
- Consider actors from theatre, television, and film backgrounds

Industry insights:
- OTT prefers natural, relatable performances over theatrical acting
- Importance of social media following for OTT casting
- Trend toward ensemble casts rather than single-star vehicles
- Emphasis on authentic regional accents and dialects
- Growing demand for actors who can perform in multiple languages""",
        
        PromptContext.BOLLYWOOD: """You are a seasoned Bollywood casting director AI assistant with decades of industry experience.

Your expertise includes:
- Comprehensive knowledge of Hindi cinema history and evolution
- Understanding of star system and film families (Kapoors, Khans, Bachchans, etc.)
- Familiarity with Bollywood production houses (Yash Raj, Dharma, T-Series, Red Chillies)
- Knowledge of song and dance requirements for commercial cinema
- Understanding of masala film conventions and character archetypes
- Experience with multi-starrer films and special appearances
- Awareness of box office dynamics and star marketability

Communication approach:
- Use Bollywood terminology naturally (muhurat, schedule, dubbing, etc.)
- Reference iconic films and performances
- Understand the importance of screen presence and star quality
- Consider actors' dance abilities for song sequences
- Balance commercial viability with artistic merit
- Respect industry hierarchies and protocols""",
        
        PromptContext.REGIONAL: """You are a regional cinema casting expert covering Indian language films.

Your expertise spans:
- South Indian cinema (Tamil, Telugu, Kannada, Malayalam)
- Regional industries (Marathi, Bengali, Gujarati, Punjabi)
- Understanding of regional star systems and audience preferences
- Knowledge of regional theatre traditions and acting styles
- Familiarity with dubbing and remake culture
- Cross-industry collaborations and pan-Indian projects

Focus areas:
- Authentic regional representation
- Language fluency and dialect accuracy
- Regional cultural sensibilities
- Local talent pools and theatre groups
- Regional film festivals and recognition""",
    }
    
    @staticmethod
    def get_talent_search_prompt(
        requirements: Dict[str, Any],
        context: PromptContext = PromptContext.MUMBAI_OTT
    ) -> str:
        """Generate prompt for talent search based on requirements."""
        base_prompt = f"""Based on these requirements, help me find suitable talent:

Project Type: {requirements.get('project_type', 'OTT Web Series')}
Genre: {requirements.get('genre', 'Drama')}
Role: {requirements.get('role_name', 'Lead Character')}

Character Requirements:
- Age Range: {requirements.get('age_min', 25)}-{requirements.get('age_max', 35)}
- Gender: {requirements.get('gender', 'Any')}
- Languages Required: {', '.join(requirements.get('languages', ['Hindi', 'English']))}
- Special Skills: {', '.join(requirements.get('skills', []))}
- Experience Level: {requirements.get('experience_level', 'Intermediate to Experienced')}

Character Description:
{requirements.get('character_description', 'Modern urban professional')}

Please suggest:
1. Key attributes to look for in candidates
2. Potential talent pools to explore
3. Audition scene suggestions
4. Red flags to watch for
5. Chemistry test recommendations if applicable"""
        
        if context == PromptContext.MUMBAI_OTT:
            base_prompt += """

Consider OTT-specific factors:
- Social media presence and engagement
- Comfort with bold/intimate scenes if required
- Availability for binge-shoot schedules
- Previous OTT work and audience reception
- Versatility across genres"""
        
        return base_prompt
    
    @staticmethod
    def get_audition_feedback_prompt(
        actor_name: str,
        role: str,
        performance_notes: str
    ) -> str:
        """Generate prompt for audition feedback analysis."""
        return f"""Analyze this audition performance and provide structured feedback:

Actor: {actor_name}
Role: {role}
Performance Notes: {performance_notes}

Please evaluate:
1. Strengths demonstrated in the audition
2. Areas needing improvement
3. Suitability for the specific role
4. Comparison with role requirements
5. Recommendations for callbacks or rejection
6. If callback, specific scenes to test
7. Direction notes for improvement

Provide balanced, constructive feedback that helps in making casting decisions."""
    
    @staticmethod
    def get_chemistry_test_prompt(
        actor1: str,
        actor2: str,
        relationship_type: str,
        scene_context: str
    ) -> str:
        """Generate prompt for chemistry test evaluation."""
        return f"""Evaluate the on-screen chemistry potential between:

Actor 1: {actor1}
Actor 2: {actor2}
Relationship Type: {relationship_type}
Scene Context: {scene_context}

Assess the following:
1. Natural rapport and comfort level
2. Energy matching and rhythm
3. Emotional connectivity
4. Physical comfort (if applicable)
5. Dialogue delivery synchronization
6. Ability to improvise together
7. Screen presence balance

Provide:
- Chemistry score (1-10)
- Specific observations
- Recommendations for improving chemistry
- Alternative pairing suggestions if chemistry is weak
- Scene suggestions that would showcase their chemistry"""
    
    @staticmethod
    def get_script_analysis_prompt(
        script_excerpt: str,
        project_context: Dict[str, Any]
    ) -> str:
        """Generate prompt for script analysis for casting."""
        return f"""Analyze this script for casting requirements:

Project: {project_context.get('title', 'Untitled')}
Genre: {project_context.get('genre', 'Drama')}
Platform: {project_context.get('platform', 'OTT')}
Target Audience: {project_context.get('audience', 'Urban 18-35')}

Script Excerpt:
{script_excerpt[:2000]}  # Limit to first 2000 characters

Extract and analyze:
1. Main characters and their traits
2. Age ranges and physical requirements
3. Emotional range required for each role
4. Language and dialect requirements
5. Special skills needed (action, dance, etc.)
6. Character relationships and chemistry requirements
7. Cultural or regional specifics
8. Casting challenges and opportunities

Provide structured casting breakdown with:
- Priority roles to cast first
- Potential casting combinations
- Budget considerations (star vs newcomer)
- Timeline for casting each role"""
    
    @staticmethod
    def get_talent_recommendation_prompt(
        role_requirements: Dict[str, Any],
        available_talents: List[Dict[str, Any]],
        context: PromptContext = PromptContext.MUMBAI_OTT
    ) -> str:
        """Generate prompt for AI talent recommendations."""
        talent_summary = "\n".join([
            f"- {t['name']}: {t['age']}y, {t['experience']}, {t.get('notable_work', 'Fresh talent')}"
            for t in available_talents[:10]
        ])
        
        prompt = f"""Based on these role requirements, rank and recommend talents:

Role Requirements:
- Character: {role_requirements.get('character_name')}
- Age: {role_requirements.get('age_range')}
- Type: {role_requirements.get('character_type')}
- Skills: {role_requirements.get('required_skills')}

Available Talents:
{talent_summary}

For each recommended talent, provide:
1. Match percentage
2. Strengths for this role
3. Potential challenges
4. Preparation suggestions
5. Audition scene recommendations
6. Backup options if unavailable"""
        
        if context == PromptContext.MUMBAI_OTT:
            prompt += """

Additional OTT considerations:
- Digital audience appeal
- Social media influence
- Binge-ability factor
- Contemporary relatability
- Cross-platform potential"""
        
        return prompt
    
    @staticmethod
    def get_diversity_analysis_prompt(
        cast_list: List[Dict[str, Any]],
        project_context: Dict[str, Any]
    ) -> str:
        """Generate prompt for cast diversity analysis."""
        return f"""Analyze the diversity and representation in this proposed cast:

Project: {project_context.get('title')}
Setting: {project_context.get('setting', 'Urban Mumbai')}
Target Audience: {project_context.get('audience')}

Proposed Cast:
{str(cast_list)[:1500]}

Evaluate:
1. Gender representation and balance
2. Regional diversity (if applicable)
3. Age distribution appropriateness
4. Socio-economic background representation
5. Language and cultural diversity
6. Industry representation (film/theatre/TV/digital)

Provide:
- Diversity score and breakdown
- Representation gaps identified
- Suggestions for improving diversity
- Potential audience impact analysis
- Compliance with platform guidelines"""
    
    @staticmethod
    def get_budget_optimization_prompt(
        roles: List[Dict[str, Any]],
        budget_constraint: float,
        context: PromptContext = PromptContext.MUMBAI_OTT
    ) -> str:
        """Generate prompt for casting budget optimization."""
        return f"""Optimize casting choices within budget constraints:

Total Budget: ₹{budget_constraint:,.0f}
Number of Roles: {len(roles)}
Project Type: {'OTT Series' if context == PromptContext.MUMBAI_OTT else 'Feature Film'}

Roles to Cast:
{str(roles)[:1000]}

Provide strategy for:
1. Star vs newcomer allocation
2. Role importance vs actor fee balance
3. Negotiation strategies for key talents
4. Cost-saving opportunities (combine roles, local talents)
5. Investment priorities (which roles need experienced actors)
6. Alternative casting patterns within budget

Consider:
- Market rates for different actor tiers
- Package deals and bulk negotiations
- Backend participation vs upfront fees
- Newcomer discovery opportunities
- Regional talent cost advantages"""


class ConversationalPrompts:
    """Prompts for maintaining conversational context."""
    
    @staticmethod
    def get_context_summary_prompt(messages: List[Dict[str, str]]) -> str:
        """Generate prompt for summarizing conversation context."""
        conversation = "\n".join([
            f"{msg['role']}: {msg['content'][:200]}..."
            for msg in messages[-10:]  # Last 10 messages
        ])
        
        return f"""Summarize this casting consultation conversation:

{conversation}

Extract:
1. Main casting requirements discussed
2. Preferences and constraints mentioned
3. Decisions made or pending
4. Action items identified
5. Key insights or recommendations given

Provide a concise summary that preserves essential context for continuation."""
    
    @staticmethod
    def get_clarification_prompt(
        user_input: str,
        possible_intents: List[str]
    ) -> str:
        """Generate prompt for clarifying ambiguous user input."""
        return f"""The user said: "{user_input}"

This could mean several things:
{chr(10).join([f"- {intent}" for intent in possible_intents])}

Generate a clarifying question that:
1. Acknowledges the ambiguity politely
2. Presents the options clearly
3. Asks for specific clarification
4. Maintains conversational flow
5. Shows understanding of casting context

Keep the response natural and helpful."""
    
    @staticmethod
    def get_suggestion_prompt(
        context: Dict[str, Any],
        stage: str
    ) -> str:
        """Generate prompt for proactive suggestions."""
        return f"""Based on the current casting process:

Stage: {stage}
Context: {str(context)[:500]}

Generate 3-5 proactive suggestions for next steps:
1. Relevant to current stage
2. Actionable and specific
3. Time-saving or value-adding
4. Based on industry best practices
5. Personalized to the project needs

Format as natural, conversational suggestions that guide the user forward."""


# Utility functions for prompt enhancement
def add_cultural_context(prompt: str, region: str = "Mumbai") -> str:
    """Add cultural context to prompts based on region."""
    cultural_contexts = {
        "Mumbai": "\nConsider Mumbai's cosmopolitan culture, mix of traditional and modern values, and fast-paced lifestyle.",
        "Delhi": "\nAccount for Delhi NCR's diverse population, corporate culture, and North Indian sensibilities.",
        "Bangalore": "\nFactor in Bangalore's tech-savvy audience, multicultural environment, and contemporary mindset.",
        "Chennai": "\nConsider Chennai's strong regional identity, Tamil cinema traditions, and conservative yet evolving audience.",
    }
    
    return prompt + cultural_contexts.get(region, "")


def add_platform_context(prompt: str, platform: str) -> str:
    """Add platform-specific context to prompts."""
    platform_contexts = {
        "Netflix": "\nNetflix prefers high production values, global appeal stories, and diverse representation.",
        "Amazon Prime": "\nAmazon values authentic regional stories, ensemble casts, and gritty realism.",
        "Hotstar": "\nHotstar caters to family audiences, cricket fans, and regional language content.",
        "Zee5": "\nZee5 focuses on heartland stories, regional content, and bold themes.",
        "SonyLIV": "\nSonyLIV emphasizes sports content, crime thrillers, and premium originals.",
    }
    
    return prompt + platform_contexts.get(platform, "")


def add_genre_context(prompt: str, genre: str) -> str:
    """Add genre-specific casting considerations."""
    genre_contexts = {
        "Romance": "\nPrioritize chemistry, charm, emotional range, and screen presence.",
        "Thriller": "\nLook for intensity, ability to maintain tension, and mysterious persona.",
        "Comedy": "\nSeek natural comic timing, expressive faces, and improvisational skills.",
        "Drama": "\nFocus on emotional depth, nuanced acting, and authentic portrayal.",
        "Action": "\nConsider physical fitness, stunt capabilities, and commanding presence.",
        "Horror": "\nValue ability to convey fear, vulnerability, and psychological complexity.",
    }
    
    return prompt + genre_contexts.get(genre, "")


# Global prompt generator instance
casting_prompts = CastingPrompts()
conversational_prompts = ConversationalPrompts()