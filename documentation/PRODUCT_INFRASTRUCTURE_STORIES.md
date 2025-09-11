# 🚀 CastMatch AI - Product Infrastructure User Stories
## Authentication, Onboarding & Core Product Requirements

### Document Info
- **Created:** September 11, 2025
- **Focus:** Essential product infrastructure before AI features
- **Target:** Complete user journey from landing → signup → onboarding → product use
- **Priority:** Phase 0 (Foundation) - Must complete before conversational AI features

---

## 🎯 **Product Infrastructure Overview**

### What We Need Before AI Features:
1. **Marketing & Landing** - Convert visitors to users
2. **Authentication System** - Secure signup/signin with industry context
3. **User Onboarding** - Tailored to Mumbai OTT casting directors
4. **Profile Management** - Industry-specific profiles and preferences
5. **Subscription Management** - Pricing tiers and billing
6. **Settings & Preferences** - Customization for different user types

---

## 📱 **Phase 0: Product Foundation**

### 1. 🌟 Landing Page & Marketing

#### **User Story 1.1: Compelling Landing Page for Mumbai OTT Industry**
**As a Mumbai Casting Director visiting the website**  
**I want** to immediately understand how CastMatch AI solves my specific casting problems  
**So that** I'm motivated to sign up and try the platform

**Landing Page Structure:**
```
HERO SECTION:
"Replace 10+ casting tools with one conversation"
- Video demo of actual casting conversation
- "Start casting in 2 minutes" CTA
- Social proof: "Used by 50+ Mumbai casting directors"

PROBLEM SECTION:
"Stop juggling multiple tools, spreadsheets, and endless emails"
- Visual showing current complex workflow vs single chat
- Pain points: Time pressure, context loss, stakeholder management

SOLUTION SECTION:  
"Just talk. The AI handles everything else."
- Interactive demo chat widget
- Real conversation examples from Mumbai OTT context
- "No forms, no complex interfaces, just conversation"

FEATURES SECTION:
- Script Analysis: Upload → Get character breakdown instantly
- Smart Search: "Find someone like young Amitabh but for comedy"
- Memory System: "Remembers every decision, learns your preferences"
- Team Collaboration: "Share shortlists, get approvals through chat"

SOCIAL PROOF:
- Mumbai industry testimonials
- Case studies: "Cast 'Mumbai Dreams' in 6 days instead of 15"
- Logo wall: Netflix, Amazon Prime, Disney+ Hotstar projects

PRICING PREVIEW:
- Simple 3-tier structure
- "Start free - No credit card required"
- Mumbai-specific pricing in ₹
```

**Acceptance Criteria:**
- ✅ Page loads in <3 seconds
- ✅ Mobile responsive design
- ✅ Interactive demo chat widget functional
- ✅ Clear Mumbai OTT industry positioning
- ✅ Conversion tracking setup
- ✅ A/B test framework ready

---

#### **User Story 1.2: Industry-Specific Demo Chat Widget**
**As a potential user exploring the landing page**  
**I want** to try a realistic casting conversation demo  
**So that** I can see exactly how the platform would work for my projects

**Demo Chat Examples:**
```
DEMO CONVERSATION 1:
Visitor: "Hi, I need to cast a Netflix thriller"
Demo AI: "Exciting! Netflix thriller - I love these projects. 

What's the setting and tone? Thinking Sacred Games gritty or more like Arya sophisticated thriller?"

Visitor: "More like Sacred Games, set in Mumbai underworld"
Demo AI: "Perfect! Mumbai underworld + Sacred Games tone suggests:

🎭 CASTING APPROACH:
• Method actors who can handle gritty, realistic roles
• Mumbai street authenticity crucial
• Mix of established talent + fresh faces for credibility

What's your lead character - the cop, the criminal, or multiple protagonists?"

[Continue with realistic casting conversation...]

CTA: "Sign up to start your real casting project →"
```

