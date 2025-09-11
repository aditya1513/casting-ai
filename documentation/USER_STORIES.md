# 🎬 CastMatch AI - User Stories
## Conversational Casting Platform User Stories

### Document Info
- **Created:** September 11, 2025
- **Based on:** Comprehensive PRD Analysis
- **Target Users:** Mumbai OTT Casting Directors
- **Format:** User Story → Acceptance Criteria → Technical Notes

---

## 👥 User Personas Reference

### 🎭 **Priya Sharma** - Senior Casting Director
- 35-45 years, 10+ years experience
- Handles 20+ OTT projects annually
- Moderate tech comfort
- Pain points: Time pressure, stakeholder management

### 🎬 **Arjun Mehta** - Emerging Assistant
- 24-30 years, 2-3 years experience
- High tech comfort, digital native
- Pain points: Limited network, industry knowledge gaps

### 📺 **Meera Kapoor** - Producer
- 40-50 years, Executive producer
- Low tech comfort, prefers summaries
- Focus: Budget, timeline, quality control

---

## 🔥 **Phase 1: Core Conversational Foundation**

### 1. 🗃️ Database Schema for Casting Domain

#### **User Story 1.1: Project Context Storage**
**As Priya (Senior Casting Director)**  
**I want** the system to remember all details about my current casting projects  
**So that** I don't have to re-enter project information in every conversation

**Acceptance Criteria:**
- ✅ System stores project details (name, genre, OTT platform, budget range, timeline)
- ✅ System remembers character requirements from previous conversations
- ✅ System tracks casting decisions and their reasoning
- ✅ Data persists between chat sessions
- ✅ Multiple projects can be active simultaneously

**Technical Implementation:**
```sql
-- Projects table with Mumbai OTT specific fields
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  genre VARCHAR(100), -- thriller, comedy, drama, action
  ott_platform VARCHAR(50), -- Netflix, Amazon Prime, Disney+ Hotstar
  budget_range VARCHAR(50), -- ₹5-10L, ₹10-25L, ₹25L+
  shooting_location VARCHAR(100),
  language VARCHAR(50), -- Hindi, English, Hinglish
  expected_start_date DATE,
  status VARCHAR(50), -- casting, pre_production, shooting
  created_at TIMESTAMP,
  casting_director_id UUID
);
```

---

#### **User Story 1.2: Talent Database with Industry Context**
**As Arjun (Assistant)**  
**I want** to access a comprehensive talent database with Mumbai industry context  
**So that** I can learn about actors and their industry relationships

**Acceptance Criteria:**
- ✅ Database includes Mumbai OTT actors with detailed profiles
- ✅ Stores industry relationships (who has worked with whom)
- ✅ Includes regional preferences and language capabilities
- ✅ Tracks previous casting patterns and success rates
- ✅ Maintains budget ranges and availability status

**Technical Implementation:**
```sql
CREATE TABLE talents (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  age_range VARCHAR(20), -- 25-30, 30-35, etc.
  gender VARCHAR(20),
  languages JSONB, -- ["Hindi", "English", "Tamil", "Marathi"]
  specialties JSONB, -- ["method_acting", "action", "comedy", "classical_training"]
  physical_attributes JSONB, -- {"height": "5'8\"", "build": "athletic"}
  location VARCHAR(100),
  budget_range VARCHAR(50),
  last_active_date DATE,
  industry_connections JSONB, -- directors, producers they've worked with
  portfolio JSONB -- demo reels, headshots, previous work
);
```

---

### 2. 💬 Core Conversational AI Interface

#### **User Story 2.1: Natural Language Project Initiation**
**As Priya (Senior Casting Director)**  
**I want** to start a new casting project just by typing naturally  
**So that** I can avoid complex forms and get straight to work

**Conversation Example:**
```
Priya: "Hi, I need to cast a new Netflix thriller series set in Mumbai"

AI: "Hello Priya! Exciting new project. I've started a new casting project for a Netflix thriller in Mumbai. 

A few quick details to get us started:
• What's the working title?
• How many main characters are we looking at?
• What's your rough timeline for casting?
• Any specific age groups or character types you have in mind?

I'll remember everything as we discuss!"
```

