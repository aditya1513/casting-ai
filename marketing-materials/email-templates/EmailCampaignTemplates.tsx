import React from 'react';

interface EmailTemplateProps {
  type: 'welcome' | 'launch' | 'reminder' | 'success' | 'weekly';
  recipientName: string;
  language: 'en' | 'hi';
}

export const EmailTemplate: React.FC<EmailTemplateProps> = ({ 
  type, 
  recipientName,
  language = 'en' 
}) => {
  const templates = {
    welcome: {
      en: {
        subject: "Welcome to CastMatch - Your Journey Begins! 🎬",
        preheader: "Thank you for joining Mumbai's casting revolution",
        headline: "Welcome to the Future of Casting",
        body: `Dear ${recipientName},\n\nCongratulations on taking the first step towards your dreams! You're now part of an exclusive community that's revolutionizing how talent meets opportunity in Mumbai.\n\nCastMatch launches on January 13, 2025, and as an early member, you'll get priority access to:\n\n• 10,000+ casting opportunities\n• AI-powered role matching\n• Direct connections with casting directors\n• Professional portfolio tools\n\nGet ready to transform your career!`,
        cta: "Complete Your Profile",
        footer: "Questions? Reply to this email or visit help.castmatch.ai"
      },
      hi: {
        subject: "CastMatch में आपका स्वागत है - आपकी यात्रा शुरू होती है! 🎬",
        preheader: "मुंबई की कास्टिंग क्रांति में शामिल होने के लिए धन्यवाद",
        headline: "कास्टिंग के भविष्य में आपका स्वागत है",
        body: `प्रिय ${recipientName},\n\nअपने सपनों की ओर पहला कदम उठाने के लिए बधाई! अब आप एक विशेष समुदाय का हिस्सा हैं जो मुंबई में प्रतिभा और अवसर के मिलन के तरीके में क्रांति ला रहा है।\n\nCastMatch 13 जनवरी, 2025 को लॉन्च होगा, और एक प्रारंभिक सदस्य के रूप में, आपको प्राथमिकता पहुंच मिलेगी:\n\n• 10,000+ कास्टिंग अवसर\n• AI-संचालित भूमिका मैचिंग\n• कास्टिंग निर्देशकों से सीधे संपर्क\n• पेशेवर पोर्टफोलियो उपकरण\n\nअपने करियर को बदलने के लिए तैयार हो जाइए!`,
        cta: "अपनी प्रोफ़ाइल पूरी करें",
        footer: "प्रश्न? इस ईमेल का उत्तर दें या help.castmatch.ai पर जाएं"
      }
    },
    launch: {
      en: {
        subject: "🚀 CastMatch is LIVE - Start Your Journey NOW!",
        preheader: "The wait is over - Mumbai's casting revolution begins today",
        headline: "IT'S LAUNCH DAY!",
        body: `Dear ${recipientName},\n\nThe moment we've all been waiting for is here! CastMatch is officially LIVE in Mumbai!\n\nToday marks the beginning of a new era in casting. No more endless queues, no more missed opportunities. Just pure talent meeting perfect roles.\n\n🎬 What's waiting for you:\n• Instant access to thousands of casting calls\n• AI that understands your unique talent\n• One-tap applications\n• Real-time notifications\n\n🎁 Launch Day Special:\nFirst 1000 users get 3 months of Premium features FREE!\n\nDon't wait - your breakthrough role could be just one tap away!`,
        cta: "Launch CastMatch Now",
        footer: "This is your moment. Make it count!"
      },
      hi: {
        subject: "🚀 CastMatch LIVE है - अपनी यात्रा अभी शुरू करें!",
        preheader: "इंतज़ार खत्म हुआ - मुंबई की कास्टिंग क्रांति आज शुरू होती है",
        headline: "लॉन्च दिवस है!",
        body: `प्रिय ${recipientName},\n\nवह क्षण आ गया है जिसका हम सब इंतज़ार कर रहे थे! CastMatch आधिकारिक तौर पर मुंबई में LIVE है!\n\nआज कास्टिंग में एक नए युग की शुरुआत है। अब और लंबी कतारें नहीं, और छूटे हुए अवसर नहीं। बस शुद्ध प्रतिभा सही भूमिकाओं से मिल रही है।\n\n🎬 आपके लिए क्या इंतज़ार कर रहा है:\n• हज़ारों कास्टिंग कॉल तक तत्काल पहुंच\n• AI जो आपकी अनूठी प्रतिभा को समझता है\n• वन-टैप आवेदन\n• रियल-टाइम सूचनाएं\n\n🎁 लॉन्च डे विशेष:\nपहले 1000 उपयोगकर्ताओं को 3 महीने की प्रीमियम सुविधाएं मुफ्त!\n\nइंतज़ार न करें - आपकी सफलता की भूमिका बस एक टैप दूर हो सकती है!`,
        cta: "CastMatch अभी लॉन्च करें",
        footer: "यह आपका क्षण है। इसे महत्वपूर्ण बनाएं!"
      }
    },
    reminder: {
      en: {
        subject: "⏰ Only 3 Days Until CastMatch Launch!",
        preheader: "Don't miss your chance to be among the first",
        headline: "The Countdown is On!",
        body: `Dear ${recipientName},\n\nIn just 3 days, everything changes for Mumbai's entertainment industry.\n\nCastMatch launches January 13, and you don't want to be left behind while others are landing their dream roles.\n\n✅ Have you completed your profile?\n✅ Uploaded your best headshots?\n✅ Added your showreel?\n\nDo it now and be ready to apply for roles the moment we go live!\n\nRemember: Early birds get exclusive access to premium casting calls that won't be available later.`,
        cta: "Prepare Your Profile",
        footer: "See you on launch day!"
      },
      hi: {
        subject: "⏰ CastMatch लॉन्च में केवल 3 दिन!",
        preheader: "पहले लोगों में शामिल होने का अवसर न चूकें",
        headline: "उलटी गिनती चल रही है!",
        body: `प्रिय ${recipientName},\n\nकेवल 3 दिनों में, मुंबई के मनोरंजन उद्योग के लिए सब कुछ बदल जाता है।\n\nCastMatch 13 जनवरी को लॉन्च होता है, और आप पीछे नहीं रहना चाहेंगे जबकि अन्य अपनी सपनों की भूमिकाएं पा रहे हैं।\n\n✅ क्या आपने अपनी प्रोफ़ाइल पूरी की है?\n✅ अपनी सर्वश्रेष्ठ तस्वीरें अपलोड की हैं?\n✅ अपना शोरील जोड़ा है?\n\nअभी करें और जैसे ही हम लाइव होते हैं, भूमिकाओं के लिए आवेदन करने के लिए तैयार रहें!\n\nयाद रखें: जल्दी आने वाले लोगों को प्रीमियम कास्टिंग कॉल तक विशेष पहुंच मिलती है जो बाद में उपलब्ध नहीं होगी।`,
        cta: "अपनी प्रोफ़ाइल तैयार करें",
        footer: "लॉन्च दिवस पर मिलते हैं!"
      }
    }
  };

  const template = templates[type];
  const content = template[language];

  return (
    <div className="email-template" style={{ fontFamily: 'Inter, Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <style>{`
        .email-header {
          background: linear-gradient(135deg, #0A0E27 0%, #1A1E37 100%);
          padding: 40px;
          text-align: center;
          border-radius: 12px 12px 0 0;
        }

        .email-logo {
          width: 120px;
          height: 120px;
          background: linear-gradient(135deg, #FFD700 0%, #FF0066 50%, #00D9FF 100%);
          border-radius: 50%;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          font-weight: 800;
          color: #FFFFFF;
        }

        .email-headline {
          color: #FFFFFF;
          font-size: 32px;
          font-weight: 800;
          margin: 0;
          background: linear-gradient(135deg, #FFD700 0%, #00D9FF 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .email-body {
          background: #FFFFFF;
          padding: 40px;
          border-left: 1px solid #E5E5E5;
          border-right: 1px solid #E5E5E5;
        }

        .email-content {
          color: #333333;
          font-size: 16px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .email-cta {
          text-align: center;
          margin: 40px 0;
        }

        .cta-button {
          display: inline-block;
          padding: 16px 48px;
          background: linear-gradient(135deg, #FF0066 0%, #FFD700 100%);
          color: #FFFFFF;
          text-decoration: none;
          border-radius: 50px;
          font-size: 18px;
          font-weight: 700;
          transition: transform 0.3s ease;
        }

        .cta-button:hover {
          transform: translateY(-2px);
        }

        .email-footer {
          background: #F5F5F5;
          padding: 24px;
          text-align: center;
          border-radius: 0 0 12px 12px;
          border: 1px solid #E5E5E5;
          border-top: none;
        }

        .footer-text {
          color: #666666;
          font-size: 14px;
          margin: 0;
        }

        .social-links {
          margin-top: 20px;
          display: flex;
          justify-content: center;
          gap: 20px;
        }

        .social-icon {
          width: 32px;
          height: 32px;
          background: #0A0E27;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          text-decoration: none;
        }

        .unsubscribe {
          margin-top: 20px;
          font-size: 12px;
          color: #999999;
        }

        .unsubscribe a {
          color: #00D9FF;
          text-decoration: none;
        }
      `}</style>

      {/* Email Header */}
      <div className="email-header">
        <div className="email-logo">CM</div>
        <h1 className="email-headline">{content.headline}</h1>
      </div>

      {/* Email Body */}
      <div className="email-body">
        <div className="email-content">{content.body}</div>
        
        <div className="email-cta">
          <a href="https://castmatch.ai" className="cta-button">{content.cta}</a>
        </div>
      </div>

      {/* Email Footer */}
      <div className="email-footer">
        <p className="footer-text">{content.footer}</p>
        
        <div className="social-links">
          <a href="#" className="social-icon">📧</a>
          <a href="#" className="social-icon">📱</a>
          <a href="#" className="social-icon">💼</a>
          <a href="#" className="social-icon">🐦</a>
        </div>

        <div className="unsubscribe">
          <a href="#">Unsubscribe</a> | <a href="#">Update Preferences</a>
        </div>
      </div>
    </div>
  );
};

// Email Campaign Schedule
export const EmailCampaignSchedule = {
  prelaunch: [
    { day: -30, type: 'welcome', segment: 'new_signups' },
    { day: -14, type: 'feature_highlight', segment: 'all' },
    { day: -7, type: 'countdown', segment: 'all' },
    { day: -3, type: 'reminder', segment: 'incomplete_profiles' },
    { day: -1, type: 'final_reminder', segment: 'all' }
  ],
  launch: [
    { day: 0, type: 'launch', segment: 'all', time: '00:01 IST' },
    { day: 0, type: 'launch_reminder', segment: 'unopened', time: '12:00 IST' },
    { day: 0, type: 'launch_evening', segment: 'unopened', time: '18:00 IST' }
  ],
  postlaunch: [
    { day: 1, type: 'success_stories', segment: 'active_users' },
    { day: 3, type: 'tips', segment: 'new_users' },
    { day: 7, type: 'weekly_opportunities', segment: 'all' },
    { day: 14, type: 'milestone', segment: 'all' }
  ]
};

// A/B Testing Variants
export const EmailABTestVariants = {
  subjectLines: {
    A: "Your Bollywood Dream Starts Now 🎬",
    B: "10,000+ Casting Calls Waiting for You",
    C: "Join Mumbai's Casting Revolution Today"
  },
  ctaButtons: {
    A: "Start Your Journey",
    B: "Join CastMatch",
    C: "Get Instant Access"
  },
  preheaders: {
    A: "Limited time - First 1000 users get premium free",
    B: "AI-powered casting is here",
    C: "Transform your career in minutes"
  }
};