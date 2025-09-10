#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Token directories
const TOKENS_DIR = path.join(__dirname, 'tokens');
const OUTPUT_DIR = path.join(__dirname, 'dist');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load all token files
function loadTokens(dir, tokens = {}) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      tokens[file] = {};
      loadTokens(filePath, tokens[file]);
    } else if (file.endsWith('.json')) {
      const name = file.replace('.json', '');
      const content = fs.readFileSync(filePath, 'utf8');
      tokens[name] = JSON.parse(content);
    }
  });
  
  return tokens;
}

// Convert tokens to CSS custom properties
function tokensToCss(tokens, prefix = '--') {
  let css = '';
  
  function processObject(obj, currentPrefix) {
    Object.entries(obj).forEach(([key, value]) => {
      const propertyName = `${currentPrefix}${key}`;
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        processObject(value, `${propertyName}-`);
      } else {
        css += `  ${propertyName}: ${value};\n`;
      }
    });
  }
  
  processObject(tokens, prefix);
  return css;
}

// Generate CSS file
function generateCss(tokens) {
  let css = `/* CastMatch Design System Tokens - Auto-generated */\n\n`;
  
  // Light theme (default)
  css += `:root {\n`;
  css += `  /* Primitive Tokens */\n`;
  
  // Colors
  if (tokens.primitives?.colors) {
    css += tokensToCss(tokens.primitives.colors.colors, '--color-');
  }
  
  // Typography
  if (tokens.primitives?.typography) {
    css += `\n  /* Typography */\n`;
    css += tokensToCss(tokens.primitives.typography.typography, '--');
  }
  
  // Spacing
  if (tokens.primitives?.spacing) {
    css += `\n  /* Spacing */\n`;
    css += tokensToCss(tokens.primitives.spacing.spacing, '--spacing-');
    css += tokensToCss(tokens.primitives.spacing.borderRadius, '--border-radius-');
    css += tokensToCss(tokens.primitives.spacing.borderWidth, '--border-width-');
  }
  
  // Effects
  if (tokens.primitives?.effects) {
    css += `\n  /* Effects */\n`;
    css += tokensToCss(tokens.primitives.effects.shadow, '--shadow-');
    css += tokensToCss(tokens.primitives.effects.blur, '--blur-');
    css += tokensToCss(tokens.primitives.effects.opacity, '--opacity-');
  }
  
  // Animation
  if (tokens.primitives?.animation) {
    css += `\n  /* Animation */\n`;
    css += tokensToCss(tokens.primitives.animation.transition, '--transition-');
  }
  
  // Layout
  if (tokens.primitives?.layout) {
    css += `\n  /* Layout */\n`;
    css += tokensToCss(tokens.primitives.layout.breakpoints, '--breakpoint-');
    css += tokensToCss(tokens.primitives.layout.zIndex, '--z-index-');
  }
  
  // Semantic tokens
  if (tokens.semantic?.colors) {
    css += `\n  /* Semantic Colors */\n`;
    Object.entries(tokens.semantic.colors.semantic.colors).forEach(([category, values]) => {
      css += tokensToCss({ [category]: values }, '--');
    });
  }
  
  css += `}\n\n`;
  
  // Dark theme
  css += `[data-theme="dark"] {\n`;
  if (tokens.themes?.dark) {
    css += tokensToCss(tokens.themes.dark.dark.colors, '--');
    if (tokens.themes.dark.dark.shadow) {
      css += tokensToCss(tokens.themes.dark.dark.shadow, '--shadow-');
    }
  }
  css += `}\n\n`;
  
  // Media query for dark mode preference
  css += `@media (prefers-color-scheme: dark) {\n`;
  css += `  :root:not([data-theme="light"]) {\n`;
  if (tokens.themes?.dark) {
    const darkTokens = tokensToCss(tokens.themes.dark.dark.colors, '--');
    css += darkTokens.split('\n').map(line => '  ' + line).join('\n');
    if (tokens.themes.dark.dark.shadow) {
      const shadowTokens = tokensToCss(tokens.themes.dark.dark.shadow, '--shadow-');
      css += shadowTokens.split('\n').map(line => '  ' + line).join('\n');
    }
  }
  css += `  }\n`;
  css += `}\n\n`;
  
  // Animation keyframes
  if (tokens.primitives?.animation?.keyframes) {
    css += `/* Animation Keyframes */\n`;
    Object.entries(tokens.primitives.animation.keyframes).forEach(([name, keyframe]) => {
      css += `@keyframes ${name} {\n`;
      Object.entries(keyframe).forEach(([step, props]) => {
        css += `  ${step} {\n`;
        Object.entries(props).forEach(([prop, value]) => {
          const cssProperty = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
          css += `    ${cssProperty}: ${value};\n`;
        });
        css += `  }\n`;
      });
      css += `}\n\n`;
    });
  }
  
  return css;
}

// Generate TypeScript types
function generateTypes(tokens) {
  let ts = `/* CastMatch Design System Token Types - Auto-generated */\n\n`;
  
  ts += `export interface DesignTokens {\n`;
  
  function generateInterface(obj, indent = '  ') {
    let result = '';
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object' && !Array.isArray(value)) {
        result += `${indent}${key}: {\n`;
        result += generateInterface(value, indent + '  ');
        result += `${indent}};\n`;
      } else {
        result += `${indent}${key}: string;\n`;
      }
    });
    return result;
  }
  
  ts += generateInterface(tokens);
  ts += `}\n\n`;
  
  ts += `export const tokens: DesignTokens;\n`;
  ts += `export default tokens;\n`;
  
  return ts;
}

// Generate JavaScript module
function generateJs(tokens) {
  let js = `/* CastMatch Design System Tokens - Auto-generated */\n\n`;
  js += `export const tokens = ${JSON.stringify(tokens, null, 2)};\n\n`;
  js += `export default tokens;\n`;
  return js;
}

// Generate SCSS variables
function generateScss(tokens) {
  let scss = `// CastMatch Design System Tokens - Auto-generated\n\n`;
  
  function processScssTokens(obj, prefix = '') {
    let result = '';
    Object.entries(obj).forEach(([key, value]) => {
      const variableName = `$${prefix}${key}`;
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        result += processScssTokens(value, `${prefix}${key}-`);
      } else {
        result += `${variableName}: ${value};\n`;
      }
    });
    return result;
  }
  
  scss += processScssTokens(tokens);
  return scss;
}

// Main build function
function build() {
  console.log('🎨 Building CastMatch Design System Tokens...\n');
  
  const tokens = loadTokens(TOKENS_DIR);
  
  // Generate CSS
  const css = generateCss(tokens);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'tokens.css'), css);
  console.log('✅ Generated tokens.css');
  
  // Generate TypeScript types
  const types = generateTypes(tokens);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'tokens.d.ts'), types);
  console.log('✅ Generated tokens.d.ts');
  
  // Generate JavaScript module
  const js = generateJs(tokens);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'tokens.js'), js);
  console.log('✅ Generated tokens.js');
  
  // Generate SCSS
  const scss = generateScss(tokens);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'tokens.scss'), scss);
  console.log('✅ Generated tokens.scss');
  
  // Generate JSON for Figma/design tools
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'tokens.json'),
    JSON.stringify(tokens, null, 2)
  );
  console.log('✅ Generated tokens.json');
  
  console.log('\n🚀 Design System build complete!');
}

// Run build
build();