**Acceptance Criteria:**
- ✅ AI extracts key project details from natural language
- ✅ Creates project record without forms
- ✅ Asks relevant follow-up questions conversationally
- ✅ Maintains context throughout the conversation
- ✅ Confirms project creation with summary

---

#### **User Story 2.2: Context-Aware Conversations**
**As Priya (Senior Casting Director)**  
**I want** the AI to remember what we discussed yesterday about my project  
**So that** I don't have to repeat information or lose context

**Conversation Example:**
```
[Next Day]
Priya: "Good morning! Any updates on that lead we discussed?"

AI: "Morning Priya! You mean Vikrant Massey for the protagonist role in 'Mumbai Dreams'? 

Yesterday we were considering him alongside Rajkummar Rao. You mentioned wanting someone with intense eyes for the thriller vibe.

I checked overnight - Vikrant has 3 weeks free in December which aligns with your shooting schedule. Should I reach out to his team for availability confirmation?"
```

**Acceptance Criteria:**
- ✅ AI recalls previous conversation context
- ✅ Remembers specific actors, roles, and decisions discussed
- ✅ Provides relevant updates without being asked
- ✅ Maintains conversation history across sessions
- ✅ References specific details from past discussions

---

### 3. 🧠 Multi-Layer Memory System Setup

#### **User Story 3.1: Short-Term Memory for Active Conversations**
**As Priya (Senior Casting Director)**  
**I want** the AI to remember everything we're discussing in our current conversation  
**So that** I don't have to repeat names or details within the same chat session

**Conversation Example:**
```
Priya: "I'm looking for a male lead, 30-35, for an action thriller"
AI: "Got it! Action thriller lead, male, 30-35..."

Priya: "He needs martial arts background"
AI: "Perfect! Adding martial arts requirement to the 30-35 male lead for your action thriller..."

Priya: "What about Vidyut?"
AI: "Vidyut Jammwal would be perfect! He fits your criteria perfectly:
✅ Age 42 (slightly above range but experienced)
✅ Exceptional martial arts background (Kalarippayattu)
✅ Action thriller experience (Commando series)

Should I add him to your shortlist for this role?"
```

**Acceptance Criteria:**
- ✅ AI remembers all details mentioned in current conversation
- ✅ Can reference actors by first name when context is clear
- ✅ Accumulates requirements as conversation progresses
- ✅ Working memory handles 7±2 concurrent items
- ✅ Context persists throughout single session

---

#### **User Story 3.2: Episodic Memory for Casting Patterns**
**As Priya (Senior Casting Director)**  
**I want** the AI to learn from my past casting decisions  
**So that** it can suggest actors I typically prefer and avoid ones I don't

**Conversation Example:**
```
Priya: "I need someone for a complex psychological role"

AI: "Based on your past casting patterns, you prefer method actors for psychological roles. You've previously chosen:
• Nawazuddin Siddiqui (3 times for complex characters)
• Rajkummar Rao (2 psychological thrillers)
• Manoj Bajpayee (intense character work)

You typically avoid mainstream commercial actors for these roles.

Should I start with method-trained actors for this psychological character?"
```

**Acceptance Criteria:**
- ✅ System tracks and learns from past casting decisions
- ✅ Identifies patterns in casting director preferences
- ✅ Makes proactive suggestions based on history
- ✅ Avoids suggesting actors previously rejected
- ✅ Explains reasoning based on past behavior

---

## 🎯 **Phase 2: Industry-Specific Intelligence**

### 4. 📜 Intelligent Script Analysis

#### **User Story 4.1: Automated Character Extraction**
**As Priya (Senior Casting Director)**  
**I want** to upload a script and get automatic character breakdown  
**So that** I can quickly understand casting requirements without manual analysis

**Conversation Example:**
```
Priya: "I'm attaching the script for our new thriller series"
[Uploads script file]

AI: "Script analyzed! Found 6 main characters for your thriller:

🎭 LEADS (2):
• ARJUN - Male, 32-35, Mumbai cop, requires intensity + action skills
• MEERA - Female, 28-32, journalist, needs sharp dialogue delivery

👥 SUPPORTING (4):
• COMMISSIONER SHARMA - Male, 50+, authority figure, veteran actor needed
• ROHIT - Male, 25-28, tech expert, fresh face acceptable
• KAVYA - Female, 35-40, lawyer, strong screen presence
• ANTAGONIST - Male, 40-45, sophisticated menace, method actor preferred

Based on the tone and genre, I recommend prioritizing actors with:
✅ Thriller/crime series experience
✅ Mumbai/urban familiarity  
✅ Strong dialogue delivery

Should we start with the leads or would you like to discuss any character in detail?"
```