**Acceptance Criteria:**
- ✅ 3-5 realistic demo conversations
- ✅ Uses actual Mumbai OTT terminology
- ✅ Shows real actor suggestions
- ✅ Demonstrates key platform features
- ✅ Smooth transition to signup

---

### 2. 🔐 Authentication & Account Creation

#### **User Story 2.1: Industry-Tailored Signup Process**
**As a Mumbai Casting Director**  
**I want** a signup process that understands my industry context  
**So that** the platform is immediately relevant and personalized

**Signup Flow:**
```
STEP 1: BASIC INFO
- Name, Email, Phone
- "Sign up with Google" option (common in industry)
- WhatsApp number (important for Mumbai film industry)

STEP 2: INDUSTRY CONTEXT
"Help us understand your casting work"
- Role: Casting Director / Assistant / Producer / Agency Owner
- Experience: 0-2 years / 2-5 years / 5-10 years / 10+ years
- Location: Mumbai / Delhi / Bangalore / Other
- Focus: Films / OTT / TV / Commercials / Theater

STEP 3: PLATFORM PREFERENCES  
"What platforms do you cast for?" (Multi-select)
- Netflix India
- Amazon Prime Video India  
- Disney+ Hotstar
- SonyLIV
- ZEE5
- Independent Films
- Other

STEP 4: TEAM SIZE
"How do you typically work?"
- Solo casting director
- Small team (2-5 people)
- Medium agency (6-20 people)  
- Large agency (20+ people)

CONFIRMATION:
"Welcome to CastMatch AI! Your account is ready.
✅ Optimized for Mumbai OTT industry
✅ Personalized for [Experience Level] casting director
✅ Ready for [Platform] projects"
```

**Acceptance Criteria:**
- ✅ Industry-specific questions that inform personalization
- ✅ Social auth options (Google, LinkedIn)
- ✅ WhatsApp integration setup
- ✅ Data validation and security
- ✅ Smooth mobile signup experience
- ✅ Email verification process

---

#### **User Story 2.2: Secure Sign-in with Industry Context**
**As a returning user**  
**I want** a fast, secure sign-in that remembers my industry preferences  
**So that** I can get back to casting work immediately

**Sign-in Features:**
```
SIGN-IN OPTIONS:
- Email + Password
- Google OAuth (one-click)
- "Remember me" for trusted devices
- WhatsApp OTP option (for mobile-first users)

SECURITY FEATURES:
- Two-factor authentication (SMS/WhatsApp)
- Session management
- Device recognition
- Suspicious activity detection

POST-SIGNIN EXPERIENCE:
"Welcome back, Priya!"
- Dashboard showing active projects
- Recent conversations summary
- Pending decisions/approvals
- Industry news/updates relevant to user
```

**Acceptance Criteria:**
- ✅ Multiple secure authentication methods
- ✅ Industry-appropriate security measures
- ✅ Fast re-authentication for return visits
- ✅ Session security and management
- ✅ Mobile-optimized signin flow

---

### 3. 🎭 User Onboarding & First Experience

#### **User Story 3.1: Personalized Onboarding Journey**
**As a new user who just signed up**  
**I want** a guided introduction tailored to my casting director experience level  
**So that** I can start using the platform effectively right away

**Onboarding Flow by Persona:**

