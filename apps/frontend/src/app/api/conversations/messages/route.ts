import { NextRequest, NextResponse } from 'next/server';

// Backend agent service URL (when available)
const BACKEND_URL = 'http://localhost:8000';
const AGENT_SERVICE_URL = 'http://localhost:3005';

// Advanced AI Agent Integration
async function tryBackendAgent(content: string, projectId: string, userId: string = 'demo-user') {
  try {
    // Try to use the backend agent service first
    const response = await fetch(`${BACKEND_URL}/api/conversations/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        conversationId: `demo-${Date.now()}`,
        userId,
        projectContext: { projectId },
      }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        data,
        source: 'backend_agents',
      };
    }
  } catch (error) {
    console.log('Backend agents unavailable, falling back to mock responses');
  }

  return { success: false };
}

// Enhanced Mock Casting Agent (mirrors backend agent capabilities)
async function generateCastingAgentResponse(content: string, projectId: string) {
  const query = content.toLowerCase();

  // Simulate realistic processing time
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

  // Detect agent intent (matching backend agent system)
  const agentResponse = detectAgentIntent(query, projectId);

  return {
    content: agentResponse.response,
    talentCards: agentResponse.talentCards || [],
    agentType: agentResponse.agentType,
    metadata: {
      detectedIntent: agentResponse.agentType,
      processingTime: '2.3s',
      confidence: agentResponse.confidence || 0.95,
    },
  };
}

// Agent Intent Detection (mirrors backend system)
function detectAgentIntent(query: string, projectId: string = 'mumbai-dreams') {
  // Script Analysis Agent
  if (
    query.includes('script') ||
    query.includes('character') ||
    query.includes('breakdown') ||
    query.includes('analyze')
  ) {
    return {
      agentType: 'script-analysis',
      confidence: 0.92,
      response: `🎬 **Script Analysis Agent Activated**

I can help analyze your script for casting requirements. Here's what I can do:

📝 **Script Analysis Capabilities:**
• **Character Breakdown**: Identify main and supporting roles
• **Age & Demographics**: Extract character age ranges and backgrounds  
• **Dialogue Complexity**: Assess language and accent requirements
• **Emotional Range**: Analyze required acting skills and intensity
• **Screen Time Analysis**: Estimate character importance and arc
• **Chemistry Requirements**: Identify character relationships

🎯 **For Detailed Analysis:**
Please share your script excerpt or character descriptions, and I'll provide:
- Comprehensive character profiles
- Recommended actor types and skills
- Budget estimates for each role
- Timeline for casting process

Would you like to upload a script or describe specific characters you need to cast?`,
    };
  }

  // Talent Discovery Agent
  if (
    query.includes('find') ||
    query.includes('search') ||
    query.includes('talent') ||
    query.includes('actor') ||
    query.includes('male lead') ||
    query.includes('female lead')
  ) {
    const talentCards = [];
    let responseText = '';

    if (query.includes('male lead') || query.includes('hero')) {
      responseText = `🎭 **Talent Discovery Agent - Male Lead Search**

Based on your project requirements for **${projectId.replace('-', ' ').toUpperCase()}**, I've identified top male lead candidates:`;

      talentCards.push(
        {
          id: 1,
          name: 'Arjun Malhotra',
          age: 29,
          experience: '7 years',
          location: 'Mumbai',
          specialties: ['Method Acting', 'Drama', 'Romance', 'Commercial'],
          photo: '/api/placeholder/150/200',
          match: 96,
          rate: '₹12-18L per project',
          availability: 'Available from next month',
          languages: ['Hindi', 'English', 'Punjabi'],
          training: 'FTII Pune Graduate',
          recentWork: "Lead role in 'Mumbai Chronicles' (2023)",
          strengths: ['Strong screen presence', 'Versatile performer', 'Method acting background'],
          socialMedia: '2.1M Instagram followers',
        },
        {
          id: 2,
          name: 'Vikram Singh',
          age: 32,
          experience: '9 years',
          location: 'Mumbai',
          specialties: ['Drama', 'Thriller', 'Action', 'Web Series'],
          photo: '/api/placeholder/150/200',
          match: 91,
          rate: '₹18-25L per project',
          availability: 'Available from March 2024',
          languages: ['Hindi', 'English', 'Marathi', 'Gujarati'],
          training: 'NSD New Delhi',
          recentWork: "Critically acclaimed 'Dark Streets' (2023)",
          strengths: ['Award-winning performances', 'High commercial viability', 'Strong fan base'],
          socialMedia: '1.8M Instagram followers',
        },
        {
          id: 3,
          name: 'Rohit Agarwal',
          age: 26,
          experience: '4 years',
          location: 'Mumbai',
          specialties: ['Romance', 'Youth-oriented', 'Commercial', 'Comedy'],
          photo: '/api/placeholder/150/200',
          match: 87,
          rate: '₹8-12L per project',
          availability: 'Available immediately',
          languages: ['Hindi', 'English', 'Bengali'],
          training: 'Mumbai Theatre Workshop',
          recentWork: "Rising star in 'College Romance 2' (2023)",
          strengths: ['Fresh face', 'Strong youth appeal', 'Cost-effective'],
          socialMedia: '950K Instagram followers',
        }
      );
    } else if (query.includes('female lead') || query.includes('heroine')) {
      responseText = `🎭 **Talent Discovery Agent - Female Lead Search**

Perfect female lead candidates for **${projectId.replace('-', ' ').toUpperCase()}**:`;

      talentCards.push(
        {
          id: 4,
          name: 'Priya Sharma',
          age: 27,
          experience: '6 years',
          location: 'Mumbai',
          specialties: ['Drama', 'Romance', 'Independent Cinema', 'Method Acting'],
          photo: '/api/placeholder/150/200',
          match: 94,
          rate: '₹15-22L per project',
          availability: 'Available',
          languages: ['Hindi', 'English', 'Tamil', 'Telugu'],
          training: "Anupam Kher's Actor Prepares",
          recentWork: "National Award nominee 'Silent Voices' (2023)",
          strengths: ['Critically acclaimed', 'Multilingual', 'Award-winning talent'],
          socialMedia: '1.5M Instagram followers',
        },
        {
          id: 5,
          name: 'Ananya Kapoor',
          age: 24,
          experience: '5 years',
          location: 'Mumbai',
          specialties: ['Commercial Cinema', 'Romance', 'Comedy', 'Dance'],
          photo: '/api/placeholder/150/200',
          match: 89,
          rate: '₹10-16L per project',
          availability: 'Available from February',
          languages: ['Hindi', 'English', 'Punjabi'],
          training: 'Shiamak Davar Dance Academy + Acting',
          recentWork: "Box office hit 'Love Actually' (2023)",
          strengths: ['Commercial appeal', 'Dance skills', 'High energy performances'],
          socialMedia: '2.8M Instagram followers',
        }
      );
    } else {
      responseText = `🎭 **Talent Discovery Agent Activated**

I can help you find the perfect talent for your project. Let me know:

🔍 **Search Parameters:**
• **Role Type**: Lead, Supporting, Character role?
• **Gender & Age Range**: Specific requirements?
• **Skills**: Acting style, special skills, languages?
• **Experience Level**: Fresh faces or established actors?
• **Budget Range**: Rate expectations?
• **Availability**: Shooting timeline?

💡 **Popular Searches:**
• "Find male lead for romantic drama"
• "Search female supporting actress with comedy background" 
• "Need child actors aged 8-12 for family film"
• "Looking for character actors for thriller series"

What specific talent are you looking for today?`;
    }

    return {
      agentType: 'talent-discovery',
      confidence: 0.95,
      response: responseText,
      talentCards,
    };
  }

  // Audition Scheduling Agent
  if (
    query.includes('audition') ||
    query.includes('schedule') ||
    query.includes('appointment') ||
    query.includes('calendar')
  ) {
    return {
      agentType: 'audition-scheduling',
      confidence: 0.91,
      response: `📅 **Audition Scheduling Agent Activated**

I'll help optimize your audition scheduling for maximum efficiency:

🗓️ **Smart Scheduling Features:**
• **Conflict Detection**: Avoid double-bookings and overlaps
• **Travel Time**: Factor in Mumbai traffic and location changes  
• **Actor Preferences**: Consider preferred time slots
• **Role Grouping**: Schedule similar character types together
• **Callback Planning**: Reserve slots for second rounds

⏰ **Recommended Schedule Structure:**

**Morning Block (9:00 AM - 1:00 PM)**
• Lead roles (fresh energy, best lighting)
• 20-minute slots with 10-min buffer

**Afternoon Block (2:00 PM - 6:00 PM)** 
• Supporting roles and character parts
• 15-minute slots with 5-min buffer

**Evening Block (6:00 PM - 8:00 PM)**
• Callbacks and final decisions only

📋 **Next Steps:**
1. Share your shortlisted actors
2. Specify audition location and requirements
3. I'll create an optimized schedule with automated notifications

Ready to schedule auditions? Share your talent list!`,
    };
  }

  // Budget Optimization Agent
  if (
    query.includes('budget') ||
    query.includes('cost') ||
    query.includes('pricing') ||
    query.includes('rate')
  ) {
    return {
      agentType: 'budget-optimization',
      confidence: 0.9,
      response: `💰 **Budget Optimization Agent Activated**

Here's a comprehensive casting budget analysis for your project:

📊 **Current Mumbai Market Rates (2024):**

**🌟 Lead Actors**
• A-List Stars: ₹1-5 Crores per project
• Established Leads: ₹30-80L per project  
• Rising Stars: ₹10-25L per project
• Fresh Faces: ₹3-8L per project

**🎭 Supporting Cast**
• Veteran Character Actors: ₹8-20L per project
• Experienced Supporting: ₹3-8L per project
• Theatre Actors: ₹1-4L per project
• New Talent: ₹50K-2L per project

**👥 Additional Costs**
• Casting Director Fee: 8-15% of talent budget
• Audition Expenses: ₹2-5L (studio, travel, food)
• Agent Commissions: 10-15% of actor fees
• Legal & Contract: ₹1-3L per major contract

💡 **Optimization Strategies:**
• Mix established and fresh talent (60:40 ratio)
• Negotiate package deals for multi-role actors
• Consider profit-sharing for budget-conscious projects
• Use local talent to reduce travel costs

What's your target budget range? I can suggest optimal talent combinations!`,
    };
  }

  // Communication Agent
  if (
    query.includes('notify') ||
    query.includes('email') ||
    query.includes('message') ||
    query.includes('contact') ||
    query.includes('follow up')
  ) {
    return {
      agentType: 'communication',
      confidence: 0.88,
      response: `📨 **Communication Agent Activated**

I'll handle all your casting communication needs efficiently:

📧 **Automated Communication Services:**

**For Selected Actors:**
• Audition confirmations with details and scripts
• Schedule changes and updates
• Callback notifications
• Final selection announcements

**For Casting Directors:**
• Daily progress reports
• Talent availability updates  
• Budget tracking alerts
• Deadline reminders

**For Stakeholders:**
• Producer updates with shortlists
• Director consultation schedules
• Investor progress presentations
• Media coordination (when needed)

🎯 **Smart Communication Features:**
• WhatsApp integration for instant updates
• Email templates for professional outreach
• SMS alerts for urgent changes
• Automated follow-ups for pending responses

📝 **Popular Templates:**
• "Congratulations! You've been shortlisted..."
• "Audition rescheduled to..."
• "Thank you for auditioning, callback details..."
• "Project update for stakeholders..."

What communication do you need to send out today?`,
    };
  }

  // Default Casting Assistant Response
  return {
    agentType: 'general-assistant',
    confidence: 0.85,
    response: `🎬 **CastMatch AI Casting Director**

Hello! I'm your intelligent casting assistant with access to 14 specialized agents:

🎭 **Core Casting Services:**
• **Talent Discovery**: Find actors by role, skills, and requirements
• **Script Analysis**: Extract character breakdowns and casting needs
• **Audition Scheduling**: Optimize appointments and manage calendars
• **Budget Optimization**: Plan costs and negotiate rates
• **Application Screening**: Rank and shortlist candidates

⚡ **Advanced Capabilities:**
• **Decision Support**: AI-powered casting recommendations  
• **Progress Tracking**: Monitor project timelines and milestones
• **Communication**: Automated outreach and notifications
• **Quality Assurance**: Validate casting decisions
• **Crisis Management**: Handle emergencies and backup plans

🚀 **Ready to Help With:**
• "Find me a male lead for romantic drama"
• "Analyze this script for character requirements"  
• "Schedule auditions for next week"
• "What's the budget for casting this project?"
• "Send audition confirmations to selected actors"

What aspect of casting can I help you with today? Just describe what you need and I'll activate the right specialist agent! 🎯`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, projectId } = body;

    // Try backend agents first
    const backendResult = await tryBackendAgent(content, projectId);

    if (backendResult.success) {
      return NextResponse.json(backendResult.data);
    }

    // Fallback to enhanced mock casting agent
    const mockResponse = await generateCastingAgentResponse(content, projectId);

    return NextResponse.json({
      ...mockResponse,
      source: 'mock_agent',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
