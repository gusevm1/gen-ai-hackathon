"use client"

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
    </div>
  )
}
