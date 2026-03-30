"use client"

import { useRouter } from "next/navigation"
import { CheckCircle2, FolderOpen, ToggleRight, Puzzle, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CopyExtensionsUrl } from "@/components/copy-extensions-url"
import { useLanguage } from "@/lib/language-context"
import { t } from "@/lib/translations"
import { useOnboardingContext } from "@/components/onboarding/OnboardingProvider"

export default function DownloadPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const { state, isActive, advance } = useOnboardingContext()

  const step = state?.onboarding_step ?? 0

  const steps = [
    {
      number: 1,
      icon: FolderOpen,
      title: t(language, "download_step1_title"),
      description: t(language, "download_step1_desc"),
    },
    {
      number: 2,
      icon: null,
      title: t(language, "download_step2_title"),
      description: null,
    },
    {
      number: 3,
      icon: ToggleRight,
      title: t(language, "download_step3_title"),
      description: t(language, "download_step3_desc"),
    },
    {
      number: 4,
      icon: Puzzle,
      title: t(language, "download_step4_title"),
      description: t(language, "download_step4_desc"),
    },
  ]

  async function handleInstalledConfirm() {
    await advance()
    router.push('/dashboard')
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">{t(language, "download_title")}</h1>
        <p className="text-muted-foreground">{t(language, "download_subtitle")}</p>
      </div>

      <div id="install-extension-cta" className="flex flex-col items-center mb-10">
        <a href="/homematch-extension.zip" download="homematch-extension.zip" className="cursor-pointer">
          <Button size="lg">
            <Download className="size-4" />
            {t(language, "download_btn")}
          </Button>
        </a>
        <span className="text-xs text-muted-foreground mt-2">v0.4.0</span>

        {/* Onboarding Step 1 confirmation button */}
        {isActive && step === 1 && (
          <Button
            size="lg"
            variant="outline"
            className="mt-4 gap-2"
            onClick={handleInstalledConfirm}
          >
            <CheckCircle2 className="size-4 text-green-500" />
            {t(language, "onboarding_installed_confirm")}
          </Button>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-4">{t(language, "download_instructions_title")}</h2>

      <div className="space-y-4">
        {steps.map((s) => (
          <Card key={s.number} className="hover:shadow-sm transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {s.number}
                </span>
                {s.icon && <s.icon className="size-5" />}
                {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {s.number === 2 ? (
                <div className="text-muted-foreground">
                  <p className="mb-2">{t(language, "download_step2_url_desc")}</p>
                  <div className="mb-2">
                    <CopyExtensionsUrl />
                  </div>
                  <p className="text-sm">{t(language, "download_step2_url_hint")}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">{s.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
