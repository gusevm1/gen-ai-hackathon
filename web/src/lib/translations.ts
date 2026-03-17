export type Language = 'en' | 'de'

export const LANG_COOKIE = 'homematch_lang'

const translations = {
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
  },
} as const

export type TranslationKey = keyof typeof translations.en

export function t(lang: Language, key: TranslationKey): string {
  return translations[lang][key]
}