**Acceptance Criteria:**
- ✅ Automatically extracts character names and roles
- ✅ Identifies age ranges and key characteristics
- ✅ Suggests required skills and experience
- ✅ Prioritizes characters by importance
- ✅ Provides casting strategy recommendations

---

#### **User Story 4.2: Industry-Specific Casting Requirements**
**As Arjun (Assistant)**  
**I want** the AI to suggest industry-specific casting considerations  
**So that** I can learn casting best practices for different genres

**Conversation Example:**
```
Arjun: "This is a period drama set in 1947 Bombay"

AI: "Great choice! For period dramas set in 1947 Bombay, here are key casting considerations:

🎭 ESSENTIAL REQUIREMENTS:
• Classical Hindi diction (Hindustani influence)
• Theater-trained actors (better period authenticity)
• Ability to carry period costumes naturally
• Understanding of pre-independence cultural nuances

🎬 CASTING STRATEGY:
• Prefer actors with period film experience
• Consider Marathi theater actors (Mumbai connect)
• Avoid very contemporary-looking faces
• Language coaching may be needed for younger actors

💡 BUDGET CONSIDERATIONS:
• Period dramas typically require 20% more for costume fittings
• May need dialect coaches
• Longer prep time = higher actor costs

Would you like me to search for actors with period drama experience specifically?"
```

**Acceptance Criteria:**
- ✅ Provides genre-specific casting advice
- ✅ Considers historical accuracy requirements
- ✅ Suggests appropriate skill sets needed
- ✅ Includes budget and timeline implications
- ✅ Offers practical casting strategies

---

### 5. 🔍 Semantic Talent Search & Discovery

#### **User Story 5.1: Natural Language Actor Search**
**As Priya (Senior Casting Director)**  
**I want** to search for actors using natural descriptions  
**So that** I can find talent without knowing exact names or using complex filters

**Conversation Examples:**
```
Example 1:
Priya: "Find someone like young Amitabh but for comedy"

AI: "Interesting combination! Looking for actors with Amitabh's intensity but comedy timing:

🎭 TOP MATCHES:
• Ayushmann Khurrana - Similar thoughtful intensity + proven comedy
• Vicky Kaushal - Strong screen presence + comic timing (Masaan meets Dream Girl)
• Rajkummar Rao - Intense acting ability + comedy expertise

These actors have that serious actor credibility like young Amitabh, but with proven comedy chops. Which direction interests you more - the musical comedy angle (Ayushmann) or the versatile method approach (Rajkummar)?"

Example 2:
Priya: "Tamil actors fluent in Hindi for cop roles"

AI: "Perfect for crossover appeal! Here are Tamil actors with Hindi fluency and cop role suitability:

🚔 STRONG MATCHES:
• Arya - Fluent Hindi, played cops in multiple languages
• Madhavan - Excellent Hindi, sophisticated cop persona
• Vikram - Intense presence, Hindi capabilities, action-ready

All three have worked in Hindi films and can handle Mumbai cop authenticity. Arya has the most recent cop experience, Madhavan brings class, Vikram adds intensity. What kind of cop character - rookie, veteran, or corrupt?"
```

**Acceptance Criteria:**
- ✅ Interprets natural language descriptions accurately
- ✅ Understands comparative references ("like X but for Y")
- ✅ Considers multiple attributes simultaneously
- ✅ Provides reasoning for recommendations
- ✅ Asks clarifying questions to refine search

---

#### **User Story 5.2: Collaborative Search Refinement**
**As Priya (Senior Casting Director)**  
**I want** to refine my search through conversation  
**So that** I can narrow down to the perfect actor through natural dialogue

