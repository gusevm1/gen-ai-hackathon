import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FileText, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Get active profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('is_default', true)
    .single()

  const applications = profile
    ? await supabase
        .from('applications')
        .select('id, listing_id, listing_address, listing_type, message, created_at')
        .eq('user_id', user.id)
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .then(r => r.data ?? [])
    : []

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Applications</h1>
      </div>
      <p className="text-muted-foreground mb-6">
        Sent applications for profile: <span className="font-medium text-foreground">{profile?.name ?? '—'}</span>
      </p>

      {applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted mb-4">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No applications yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Find listings on Top Matches and use Quick Apply to send your first application.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map(app => {
            const flatfoxUrl = `https://flatfox.ch/de/flat/${app.listing_id}/`
            const date = new Date(app.created_at).toLocaleDateString('de-CH', { day: 'numeric', month: 'short', year: 'numeric' })
            return (
              <Card key={app.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{app.listing_address ?? `Listing ${app.listing_id}`}</p>
                      {app.listing_type && <p className="text-xs text-muted-foreground mt-0.5">{app.listing_type}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{date}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs text-green-600 dark:text-green-400">Applied</Badge>
                      <a href={flatfoxUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