```
FOR SENIOR CASTING DIRECTOR (Priya):
WELCOME: "Hi Priya! I see you're an experienced casting director. Let's get you set up quickly."

STEP 1: QUICK WINS
"Let's start with something familiar - creating your first project."
- Guided project creation through conversation
- Show how natural language replaces forms
- Demonstrate memory system

STEP 2: IMPORT EXISTING DATA  
"Do you have existing talent lists or project data?"
- CSV import option
- Manual entry through conversation
- Connect existing tools (if any)

STEP 3: TEAM COLLABORATION
"Working with assistants or producers?"
- Team invitation setup
- Permission levels
- Collaboration features demo

FOR ASSISTANT (Arjun):
WELCOME: "Welcome Arjun! I see you're growing in the casting world. I'm here to help you learn and succeed."

STEP 1: LEARNING MODE
"Let's start with industry knowledge"
- Interactive tutorial on casting terminology
- Mumbai OTT industry overview
- Common casting scenarios practice

STEP 2: GUIDED CASTING EXERCISE
"Try a sample casting project"
- Practice conversation with realistic scenario
- Learn search techniques
- Understand decision-making process

STEP 3: NETWORKING & LEARNING
"Building your industry knowledge"
- Industry connections mapping
- Learning resources
- Mentorship matching (future feature)

FOR PRODUCER (Meera):
WELCOME: "Hi Meera! As a producer, you need executive-level insights. Let's set that up."

STEP 1: DASHBOARD SETUP
"Your executive casting dashboard"
- Budget tracking setup  
- Timeline monitoring
- Team performance metrics

STEP 2: APPROVAL WORKFLOWS
"Streamlined decision-making"
- Approval process setup
- Notification preferences
- Executive reporting setup
```

**Acceptance Criteria:**
- ✅ Personalized based on signup information
- ✅ Interactive tutorials with real industry examples
- ✅ Progress tracking and completion rewards
- ✅ Skip options for experienced users
- ✅ Mobile-optimized onboarding flow
- ✅ Help resources easily accessible

---

#### **User Story 3.2: First Project Creation Guide**
**As a new user completing onboarding**  
**I want** to create my first casting project with guidance  
**So that** I experience the core value proposition immediately

**Guided First Project:**
```
AI GUIDE: "Let's create your first project together! This will show you how different CastMatch AI is from traditional tools.

Instead of filling out forms, just tell me about your project naturally..."

USER: "I need to cast a comedy series for Amazon Prime"

AI: "Perfect! Amazon Prime comedy - I love these projects. I've started your project.

🎯 WHAT I UNDERSTOOD:
✅ Platform: Amazon Prime Video India  
✅ Genre: Comedy
✅ Format: Series (multiple episodes)

A few quick questions to complete the setup:
• What's the comedy style - situational, romantic, or family comedy?
• Any working title?
• When do you want to start shooting?
• How many main characters are you thinking?

See how easy this is compared to complex forms?"

[Continue guided conversation...]

AI: "Excellent! Your first project 'Prime Comedy Series' is ready:
✅ 6 main characters identified
✅ Budget range set (₹15-25L total)
✅ Timeline: Casting by December, shooting January
✅ Amazon Prime comedy style preferences saved

Next time, you can just say 'Start new project' and I'll remember how you like to work!"
```

**Acceptance Criteria:**
- ✅ Conversational project creation (no forms)
- ✅ Real-time guidance and explanations
- ✅ Platform learns user preferences immediately
- ✅ Clear value demonstration vs traditional tools
- ✅ Smooth transition to regular platform use

---

### 4. 👤 User Profiles & Preferences

#### **User Story 4.1: Industry-Specific Profile Management**
**As a casting director using the platform**  
**I want** to maintain a professional profile that reflects my industry expertise  
**So that** the AI can serve me better and I can collaborate effectively with others

**Profile Structure:**
```
PROFESSIONAL INFORMATION:
- Name, Title, Company/Agency
- Industry Experience & Specializations
- Notable Projects Portfolio
- OTT Platform Relationships
- Regional Expertise (Mumbai, Delhi, etc.)
- Language Capabilities

CASTING PREFERENCES:
- Preferred Actor Types & Categories
- Budget Ranges I Typically Work With
- Genres I Specialize In
- Collaboration Style (Solo vs Team)
- Decision-Making Patterns

PLATFORM PREFERENCES:
- Communication Channels (Chat, WhatsApp, Email)
- Notification Settings
- Working Hours & Availability
- AI Interaction Style (Formal vs Casual)

PRIVACY SETTINGS:
- Profile Visibility to Other Users
- Project Information Sharing
- Client Confidentiality Preferences
```

