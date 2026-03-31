"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { t, type Language } from "@/lib/translations"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { buttonVariants } from "@/components/ui/button"
import { Download } from "lucide-react"
import { updateProfilesLanguage } from "@/app/(dashboard)/profiles/actions"

export default function SettingsPage() {
  const { language, setLanguage } = useLanguage()

  async function handleLanguageChange(newLang: Language) {
    setLanguage(newLang)
    // Sync preferences.language in all Supabase profiles so the AI scores in the correct language
    await updateProfilesLanguage(newLang)
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">{t(language, "settings_title")}</h1>
      <p className="text-muted-foreground mb-8">{t(language, "settings_subtitle")}</p>

      <div className="max-w-sm space-y-4">
        <div className="space-y-2">
          <Label>{t(language, "settings_language")}</Label>
          <Select value={language} onValueChange={(v) => handleLanguageChange(v as Language)}>
            <SelectTrigger className="w-48 cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t(language, "settings_language_en")}</SelectItem>
              <SelectItem value="de">{t(language, "settings_language_de")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Download Extension section */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-1">{t(language, "download_title")}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t(language, "download_subtitle")}
        </p>
        <Link href="/download" className={buttonVariants()}>
          <Download className="size-4 mr-2" />
          {t(language, "download_btn")}
        </Link>
      </div>
    </div>
  )
}