**Conversation Example:**
```
Priya: "I need a method actor for a complex psychological role"

AI: "Excellent! Mumbai has amazing method actors. Here are top options:
• Nawazuddin Siddiqui
• Manoj Bajpayee  
• Rajkummar Rao
• Kay Kay Menon
• Irrfan Khan level actors

What's the character's age range and complexity type?"

Priya: "35-40, someone dealing with PTSD, needs vulnerability"

AI: "Perfect specification! For 35-40 with PTSD vulnerability:

🎯 IDEAL MATCHES:
• Rajkummar Rao (37) - Exceptional at vulnerable, damaged characters
• Abhay Deol (38) - Nuanced portrayals, handles psychological depth well
• Vicky Kaushal (35) - Strong emotional range, proven with traumatic roles

Rajkummar has the most experience with PTSD-type roles (Omerta, Trapped). Should I check his availability first?"

Priya: "Yes, and also check if he's worked with Director Anurag Kashyap before"

AI: "Great thinking! Checking Rajkummar + Anurag collaboration history...

✅ YES! They worked together on:
• Mukkabaaz (2017) - Anurag as producer, great relationship
• Previously connected through similar film circles

This existing relationship could mean:
• Faster casting decision
• Better rate negotiation
• Director confidence in choice

Should I reach out to Rajkummar's team about availability and your project?"
```

**Acceptance Criteria:**
- ✅ Allows iterative search refinement through dialogue
- ✅ Remembers and applies multiple search criteria
- ✅ Provides additional context and industry insights
- ✅ Suggests next logical steps in the process
- ✅ Maintains search history throughout conversation

---

### 6. 🎭 Industry-Specific NLU (Natural Language Understanding)

#### **User Story 6.1: Casting Jargon Recognition**
**As Priya (Senior Casting Director)**  
**I want** the AI to understand industry terminology naturally  
**So that** I can speak in my professional language without explanation

**Conversation Examples:**
```
Example 1 - Technical Terms:
Priya: "I need someone for combination dates next week"

AI: "Got it! You need an actor available for combination shooting next week. This usually means:
• Multiple scenes/setups in compressed schedule  
• Higher day rate due to intensive shooting
• Actor needs to be local/flexible for quick turnarounds

Which project is this for? I can check who from your shortlisted actors handles combination dates well."

Example 2 - Industry Roles:
Priya: "Get me a look test for the three shortlisted leads"

AI: "Perfect! Setting up look tests for your shortlisted leads. I'll coordinate:

📸 LOOK TEST REQUIREMENTS:
• Basic costume/styling for character
• Key lighting setup for screen presence
• Multiple angles + close-ups
• 2-3 sample dialogue scenes

Should I schedule these at your usual studio or do you prefer a specific location? Also, does the director want to be present or review recordings later?"

Example 3 - Casting Decisions:
Priya: "Let's lock Vikrant for the lead and float the others"

AI: "Excellent decision! 

✅ LOCKING VIKRANT MASSEY for lead role:
• I'll prepare the casting confirmation
• Schedule contract discussion
• Notify production team

🔄 FLOATING OTHER OPTIONS:
• Keeping Rajkummar and Abhay as backups
• Maintaining their availability without commitment
• Can quick-switch if anything changes

Should I send Vikrant's team the official casting confirmation today?"
```

**Acceptance Criteria:**
- ✅ Recognizes and correctly interprets casting industry terms
- ✅ Understands Mumbai film/OTT specific terminology
- ✅ Responds appropriately to technical casting language
- ✅ Provides relevant context and next steps
- ✅ Maintains professional tone and understanding

---

#### **User Story 6.2: Regional and Cultural Context Understanding**
**As Arjun (Assistant)**  
**I want** the AI to understand regional and cultural nuances  
**So that** I can learn about appropriate casting for different contexts

**Conversation Example:**
```
Arjun: "This character is a typical Mumbai middle-class father"

AI: "Perfect character type! For a typical Mumbai middle-class father, you'll want someone who embodies:

🏠 MUMBAI MIDDLE-CLASS AUTHENTICITY:
• Local train commuter believability
• Marathi/Hindi bilingual comfort
• Middle-class mannerisms and speech patterns
• Relatable, non-glamorous appeal

🎭 IDEAL ACTOR PROFILES:
• Anupam Kher types - lived-in, authentic feel
• Sanjay Mishra - natural middle-class energy
• Kumud Mishra - perfect Mumbai middle-class vibe
• Seema Pahwa (if flexibility on gender)

💡 CASTING CONSIDERATIONS:
• Avoid overly polished/glamorous actors
• Look for actors with theater/TV background
• Consider Marathi film actors (authentic Mumbai feel)
• Age range 45-55 typically works best

The key is someone audiences will see as 'apna aadmi' (our person). Should I search for actors with this specific demographic appeal?"
```