**Profile Editing Interface:**
```
USER: "Update my profile"

AI: "I'd be happy to help update your profile, Priya. What would you like to change?

Current highlights:
👤 Senior Casting Director, 12 years experience
🎬 Specializes in: Thriller, Drama, Crime series
📱 Works with: Netflix India, Amazon Prime
🏙️ Based in: Mumbai, covers all India

You can say things like:
• 'Add comedy to my specializations'
• 'Update my experience to 13 years'  
• 'I now work with Disney+ Hotstar too'
• 'Change my notification preferences'"

USER: "Add that I now work with Disney+ Hotstar and I'm interested in comedy projects"

AI: "Perfect updates! I've added:
✅ Disney+ Hotstar to your platform relationships
✅ Comedy to your genre specializations (alongside thriller, drama, crime)

Your profile now shows you're open to comedy projects. I'll start suggesting comedy-specific opportunities and tailor casting recommendations accordingly.

Anything else you'd like to update?"
```

**Acceptance Criteria:**
- ✅ Comprehensive industry-relevant profile fields
- ✅ Conversational profile editing (no forms)
- ✅ AI learns from profile to improve recommendations
- ✅ Privacy controls for sensitive information
- ✅ Portfolio/work history integration

---

#### **User Story 4.2: Team & Collaboration Settings**
**As a casting director working with a team**  
**I want** to manage team member access and collaboration preferences  
**So that** we can work efficiently while maintaining appropriate permissions

**Team Management:**
```
TEAM SETUP CONVERSATION:
USER: "I need to add my assistant Arjun to my account"

AI: "Great! Adding team members is easy. Let me set up Arjun's access.

🎭 TEAM MEMBER SETUP:
• Name: Arjun  
• Role: Casting Assistant
• Email: [user provides]

What level of access should Arjun have?
• Full Access: Can manage all projects and decisions
• Project Access: Can work on assigned projects only  
• View Only: Can see projects but not make changes
• Custom: Let's set specific permissions"

USER: "Project access, and he can shortlist actors but I need to approve final decisions"

AI: "Perfect setup! Arjun will have:
✅ Access to projects you assign
✅ Can search for actors and create shortlists  
✅ Cannot make final casting decisions (requires your approval)
✅ Can schedule auditions and manage logistics

I'll send Arjun an invitation. He'll get a personalized onboarding as your assistant, and I'll teach him how to collaborate with you effectively."

COLLABORATION FEATURES:
- Real-time project sharing
- Approval workflows
- Comment and feedback systems
- Activity tracking and notifications
```

**Acceptance Criteria:**
- ✅ Flexible team permission system
- ✅ Role-based access control
- ✅ Collaborative decision-making workflows
- ✅ Team activity tracking
- ✅ Easy team member invitation process

---

### 5. 💳 Subscription & Billing Management

#### **User Story 5.1: Mumbai-Optimized Pricing & Billing**
**As a Mumbai-based casting professional**  
**I want** transparent, local pricing with flexible payment options  
**So that** I can choose and manage a plan that fits my business needs

**Pricing Structure (from PRD):**
```
STARTER PLAN - ₹4,999/month
Target: Freelance casting directors
- 3 active projects
- 100 conversations/month
- Basic AI features
- Email support

PROFESSIONAL PLAN - ₹14,999/month  
Target: Mid-size casting agencies
- 10 active projects
- Unlimited conversations
- Advanced AI & memory features
- Priority support + collaboration (3 users)

STUDIO PLAN - ₹49,999/month
Target: Production houses, streaming platforms  
- Unlimited projects & conversations
- All AI features + API access
- Team collaboration (10 users)
- Custom integrations

ENTERPRISE - Custom Pricing
Target: Major studios, OTT platforms
- White-label options
- SLA guarantees + on-premise
- Custom AI training + dedicated support
```

