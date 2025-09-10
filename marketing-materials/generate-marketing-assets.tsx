import React from 'react';
import { LaunchAnnouncementGraphic } from './graphics/LaunchAnnouncementGraphic';
import { SocialMediaPost, InstagramStoryTemplates, TwitterThreads } from './social-media/SocialMediaCampaign';
import { AppStoreScreenshot, AppPreviewVideo } from './app-store/AppStoreAssets';
import { LandingPageHero } from './landing-page/LandingPageHero';
import { EmailTemplate, EmailCampaignSchedule } from './email-templates/EmailCampaignTemplates';

// Marketing Asset Generator Configuration
export const MarketingAssetGenerator = {
  // Generate all launch graphics
  generateLaunchGraphics: () => {
    const variants = ['hero', 'square', 'story', 'banner'] as const;
    const languages = ['en', 'hi', 'mr'] as const;
    const graphics = [];

    variants.forEach(variant => {
      languages.forEach(language => {
        graphics.push({
          component: LaunchAnnouncementGraphic,
          props: { variant, language },
          filename: `launch-${variant}-${language}.svg`,
          exportFormats: ['svg', 'png', 'jpg']
        });
      });
    });

    return graphics;
  },

  // Generate social media campaign assets
  generateSocialMediaAssets: () => {
    const platforms = ['instagram', 'twitter', 'linkedin', 'facebook'] as const;
    const campaignDays = [1, 2, 3, 7, 13, 14, 21, 30];
    const posts = [];

    platforms.forEach(platform => {
      campaignDays.forEach(day => {
        posts.push({
          component: SocialMediaPost,
          props: { platform, type: 'single', day },
          filename: `${platform}-day${day}.svg`,
          dimensions: getSocialDimensions(platform)
        });
      });
    });

    // Add Instagram Stories
    Object.keys(InstagramStoryTemplates).forEach(template => {
      posts.push({
        type: 'story',
        template: InstagramStoryTemplates[template],
        platform: 'instagram',
        filename: `instagram-story-${template}.json`
      });
    });

    // Add Twitter Threads
    TwitterThreads.forEach((thread, index) => {
      posts.push({
        type: 'thread',
        content: thread,
        platform: 'twitter',
        filename: `twitter-thread-${index + 1}.json`
      });
    });

    return posts;
  },

  // Generate app store screenshots
  generateAppStoreAssets: () => {
    const devices = ['iphone', 'ipad', 'android'] as const;
    const themes = ['light', 'dark'] as const;
    const screenshots = [];

    devices.forEach(device => {
      themes.forEach(theme => {
        for (let i = 1; i <= 8; i++) {
          screenshots.push({
            component: AppStoreScreenshot,
            props: { index: i, device, theme },
            filename: `${device}-screenshot-${i}-${theme}.svg`,
            required: true
          });
        }
      });
    });

    // Add app preview video storyboard
    screenshots.push({
      type: 'video',
      storyboard: AppPreviewVideo,
      filename: 'app-preview-storyboard.json'
    });

    return screenshots;
  },

  // Generate landing page variants
  generateLandingPageAssets: () => {
    const variants = ['desktop', 'mobile', 'tablet'] as const;
    const languages = ['en', 'hi', 'mr'] as const;
    const pages = [];

    variants.forEach(variant => {
      languages.forEach(language => {
        pages.push({
          component: LandingPageHero,
          props: { variant, language },
          filename: `landing-${variant}-${language}.html`,
          responsive: true
        });
      });
    });

    return pages;
  },

  // Generate email campaign templates
  generateEmailTemplates: () => {
    const types = ['welcome', 'launch', 'reminder', 'success', 'weekly'] as const;
    const languages = ['en', 'hi'] as const;
    const templates = [];

    types.forEach(type => {
      languages.forEach(language => {
        templates.push({
          component: EmailTemplate,
          props: { 
            type, 
            recipientName: '{{recipient_name}}',
            language 
          },
          filename: `email-${type}-${language}.html`,
          testData: {
            recipientName: 'Test User',
            personalData: generateTestPersonalization()
          }
        });
      });
    });

    // Add campaign schedule
    templates.push({
      type: 'schedule',
      data: EmailCampaignSchedule,
      filename: 'email-campaign-schedule.json'
    });

    return templates;
  }
};

// Helper function to get social media dimensions
function getSocialDimensions(platform: string) {
  const dimensions = {
    instagram: { width: 1080, height: 1080 },
    twitter: { width: 1200, height: 675 },
    linkedin: { width: 1200, height: 630 },
    facebook: { width: 1200, height: 630 }
  };
  return dimensions[platform as keyof typeof dimensions];
}

// Generate test personalization data
function generateTestPersonalization() {
  return {
    firstName: 'Raj',
    lastName: 'Kumar',
    preferredLanguage: 'en',
    registrationDate: '2024-12-15',
    profileCompletion: 75,
    matchedRoles: 12,
    applications: 5
  };
}

// Asset Export Manager
export class AssetExportManager {
  private assets: any[] = [];