**Acceptance Criteria:**
- ✅ Understands Mumbai-specific cultural contexts
- ✅ Recognizes class and demographic indicators
- ✅ Provides culturally appropriate casting suggestions
- ✅ Explains reasoning behind recommendations
- ✅ Considers authentic representation over glamour

---

## 🚀 **Phase 3: Demo & Validation**

### 7. 🎬 End-to-End Conversational Workflows

#### **User Story 7.1: Complete Script-to-Shortlist Workflow**
**As Priya (Senior Casting Director)**  
**I want** to go from script upload to final shortlist through conversation  
**So that** I can complete my entire casting workflow without leaving the chat

**Complete Workflow Example:**
```
Priya: "Starting casting for new Netflix series - 'Mumbai Nights'"
[Uploads script]

AI: "Exciting! Mumbai Nights - I've analyzed your script. It's a crime thriller with strong characters:

🎭 KEY ROLES IDENTIFIED:
• INSPECTOR RAVI (Male, 35-40) - Lead investigator, needs intensity
• PRIYA JOURNALIST (Female, 30-35) - Sharp, fearless reporter
• DON MALIK (Male, 45-50) - Sophisticated antagonist
• CONSTABLE ROHIT (Male, 25-30) - Ravi's partner, comic relief

Let's start with your lead - Inspector Ravi. Based on the character, I'm thinking method actors with cop experience. Thoughts?"

Priya: "Yes, someone like Saif in Sacred Games but younger"

AI: "Perfect reference! Saif's intensity + sophistication but younger. Here are ideal matches:

🎯 TOP RECOMMENDATIONS:
• Vikrant Massey (36) - Similar intensity, proven in crime roles
• Pratik Gandhi (43) - Great dramatic range, sophisticated appeal  
• Tahir Raj Bhasin (35) - Strong screen presence, can handle cop roles

All three have that intelligent, brooding quality. Vikrant has more cop experience, Pratik brings sophistication, Tahir has the action capability. Who should we start with?"

Priya: "Let's go with Vikrant first, then Pratik as backup"

AI: "Excellent choices! 

✅ INSPECTOR RAVI SHORTLIST:
1. Vikrant Massey (Primary)
2. Pratik Gandhi (Backup)

I'll check their availability for your December shooting schedule. 

Now for Priya the journalist - thinking sharp, fearless women who can handle crime thriller intensity. Radhika Apte types but maybe someone fresh?"

Priya: "Yes, someone who can match Vikrant's intensity"

AI: "Great chemistry consideration! For matching Vikrant's intensity:

• Shweta Tripathi - Proven intense performer, great opposite Vikrant
• Sobhita Dhulipala - Strong screen presence, thriller experience
• Sanya Malhotra - Versatile, can handle intense roles

Shweta and Vikrant have great on-screen chemistry (Mirzapur connection). Should I prioritize her?"

Priya: "Perfect! Add her to the list. What about the antagonist?"

AI: "Don Malik needs that sophisticated menace. Based on your script:

🎭 ANTAGONIST OPTIONS:
• Nawazuddin Siddiqui - Master of complex villains
• Kay Kay Menon - Sophisticated intensity
• Ronit Roy - Corporate villain expertise

Nawazuddin would bring incredible depth to Don Malik. Budget might be higher but worth it for this character. Thoughts?"

Priya: "Budget is flexible for the right actor. Lock Nawazuddin as first choice"

AI: "Excellent! Your shortlist is taking great shape:

📋 MUMBAI NIGHTS - FINAL SHORTLIST:
✅ Inspector Ravi: Vikrant Massey (Primary), Pratik Gandhi (Backup)
✅ Journalist Priya: Shweta Tripathi (Primary)  
✅ Don Malik: Nawazuddin Siddiqui (Primary)
⏳ Constable Rohit: Still discussing

This is a powerful casting combination! Strong chemistry potential between Vikrant-Shweta, and Nawazuddin will elevate the entire project.

Should I start checking availability and rates for your primary choices?"
```

