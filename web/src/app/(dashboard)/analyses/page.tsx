import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { FileSearch, ExternalLink, Download } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { AnalysesFilterBar } from '@/components/analyses/analyses-filter-bar'
import { AnalysesGrid } from '@/components/analyses/AnalysesGrid'
import { t, type Language, LANG_COOKIE } from '@/lib/translations'

export default async function AnalysesPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string; sort?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const params = await searchParams
  const profileFilter = params.profile ?? ''
  const sort = params.sort ?? 'newest'

  const cookieStore = await cookies()
  const lang = (cookieStore.get(LANG_COOKIE)?.value ?? 'en') as Language

  let query = supabase
    .from('analyses')
    .select('id, listing_id, score, breakdown, profile_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: sort === 'oldest' })

  if (profileFilter) {
    query = query.eq('profile_id', profileFilter)
  }

  const { data: analyses } = await query

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')

  const profileRecord: Record<string, string> = {}
  if (profiles) {
    for (const p of profiles) {
      profileRecord[p.id] = p.name
    }
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t(lang, 'analyses_title')}</h1>
        <p className="text-muted-foreground mt-1">{t(lang, 'analyses_subtitle')}</p>
      </div>

      <AnalysesFilterBar
        profiles={profiles ?? []}
        currentProfile={profileFilter}
        currentSort={sort}
        lang={lang}
        analysisCount={analyses?.length ?? 0}
      />

      {!analyses || analyses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted mb-4">
            <FileSearch className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">{t(lang, 'analyses_empty_title')}</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            {t(lang, 'analyses_empty_desc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://flatfox.ch/en/search/"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'default', size: 'lg' })}
            >
              Open Flatfox <ExternalLink className="ml-2 size-4" />
            </a>
            <a
              href="/download"
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              <Download className="mr-2 size-4" /> Download Extension
            </a>
          </div>
        </div>
      ) : (
        <AnalysesGrid analyses={analyses ?? []} profileMap={profileRecord} lang={lang} />
      )}
    </div>
  )
}
