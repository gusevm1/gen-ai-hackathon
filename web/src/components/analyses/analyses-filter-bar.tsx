"use client"

import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type Language, t } from "@/lib/translations"

interface Props {
  profiles: { id: string; name: string }[]
  currentProfile: string
  currentSort: string
  lang: Language
}

export function AnalysesFilterBar({ profiles, currentProfile, currentSort, lang }: Props) {
  const router = useRouter()

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(window.location.search)
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    const qs = params.toString()
    router.push(`/analyses${qs ? `?${qs}` : ""}`)
  }

  if (profiles.length === 0) return null

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <Select value={currentProfile || "all"} onValueChange={(v) => updateParam("profile", v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder={t(lang, "filter_all_profiles")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t(lang, "filter_all_profiles")}</SelectItem>
          {profiles.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentSort} onValueChange={(v) => updateParam("sort", v)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">{t(lang, "filter_newest")}</SelectItem>
          <SelectItem value="oldest">{t(lang, "filter_oldest")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