**Acceptance Criteria:**
- ✅ Complete workflow from script upload to final shortlist
- ✅ Natural conversation flow throughout the process
- ✅ AI maintains context and builds on decisions
- ✅ Provides chemistry and casting logic insights  
- ✅ Creates actionable final deliverable (shortlist)
- ✅ Suggests logical next steps in the process

---

#### **User Story 7.2: Collaborative Team Decision Making**
**As Meera (Producer)**  
**I want** to review and approve casting decisions through conversation  
**So that** I can quickly provide executive oversight without complex reports

**Conversation Example:**
```
AI: "Hi Meera! Priya has finalized the shortlist for Mumbai Nights. Here's the executive summary:

📈 CASTING OVERVIEW:
• Total estimated budget: ₹45L for main cast (within ₹50L limit)
• Timeline: All actors available for December shoot
• Risk: Low - all proven performers
• Chemistry: Strong potential (Vikrant-Shweta proven pairing)

🎭 MAIN CAST:
• Inspector Ravi: Vikrant Massey (₹15L per episode)
• Journalist Priya: Shweta Tripathi (₹8L per episode)
• Don Malik: Nawazuddin Siddiqui (₹20L per episode)

Any concerns or changes needed before we proceed to negotiations?"

Meera: "Nawazuddin seems expensive. Any alternatives?"

AI: "Understandable budget concern! Here are alternatives with similar impact:

💰 COST-EFFECTIVE OPTIONS:
• Kay Kay Menon: ₹12L per episode (40% savings)
• Ronit Roy: ₹10L per episode (50% savings)
• Jaideep Ahlawat: ₹15L per episode (25% savings)

All are strong antagonists. Kay Kay has the most similar sophisticated menace. This change would bring total budget to ₹35L, giving you ₹15L buffer.

However, Nawazuddin's star power could significantly boost viewership - potentially worth the premium. Your call on budget vs star value?"

Meera: "Let's try Kay Kay first. If he's not available, we'll reconsider Nawazuddin"

AI: "Smart approach! Updated casting strategy:

🎯 REVISED PLAN:
• Try Kay Kay Menon first (₹12L budget)
• Keep Nawazuddin as backup (if Kay Kay unavailable)
• Total budget: ₹35L with Kay Kay, ₹45L with Nawazuddin

I'll have Priya reach out to Kay Kay's team today. You'll know availability within 48 hours. Sound good?"

Meera: "Perfect. Keep me updated on responses."

AI: "Absolutely! I'll send you updates as soon as we hear back from anyone. You'll have full visibility on negotiations and responses."
```

**Acceptance Criteria:**
- ✅ Provides executive-level summaries automatically
- ✅ Highlights budget, timeline, and risk factors
- ✅ Responds to producer concerns with alternatives
- ✅ Maintains business focus while being conversational
- ✅ Updates all stakeholders on decisions and progress

---

### 8. 📺 Mumbai OTT Demo Creation

#### **User Story 8.1: Realistic Industry Demo Scenarios**
**As a Beta User (Any Persona)**  
**I want** to see realistic demo scenarios using actual Mumbai OTT context  
**So that** I can understand how the platform would work for my real projects

**Demo Scenario 1: Netflix Crime Thriller**
```
DEMO: "Sacred Games meets Scam 1992" - New Netflix Series

User: "I'm casting a new Netflix crime series, think Sacred Games but with financial crime angle"

AI: "Exciting concept! Sacred Games' gritty realism with Scam's financial intrigue. That suggests:

🎭 CASTING APPROACH:
• Need actors who can handle complex, morally gray characters
• Mumbai authenticity is crucial
• Mix of intensity (Sacred Games) + intelligence (Scam 1992)
• Ensemble cast like both shows

What's your protagonist - the investigator, the financial criminal, or multiple leads?"

User: "Multiple leads - corrupt banker, honest cop, and journalist uncovering it all"

AI: "Perfect triangle! This structure works brilliantly:

💼 CORRUPT BANKER (Think Harshad Mehta energy):
• Pratik Gandhi - Proven in financial crime (Scam 1992)
• Abhay Deol - Sophisticated, can play morally complex
• Arjun Rampal - Corporate villain experience

👮‍♂️ HONEST COP (Sacred Games intensity):
• Vikrant Massey - Great at conflicted law enforcement
• Jaideep Ahlawat - Proven cop roles, intense presence
• Pankaj Tripathi - If you want veteran, wise cop angle

📰 INVESTIGATIVE JOURNALIST:
• Shweta Tripathi - Sharp, fearless energy
• Radhika Apte - Proven in investigative roles
• Sobhita Dhulipala - Rising star, strong screen presence

Which triangle interests you most? The Pratik-Jaideep-Shweta combination would be powerful!"
```