**Billing Management Interface:**
```
USER: "I want to upgrade to Professional plan"

AI: "Excellent choice! Professional plan will give you:

🚀 IMMEDIATE UPGRADES:
• Unlimited conversations (vs current 100/month limit)
• 10 active projects (vs current 3)
• Advanced memory features
• Team collaboration for up to 3 users
• Priority support

💰 PRICING:
• ₹14,999/month (billed monthly)
• ₹1,49,990/year (2 months free if paid annually)
• Immediate upgrade, prorated billing

PAYMENT OPTIONS:
• Credit/Debit Card
• Net Banking
• UPI (PhonePe, Google Pay, Paytm)
• Bank Transfer for annual plans

Should I proceed with the upgrade?"

BILLING DASHBOARD:
- Current plan and usage
- Billing history and invoices  
- Payment method management
- Usage analytics and limits
- Upgrade/downgrade options
```

**Acceptance Criteria:**
- ✅ Clear plan comparison and benefits
- ✅ Multiple India-friendly payment options
- ✅ Transparent billing and usage tracking
- ✅ Easy plan changes and prorated billing
- ✅ GST compliance and proper invoicing

---

#### **User Story 5.2: Usage Analytics & Plan Optimization**
**As a subscription user**  
**I want** to understand my platform usage and get recommendations for plan optimization  
**So that** I can make informed decisions about my subscription

**Usage Analytics Dashboard:**
```
MONTHLY USAGE REPORT:
AI: "Here's your October usage summary, Priya:

📊 USAGE HIGHLIGHTS:
• Conversations: 247 (Professional plan = unlimited ✅)
• Active Projects: 8 (limit: 10, you have 2 slots available)
• Team Collaborators: 2 (limit: 3, can add 1 more)
• AI Features Used: Script analysis (12×), Talent search (89×), Smart suggestions (156×)

💡 OPTIMIZATION INSIGHTS:
• You're using Advanced AI features heavily - perfect for Professional plan
• Consider adding 1 more team member to maximize value
• Your project completion rate improved 40% this month!

📈 COMPARED TO LAST MONTH:
• 23% more conversations (increased efficiency)
• 2 additional projects completed
• 15% faster casting decisions

Keep up the great work! Your casting efficiency is impressive."

PLAN RECOMMENDATIONS:
- Upgrade suggestions based on usage patterns
- Cost optimization recommendations
- Feature utilization insights
```

**Acceptance Criteria:**
- ✅ Detailed usage analytics and insights
- ✅ Proactive plan optimization recommendations
- ✅ Performance metrics and improvements tracking
- ✅ Cost-benefit analysis for plan changes
- ✅ Industry benchmarking where possible

---

### 6. ⚙️ Settings & Platform Customization

#### **User Story 6.1: Personalized Platform Experience**
**As a casting director with specific working preferences**  
**I want** to customize how the platform works for my unique workflow  
**So that** it feels natural and enhances rather than disrupts my process

**Settings Categories:**
```
CONVERSATION PREFERENCES:
USER: "I want to customize how the AI talks to me"

AI: "Absolutely! Let's personalize our conversations. What would you prefer?

🗣️ COMMUNICATION STYLE:
• Formal & Professional (current)
• Casual & Friendly  
• Direct & Concise
• Detailed & Explanatory

⏰ RESPONSE TIMING:
• Instant responses
• Brief pause for thoughtful responses (current)
• Scheduled responses during work hours only

🎭 INDUSTRY LANGUAGE:
• Full casting jargon (assume expertise)
• Mix of jargon + explanations (current)
• Simple language with minimal jargon

📱 INTERACTION METHOD:
• Text-based conversation (current)
• Voice input/output options
• WhatsApp integration
• Email summaries"

WORKFLOW CUSTOMIZATION:
- Default project templates
- Shortlist formats and presentation
- Approval workflows
- Notification preferences
- Integration settings

PRIVACY & DATA SETTINGS:
- Conversation history retention
- Data sharing preferences  
- Anonymization options
- Export/backup settings
```

**Acceptance Criteria:**
- ✅ Granular customization options
- ✅ Conversational settings interface
- ✅ Real-time preview of changes
- ✅ Easy reset to defaults
- ✅ Settings sync across devices

---

#### **User Story 6.2: Integration & Workflow Settings**
**As a casting director using multiple tools**  
**I want** to integrate CastMatch AI with my existing workflow  
**So that** I can gradually adopt the platform without disrupting current projects

