/**
 * Animated Form Elements with Cinematic Interactions
 * Premium form components with Hollywood-grade animations
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect, ReactNode } from 'react'
import { duration, easing, colors } from '../core/animation-tokens'
import { Eye, EyeOff, Search, Check, X, AlertCircle, Info } from 'lucide-react'

// Animated Input Field
interface AnimatedInputProps {
  label: string
  type?: 'text' | 'email' | 'password' | 'search' | 'number'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  success?: boolean
  disabled?: boolean
  required?: boolean
  icon?: ReactNode
  className?: string
}

export function AnimatedInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  success,
  disabled = false,
  required = false,
  icon,
  className = ''
}: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasValue = value.length > 0
  const isFloating = isFocused || hasValue

  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type

  // Label animation variants
  const labelVariants = {
    floating: {
      y: -28,
      scale: 0.85,
      color: error ? '#EF4444' : success ? '#10B981' : isFocused ? '#8B5CF6' : '#94A3B8',
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20
      }
    },
    resting: {
      y: 0,
      scale: 1,
      color: '#94A3B8',
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20
      }
    }
  }

  // Border animation variants
  const borderVariants = {
    focused: {
      scale: 1,
      borderColor: error ? '#EF4444' : success ? '#10B981' : '#8B5CF6',
      boxShadow: error 
        ? '0 0 0 3px rgba(239, 68, 68, 0.1)' 
        : success 
        ? '0 0 0 3px rgba(16, 185, 129, 0.1)'
        : '0 0 0 3px rgba(139, 92, 246, 0.1)',
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    unfocused: {
      scale: 1,
      borderColor: error ? '#EF4444' : success ? '#10B981' : '#374151',
      boxShadow: '0 0 0 0px transparent',
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Input Container */}
      <motion.div
        className="relative"
        variants={borderVariants}
        animate={isFocused ? "focused" : "unfocused"}
      >
        {/* Background with gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-xl border"
          style={{
            borderColor: error ? '#EF4444' : success ? '#10B981' : '#374151'
          }}
          animate={{
            borderColor: isFocused 
              ? (error ? '#EF4444' : success ? '#10B981' : '#8B5CF6')
              : (error ? '#EF4444' : success ? '#10B981' : '#374151')
          }}
        />

        {/* Icon */}
        {icon && (
          <motion.div
            className="absolute left-3 top-1/2 text-slate-400"
            animate={{
              color: isFocused 
                ? (error ? '#EF4444' : success ? '#10B981' : '#8B5CF6')
                : '#94A3B8',
              y: '-50%'
            }}
            transition={{ duration: duration.fast / 1000 }}
          >
            {icon}
          </motion.div>
        )}

        {/* Input Field */}
        <input
          ref={inputRef}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          required={required}
          className={`
            w-full px-4 py-3 bg-transparent border-none outline-none text-white
            placeholder-transparent relative z-10
            ${icon ? 'pl-10' : ''}
            ${type === 'password' ? 'pr-10' : ''}
          `}
          placeholder={placeholder}
        />

        {/* Animated Label */}
        <motion.label
          className="absolute left-4 pointer-events-none font-medium origin-left z-20"
          variants={labelVariants}
          animate={isFloating ? "floating" : "resting"}
          onClick={() => inputRef.current?.focus()}
          style={{ top: '50%', translateY: '-50%' }}
        >
          {label}
          {required && (
            <motion.span
              className="text-red-400 ml-1"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              *
            </motion.span>
          )}
        </motion.label>

        {/* Password Toggle */}
        {type === 'password' && (
          <motion.button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 text-slate-400 hover:text-white"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{ y: '-50%' }}
          >
            <motion.div
              animate={{ rotate: showPassword ? 180 : 0 }}
              transition={{ duration: duration.base / 1000 }}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </motion.div>
          </motion.button>
        )}

        {/* Success/Error Icons */}
        <AnimatePresence>
          {(success || error) && (
            <motion.div
              className={`absolute right-3 top-1/2 ${
                type === 'password' ? 'right-12' : 'right-3'
              }`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              style={{ y: '-50%' }}
            >
              {success ? (
                <Check size={20} className="text-green-500" />
              ) : (
                <X size={20} className="text-red-500" />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Focus Indicator Line */}
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500"
          initial={{ width: 0 }}
          animate={{ width: isFocused ? '100%' : 0 }}
          transition={{ duration: duration.base / 1000, ease: easing.cinematic }}
        />
      </motion.div>

      {/* Error/Success Message */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div
            className="flex items-center gap-2 mt-2 text-sm"
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: duration.base / 1000 }}
          >
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 0.5,
                repeat: error ? 3 : 1,
                ease: "easeInOut"
              }}
            >
              {error ? (
                <AlertCircle size={16} className="text-red-500" />
              ) : (
                <Check size={16} className="text-green-500" />
              )}
            </motion.div>
            <span className={error ? 'text-red-400' : 'text-green-400'}>
              {error || 'Input is valid'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Animated Search Bar
interface AnimatedSearchProps {
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  suggestions?: string[]
  loading?: boolean
  className?: string
}

export function AnimatedSearch({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
  suggestions = [],
  loading = false,
  className = ''
}: AnimatedSearchProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleSearch = () => {
    onSearch?.(value)
    setShowSuggestions(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
    setShowSuggestions(false)
    onSearch?.(suggestion)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Search Container */}
      <motion.div
        className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700"
        animate={{
          borderColor: isFocused ? '#8B5CF6' : '#374151',
          boxShadow: isFocused ? '0 0 0 3px rgba(139, 92, 246, 0.1)' : '0 0 0 0px transparent',
        }}
        transition={{ duration: duration.base / 1000 }}
      >
        {/* Search Icon */}
        <motion.div
          className="absolute left-4 top-1/2 text-slate-400"
          animate={{
            color: isFocused ? '#8B5CF6' : '#94A3B8',
            y: '-50%'
          }}
        >
          <Search size={20} />
        </motion.div>

        {/* Input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setIsFocused(true)
            setShowSuggestions(suggestions.length > 0)
          }}
          onBlur={() => {
            setIsFocused(false)
            setTimeout(() => setShowSuggestions(false), 200)
          }}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="w-full px-12 py-4 bg-transparent border-none outline-none text-white 
                    placeholder-slate-400 text-lg"
        />

        {/* Search Button */}
        <motion.button
          onClick={handleSearch}
          className="absolute right-2 top-1/2 p-2 bg-purple-600 hover:bg-purple-700 
                    text-white rounded-xl border border-purple-500"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ y: '-50%' }}
          disabled={loading}
        >
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Search size={20} />
            </motion.div>
          ) : (
            <Search size={20} />
          )}
        </motion.button>

        {/* Animated Border */}
        <motion.div
          className="absolute inset-0 rounded-2xl"
          animate={{
            background: isFocused 
              ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.2) 0%, rgba(168, 85, 247, 0.2) 50%, rgba(139, 92, 246, 0.2) 100%)'
              : 'transparent'
          }}
          style={{ padding: '1px' }}
        />
      </motion.div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-md 
                      rounded-xl border border-slate-700 shadow-2xl z-50 overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: duration.base / 1000 }}
          >
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-3 text-left text-slate-300 hover:bg-slate-700/50 
                          hover:text-white transition-colors border-b border-slate-700/50 last:border-b-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 4 }}
              >
                <Search size={16} className="inline mr-3 text-slate-500" />
                {suggestion}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Animated Select Dropdown