**Demo Scenario 2: Amazon Prime Family Drama**
```
DEMO: "Made in Heaven meets Four More Shots Please" - Amazon Prime Series

User: "Amazon wants something like Made in Heaven but focused on women entrepreneurs in Mumbai"

AI: "Love this concept! Made in Heaven's production values + Four More Shots' female friendship + entrepreneurial angle. Very Amazon Prime!

🏢 CORE CASTING STRATEGY:
• Strong female ensemble (4-5 leads)
• Mix of established + rising talent
• Mumbai sophistication essential
• Age range: 28-40 for relatability

💪 POTENTIAL FEMALE LEADS:
• Sobhita Dhulipala - Made in Heaven connection, perfect fit
• Kirti Kulhari - Strong, independent woman roles
• Sayani Gupta - Proven ensemble player (Four More Shots)
• Plabita Borthakur - Rising talent, natural acting

This cast would give you established names (Sobhita, Kirti) + fresh energy (Sayani, Plabita). Want to develop this ensemble further?"
```

**Acceptance Criteria:**
- ✅ Uses actual Mumbai OTT industry references
- ✅ Demonstrates realistic casting thought processes  
- ✅ Shows understanding of platform-specific content styles
- ✅ Provides multiple casting options with clear reasoning
- ✅ Engages users with industry-specific insights

---

## 💡 **Technical Implementation Notes**

### Memory System Architecture:
```javascript
const memorySystem = {
  shortTermMemory: {
    storage: "Redis",
    duration: "30 minutes",
    capacity: "7±2 items",
    content: "Current conversation context"
  },
  episodicMemory: {
    storage: "PostgreSQL + Vector DB", 
    content: "Past casting decisions with emotional context",
    retrieval: "Semantic similarity + recency"
  },
  semanticMemory: {
    storage: "Graph DB + Embeddings",
    content: "Industry relationships, actor capabilities",
    update: "Continuous learning from conversations"
  },
  proceduralMemory: {
    storage: "PostgreSQL",
    content: "Learned successful workflows",
    application: "Automatic process suggestions"
  }
};
```

### Conversation Flow Management:
```python
conversation_states = {
    "project_initiation": "Extracting project basics",
    "script_analysis": "Processing script, extracting characters", 
    "talent_search": "Finding actors based on requirements",
    "shortlist_refinement": "Iteratively improving recommendations",
    "stakeholder_approval": "Getting team feedback and sign-off",
    "scheduling_coordination": "Managing auditions and meetings"
}
```

### Industry-Specific Data Models:
```sql
-- Mumbai OTT Industry specific fields
ALTER TABLE talents ADD COLUMN ott_platforms JSONB; -- Which OTTs they've worked with
ALTER TABLE talents ADD COLUMN regional_connect VARCHAR(100); -- Mumbai, Delhi, South India
ALTER TABLE talents ADD COLUMN industry_reputation TEXT; -- Method actor, commercial star, etc.
ALTER TABLE projects ADD COLUMN cultural_context VARCHAR(100); -- Urban Mumbai, small town, etc.
```

---

## ✅ **Definition of Done**

For each user story to be considered complete:

1. **Functional Requirements Met**: All acceptance criteria implemented and tested
2. **Conversational Flow**: Natural dialogue, not form-filling experience  
3. **Industry Context**: Mumbai OTT terminology and references working correctly
4. **Memory Integration**: Context maintained across conversations appropriately
5. **Performance**: Response time < 2 seconds for 95% of queries
6. **User Testing**: Validated with at least one target persona simulation

---

*These user stories represent the core conversational casting experience that will revolutionize how Mumbai OTT industry professionals work with casting AI.*
