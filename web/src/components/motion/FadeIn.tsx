"use client"

import { motion, useReducedMotion } from "motion/react"
import { fadeUpVariants } from "@/lib/motion"

interface FadeInProps {
  children: React.ReactNode
  className?: string
  delay?: number
  variants?: typeof fadeUpVariants
  animate?: string
}

export function FadeIn({
  children,
  className,
  delay = 0,
  variants = fadeUpVariants,
  animate,
}: FadeInProps) {
  const shouldReduceMotion = useReducedMotion()

  const mountMode = animate !== undefined

  if (mountMode) {
    return (
      <motion.div
        className={className}
        initial="hidden"
        animate={animate}
        variants={shouldReduceMotion ? {} : variants}
        transition={delay ? { delay } : undefined}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      exit="exit"
      viewport={{ once: true, amount: 0.2 }}
      variants={shouldReduceMotion ? {} : variants}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </motion.div>
  )
}
