const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

class DribbbleTrialCapture {
  constructor(profiles, projectLimit = 4) {
    this.profiles = profiles;
    this.projectLimit = projectLimit;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.baseOutputDir = path.join(process.cwd(), 'inspiration');
    this.stats = {
      totalProfiles: profiles.length,
      totalProjects: 0,
      successfulCaptures: 0,
      errors: []
    };
  }

  async init() {
    console.log('🚀 Initializing browser for trial capture...\n');
    console.log(`📋 Profiles to capture: ${this.profiles.map(p => p.username).join(', ')}`);
    console.log(`🎯 Project limit per profile: ${this.projectLimit}\n`);
    
    this.browser = await chromium.launch({
      headless: false, // Set to true for production
      viewport: { width: 1920, height: 1080 },
      slowMo: 50 // Slightly faster for trial
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2, // High quality screenshots
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    this.page = await this.context.newPage();
    
    // Create base inspiration directory
    await fs.mkdir(this.baseOutputDir, { recursive: true });
  }

  async captureFullPage(filepath, description) {
    try {
      // Wait for images to load
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1500);
      
      // Quick scroll to load lazy content
      await this.quickScroll();
      
      // Take screenshot
      await this.page.screenshot({
        path: filepath,
        fullPage: true,
        animations: 'disabled'
      });
      
      console.log(`  ✅ ${description}`);
      this.stats.successfulCaptures++;
      return filepath;
    } catch (error) {
      console.error(`  ❌ Failed: ${description} - ${error.message}`);
      this.stats.errors.push({ file: filepath, error: error.message });
      return null;
    }
  }

  async quickScroll() {
    await this.page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 200;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 50);
      });
    });
    await this.page.waitForTimeout(500);
  }

  async captureProfile(profile) {
    const { username, name } = profile;
    const profileDir = path.join(this.baseOutputDir, `${username}-trial`);
    await fs.mkdir(profileDir, { recursive: true });
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📷 Capturing: ${name} (@${username})`);
    console.log(`${'='.repeat(60)}\n`);
    
    const stats = {
      profile: username,
      projectsCaptured: 0,
      files: []
    };

    try {
      // Navigate to profile
      const profileUrl = `https://dribbble.com/${username}`;
      console.log(`🔗 Navigating to: ${profileUrl}`);
      
      await this.page.goto(profileUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Capture main profile page
      const profilePath = path.join(profileDir, `${username}-profile.png`);
      await this.captureFullPage(profilePath, 'Profile page captured');
      stats.files.push(`${username}-profile.png`);
      
      // Try to click on Work tab if it exists
      await this.page.waitForTimeout(1500);
      
      const workSelectors = [
        'a[href*="/work"]',
        'button:has-text("Work")',
        'a:has-text("Work")',
        '.profile-nav a:has-text("Work")'
      ];
      
      let workClicked = false;
      for (const selector of workSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            await this.page.waitForTimeout(2000);
            workClicked = true;
            console.log('  ✅ Clicked on Work section');
            
            const workPath = path.join(profileDir, `${username}-work-section.png`);
            await this.captureFullPage(workPath, 'Work section captured');
            stats.files.push(`${username}-work-section.png`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      // Find and capture projects (limited to projectLimit)
      console.log(`\n📸 Capturing first ${this.projectLimit} projects...`);
      
      const projectLinks = await this.page.$$eval('a[href*="/shots/"]', 
        (links, limit) => links
          .slice(0, limit)
          .map(link => ({
            href: link.href,
            title: link.querySelector('img')?.alt || 'untitled'
          }))
          .filter(item => item.href && item.href.includes('/shots/')),
        this.projectLimit
      );
      
      console.log(`  Found ${projectLinks.length} projects to capture\n`);
      
      for (let i = 0; i < projectLinks.length; i++) {
        const project = projectLinks[i];
        const projectNum = i + 1;
        
        console.log(`  📷 [${projectNum}/${this.projectLimit}] ${project.title}`);
        
        try {
          await this.page.goto(project.href, {
            waitUntil: 'networkidle',
            timeout: 30000
          });
          
          const filename = `${username}-project-${projectNum}-${project.title.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 30)}.png`;
          const projectPath = path.join(profileDir, filename);
          
          await this.captureFullPage(projectPath, `Project ${projectNum} captured`);
          stats.files.push(filename);
          stats.projectsCaptured++;
          
          // Small delay between captures
          await this.page.waitForTimeout(1000);
          
        } catch (error) {
          console.error(`    ⚠️ Error: ${error.message}`);
          this.stats.errors.push({ 
            profile: username,
            project: projectNum, 
            error: error.message 
          });
        }
      }
      
      // Save profile capture summary
      const summaryPath = path.join(profileDir, 'capture-summary.json');
      await fs.writeFile(summaryPath, JSON.stringify({
        profile: username,
        name: name,
        timestamp: new Date().toISOString(),
        projectsCaptured: stats.projectsCaptured,
        projectLimit: this.projectLimit,
        files: stats.files
      }, null, 2));
      
      console.log(`\n✅ Completed: ${stats.projectsCaptured} projects captured for @${username}`);
      console.log(`📁 Saved to: ${profileDir}`);
      
      this.stats.totalProjects += stats.projectsCaptured;
      
    } catch (error) {
      console.error(`\n❌ Profile capture failed: ${error.message}`);
      this.stats.errors.push({ 
        profile: username, 
        error: error.message 
      });
    }
  }

  async captureAllProfiles() {
    for (const profile of this.profiles) {
      await this.captureProfile(profile);
      
      // Delay between profiles
      if (this.profiles.indexOf(profile) < this.profiles.length - 1) {
        console.log('\n⏳ Waiting before next profile...\n');
        await this.page.waitForTimeout(3000);
      }
    }
  }

  async generateFinalReport() {
    const reportPath = path.join(this.baseOutputDir, 'trial-capture-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      mode: 'TRIAL',
      projectLimit: this.projectLimit,
      profiles: this.profiles.map(p => p.username),
      stats: this.stats,
      outputDirectory: this.baseOutputDir
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TRIAL CAPTURE COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Profiles captured: ${this.stats.totalProfiles}`);
    console.log(`📷 Total projects: ${this.stats.totalProjects}`);
    console.log(`✨ Successful captures: ${this.stats.successfulCaptures}`);
    console.log(`📁 Output directory: ${this.baseOutputDir}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️ Errors encountered: ${this.stats.errors.length}`);
    }
    
    console.log(`\n📄 Report saved to: ${reportPath}`);
    console.log('='.repeat(60));
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      await this.captureAllProfiles();
      await this.generateFinalReport();
    } catch (error) {
      console.error(`\n❌ Fatal error: ${error.message}`);
      console.error(error);
    } finally {
      await this.cleanup();
      console.log('\n✨ Trial capture completed!');
    }
  }
}

// Profile configurations
const profiles = [
  {
    username: 'uxerflow',
    name: 'UXerflow AI Platform Designs'
  },
  {
    username: 'glebich',
    name: 'Gleb Kuznetsov - Design Excellence'
  }
];

// Run the trial capture
if (require.main === module) {
  const capture = new DribbbleTrialCapture(profiles, 4); // 4 projects per profile
  capture.run().catch(console.error);
}

module.exports = DribbbleTrialCapture;