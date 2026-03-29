import Link from "next/link"
import { Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  className?: string
}

const SIZE_CONFIG = {
  sm: { icon: "size-4", text: "text-base" },
  md: { icon: "size-5", text: "text-lg" },
  lg: { icon: "size-7", text: "text-2xl" },
}

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const { icon, text } = SIZE_CONFIG[size]
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <Home className={cn(icon, "text-primary")} />
      {showText && (
        <span className={cn(text, "font-semibold tracking-tight")}>HomeMatch</span>
      )}
    </Link>
  )
}
