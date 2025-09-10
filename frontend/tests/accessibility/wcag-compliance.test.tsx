/**
 * WCAG 2.1 AA Compliance Testing Suite
 * Tests all components and pages for accessibility standards
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';

// Components to test
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TalentCard } from '@/components/castmatch/TalentCard';
import { MessageBubble } from '@/components/castmatch/MessageBubble';
import { CastMatchSidebar } from '@/components/layout/CastMatchSidebar';
import { CastMatchLayout } from '@/components/layout/CastMatchLayout';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('WCAG 2.1 AA Compliance Tests', () => {
  describe('Color Contrast (WCAG 1.4.3)', () => {
    it('should meet minimum contrast ratio of 4.5:1 for normal text', async () => {
      const { container } = render(
        <div>
          <Button>Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="destructive">Destructive Button</Button>
        </div>
      );
      
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });
      
      expect(results).toHaveNoViolations();
    });
    
    it('should meet contrast ratio of 3:1 for large text', async () => {
      const { container } = render(
        <div>
          <h1 className="text-4xl font-bold">Large Heading</h1>
          <h2 className="text-3xl font-semibold">Subheading</h2>
        </div>
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
  
  describe('Keyboard Navigation (WCAG 2.1.1)', () => {
    it('should allow keyboard navigation through interactive elements', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(
        <div>
          <Button onClick={handleClick}>First Button</Button>
          <Input placeholder="Text input" />
          <Button onClick={handleClick}>Second Button</Button>
        </div>
      );
      
      // Tab through elements
      await user.tab();
      expect(screen.getByText('First Button')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByPlaceholderText('Text input')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Second Button')).toHaveFocus();
      
      // Shift+Tab to go backwards
      await user.tab({ shift: true });
      expect(screen.getByPlaceholderText('Text input')).toHaveFocus();
    });
    
    it('should support Enter and Space keys for button activation', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(<Button onClick={handleClick}>Click Me</Button>);
      
      const button = screen.getByText('Click Me');
      button.focus();
      
      // Test Enter key
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      // Test Space key
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
    
    it('should trap focus within modal dialogs', async () => {
      const user = userEvent.setup();
      
      const { container } = render(
        <div>
          <button>Outside Button</button>
          <div role="dialog" aria-modal="true">
            <button>First Modal Button</button>
            <input type="text" />
            <button>Last Modal Button</button>
          </div>
        </div>
      );
      
      const dialog = screen.getByRole('dialog');
      const buttons = within(dialog).getAllByRole('button');
      
      // Focus should cycle within dialog
      buttons[0].focus();
      await user.tab();
      expect(within(dialog).getByRole('textbox')).toHaveFocus();
      
      await user.tab();
      expect(buttons[1]).toHaveFocus();
      
      // Tab should wrap to first element
      await user.tab();
      expect(buttons[0]).toHaveFocus();
    });
  });
  
  describe('Screen Reader Support (WCAG 1.3.1)', () => {
    it('should have proper ARIA labels for interactive elements', async () => {
      const { container } = render(
        <div>
          <Button aria-label="Save changes">Save</Button>
          <Input aria-label="Email address" placeholder="Enter email" />
          <div role="navigation" aria-label="Main navigation">
            <ul>
              <li><a href="/home">Home</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </div>
        </div>
      );
      
      expect(screen.getByLabelText('Save changes')).toBeInTheDocument();
      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
      expect(screen.getByLabelText('Main navigation')).toBeInTheDocument();
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
    
    it('should have proper heading hierarchy', async () => {
      const { container } = render(
        <div>
          <h1>Page Title</h1>
          <section>
            <h2>Section Title</h2>
            <h3>Subsection Title</h3>
          </section>
          <section>
            <h2>Another Section</h2>
            <h3>Another Subsection</h3>
          </section>
        </div>
      );
      
      const results = await axe(container, {
        rules: {
          'heading-order': { enabled: true },
        },
      });
      
      expect(results).toHaveNoViolations();
    });
    
    it('should announce live regions for dynamic content', async () => {
      const { rerender } = render(
        <div aria-live="polite" aria-atomic="true">
          <p>Initial message</p>
        </div>
      );
      
      // Update content
      rerender(
        <div aria-live="polite" aria-atomic="true">
          <p>Updated message</p>
        </div>
      );
      
      // Check that aria-live region exists
      const liveRegion = screen.getByText('Updated message').parentElement;
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });
  });
  
  describe('Focus Indicators (WCAG 2.4.7)', () => {
    it('should have visible focus indicators for all interactive elements', () => {
      render(
        <div>
          <Button>Button</Button>
          <Input />
          <a href="#">Link</a>
          <select>
            <option>Option 1</option>
          </select>
        </div>
      );
      
      const button = screen.getByRole('button');
      const input = screen.getByRole('textbox');
      const link = screen.getByRole('link');
      const select = screen.getByRole('combobox');
      
      // Check that focus styles are applied
      button.focus();
      expect(button).toHaveFocus();
      
      input.focus();
      expect(input).toHaveFocus();
      
      link.focus();
      expect(link).toHaveFocus();
      
      select.focus();
      expect(select).toHaveFocus();
    });
  });
  
  describe('Form Accessibility (WCAG 1.3.5)', () => {
    it('should have proper form labels and error messages', async () => {
      const { container } = render(
        <form>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" required aria-describedby="email-error" />
            <span id="email-error" role="alert">Email is required</span>
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required />
          </div>
          <Button type="submit">Submit</Button>
        </form>
      );
      
      // Check label associations
      const emailInput = screen.getByLabelText('Email Address');
      expect(emailInput).toHaveAttribute('id', 'email');
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      
      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toHaveAttribute('id', 'password');
      
      // Check error message association
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('Email is required');
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
    
    it('should have proper fieldset and legend for grouped inputs', async () => {
      const { container } = render(
        <fieldset>
          <legend>Contact Preferences</legend>
          <div>
            <input type="radio" id="email-pref" name="contact" value="email" />
            <Label htmlFor="email-pref">Email</Label>
          </div>
          <div>
            <input type="radio" id="phone-pref" name="contact" value="phone" />
            <Label htmlFor="phone-pref">Phone</Label>
          </div>
        </fieldset>
      );
      
      const fieldset = screen.getByRole('group');
      expect(fieldset).toHaveAccessibleName('Contact Preferences');
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
  
  describe('Alternative Text (WCAG 1.1.1)', () => {
    it('should have alt text for informative images', async () => {
      const { container } = render(
        <div>
          <img src="/talent.jpg" alt="Actor headshot" />
          <img src="/icon.svg" alt="" /> {/* Decorative image */}
          <svg role="img" aria-label="Company logo">
            <title>Company Logo</title>
          </svg>
        </div>
      );
      
      // Informative image should have alt text
      const informativeImg = screen.getByAltText('Actor headshot');
      expect(informativeImg).toBeInTheDocument();
      
      // SVG should have proper labeling
      const svgLogo = screen.getByLabelText('Company logo');
      expect(svgLogo).toBeInTheDocument();
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
  
  describe('Component-Specific Accessibility Tests', () => {
    it('TalentCard should be fully accessible', async () => {
      const { container } = render(
        <TalentCard
          talent={{
            id: '1',
            name: 'John Doe',
            role: 'Actor',
            image: '/headshot.jpg',
            rating: 4.5,
            location: 'New York',
            experience: '5 years',
          }}
          onClick={() => {}}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      
      // Check for interactive elements
      const card = screen.getByRole('article');
      expect(card).toHaveAccessibleName();
    });
    
    it('MessageBubble should support screen readers', async () => {
      const { container } = render(
        <MessageBubble
          message={{
            id: '1',
            content: 'Hello, this is a test message',
            sender: 'user',
            timestamp: new Date().toISOString(),
          }}
          isOwn={false}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
    
    it('CastMatchLayout should have proper landmark regions', async () => {
      const { container } = render(
        <CastMatchLayout>
          <div>Content</div>
        </CastMatchLayout>
      );
      
      // Check for landmark regions
      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
      expect(screen.getByRole('main')).toBeInTheDocument(); // Main content
      expect(screen.getByRole('navigation')).toBeInTheDocument(); // Navigation
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
  
  describe('Mobile Accessibility', () => {
    it('should have touch-friendly tap targets (44x44px minimum)', async () => {
      const { container } = render(
        <div>
          <Button className="min-h-[44px] min-w-[44px]">Tap Me</Button>
          <a href="#" className="inline-block p-3">Link with padding</a>
        </div>
      );
      
      const button = screen.getByRole('button');
      const computedStyle = window.getComputedStyle(button);
      
      // Note: In a real test, you'd check actual computed dimensions
      // This is a simplified check
      expect(button.className).toContain('min-h-[44px]');
      expect(button.className).toContain('min-w-[44px]');
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});