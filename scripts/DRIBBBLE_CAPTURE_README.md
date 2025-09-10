# Dribbble Profile Screenshot Capture Tool

## Overview
This tool automates the process of capturing screenshots from a Dribbble profile, including the main profile page and all individual project pages.

## Features
- ✅ Full-page screenshot capture (entire scrollable content)
- ✅ Automatic navigation through all projects
- ✅ Multiple navigation methods (direct links, keyboard navigation, next buttons)
- ✅ Human-like behavior with delays to avoid bot detection
- ✅ High-quality screenshots (2x device scale factor)
- ✅ Comprehensive error handling and logging
- ✅ Detailed capture report generation
- ✅ Auto-scroll for lazy-loaded content

## Prerequisites

### Install Node.js and npm
Ensure you have Node.js (v14 or higher) installed on your system.

### Install Playwright
```bash
npm install playwright
```

### Install Playwright browsers
```bash
npx playwright install chromium
```

## Usage

### Basic Usage
```bash
node scripts/capture-dribbble-profile-complete.js
```

### Run in Headless Mode
To run without browser UI (faster, production mode), edit the script and change:
```javascript
headless: false  // Change to: headless: true
```

## Output Structure

Screenshots are saved in a timestamped directory:
```
dribbble-screenshots/
└── capture-[timestamp]/
    ├── profile.png                    # Main profile page
    ├── work-section.png               # Work tab/section
    ├── project_1_[title].png          # Individual projects
    ├── project_2_[title].png
    ├── ...
    └── capture-report.json            # Detailed capture report
```

## Configuration Options

You can modify these settings in the script:

```javascript
// Browser settings
headless: false,                    // Set to true for headless mode
viewport: { width: 1920, height: 1080 },
slowMo: 100,                       // Milliseconds between actions

// Screenshot quality
deviceScaleFactor: 2,              // 1 for normal, 2 for retina quality

// Delays (in milliseconds)
waitForTimeout: 2000,               // General wait time
navigationDelay: 1500,              // Delay between project captures
```

## Navigation Methods

The script attempts multiple navigation strategies:

1. **Direct Navigation**: Finds all project links and visits each URL
2. **Keyboard Navigation**: Uses arrow keys to navigate between projects
3. **Button Navigation**: Clicks next/previous buttons if available

## Error Handling

- All errors are logged and collected in the final report
- The script continues capturing even if individual projects fail
- Network timeouts are handled gracefully
- A comprehensive error report is generated

## Report Format

The `capture-report.json` file contains:
```json
{
  "timestamp": "2025-01-07T00:00:00.000Z",
  "outputDirectory": "/path/to/screenshots",
  "projectsCaptured": 15,
  "errors": [],
  "files": ["profile.png", "project_1.png", ...]
}
```

## Troubleshooting

### Browser doesn't launch
```bash
# Reinstall Playwright browsers
npx playwright install chromium --force
```

### Timeout errors
Increase timeout values in the script:
```javascript
timeout: 60000  // Increase from 30000
```

### Missing screenshots
Check the console output and `capture-report.json` for specific errors.

### Rate limiting
If you encounter rate limiting:
1. Increase delays between captures
2. Run in smaller batches
3. Use a VPN or proxy

## Advanced Usage

### Capture specific user profile
Modify the URL in the script:
```javascript
await this.page.goto('https://dribbble.com/YOUR_USERNAME', {
```

### Filter projects by type
Add filtering logic in `captureProjectsByDirectNavigation()`:
```javascript
// Only capture projects with specific keywords
projectLinks = projectLinks.filter(p => 
  p.title.toLowerCase().includes('design')
);
```

### Custom output directory
Modify the output directory in constructor:
```javascript
this.outputDir = path.join('/custom/path', `capture-${Date.now()}`);
```

## Script Architecture

The script is built as a class with the following methods:

- `init()`: Initializes browser and context
- `captureFullPage()`: Takes full-page screenshots with auto-scroll
- `autoScroll()`: Scrolls page to load lazy content
- `captureProfile()`: Captures main profile and work section
- `captureProjects()`: Orchestrates project capture strategies
- `captureProjectsByDirectNavigation()`: Direct URL navigation
- `captureProjectsByKeyboardNavigation()`: Arrow key navigation
- `generateReport()`: Creates detailed capture report
- `cleanup()`: Closes browser and cleans up resources

## Performance Tips

1. **Headless Mode**: Run in headless mode for 2-3x faster capture
2. **Parallel Capture**: For multiple profiles, run multiple instances
3. **Selective Capture**: Filter projects before capturing
4. **Lower Quality**: Reduce `deviceScaleFactor` to 1 for smaller files

## Legal Notice

This tool is for educational and personal use only. Respect Dribbble's terms of service and the intellectual property rights of designers. Do not use captured content without proper attribution or permission.

## Support

For issues or questions, please check the error logs in `capture-report.json` first. The script provides detailed error messages to help diagnose problems.