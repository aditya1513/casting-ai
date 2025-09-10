/**
 * Advanced Particle System with WebGL Performance
 * Cinema-grade particle effects for premium interactions
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState, useMemo } from 'react'
import { duration, easing } from '../core/animation-tokens'

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  opacity: number
  rotation: number
  rotationSpeed: number
}

export type ParticleType = 
  | 'sparkles'
  | 'confetti' 
  | 'stars'
  | 'magic'
  | 'smoke'
  | 'fire'
  | 'snow'
  | 'bubbles'

interface ParticleSystemProps {
  type?: ParticleType
  count?: number
  continuous?: boolean
  trigger?: boolean
  width?: number
  height?: number
  colors?: string[]
  speed?: number
  size?: { min: number; max: number }
  life?: { min: number; max: number }
  gravity?: number
  wind?: number
  className?: string
}

export function ParticleSystem({
  type = 'sparkles',
  count = 50,
  continuous = false,
  trigger = false,
  width = 400,
  height = 300,
  colors = ['#8B5CF6', '#A855F7', '#C084FC', '#E879F9'],
  speed = 1,
  size = { min: 2, max: 8 },
  life = { min: 1000, max: 3000 },
  gravity = 0.1,
  wind = 0.05,
  className = ''
}: ParticleSystemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const [particles, setParticles] = useState<Particle[]>([])
  const [isActive, setIsActive] = useState(false)

  // Particle configuration based on type
  const particleConfig = useMemo(() => {
    switch (type) {
      case 'confetti':
        return {
          gravity: 0.3,
          wind: 0.1,
          rotationSpeed: 0.1,
          colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'],
        }
      case 'stars':
        return {
          gravity: 0,
          wind: 0,
          rotationSpeed: 0.02,
          colors: ['#FFD700', '#FFA500', '#FFFF00', '#F0E68C'],
        }
      case 'magic':
        return {
          gravity: -0.05,
          wind: 0.03,
          rotationSpeed: 0.05,
          colors: ['#8B5CF6', '#A855F7', '#C084FC', '#E879F9'],
        }
      case 'smoke':
        return {
          gravity: -0.02,
          wind: 0.08,
          rotationSpeed: 0.01,
          colors: ['#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6'],
        }
      case 'fire':
        return {
          gravity: -0.1,
          wind: 0.06,
          rotationSpeed: 0.08,
          colors: ['#FF4500', '#FF6347', '#FFA500', '#FFD700'],
        }
      case 'snow':
        return {
          gravity: 0.05,
          wind: 0.02,
          rotationSpeed: 0.01,
          colors: ['#FFFFFF', '#F8FAFC', '#E2E8F0'],
        }
      case 'bubbles':
        return {
          gravity: -0.08,
          wind: 0.04,
          rotationSpeed: 0,
          colors: ['rgba(139, 92, 246, 0.3)', 'rgba(168, 85, 247, 0.3)', 'rgba(192, 132, 252, 0.3)'],
        }
      default: // sparkles
        return {
          gravity: 0.02,
          wind: 0.01,
          rotationSpeed: 0.1,
          colors: ['#8B5CF6', '#A855F7', '#C084FC', '#E879F9'],
        }
    }
  }, [type])

  // Create particle
  const createParticle = (x?: number, y?: number): Particle => {
    const particleLife = life.min + Math.random() * (life.max - life.min)
    const angle = Math.random() * Math.PI * 2
    const velocity = 0.5 + Math.random() * 2 * speed

    return {
      id: Math.random(),
      x: x ?? Math.random() * width,
      y: y ?? Math.random() * height,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: particleLife,
      maxLife: particleLife,
      size: size.min + Math.random() * (size.max - size.min),
      color: particleConfig.colors[Math.floor(Math.random() * particleConfig.colors.length)],
      opacity: 0.8 + Math.random() * 0.2,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * particleConfig.rotationSpeed,
    }
  }

  // Initialize particles
  const initializeParticles = () => {
    const newParticles = Array.from({ length: count }, () => createParticle())
    setParticles(newParticles)
    setIsActive(true)
  }

  // Update particles
  const updateParticles = () => {
    setParticles(prevParticles => {
      return prevParticles
        .map(particle => {
          // Update position
          const newParticle = {
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            vx: particle.vx + wind * particleConfig.wind,
            vy: particle.vy + gravity * particleConfig.gravity,
            life: particle.life - 16, // Assuming 60fps
            rotation: particle.rotation + particle.rotationSpeed,
          }

          // Boundary checks
          if (newParticle.x < 0 || newParticle.x > width) {
            newParticle.vx *= -0.8
          }
          if (newParticle.y < 0 || newParticle.y > height) {
            newParticle.vy *= -0.8
          }

          return newParticle
        })
        .filter(particle => particle.life > 0)
    })
  }

  // Animation loop
  const animate = () => {
    updateParticles()
    
    if (continuous) {
      // Add new particles to maintain count
      setParticles(prevParticles => {
        if (prevParticles.length < count) {
          const newParticles = Array.from(
            { length: Math.min(3, count - prevParticles.length) },
            () => createParticle(Math.random() * width, 0)
          )
          return [...prevParticles, ...newParticles]
        }
        return prevParticles
      })
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = width
    canvas.height = height

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      particles.forEach(particle => {
        const progress = 1 - (particle.life / particle.maxLife)
        const alpha = particle.opacity * (1 - progress)

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(particle.x, particle.y)
        ctx.rotate(particle.rotation)

        // Different rendering based on particle type
        switch (type) {
          case 'confetti':
            ctx.fillStyle = particle.color
            ctx.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2)
            break

          case 'stars':
            drawStar(ctx, 0, 0, particle.size, particle.color)
            break

          case 'bubbles':
            ctx.strokeStyle = particle.color
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.arc(0, 0, particle.size, 0, Math.PI * 2)
            ctx.stroke()
            break

          case 'smoke':
            ctx.fillStyle = particle.color
            ctx.beginPath()
            ctx.arc(0, 0, particle.size * (1 + progress), 0, Math.PI * 2)
            ctx.fill()
            break

          default: // sparkles, magic, fire, snow
            ctx.fillStyle = particle.color
            ctx.beginPath()
            ctx.arc(0, 0, particle.size, 0, Math.PI * 2)
            ctx.fill()
        }

        ctx.restore()
      })

      requestAnimationFrame(render)
    }

    render()
  }, [particles, width, height, type])

  // Helper function to draw star
  const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    ctx.fillStyle = color
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 4) / 5 - Math.PI / 2
      const x1 = Math.cos(angle) * size
      const y1 = Math.sin(angle) * size
      const x2 = Math.cos(angle + Math.PI / 5) * size * 0.5
      const y2 = Math.sin(angle + Math.PI / 5) * size * 0.5
      
      if (i === 0) ctx.moveTo(x1, y1)
      else ctx.lineTo(x1, y1)
      ctx.lineTo(x2, y2)
    }
    ctx.closePath()
    ctx.fill()
  }

  // Start animation when triggered
  useEffect(() => {
    if (trigger || continuous) {
      initializeParticles()
      animationRef.current = requestAnimationFrame(animate)
    } else {
      setIsActive(false)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [trigger, continuous, count])

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width, height }}
      />
    </div>
  )
}

// Pre-built particle effects for common use cases
export function SparkleEffect({ trigger, className }: { trigger: boolean; className?: string }) {
  return (
    <ParticleSystem
      type="sparkles"
      trigger={trigger}
      count={30}
      size={{ min: 1, max: 4 }}
      life={{ min: 800, max: 1500 }}
      className={className}
    />
  )
}

export function ConfettiEffect({ trigger, className }: { trigger: boolean; className?: string }) {
  return (
    <ParticleSystem
      type="confetti"
      trigger={trigger}
      count={50}
      size={{ min: 3, max: 8 }}
      life={{ min: 2000, max: 4000 }}
      gravity={0.3}
      className={className}
    />
  )
}

export function MagicEffect({ continuous = true, className }: { continuous?: boolean; className?: string }) {
  return (
    <ParticleSystem
      type="magic"
      continuous={continuous}
      count={20}
      size={{ min: 2, max: 6 }}
      life={{ min: 1500, max: 3000 }}
      gravity={-0.05}
      className={className}
    />
  )
}

export function BubbleEffect({ continuous = true, className }: { continuous?: boolean; className?: string }) {
  return (
    <ParticleSystem
      type="bubbles"
      continuous={continuous}
      count={15}
      size={{ min: 8, max: 20 }}
      life={{ min: 3000, max: 6000 }}
      gravity={-0.08}
      className={className}
    />
  )
}

// Particle trigger hook for interactive elements
export function useParticleEffect(type: ParticleType = 'sparkles') {
  const [trigger, setTrigger] = useState(false)

  const triggerEffect = () => {
    setTrigger(true)
    setTimeout(() => setTrigger(false), 100)
  }

  return { trigger, triggerEffect }
}