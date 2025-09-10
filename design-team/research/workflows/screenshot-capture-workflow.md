# Screenshot Capture Workflow - Production Standard
## Version 2.0 - Fixed Loading & Attribution Issues

### Critical Issues Resolved
1. **Loading State Issue**: Screenshots no longer capture loading/spinner states
2. **Profile Mismatch**: Screenshots now verified to be from correct designer only

---

## Pre-Capture Setup

### 1. Environment Preparation
```bash
# Install required dependencies
npm install playwright @playwright/test
npx playwright install chromium

# Create folder structure
mkdir -p screenshots/{profile_name}/{date}
mkdir -p screenshots/_rejected  # For failed captures
mkdir -p screenshots/_metadata  # For validation logs
```

### 2. Profile Verification List
```javascript
const VERIFIED_PROFILES = {
  'glebich': {
    url: 'https://dribbble.com/glebich',
    displayName: 'Gleb Kuznetsov✈',
    verificationSelectors: [
      'a[href="/glebich"]',
      'span:text("Gleb Kuznetsov")'
    ]
  },
  'uxerflow': {
    url: 'https://dribbble.com/uxerflow',
    displayName: 'UXerflow',
    verificationSelectors: [
      'a[href="/uxerflow"]',
      'span:text("UXerflow")'
    ]
  }
};
```

---

## Capture Process - Step by Step

### Phase 1: Navigation & Initial Load
```javascript
// 1. Navigate to profile
await page.goto(profileUrl, {
  waitUntil: 'networkidle',
  timeout: 30000
});

// 2. Initial stability check
await page.waitForTimeout(3000);

// 3. Verify we're on correct profile
const profileVerified = await verifyProfileOwnership(page, profileName);
if (!profileVerified) {
  throw new Error(`Not on correct profile: ${profileName}`);
}
```

### Phase 2: Content Loading Verification
```javascript
// Multiple-strategy load confirmation
async function waitForFullLoad(page) {
  // Strategy 1: Wait for DOM
  await page.waitForLoadState('domcontentloaded');
  
  // Strategy 2: Wait for network idle
  await page.waitForLoadState('networkidle');
  
  // Strategy 3: Wait for images
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll('img'));
    return images.every(img => img.complete && img.naturalHeight !== 0);
  }, { timeout: 30000 });
  
  // Strategy 4: Wait for Dribbble-specific content
  await page.waitForSelector('img[src*="cdn.dribbble"]', { 
    state: 'visible',
    timeout: 20000 
  });
  
  // Strategy 5: No spinners or loaders visible
  await page.waitForFunction(() => {
    const loaders = document.querySelectorAll(
      '.spinner, .loader, .loading, [class*="load"], [class*="spin"]'
    );
    return loaders.length === 0 || 
           Array.from(loaders).every(el => 
             el.style.display === 'none' || 
             el.style.visibility === 'hidden'
           );
  });
  
  // Strategy 6: Final stability buffer
  await page.waitForTimeout(5000);
}
```

### Phase 3: Shot Collection & Validation
```javascript
// Get shots with ownership verification
async function collectVerifiedShots(page, profileName) {
  const shots = await page.evaluate((profile) => {
    const shotElements = document.querySelectorAll('li[data-thumbnail]');
    const verifiedShots = [];
    
    shotElements.forEach(shot => {
      // Check if shot belongs to correct profile
      const authorLink = shot.querySelector('a.hoverable');
      const shotLink = shot.querySelector('a.dribbble-link');
      
      if (authorLink && authorLink.href.includes(profile)) {
        verifiedShots.push({
          url: shotLink.href,
          title: shot.querySelector('img')?.alt || 'untitled',
          thumbnail: shot.querySelector('img')?.src,
          verified: true
        });
      }
    });
    
    return verifiedShots;
  }, profileName);
  
  return shots;
}
```

### Phase 4: Individual Shot Capture
```javascript
async function captureShot(page, shot, profileName, index) {
  console.log(`Capturing: ${shot.title}`);
  
  // Navigate to shot
  await page.goto(shot.url, { waitUntil: 'networkidle' });
  
  // Full load verification
  await waitForFullLoad(page);
  
  // Double-check ownership
  const isCorrectAuthor = await page.evaluate((profile) => {
    const authorLinks = document.querySelectorAll(`a[href*="/${profile}"]`);
    return authorLinks.length > 0;
  }, profileName);
  
  if (!isCorrectAuthor) {
    console.error(`REJECTED: Shot not by ${profileName}`);
    return null;
  }
  
  // Quality check before capture
  const qualityCheck = await performQualityCheck(page);
  if (!qualityCheck.passed) {
    console.error(`REJECTED: Quality check failed - ${qualityCheck.reason}`);
    return null;
  }
  
  // Capture screenshot
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `screenshots/${profileName}/${timestamp}_${index}_${sanitizeTitle(shot.title)}.png`;
  
  await page.screenshot({
    path: filename,
    fullPage: false,
    clip: await getContentBounds(page)
  });
  
  return {
    filename,
    shot,
    timestamp,
    qualityCheck
  };
}
```

