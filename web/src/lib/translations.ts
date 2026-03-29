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

    // Navbar / Footer (shared)
    landing_nav_signin: 'Sign In',
    landing_footer_copyright: '© 2026 HomeMatch. All rights reserved.',

    // Section 1 — Hero
    landing_hero_overline: 'Find your perfect flat',
    landing_hero_headline: 'Thousands of listings. One perfect match.',
    landing_hero_subtitle: 'HomeMatch scores every Flatfox listing against your exact needs — so you spend time on viewings, not scrolling.',
    landing_hero_cta: 'Get Started',

    // Section 2 — Globe
    landing_globe_headline: 'Built for the Swiss market',
    landing_globe_body: 'HomeMatch works with Flatfox — the leading Swiss rental platform.',

    // Section 3 — Problem
    landing_problem_overline: 'The problem',
    landing_problem_headline: 'Finding a flat in Switzerland is exhausting.',
    landing_problem_bullet1: 'You scroll through 40 listings every Sunday and still feel lost.',
    landing_problem_bullet2: 'You request viewings. Half never reply. The rest are wrong.',
    landing_problem_bullet3: 'The right flat is gone in 48 hours — you saw it too late.',

    // Section 4 — How it works
    landing_howit_overline: 'How to avoid this',
    landing_howit_headline: 'Three steps from search to certainty.',
    landing_howit_step1_label: 'Tell us what you need',
    landing_howit_step1_body: 'Set your criteria once — location, budget, size, must-haves — via chat or a quick form.',
    landing_howit_step2_label: 'We score every listing',
    landing_howit_step2_body: 'HomeMatch reads each Flatfox listing and calculates a match score against your profile in seconds.',
    landing_howit_step3_label: 'See the full picture',
    landing_howit_step3_body: 'Open any listing to see your score, a breakdown by category, and the AI reasoning behind it.',

    // Section 4b — Features
    landing_features_overline: 'Built for Swiss renters',
    landing_features_headline: 'Everything you need to find the right flat faster.',
    landing_feat1_title: 'AI match scoring',
    landing_feat1_body: 'Every listing gets a score from 0–100 based on how well it fits your profile. No guessing required.',
    landing_feat2_title: 'Multiple profiles',
    landing_feat2_body: 'Switch between search profiles instantly — ideal if you are searching for different locations or budgets.',
    landing_feat3_title: 'Transparent reasoning',
    landing_feat3_body: 'See exactly why a listing scored high or low. Category-by-category breakdown with AI explanation.',

    // Section 5 — CTA
    landing_cta_overline: 'Ready to find your flat?',
    landing_cta_headline: 'Start matching in minutes.',
    landing_cta_subtext: 'Free to use. No credit card. Works on Flatfox today.',
    landing_cta_button: 'Create free account',

    // Section Credits
    landing_credits_label: 'A project from',
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

    // Navbar / Footer (shared)
    landing_nav_signin: 'Anmelden',
    landing_footer_copyright: '© 2026 HomeMatch. Alle Rechte vorbehalten.',

    // Section 1 — Hero
    landing_hero_overline: 'Finde deine perfekte Wohnung',
    landing_hero_headline: 'Tausende Inserate. Ein perfektes Match.',
    landing_hero_subtitle: 'HomeMatch bewertet jedes Flatfox-Inserat anhand deiner genauen Anforderungen — damit du Zeit für Besichtigungen hast, nicht fürs Scrollen.',
    landing_hero_cta: 'Jetzt starten',

    // Section 2 — Globe
    landing_globe_headline: 'Für den Schweizer Markt gebaut',
    landing_globe_body: 'HomeMatch funktioniert mit Flatfox — der führenden Schweizer Mietplattform.',

    // Section 3 — Problem
    landing_problem_overline: 'Das Problem',
    landing_problem_headline: 'Eine Wohnung in der Schweiz zu finden ist erschöpfend.',
    landing_problem_bullet1: 'Du scrollst jeden Sonntag durch 40 Inserate und weißt am Ende nicht weiter.',
    landing_problem_bullet2: 'Du fragst Besichtigungen an. Die Hälfte antwortet nie. Der Rest passt nicht.',
    landing_problem_bullet3: 'Die richtige Wohnung ist in 48 Stunden weg — du hast sie zu spät gesehen.',

    // Section 4 — How it works
    landing_howit_overline: 'So vermeidest du das',
    landing_howit_headline: 'Drei Schritte von der Suche zur Sicherheit.',
    landing_howit_step1_label: 'Sag uns, was du brauchst',
    landing_howit_step1_body: 'Gib deine Kriterien einmal ein — Ort, Budget, Größe, Pflichtanforderungen — per Chat oder kurzem Formular.',
    landing_howit_step2_label: 'Wir bewerten jedes Inserat',
    landing_howit_step2_body: 'HomeMatch liest jedes Flatfox-Inserat und berechnet in Sekunden einen Match-Score für dein Profil.',
    landing_howit_step3_label: 'Sieh das gesamte Bild',
    landing_howit_step3_body: 'Öffne ein Inserat und sieh deinen Score, eine Aufschlüsselung nach Kategorie und die KI-Begründung dahinter.',

    // Section 4b — Features
    landing_features_overline: 'Für Schweizer Mietende gebaut',
    landing_features_headline: 'Alles, was du brauchst, um schneller die richtige Wohnung zu finden.',
    landing_feat1_title: 'KI-gestütztes Matching',
    landing_feat1_body: 'Jedes Inserat erhält einen Score von 0–100, der zeigt, wie gut es zu deinem Profil passt. Kein Raten mehr.',
    landing_feat2_title: 'Mehrere Profile',
    landing_feat2_body: 'Wechsle sofort zwischen Suchprofilen — ideal, wenn du verschiedene Orte oder Budgets im Blick hast.',
    landing_feat3_title: 'Transparente Begründung',
    landing_feat3_body: 'Sieh genau, warum ein Inserat hoch oder niedrig bewertet wurde — mit Kategorie-Aufschlüsselung und KI-Erklärung.',

    // Section 5 — CTA
    landing_cta_overline: 'Bereit, deine Wohnung zu finden?',
    landing_cta_headline: 'In wenigen Minuten loslegen.',
    landing_cta_subtext: 'Kostenlos. Keine Kreditkarte. Funktioniert auf Flatfox.',
    landing_cta_button: 'Kostenloses Konto erstellen',

    // Section Credits
    landing_credits_label: 'A project from',
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
