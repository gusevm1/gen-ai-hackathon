"use client"

import { motion } from "motion/react"
import { staggerContainerVariants, staggerItemVariants } from "@/lib/motion"

export function StaggerGroup({
  children,
  className,
  animate,
}: {
  children: React.ReactNode
  className?: string
  animate?: string
}) {
  const mountMode = animate !== undefined

  return (
    <motion.div
      className={className}
      initial="hidden"
      {...(mountMode
        ? { animate }
        : { whileInView: "visible", viewport: { once: true, amount: 0.15 } }
      )}
      variants={staggerContainerVariants}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div className={className} variants={staggerItemVariants}>
      {children}
    </motion.div>
  )
}