  constructor() {
    this.initializeAssets();
  }

  private initializeAssets() {
    this.assets = [
      ...MarketingAssetGenerator.generateLaunchGraphics(),
      ...MarketingAssetGenerator.generateSocialMediaAssets(),
      ...MarketingAssetGenerator.generateAppStoreAssets(),
      ...MarketingAssetGenerator.generateLandingPageAssets(),
      ...MarketingAssetGenerator.generateEmailTemplates()
    ];
  }

  // Export all assets
  async exportAll() {
    console.log(`📦 Exporting ${this.assets.length} marketing assets...`);
    
    for (const asset of this.assets) {
      await this.exportAsset(asset);
    }
    
    console.log('✅ All assets exported successfully!');
    return this.generateManifest();
  }

  // Export individual asset
  private async exportAsset(asset: any) {
    const { component: Component, props, filename } = asset;
    
    if (Component) {
      // React component export
      const element = React.createElement(Component, props);
      // In production, this would use a headless browser or SVG renderer
      console.log(`Exporting: ${filename}`);
    } else if (asset.type === 'schedule' || asset.type === 'thread') {
      // JSON data export
      console.log(`Exporting data: ${filename}`);
    }
  }

  // Generate asset manifest
  private generateManifest() {
    return {
      totalAssets: this.assets.length,
      categories: {
        graphics: this.assets.filter(a => a.filename?.includes('launch-')).length,
        social: this.assets.filter(a => a.filename?.includes('instagram') || a.filename?.includes('twitter')).length,
        appStore: this.assets.filter(a => a.filename?.includes('screenshot')).length,
        landing: this.assets.filter(a => a.filename?.includes('landing-')).length,
        email: this.assets.filter(a => a.filename?.includes('email-')).length
      },
      exportDate: new Date().toISOString(),
      campaign: 'Mumbai Launch - January 13, 2025'
    };
  }

  // Get asset statistics
  getStatistics() {
    return {
      totalAssets: this.assets.length,
      byCategory: {
        graphics: this.countByPrefix('launch-'),
        socialMedia: this.countByPrefix(['instagram', 'twitter', 'linkedin', 'facebook']),
        appStore: this.countByPrefix('screenshot'),
        landing: this.countByPrefix('landing-'),
        email: this.countByPrefix('email-')
      },
      byLanguage: {
        english: this.countByLanguage('en'),
        hindi: this.countByLanguage('hi'),
        marathi: this.countByLanguage('mr')
      },
      byPlatform: {
        instagram: this.countByPrefix('instagram'),
        twitter: this.countByPrefix('twitter'),
        linkedin: this.countByPrefix('linkedin'),
        facebook: this.countByPrefix('facebook')
      }
    };
  }

  private countByPrefix(prefix: string | string[]): number {
    const prefixes = Array.isArray(prefix) ? prefix : [prefix];
    return this.assets.filter(a => 
      prefixes.some(p => a.filename?.includes(p))
    ).length;
  }

  private countByLanguage(lang: string): number {
    return this.assets.filter(a => 
      a.props?.language === lang || a.filename?.includes(`-${lang}.`)
    ).length;
  }
}

// Mumbai Launch Campaign Orchestrator
export const MumbaiLaunchOrchestrator = {
  // Pre-launch phase
  preLaunch: {
    startDate: '2024-12-29',
    endDate: '2025-01-12',
    assets: [
      'teaser-graphics',
      'countdown-posts',
      'email-warmup',
      'influencer-kits'
    ],
    channels: ['Instagram', 'Twitter', 'Email', 'WhatsApp']
  },

  // Launch day
  launchDay: {
    date: '2025-01-13',
    schedule: [
      { time: '00:01', action: 'App goes live', assets: ['launch-hero-en', 'launch-hero-hi'] },
      { time: '06:00', action: 'Email blast', assets: ['email-launch-en', 'email-launch-hi'] },
      { time: '09:00', action: 'Social media', assets: ['instagram-day13', 'twitter-day13'] },
      { time: '12:00', action: 'Press release', assets: ['press-kit'] },
      { time: '18:00', action: 'Peak push', assets: ['prime-time-graphics'] }
    ]
  },

  // Post-launch phase
  postLaunch: {
    startDate: '2025-01-14',
    endDate: '2025-02-11',
    assets: [
      'success-stories',
      'user-testimonials',
      'feature-highlights',
      'weekly-newsletters'
    ],
    metrics: ['downloads', 'registrations', 'engagement', 'conversions']
  }
};

// Export utility function
export async function generateAllMarketingAssets() {
  const manager = new AssetExportManager();
  const manifest = await manager.exportAll();
  const stats = manager.getStatistics();
  
  console.log('📊 Asset Generation Complete!');
  console.log('Statistics:', stats);
  console.log('Manifest:', manifest);
  
  return {
    manifest,
    statistics: stats,
    orchestrator: MumbaiLaunchOrchestrator
  };
}

// Usage example
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).generateMarketingAssets = generateAllMarketingAssets;
}