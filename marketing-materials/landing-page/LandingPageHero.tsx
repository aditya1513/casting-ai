import React, { useState, useEffect } from 'react';

interface LandingPageHeroProps {
  variant: 'desktop' | 'mobile' | 'tablet';
  language: 'en' | 'hi' | 'mr';
}

export const LandingPageHero: React.FC<LandingPageHeroProps> = ({ 
  variant = 'desktop',
  language = 'en' 
}) => {
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const launchDate = new Date('2025-01-13T00:00:00+05:30'); // Mumbai time
    
    const timer = setInterval(() => {
      const now = new Date();
      const difference = launchDate.getTime() - now.getTime();
      
      if (difference > 0) {
        setCountdown({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const content = {
    en: {
      headline: "Your Bollywood Dream Starts Here",
      subheadline: "AI-powered casting platform connecting Mumbai's talent with opportunities",
      cta: {
        primary: "Join Early Access",
        secondary: "Watch Demo"
      },
      features: [
        "10,000+ Active Casting Calls",
        "AI-Powered Role Matching",
        "Direct Connect with Directors",
        "Portfolio Management"
      ],
      countdown: {
        label: "Launching in Mumbai",
        days: "Days",
        hours: "Hours",
        minutes: "Minutes",
        seconds: "Seconds"
      }
    },
    hi: {
      headline: "आपका बॉलीवुड सपना यहाँ शुरू होता है",
      subheadline: "AI-संचालित कास्टिंग प्लेटफॉर्म जो मुंबई की प्रतिभा को अवसरों से जोड़ता है",
      cta: {
        primary: "जल्दी पहुंच में शामिल हों",
        secondary: "डेमो देखें"
      },
      features: [
        "10,000+ सक्रिय कास्टिंग कॉल",
        "AI-संचालित भूमिका मैचिंग",
        "निर्देशकों से सीधा संपर्क",
        "पोर्टफोलियो प्रबंधन"
      ],
      countdown: {
        label: "मुंबई में लॉन्च हो रहा है",
        days: "दिन",
        hours: "घंटे",
        minutes: "मिनट",
        seconds: "सेकंड"
      }
    },
    mr: {
      headline: "तुमचे बॉलीवुड स्वप्न इथे सुरू होते",
      subheadline: "AI-चालित कास्टिंग प्लॅटफॉर्म जो मुंबईची प्रतिभा संधींशी जोडते",
      cta: {
        primary: "लवकर प्रवेशात सामील व्हा",
        secondary: "डेमो पहा"
      },
      features: [
        "10,000+ सक्रिय कास्टिंग कॉल",
        "AI-चालित भूमिका मॅचिंग",
        "दिग्दर्शकांशी थेट संपर्क",
        "पोर्टफोलिओ व्यवस्थापन"
      ],
      countdown: {
        label: "मुंबईत लॉन्च होत आहे",
        days: "दिवस",
        hours: "तास",
        minutes: "मिनिटे",
        seconds: "सेकंद"
      }
    }
  };

  const text = content[language];

  return (
    <div className={`landing-hero landing-hero--${variant}`}>
      <style jsx>{`
        .landing-hero {
          position: relative;
          width: 100%;
          min-height: 100vh;
          background: linear-gradient(135deg, #0A0E27 0%, #1A1E37 50%, #0A0E27 100%);
          overflow: hidden;
        }

        .hero-container {
          max-width: 1440px;
          margin: 0 auto;
          padding: ${variant === 'mobile' ? '40px 20px' : '80px 40px'};
          position: relative;
          z-index: 10;
        }

        .hero-content {
          display: grid;
          grid-template-columns: ${variant === 'desktop' ? '1fr 1fr' : '1fr'};
          gap: 60px;
          align-items: center;
        }

        .hero-text {
          color: #FFFFFF;
        }

        .hero-headline {
          font-size: ${variant === 'mobile' ? '36px' : '64px'};
          font-weight: 800;
          line-height: 1.1;
          background: linear-gradient(135deg, #FFD700 0%, #FF0066 50%, #00D9FF 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 24px;
        }

        .hero-subheadline {
          font-size: ${variant === 'mobile' ? '18px' : '24px'};
          font-weight: 400;
          opacity: 0.9;
          margin-bottom: 40px;
          line-height: 1.5;
        }

        .hero-cta {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 60px;
        }

        .btn {
          padding: ${variant === 'mobile' ? '14px 28px' : '18px 40px'};
          font-size: ${variant === 'mobile' ? '16px' : '18px'};
          font-weight: 700;
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          text-decoration: none;
          display: inline-block;
        }

        .btn-primary {
          background: linear-gradient(135deg, #FF0066 0%, #FFD700 100%);
          color: #FFFFFF;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(255, 0, 102, 0.3);
        }

        .btn-secondary {
          background: transparent;
          color: #00D9FF;
          border: 2px solid #00D9FF;
        }

        .btn-secondary:hover {
          background: #00D9FF;
          color: #0A0E27;
        }

        .countdown-section {
          margin-bottom: 40px;
        }

        .countdown-label {
          font-size: 18px;
          color: #00D9FF;
          margin-bottom: 20px;
        }

        .countdown-boxes {
          display: flex;
          gap: 20px;
        }

        .countdown-box {
          background: rgba(0, 217, 255, 0.1);
          border: 1px solid rgba(0, 217, 255, 0.3);
          border-radius: 12px;
          padding: 16px;
          min-width: ${variant === 'mobile' ? '60px' : '80px'};
          text-align: center;
        }

        .countdown-number {
          font-size: ${variant === 'mobile' ? '24px' : '32px'};
          font-weight: 800;
          color: #FFD700;
        }

        .countdown-unit {
          font-size: 12px;
          color: #FFFFFF;
          opacity: 0.7;
          text-transform: uppercase;
        }

        .features-list {
          display: grid;
          grid-template-columns: ${variant === 'mobile' ? '1fr' : 'repeat(2, 1fr)'};
          gap: 20px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .feature-icon {
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #00D9FF 0%, #FFD700 100%);
          border-radius: 50%;
          flex-shrink: 0;
        }

        .feature-text {
          font-size: 16px;
          color: #FFFFFF;
          opacity: 0.9;
        }

        .hero-visual {
          position: relative;
          height: ${variant === 'mobile' ? '300px' : '600px'};
        }

        .floating-cards {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .floating-card {
          position: absolute;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 24px;
          animation: float 20s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-20px) rotate(2deg); }
          50% { transform: translateY(0px) rotate(-1deg); }
          75% { transform: translateY(-10px) rotate(1deg); }
        }

        .card-1 {
          top: 10%;
          left: 10%;
          width: 200px;
          animation-delay: 0s;
        }

        .card-2 {
          top: 40%;
          right: 20%;
          width: 180px;
          animation-delay: 5s;
        }

        .card-3 {
          bottom: 20%;
          left: 30%;
          width: 220px;
          animation-delay: 10s;
        }

        .background-pattern {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.05;
          pointer-events: none;
        }
      `}</style>

      <div className="background-pattern">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#00D9FF" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-headline">{text.headline}</h1>
            <p className="hero-subheadline">{text.subheadline}</p>

            <div className="countdown-section">
              <div className="countdown-label">{text.countdown.label}</div>
              <div className="countdown-boxes">
                <div className="countdown-box">
                  <div className="countdown-number">{countdown.days}</div>
                  <div className="countdown-unit">{text.countdown.days}</div>
                </div>
                <div className="countdown-box">
                  <div className="countdown-number">{countdown.hours}</div>
                  <div className="countdown-unit">{text.countdown.hours}</div>
                </div>
                <div className="countdown-box">
                  <div className="countdown-number">{countdown.minutes}</div>
                  <div className="countdown-unit">{text.countdown.minutes}</div>
                </div>
                <div className="countdown-box">
                  <div className="countdown-number">{countdown.seconds}</div>
                  <div className="countdown-unit">{text.countdown.seconds}</div>
                </div>
              </div>
            </div>

            <div className="hero-cta">
              <button className="btn btn-primary">{text.cta.primary}</button>
              <button className="btn btn-secondary">{text.cta.secondary}</button>
            </div>

            <div className="features-list">
              {text.features.map((feature, index) => (
                <div key={index} className="feature-item">
                  <div className="feature-icon"></div>
                  <span className="feature-text">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {variant === 'desktop' && (
            <div className="hero-visual">
              <div className="floating-cards">
                <div className="floating-card card-1">
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎬</div>
                  <div style={{ color: '#FFD700', fontWeight: 700 }}>500+</div>
                  <div style={{ fontSize: '14px', opacity: 0.7 }}>Daily Auditions</div>
                </div>
                <div className="floating-card card-2">
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>⭐</div>
                  <div style={{ color: '#00D9FF', fontWeight: 700 }}>95%</div>
                  <div style={{ fontSize: '14px', opacity: 0.7 }}>Match Success</div>
                </div>
                <div className="floating-card card-3">
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎭</div>
                  <div style={{ color: '#FF0066', fontWeight: 700 }}>24/7</div>
                  <div style={{ fontSize: '14px', opacity: 0.7 }}>AI Support</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};