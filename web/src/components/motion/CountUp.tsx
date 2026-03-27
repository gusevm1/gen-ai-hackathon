"use client"

import { useEffect, useRef } from "react"
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useInView,
} from "motion/react"
import { spring } from "@/lib/motion"

interface CountUpProps {
  target: number
  duration?: number
  className?: string
}

export function CountUp({ target, duration = 1.8, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  const count = useMotionValue(0)
  const springCount = useSpring(count, { ...spring.bouncy, duration })
  const rounded = useTransform(springCount, Math.round)

  useEffect(() => {
    if (isInView) {
      springCount.set(target)
    }
  }, [isInView, target, springCount])

  return (
    <motion.span ref={ref} className={className}>
      {rounded}
    </motion.span>
  )
}
