const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

class DribbbleProfileCapture {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.outputDir = path.join(process.cwd(), 'dribbble-screenshots', `capture-${Date.now()}`);
    this.projectCount = 0;
    this.errors = [];
  }

  async init() {
    console.log('🚀 Initializing browser...\n');
    
    this.browser = await chromium.launch({
      headless: false, // Set to true for production
      viewport: { width: 1920, height: 1080 },
      slowMo: 100 // Slow down actions to appear more human-like
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2, // High quality screenshots
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    this.page = await this.context.newPage();
    
    // Create output directory
    await fs.mkdir(this.outputDir, { recursive: true });
    console.log(`📁 Output directory: ${this.outputDir}\n`);
  }

  async captureFullPage(filename, description) {
    try {
      // Wait for images to load
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      
      // Scroll to load lazy-loaded content
      await this.autoScroll();
      
      // Take screenshot
      const filepath = path.join(this.outputDir, filename);
      await this.page.screenshot({
        path: filepath,
        fullPage: true,
        animations: 'disabled'
      });
      
      console.log(`✅ Captured: ${description} -> ${filename}`);
      return filepath;
    } catch (error) {
      console.error(`❌ Error capturing ${description}: ${error.message}`);
      this.errors.push({ filename, description, error: error.message });
      return null;
    }
  }

  async autoScroll() {
    await this.page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0); // Scroll back to top
            resolve();
          }
        }, 100);
      });
    });
    await this.page.waitForTimeout(1000);
  }

  async captureProfile() {
    console.log('📷 Starting profile capture...\n');
    
    try {
      // Navigate to profile
      await this.page.goto('https://dribbble.com/uxerflow', {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      // Capture main profile page
      await this.captureFullPage('profile.png', 'Profile Page');
      
      // Wait for navigation menu to be ready
      await this.page.waitForTimeout(2000);
      
      // Try to click on Work tab/section
      const workSelectors = [
        'a[href*="/uxerflow"][href*="work"]',
        'button:has-text("Work")',
        'a:has-text("Work")',
        '[data-tab="work"]',
        '.profile-nav a:has-text("Work")',
        '.nav-tabs a:has-text("Work")'
      ];
      
      let workClicked = false;
      for (const selector of workSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            await this.page.waitForTimeout(2000);
            workClicked = true;
            console.log('✅ Clicked on Work section');
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!workClicked) {
        console.log('⚠️ Could not find Work section, continuing with main page projects');
      }
      
      // Capture work section
      await this.captureFullPage('work-section.png', 'Work Section');
      
    } catch (error) {
      console.error(`❌ Error capturing profile: ${error.message}`);
      this.errors.push({ action: 'profile capture', error: error.message });
    }
  }

  async captureProjects() {
    console.log('\n📸 Starting project capture...\n');
    
    try {
      // Find all project links
      const projectSelectors = [
        'a[href*="/shots/"]',
        '.shot-thumbnail',
        '.dribbble-shot',
        '.shot-card a',
        '[data-shot-id]'
      ];
      
      let projectLinks = [];
      for (const selector of projectSelectors) {
        projectLinks = await this.page.$$eval(selector, links => 
          links.map(link => ({
            href: link.href || link.querySelector('a')?.href,
            title: link.querySelector('img')?.alt || link.textContent?.trim() || 'untitled'
          })).filter(item => item.href && item.href.includes('/shots/'))
        );
        
        if (projectLinks.length > 0) break;
      }
      
      // Remove duplicates
      const uniqueLinks = Array.from(new Map(projectLinks.map(item => [item.href, item])).values());
      
      console.log(`📊 Found ${uniqueLinks.length} projects to capture\n`);
      
      // Method 1: Direct navigation to each project
      await this.captureProjectsByDirectNavigation(uniqueLinks);
      
      // Method 2: Try keyboard navigation as fallback
      if (this.projectCount < uniqueLinks.length) {
        await this.captureProjectsByKeyboardNavigation();
      }
      
    } catch (error) {
      console.error(`❌ Error capturing projects: ${error.message}`);
      this.errors.push({ action: 'project capture', error: error.message });
    }
  }

  async captureProjectsByDirectNavigation(projectLinks) {
    for (let i = 0; i < projectLinks.length; i++) {
      const project = projectLinks[i];
      const projectNum = i + 1;
      
      console.log(`📷 [${projectNum}/${projectLinks.length}] Capturing: ${project.title}`);
      
      try {
        await this.page.goto(project.href, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        const filename = `project_${projectNum}_${project.title.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 50)}.png`;
        await this.captureFullPage(filename, `Project ${projectNum}: ${project.title}`);
        
        this.projectCount++;
        
        // Add delay between captures
        await this.page.waitForTimeout(1500 + Math.random() * 1500);
        
      } catch (error) {
        console.error(`  ⚠️ Error: ${error.message}`);
        this.errors.push({ 
          project: `Project ${projectNum}`, 
          title: project.title, 
          error: error.message 
        });
      }
    }
  }

  async captureProjectsByKeyboardNavigation() {
    console.log('\n🎹 Attempting keyboard navigation for remaining projects...\n');
    
    try {
      // Navigate to first project if not already there
      if (this.projectCount === 0) {
        const firstProject = await this.page.$('a[href*="/shots/"]');
        if (firstProject) {
          await firstProject.click();
          await this.page.waitForTimeout(3000);
          this.projectCount++;
          await this.captureFullPage(`project_${this.projectCount}_keyboard.png`, `Project ${this.projectCount} (Keyboard Nav)`);
        }
      }
      
      // Try arrow key navigation
      let navigationAttempts = 0;
      const maxAttempts = 20;
      
      while (navigationAttempts < maxAttempts) {
        try {
          const currentUrl = this.page.url();
          
          // Press right arrow key
          await this.page.keyboard.press('ArrowRight');
          await this.page.waitForTimeout(2000);
          
          // Check if URL changed
          const newUrl = this.page.url();
          if (newUrl !== currentUrl && newUrl.includes('/shots/')) {
            this.projectCount++;
            await this.captureFullPage(
              `project_${this.projectCount}_keyboard.png`, 
              `Project ${this.projectCount} (Keyboard Nav)`
            );
          } else {
            // Try clicking next button if arrow key didn't work
            const nextSelectors = [
              'a[rel="next"]',
              'button[aria-label="Next"]',
              '.next-shot',
              '.shot-navigation a:last-child',
              '[data-next-shot]'
            ];
            
            let nextClicked = false;
            for (const selector of nextSelectors) {
              try {
                const nextBtn = await this.page.$(selector);
                if (nextBtn) {
                  await nextBtn.click();
                  await this.page.waitForTimeout(2000);
                  nextClicked = true;
                  this.projectCount++;
                  await this.captureFullPage(
                    `project_${this.projectCount}_next.png`, 
                    `Project ${this.projectCount} (Next Button)`
                  );
                  break;
                }
              } catch (e) {
                // Continue to next selector
              }
            }
            
            if (!nextClicked) {
              console.log('⚠️ No more projects to navigate to');
              break;
            }
          }
          
          navigationAttempts++;
          await this.page.waitForTimeout(1000 + Math.random() * 1000);
          
        } catch (error) {
          console.error(`  ⚠️ Navigation error: ${error.message}`);
          break;
        }
      }
      
    } catch (error) {
      console.error(`❌ Keyboard navigation error: ${error.message}`);
      this.errors.push({ action: 'keyboard navigation', error: error.message });
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      outputDirectory: this.outputDir,
      projectsCaptured: this.projectCount,
      errors: this.errors,
      files: await fs.readdir(this.outputDir)
    };
    
    const reportPath = path.join(this.outputDir, 'capture-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 CAPTURE SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Projects captured: ${this.projectCount}`);
    console.log(`📁 Output directory: ${this.outputDir}`);
    console.log(`📷 Total screenshots: ${report.files.length}`);
    
    if (this.errors.length > 0) {
      console.log(`\n⚠️ Errors encountered: ${this.errors.length}`);
      this.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${JSON.stringify(err)}`);
      });
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
      await this.captureProfile();
      await this.captureProjects();
      await this.generateReport();
    } catch (error) {
      console.error(`\n❌ Fatal error: ${error.message}`);
      console.error(error);
    } finally {
      await this.cleanup();
      console.log('\n✨ Script execution completed!');
    }
  }
}

// Run the capture
if (require.main === module) {
  const capture = new DribbbleProfileCapture();
  capture.run().catch(console.error);
}

module.exports = DribbbleProfileCapture;