interface AnimatedSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string; icon?: ReactNode }>
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
}

export function AnimatedSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  error,
  disabled = false,
  className = ''
}: AnimatedSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const selectedOption = options.find(option => option.value === value)

  const toggleOpen = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      setIsFocused(!isOpen)
    }
  }

  const selectOption = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setIsFocused(false)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Label */}
      <motion.label
        className="block text-sm font-medium text-slate-300 mb-2"
        animate={{ 
          color: error ? '#EF4444' : isFocused ? '#8B5CF6' : '#CBD5E1'
        }}
      >
        {label}
      </motion.label>

      {/* Select Container */}
      <motion.div
        className="relative bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 cursor-pointer"
        animate={{
          borderColor: error ? '#EF4444' : isFocused ? '#8B5CF6' : '#374151',
          boxShadow: isFocused ? '0 0 0 3px rgba(139, 92, 246, 0.1)' : '0 0 0 0px transparent',
        }}
        onClick={toggleOpen}
        whileHover={{ scale: disabled ? 1 : 1.01 }}
        whileTap={{ scale: disabled ? 1 : 0.99 }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {selectedOption?.icon && (
              <motion.div
                className="text-slate-400"
                animate={{ color: isFocused ? '#8B5CF6' : '#94A3B8' }}
              >
                {selectedOption.icon}
              </motion.div>
            )}
            <span className={selectedOption ? 'text-white' : 'text-slate-400'}>
              {selectedOption?.label || placeholder}
            </span>
          </div>
          
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: duration.base / 1000 }}
            className="text-slate-400"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </motion.div>
        </div>
      </motion.div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-md 
                      rounded-xl border border-slate-700 shadow-2xl z-50 overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: duration.base / 1000 }}
          >
            {options.map((option, index) => (
              <motion.button
                key={option.value}
                onClick={() => selectOption(option.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                          border-b border-slate-700/50 last:border-b-0
                          ${value === option.value 
                            ? 'bg-purple-600/20 text-purple-300' 
                            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                          }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 4 }}
              >
                {option.icon && (
                  <div className="text-slate-400">
                    {option.icon}
                  </div>
                )}
                {option.label}
                {value === option.value && (
                  <motion.div
                    className="ml-auto text-purple-400"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <Check size={16} />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="flex items-center gap-2 mt-2 text-sm text-red-400"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}