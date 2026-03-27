'use client'

import { MotionValue, motion, useTransform, useMotionValue } from "motion/react"

interface IsometricHomeProps {
  // scrollYProgress from parent chapter — used to drive build sequence
  // Pass a MotionValue<number> for scroll-driven animation, or undefined for static
  scrollProgress?: MotionValue<number>
  // For ChapterDream: overall house opacity (0.4 → 1.0 as scroll increases)
  globalOpacity?: MotionValue<number>
  // For ChapterDream: warm window glow (0 → 1 as scroll increases)
  windowGlow?: MotionValue<number>
  // Build sequence mode: each part fades in at its threshold
  buildMode?: boolean
  className?: string
}

export function IsometricHome({ scrollProgress, globalOpacity, windowGlow, buildMode, className }: IsometricHomeProps) {
  // Fallback static progress (always 1 = fully visible)
  const staticProgress = useMotionValue(1)
  const sp = scrollProgress ?? staticProgress

  // Build mode: each polygon group fades in at scroll thresholds
  const foundationOpacity = useTransform(sp, [0.0, 0.1], [0, 1])
  const frontWallOpacity  = useTransform(sp, [0.1, 0.2], [0, 1])
  const sideWallOpacity   = useTransform(sp, [0.2, 0.3], [0, 1])
  const roofOpacity       = useTransform(sp, [0.3, 0.4], [0, 1])
  const windowsOpacity    = useTransform(sp, [0.4, 0.5], [0, 1])
  const doorOpacity       = useTransform(sp, [0.5, 0.6], [0, 1])
  const chimneyOpacity    = useTransform(sp, [0.6, 0.65], [0, 1])
  // Dim the whole house at 0.65→0.75 (for ChapterProblem: house fades to show it's a problem)
  const houseGroupOpacity = useTransform(sp, [0.65, 0.75], [1, 0.3])

  // When not in buildMode, all parts are fully visible (opacity = 1)
  const fo = buildMode ? foundationOpacity : useMotionValue(1)
  const fwo = buildMode ? frontWallOpacity : useMotionValue(1)
  const swo = buildMode ? sideWallOpacity : useMotionValue(1)
  const ro = buildMode ? roofOpacity : useMotionValue(1)
  const wo = buildMode ? windowsOpacity : useMotionValue(1)
  const doo = buildMode ? doorOpacity : useMotionValue(1)
  const cho = buildMode ? chimneyOpacity : useMotionValue(1)
  const hgo = buildMode ? houseGroupOpacity : useMotionValue(1)

  return (
    <svg
      viewBox="0 0 300 280"
      className={className}
      aria-label="Isometric house illustration"
      role="img"
    >
      <motion.g style={{ opacity: buildMode ? hgo : (globalOpacity ?? useMotionValue(1)) }}>
        {/* Foundation — top face of base slab */}
        <motion.polygon
          points="150,200 202,170 150,140 98,170"
          fill="hsl(220 20% 55%)"
          style={{ opacity: fo }}
        />

        {/* Front wall — left face */}
        <motion.polygon
          points="150,200 202,170 202,120 150,150"
          fill="hsl(220 20% 45%)"
          style={{ opacity: fwo }}
        />

        {/* Side wall — right face */}
        <motion.polygon
          points="202,170 150,140 150,90 202,120"
          fill="hsl(220 20% 30%)"
          style={{ opacity: swo }}
        />

        {/* Roof group */}
        <motion.g style={{ opacity: ro }}>
          {/* Roof left facet */}
          <polygon points="150,100 150,150 202,120" fill="hsl(220 20% 60%)"/>
          {/* Roof right facet */}
          <polygon points="150,100 202,120 150,90" fill="hsl(220 20% 50%)"/>
          {/* Roof left side */}
          <polygon points="150,100 150,150 98,120" fill="hsl(220 20% 65%)"/>
        </motion.g>

        {/* Door */}
        <motion.polygon
          points="157,200 163,197 163,180 157,183"
          fill="hsl(220 30% 15%)"
          style={{ opacity: doo }}
        />

        {/* Windows group */}
        <motion.g style={{ opacity: wo }}>
          {/* Window 1 dark base */}
          <polygon points="162,175 172,169 172,159 162,165" fill="hsl(220 30% 20%)"/>
          {/* Window 2 dark base */}
          <polygon points="178,166 188,160 188,150 178,156" fill="hsl(220 30% 20%)"/>
          {/* Window 1 warm glow overlay */}
          <motion.polygon
            points="162,175 172,169 172,159 162,165"
            fill="hsl(38 90% 60%)"
            style={{ opacity: windowGlow ?? useMotionValue(0) }}
          />
          {/* Window 2 warm glow overlay */}
          <motion.polygon
            points="178,166 188,160 188,150 178,156"
            fill="hsl(38 90% 60%)"
            style={{ opacity: windowGlow ?? useMotionValue(0) }}
          />
        </motion.g>

        {/* Chimney */}
        <motion.polygon
          points="170,115 175,112 175,105 170,108"
          fill="hsl(220 20% 25%)"
          style={{ opacity: cho }}
        />
      </motion.g>
    </svg>
  )
}
