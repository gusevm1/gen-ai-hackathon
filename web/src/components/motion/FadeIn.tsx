"use client"

import { motion, useReducedMotion } from "motion/react"
import { fadeUpVariants } from "@/lib/motion"

interface FadeInProps {
  children: React.ReactNode
  className?: string
  delay?: number
  variants?: typeof fadeUpVariants
}

export function FadeIn({
  children,
  className,
  delay = 0,
  variants = fadeUpVariants,
}: FadeInProps) {
  const shouldReduceMotion = useReducedMotion()

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
