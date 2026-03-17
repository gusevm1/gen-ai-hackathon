"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { type Language, LANG_COOKIE } from "./translations"

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
})

function readLangCookie(): Language {
  if (typeof document === "undefined") return "en"
  const match = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`))
  const val = match ? decodeURIComponent(match[1]) : "en"
  return val === "de" ? "de" : "en"
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>("en")

  useEffect(() => {
    setLang(readLangCookie())
  }, [])

  const setLanguage = (lang: Language) => {
    setLang(lang)
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; SameSite=Lax`
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
