'use client'

import { motion } from 'framer-motion'

interface TypingUser {
  userId: string
  userName: string
  conversationId: string
}

interface TypingIndicatorProps {
  users: TypingUser[]
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null

  const displayText =
    users.length === 1
      ? `${users[0].userName} is typing`
      : users.length === 2
      ? `${users[0].userName} and ${users[1].userName} are typing`
      : `${users[0].userName} and ${users.length - 1} others are typing`

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="px-4 py-2"
    >
      <div className="flex items-center gap-2">
        <div className="bg-slate-800 rounded-full px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-purple-500 rounded-full"
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
          <span className="text-sm text-slate-400 ml-1">{displayText}</span>
        </div>
      </div>
    </motion.div>
  )
}