**Integration Options:**
```
INTEGRATION SETUP:
USER: "Can I connect this to my existing tools?"

AI: "Absolutely! Let's set up integrations to make your transition smooth.

📧 EMAIL INTEGRATION:
• Gmail/Outlook sync for casting correspondence
• Automatic project updates via email
• Shortlist sharing with stakeholders

📅 CALENDAR INTEGRATION:
• Google Calendar/Outlook for audition scheduling
• Automatic blocking for casting sessions
• Team calendar coordination

📱 WHATSAPP BUSINESS:
• Project updates and notifications
• Quick casting decisions on mobile
• Team communication integration

💾 DATA EXPORT/IMPORT:
• CSV export for existing tools
• Import talent databases
• Project history migration

🔗 THIRD-PARTY TOOLS:
• Casting Networks integration (future)
• Production management tools
• Accounting/invoicing systems"

WORKFLOW TEMPLATES:
- Customizable casting process templates
- Stakeholder approval workflows
- Communication templates
- Project milestone tracking
```

**Acceptance Criteria:**
- ✅ Multiple integration options available
- ✅ Easy setup and configuration process
- ✅ Data import/export functionality
- ✅ Workflow template customization
- ✅ Seamless transition from existing tools

---

## 🎯 **Complete User Journey Map**

### **From Landing to Active User:**

```
1. DISCOVERY (Landing Page):
   Visitor sees demo → Understands value → Signs up

2. SIGNUP & ONBOARDING:
   Account creation → Industry profiling → Personalized tutorial

3. FIRST PROJECT:
   Guided project creation → AI conversation demo → Value realization

4. ONGOING USE:
   Regular casting workflows → Team collaboration → Platform mastery

5. GROWTH & OPTIMIZATION:
   Usage analytics → Plan upgrades → Advanced features → Team expansion
```

---

## ✅ **Implementation Priority Order**

### **Phase 0A: Essential Foundation (Week 1-2)**
1. **Landing Page** - Marketing and conversion
2. **Authentication System** - Signup/signin with industry context  
3. **Basic User Profiles** - Essential information capture

### **Phase 0B: User Experience (Week 2-3)**
4. **Onboarding Flow** - Personalized first experience
5. **Settings & Preferences** - Basic customization
6. **Team Management** - Basic collaboration features

### **Phase 0C: Business Model (Week 3-4)**
7. **Subscription System** - Billing and plan management
8. **Usage Analytics** - Tracking and optimization
9. **Integrations** - Basic email/calendar connectivity

---

## 💡 **Technical Implementation Notes**

### **Authentication Architecture:**
```javascript
const authSystem = {
  providers: ["email", "google", "linkedin"],
  security: ["2FA", "session_management", "device_recognition"],
  userContext: {
    industry: "mumbai_ott_casting",
    experience: "senior_director | assistant | producer",
    platforms: ["netflix", "prime", "hotstar", "zee5"],
    preferences: "stored_for_personalization"
  }
};
```

### **Subscription Management:**
```javascript
const billingSystem = {
  plans: ["starter_4999", "professional_14999", "studio_49999", "enterprise"],
  currency: "INR",
  payments: ["razorpay", "stripe_india"],
  billing: ["monthly", "annual_discount"],
  usage_tracking: "conversations, projects, team_members, ai_features"
};
```

### **Profile & Settings Schema:**
```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY,
  industry_role VARCHAR(50), -- casting_director, assistant, producer
  experience_level VARCHAR(20), -- junior, mid, senior, expert  
  specializations JSONB, -- ["thriller", "comedy", "drama"]
  platforms JSONB, -- ["netflix", "prime", "hotstar"]
  location VARCHAR(100),
  team_size INTEGER,
  preferences JSONB -- communication style, workflow settings
);
```

---

**This comprehensive product infrastructure ensures we have a complete, professional platform that serves Mumbai OTT casting professionals from their first visit through to advanced platform mastery. Once this foundation is solid, we can build the revolutionary conversational AI features on top.**
