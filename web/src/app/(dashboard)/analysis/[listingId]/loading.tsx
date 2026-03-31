"use client"

import { useState, useEffect } from "react"

const STAGES = [
  { label: "Fetching listings...", progress: 25 },
  { label: "Analyzing property details...", progress: 50 },
  { label: "Scoring compatibility...", progress: 75 },
  { label: "Finalizing results...", progress: 92 },
]

export default function AnalysisLoading() {
  const [stage, setStage] = useState(0)
  const [progress, setProgress] = useState(5)

  useEffect(() => {
    let cancelled = false
    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

    const run = async () => {
      for (let i = 0; i < STAGES.length; i++) {
        if (cancelled) return
        const delay = i === 0 ? 200 : 900 + Math.random() * 600
        await sleep(delay)
        if (cancelled) return
        setStage(i)
        setProgress(STAGES[i].progress)
      }
    }

    run()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-full max-w-xs space-y-3">
          <p className="text-sm text-center text-muted-foreground tabular-nums">
            {STAGES[stage].label}
          </p>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
