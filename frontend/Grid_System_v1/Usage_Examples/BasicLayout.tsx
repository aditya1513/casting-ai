/**
 * CastMatch Layout System - Basic Usage Example
 * Demonstrates the fundamental implementation of the grid system
 */

import React, { useState } from 'react'
import { 
  CastMatchLayout,
  Message 
} from '../../components/layout'

export function BasicLayoutExample() {
  const [messages, setMessages] = useState<Array<{
    id: string
    content: string
    sender: 'user' | 'ai'
    timestamp: Date
  }>>([
    {
      id: '1',
      content: "I need a female lead for a romantic drama set in Mumbai, age 25-35.",
      sender: 'user',
      timestamp: new Date()
    },
    {
      id: '2',
      content: "I've found 12 talented actresses that match your requirements. Here are the top recommendations based on your criteria:",
      sender: 'ai',
      timestamp: new Date()
    }
  ])
  
  const handleSendMessage = (message: string) => {
    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      content: message,
      sender: 'user' as const,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        content: `I understand you're looking for: "${message}". Let me search our talent database...`,
        sender: 'ai' as const,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
    }, 1000)
  }
  
  return (
    <CastMatchLayout
      onSendMessage={handleSendMessage}
      conversationContent={
        <div className="space-y-6">
          {messages.map(msg => (
            <Message
              key={msg.id}
              content={msg.content}
              sender={msg.sender}
              timestamp={msg.timestamp}
            />
          ))}
        </div>
      }
    />
  )
}