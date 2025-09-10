/**
 * CastMatch Layout System Exports
 * Central export point for all layout components and utilities
 */

// Core Layout Components
export { CastMatchLayoutProvider, useLayoutContext } from './CastMatchLayoutProvider'
export { CastMatchSidebar } from './CastMatchSidebar'
export { 
  CastMatchMainContent, 
  ContentSection, 
  ContentGrid, 
  ContentHeader, 
  ContentFooter 
} from './CastMatchMainContent'
export { CastMatchInputArea, MinimalInputArea } from './CastMatchInputArea'
export { 
  CastMatchConversationArea, 
  Message, 
  TypingIndicator, 
  SystemMessage, 
  MessageGroup 
} from './CastMatchConversationArea'
export { CastMatchLayout, CastingDirectorLayout } from './CastMatchLayout'

// Type exports
export type { Breakpoint } from '../../hooks/useResponsiveLayout'