### Phase 5: Quality Validation
```javascript
async function performQualityCheck(page) {
  const checks = await page.evaluate(() => {
    const results = {
      passed: true,
      checks: {},
      reason: null
    };
    
    // Check 1: No loading indicators
    const hasLoaders = document.querySelector('.spinner, .loader, .loading');
    results.checks.noLoaders = !hasLoaders;
    
    // Check 2: Images loaded
    const images = Array.from(document.querySelectorAll('img'));
    const allImagesLoaded = images.every(img => img.complete && img.naturalHeight > 0);
    results.checks.imagesLoaded = allImagesLoaded;
    
    // Check 3: Main content visible
    const mainContent = document.querySelector('.shot-content, .media-content, [class*="shot"]');
    results.checks.contentVisible = mainContent && mainContent.offsetHeight > 100;
    
    // Check 4: No error messages
    const hasErrors = document.querySelector('.error, .not-found, [class*="404"]');
    results.checks.noErrors = !hasErrors;
    
    // Determine overall pass/fail
    if (!results.checks.imagesLoaded) {
      results.passed = false;
      results.reason = 'Images not fully loaded';
    } else if (!results.checks.contentVisible) {
      results.passed = false;
      results.reason = 'Main content not visible';
    } else if (!results.checks.noErrors) {
      results.passed = false;
      results.reason = 'Error state detected';
    }
    
    return results;
  });
  
  return checks;
}
```

---

## Post-Capture Validation

### 1. Metadata Generation
```javascript
async function generateMetadata(captures, profileName) {
  const metadata = {
    profile: profileName,
    captureDate: new Date().toISOString(),
    totalShots: captures.length,
    successfulCaptures: captures.filter(c => c !== null).length,
    rejectedCaptures: captures.filter(c => c === null).length,
    captures: captures.filter(c => c !== null).map(c => ({
      filename: c.filename,
      title: c.shot.title,
      url: c.shot.url,
      timestamp: c.timestamp,
      qualityChecks: c.qualityCheck.checks
    }))
  };
  
  // Save metadata
  const metadataFile = `screenshots/_metadata/${profileName}_${Date.now()}.json`;
  await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));
  
  return metadata;
}
```

### 2. Batch Validation Report
```javascript
async function generateValidationReport(metadata) {
  const report = `
# Screenshot Capture Report
## Profile: ${metadata.profile}
## Date: ${metadata.captureDate}

### Summary
- Total Shots Attempted: ${metadata.totalShots}
- Successful Captures: ${metadata.successfulCaptures}
- Rejected Captures: ${metadata.rejectedCaptures}
- Success Rate: ${(metadata.successfulCaptures / metadata.totalShots * 100).toFixed(1)}%

### Quality Metrics
${metadata.captures.map(c => `
#### ${c.title}
- Images Loaded: ${c.qualityChecks.imagesLoaded ? '✅' : '❌'}
- Content Visible: ${c.qualityChecks.contentVisible ? '✅' : '❌'}
- No Loaders: ${c.qualityChecks.noLoaders ? '✅' : '❌'}
- No Errors: ${c.qualityChecks.noErrors ? '✅' : '❌'}
`).join('\n')}
  `;
  
  return report;
}
```

---

## Error Recovery & Retry Logic

### Automatic Retry for Failed Captures
```javascript
async function captureWithRetry(page, shot, profileName, index, maxRetries = 3) {
  let attempt = 0;
  let lastError = null;
  
  while (attempt < maxRetries) {
    try {
      console.log(`Attempt ${attempt + 1} for: ${shot.title}`);
      const result = await captureShot(page, shot, profileName, index);
      
      if (result) {
        return result;
      }
      
      // If null returned, it was rejected for quality/ownership
      console.log(`Quality/ownership check failed, retrying...`);
      await page.waitForTimeout(5000); // Wait before retry
      
    } catch (error) {
      lastError = error;
      console.error(`Error on attempt ${attempt + 1}:`, error.message);
      await page.waitForTimeout(5000);
    }
    
    attempt++;
  }
  
  console.error(`Failed after ${maxRetries} attempts: ${shot.title}`);
  return null;
}
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Capturing Too Early
**Issue**: Screenshots show spinners or partial content
**Solution**: Use multi-strategy wait approach (DOM + network + images + custom checks)

### Pitfall 2: Wrong Profile Attribution
**Issue**: Capturing shots from featured/popular that aren't by the target designer
**Solution**: Verify author link on both list and detail views

### Pitfall 3: Dynamic Content Loading
**Issue**: Dribbble loads content progressively
**Solution**: Wait for specific Dribbble CDN images and use 5-second stability buffer

### Pitfall 4: Memory Leaks with Many Screenshots
**Issue**: Browser memory grows with each capture
**Solution**: Restart browser context every 20 captures

### Pitfall 5: Rate Limiting
**Issue**: Too many rapid requests trigger rate limits
**Solution**: Add random delays between captures (3-7 seconds)

---

## Maintenance & Updates

### Weekly Review Checklist
- [ ] Review rejection rates from metadata
- [ ] Update selectors if Dribbble changes UI
- [ ] Check for new loading indicators to exclude
- [ ] Validate profile verification still works
- [ ] Archive old screenshots (>30 days)

### Selector Updates
Keep these selectors current:
```javascript
const SELECTORS = {
  shots: 'li[data-thumbnail]',
  authorLink: 'a.hoverable',
  shotLink: 'a.dribbble-link',
  mainContent: '.shot-content, .media-content',
  loaders: '.spinner, .loader, .loading, [class*="load"]',
  images: 'img[src*="cdn.dribbble"]'
};
```

---

## Version History
- **v2.0** (Current): Fixed loading states and profile attribution issues
- **v1.0**: Initial implementation (deprecated due to quality issues)