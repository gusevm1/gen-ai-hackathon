export type Language = 'en' | 'de'

export const LANG_COOKIE = 'homematch_lang'

export const translations = {
  en: {
    nav_ai_search: 'AI-Powered Search',
    nav_profiles: 'Profiles',
    nav_analyses: 'Analyses',
    nav_download: 'Download',
    nav_settings: 'Settings',

    analyses_title: 'Analyses',
    analyses_subtitle: 'Your scored listings',
    analyses_empty_title: 'No analyses yet',
    analyses_empty_desc: 'Score listings on Flatfox using the browser extension to see results here.',
    analyses_listing: 'Listing',
    tier_excellent: 'excellent match',
    tier_good: 'good match',
    tier_fair: 'fair match',
    tier_poor: 'poor match',
    no_profile: 'No profile',
    filter_all_profiles: 'All profiles',
    filter_newest: 'Newest first',
    filter_oldest: 'Oldest first',

    settings_title: 'Settings',
    settings_subtitle: 'Account settings',
    settings_language: 'Language',
    settings_language_en: 'English',
    settings_language_de: 'German',

    landing_nav_signin: 'Sign In',
    // Chapter 1 - Hook
    landing_hook_phrase1: 'Your next home.',
    landing_hook_phrase2: 'Already found.',
    // Chapter 2 - Switzerland
    landing_ch_line1: 'One flat for every 200 applicants.',
    landing_ch_line2: "The Swiss rental market doesn't wait.",
    // Chapter 3 - Problem
    landing_problem_overline: 'The problem',
    landing_problem_headline: 'Finding a flat in Zurich takes weeks.',
    landing_problem_pain1: 'You scroll through 40 listings on Sunday.',
    landing_problem_pain2: "You request 8 viewings. 6 don't reply.",
    landing_problem_pain3: 'The good one goes in 48 hours. You saw it too late.',
    // Chapter 4 - Mechanism
    landing_mech_overline: 'How it works',
    landing_mech_headline: 'HomeMatch reads every listing the way you would — but in seconds.',
    // Chapter 5 - Score
    landing_score_label: 'Excellent match.',
    // Chapter 6 - Dream
    landing_dream_line1: 'No more guessing.',
    landing_dream_line2: 'No more wasted evenings.',
    landing_dream_line3: 'Find the right flat. Not just the next one.',
    // Chapter 7 - CTA
    landing_cta_headline: 'Free to use. No credit card. Works on Flatfox today.',
    landing_cta_button: 'Create free account',
    landing_cta_signin: 'Already have an account?',
    landing_cta_signin_link: 'Sign in',
    // Footer
    landing_footer_copyright: '© 2026 HomeMatch. All rights reserved.',
  },
  de: {
    nav_ai_search: 'KI-gestützte Suche',
    nav_profiles: 'Profile',
    nav_analyses: 'Analysen',
    nav_download: 'Download',
    nav_settings: 'Einstellungen',

    analyses_title: 'Analysen',
    analyses_subtitle: 'Deine bewerteten Inserate',
    analyses_empty_title: 'Noch keine Analysen',
    analyses_empty_desc: 'Bewerte Inserate auf Flatfox mit der Browser-Erweiterung, um Ergebnisse hier zu sehen.',
    analyses_listing: 'Inserat',
    tier_excellent: 'ausgezeichnet',
    tier_good: 'gut',
    tier_fair: 'befriedigend',
    tier_poor: 'schwach',
    no_profile: 'Kein Profil',
    filter_all_profiles: 'Alle Profile',
    filter_newest: 'Neueste zuerst',
    filter_oldest: 'Älteste zuerst',

    settings_title: 'Einstellungen',
    settings_subtitle: 'Kontoeinstellungen',
    settings_language: 'Sprache',
    settings_language_en: 'Englisch',
    settings_language_de: 'Deutsch',

    landing_nav_signin: 'Anmelden',
    landing_hook_phrase1: 'Deine nächste Wohnung.',
    landing_hook_phrase2: 'Bereits gefunden.',
    landing_ch_line1: 'Eine Wohnung für 200 Bewerber.',
    landing_ch_line2: 'Der Schweizer Mietmarkt wartet nicht.',
    landing_problem_overline: 'Das Problem',
    landing_problem_headline: 'Eine Wohnung in Zürich zu finden dauert Wochen.',
    landing_problem_pain1: 'Du scrollst sonntags durch 40 Inserate.',
    landing_problem_pain2: 'Du fragst 8 Besichtigungen an. 6 antworten nicht.',
    landing_problem_pain3: 'Die gute Wohnung ist in 48 Stunden weg. Du hast sie zu spät gesehen.',
    landing_mech_overline: 'So funktioniert es',
    landing_mech_headline: 'HomeMatch liest jedes Inserat so wie du — aber in Sekunden.',
    landing_score_label: 'Ausgezeichnete Übereinstimmung.',
    landing_dream_line1: 'Kein Raten mehr.',
    landing_dream_line2: 'Keine verschwendeten Abende mehr.',
    landing_dream_line3: 'Finde die richtige Wohnung. Nicht nur die nächste.',
    landing_cta_headline: 'Kostenlos. Keine Kreditkarte. Funktioniert auf Flatfox.',
    landing_cta_button: 'Kostenloses Konto erstellen',
    landing_cta_signin: 'Bereits ein Konto?',
    landing_cta_signin_link: 'Anmelden',
    landing_footer_copyright: '© 2026 HomeMatch. Alle Rechte vorbehalten.',
  },
} as const

// Ensure de has all keys that en has (key-only check)
type _DeHasAllEnKeys = keyof typeof translations.en extends keyof typeof translations.de ? true : false
const _deKeyCheck: _DeHasAllEnKeys = true
void _deKeyCheck

export type TranslationKey = keyof typeof translations.en

export function t(lang: Language, key: TranslationKey): string {
  return translations[lang][key]
}
