export type Language = 'en' | 'de'

export const LANG_COOKIE = 'homematch_lang'

export const translations = {
  en: {
    // Navigation
    nav_ai_search: 'AI-Powered Search',
    nav_profiles: 'Profiles',
    nav_analyses: 'Analyses',
    nav_download: 'Download',
    nav_settings: 'Settings',

    // Nav user
    sign_out: 'Sign out',

    // Analyses page
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

    // Settings
    settings_title: 'Settings',
    settings_subtitle: 'Account settings',
    settings_language: 'Language',
    // Fixed labels — always show native language name regardless of UI language
    settings_language_en: 'English',
    settings_language_de: 'Deutsch',

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


    // Profiles page
    profiles_title: 'Profiles',
    profiles_subtitle: 'Manage your search profiles. Each profile has its own requirements for scoring listings.',
    profiles_no_profiles: "You don't have any profiles yet.",
    profiles_no_profiles_hint: 'Create your first profile to start scoring listings.',
    profiles_create_first: 'Create Your First Profile',
    profiles_new: 'New Profile',
    back_to_profiles: 'Back to Profiles',
    edit_profile_desc: 'Edit preferences for this profile. These will be used to score listings on Flatfox.',

    // Profile card
    profile_rename: 'Rename',
    profile_duplicate: 'Duplicate',
    profile_delete: 'Delete',
    profile_edit: 'Edit',
    profile_set_active: 'Set Active',
    profile_active: 'Active',
    profile_no_prefs: 'No preferences set yet',
    profile_buy: 'Buy',
    profile_rent: 'Rent',
    profile_rooms: 'rooms',
    profile_up_to: 'up to',
    profile_from: 'from',

    // Profile dialogs
    profile_create_title: 'Create New Profile',
    profile_create_desc: 'Give your new search profile a name.',
    profile_create_placeholder: 'e.g., Zurich Family Apartment',
    profile_rename_title: 'Rename Profile',
    profile_rename_desc: 'Enter a new name for this profile.',
    profile_delete_desc: 'This will permanently delete this profile and all its preferences. Analyses scored with this profile will remain.',
    cancel: 'Cancel',
    save: 'Save',
    create: 'Create',
    delete_profile: 'Delete Profile',

    // Download page
    download_title: 'Download Extension',
    download_subtitle: 'Install the HomeMatch Chrome extension to score listings on Flatfox',
    download_btn: 'Download HomeMatch Extension',
    download_instructions_title: 'Installation Instructions',
    download_step1_title: 'Unzip the downloaded file',
    download_step1_desc: "Extract the downloaded .zip file. You'll get a folder containing the extension files.",
    download_step2_title: 'Open Chrome Extensions',
    download_step2_url_desc: "Open a new tab and go to the extensions page:",
    download_step2_url_hint: "Copy the URL above and paste it into your browser's address bar.",
    download_step3_title: 'Enable Developer Mode',
    download_step3_desc: "In the top-right corner of the extensions page, toggle the 'Developer mode' switch to ON.",
    download_step4_title: 'Load the extension',
    download_step4_desc: "Click 'Load unpacked' in the top-left, then select the unzipped folder. The HomeMatch extension will appear in your extensions list.",

    // Preferences form
    pref_location_type: 'Location & Type',
    pref_budget: 'Budget',
    pref_size_rooms: 'Size & Rooms',
    pref_features_availability: 'Features & Availability',
    pref_custom_criteria: 'Custom Criteria',
    pref_what_matters: 'What Matters Most',
    pref_save: 'Save Preferences',
    pref_saving: 'Saving...',
    pref_saved: 'Preferences saved successfully!',
    pref_save_error: 'Failed to save preferences',

    // Location type section
    location_label: 'Location',
    location_placeholder: 'e.g., Zurich, Basel',
    offer_type_label: 'Offer Type',
    offer_type_rent: 'Rent',
    offer_type_buy: 'Buy',
    property_type_label: 'Property Type',
    property_type_any: 'Any',
    property_type_apartment: 'Apartment',
    property_type_house: 'House',
    property_type_placeholder: 'Select property type',

    // Budget section
    budget_label: 'Budget (CHF)',
    budget_min: 'Min CHF',
    budget_max: 'Max CHF',
    budget_dealbreaker: 'Hard limit — score 0 if over budget',

    // Size & rooms section
    rooms_label: 'Rooms',
    rooms_min: 'Min rooms',
    rooms_max: 'Max rooms',
    rooms_dealbreaker: 'Hard limit — score 0 if below minimum rooms',
    living_space_label: 'Living Space (sqm)',
    living_space_min: 'Min sqm',
    living_space_max: 'Max sqm',
    living_space_dealbreaker: 'Hard limit — score 0 if below minimum space',
    floor_pref_label: 'Floor Preference',
    floor_any: 'Any floor',
    floor_ground: 'Ground floor only',
    floor_not_ground: 'Not ground floor',

    // Features section
    features_label: 'Feature Preferences',
    features_hint: 'Click to toggle features you care about',
    availability_label: 'Availability',
    availability_any: 'Any time',
    availability_immediately: 'Immediately',
    availability_1month: 'Within 1 month',
    availability_3months: 'Within 3 months',
    availability_specific: 'Specific date',
    availability_placeholder: 'Select availability',

    // Feature labels
    feature_balconygarden: 'Balcony / Garden',
    feature_parkingspace: 'Parking Space',
    feature_garage: 'Garage',
    feature_lift: 'Elevator',
    feature_dishwasher: 'Dishwasher',
    feature_washingmachine: 'Washing Machine',
    feature_petsallowed: 'Pets Allowed',
    feature_minergie: 'Minergie (Energy Efficient)',
    feature_parquetflooring: 'Parquet Flooring',
    feature_view: 'View',
    feature_cable: 'Cable TV',
    feature_accessiblewithwheelchair: 'Wheelchair Accessible',

    // Dynamic fields section
    custom_criteria_label: 'Custom Criteria',
    custom_criteria_hint: 'Add any additional preferences with importance levels',
    criterion_name_placeholder: 'Criterion name',
    criterion_details_placeholder: 'Details (optional)',
    importance_placeholder: 'Importance',
    add_criterion: '+ Add Criterion',
    importance_critical: 'Critical',
    importance_high: 'High',
    importance_medium: 'Medium',
    importance_low: 'Low',

    // Importance section
    importance_section_hint: 'Set how important each category is when scoring listings',
    importance_location: 'Location',
    importance_price: 'Price & Budget',
    importance_size: 'Size & Rooms',
    importance_features: 'Features & Amenities',
    importance_condition: 'Condition & Age',
  },
  de: {
    // Navigation
    nav_ai_search: 'KI-gestützte Suche',
    nav_profiles: 'Profile',
    nav_analyses: 'Analysen',
    nav_download: 'Download',
    nav_settings: 'Einstellungen',

    // Nav user
    sign_out: 'Abmelden',

    // Analyses page
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

    // Settings
    settings_title: 'Einstellungen',
    settings_subtitle: 'Kontoeinstellungen',
    settings_language: 'Sprache',
    // Fixed labels — always show native language name regardless of UI language
    settings_language_en: 'English',
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

// Profiles page
    profiles_title: 'Profile',
    profiles_subtitle: 'Verwalte deine Suchprofile. Jedes Profil hat eigene Anforderungen für die Bewertung von Inseraten.',
    profiles_no_profiles: 'Du hast noch keine Profile.',
    profiles_no_profiles_hint: 'Erstelle dein erstes Profil, um mit der Bewertung von Inseraten zu beginnen.',
    profiles_create_first: 'Erstes Profil erstellen',
    profiles_new: 'Neues Profil',
    back_to_profiles: 'Zurück zu Profile',
    edit_profile_desc: 'Bearbeite die Einstellungen für dieses Profil. Diese werden verwendet, um Inserate auf Flatfox zu bewerten.',

    // Profile card
    profile_rename: 'Umbenennen',
    profile_duplicate: 'Duplizieren',
    profile_delete: 'Löschen',
    profile_edit: 'Bearbeiten',
    profile_set_active: 'Als aktiv setzen',
    profile_active: 'Aktiv',
    profile_no_prefs: 'Noch keine Einstellungen',
    profile_buy: 'Kaufen',
    profile_rent: 'Mieten',
    profile_rooms: 'Zimmer',
    profile_up_to: 'bis zu',
    profile_from: 'ab',

    // Profile dialogs
    profile_create_title: 'Neues Profil erstellen',
    profile_create_desc: 'Gib deinem neuen Suchprofil einen Namen.',
    profile_create_placeholder: 'z.B. Zürich Familienwohnung',
    profile_rename_title: 'Profil umbenennen',
    profile_rename_desc: 'Gib einen neuen Namen für dieses Profil ein.',
    profile_delete_desc: 'Dies löscht dieses Profil und alle zugehörigen Einstellungen dauerhaft. Analysen, die mit diesem Profil bewertet wurden, bleiben erhalten.',
    cancel: 'Abbrechen',
    save: 'Speichern',
    create: 'Erstellen',
    delete_profile: 'Profil löschen',

    // Download page
    download_title: 'Erweiterung herunterladen',
    download_subtitle: 'Installiere die HomeMatch Chrome-Erweiterung, um Inserate auf Flatfox zu bewerten',
    download_btn: 'HomeMatch-Erweiterung herunterladen',
    download_instructions_title: 'Installationsanleitung',
    download_step1_title: 'Heruntergeladene Datei entpacken',
    download_step1_desc: 'Entpacke die heruntergeladene .zip-Datei. Du erhältst einen Ordner mit den Erweiterungsdateien.',
    download_step2_title: 'Chrome-Erweiterungen öffnen',
    download_step2_url_desc: 'Öffne einen neuen Tab und gehe zur Erweiterungsseite:',
    download_step2_url_hint: 'Kopiere die URL oben und füge sie in die Adressleiste deines Browsers ein.',
    download_step3_title: 'Entwicklermodus aktivieren',
    download_step3_desc: "Aktiviere den Schalter 'Entwicklermodus' oben rechts auf der Erweiterungsseite.",
    download_step4_title: 'Erweiterung laden',
    download_step4_desc: "Klicke oben links auf 'Entpackt laden' und wähle dann den entpackten Ordner aus. Die HomeMatch-Erweiterung erscheint in deiner Erweiterungsliste.",

    // Preferences form
    pref_location_type: 'Standort & Typ',
    pref_budget: 'Budget',
    pref_size_rooms: 'Größe & Zimmer',
    pref_features_availability: 'Ausstattung & Verfügbarkeit',
    pref_custom_criteria: 'Benutzerdefinierte Kriterien',
    pref_what_matters: 'Was ist am wichtigsten',
    pref_save: 'Einstellungen speichern',
    pref_saving: 'Speichern...',
    pref_saved: 'Einstellungen erfolgreich gespeichert!',
    pref_save_error: 'Fehler beim Speichern der Einstellungen',

    // Location type section
    location_label: 'Standort',
    location_placeholder: 'z.B. Zürich, Basel',
    offer_type_label: 'Angebotstyp',
    offer_type_rent: 'Mieten',
    offer_type_buy: 'Kaufen',
    property_type_label: 'Objekttyp',
    property_type_any: 'Beliebig',
    property_type_apartment: 'Wohnung',
    property_type_house: 'Haus',
    property_type_placeholder: 'Objekttyp auswählen',

    // Budget section
    budget_label: 'Budget (CHF)',
    budget_min: 'Min CHF',
    budget_max: 'Max CHF',
    budget_dealbreaker: 'Hartes Limit — 0 Punkte wenn über Budget',

    // Size & rooms section
    rooms_label: 'Zimmer',
    rooms_min: 'Min Zimmer',
    rooms_max: 'Max Zimmer',
    rooms_dealbreaker: 'Hartes Limit — 0 Punkte wenn unter Mindest-Zimmerzahl',
    living_space_label: 'Wohnfläche (m²)',
    living_space_min: 'Min m²',
    living_space_max: 'Max m²',
    living_space_dealbreaker: 'Hartes Limit — 0 Punkte wenn unter Mindestfläche',
    floor_pref_label: 'Stockwerkpräferenz',
    floor_any: 'Beliebiges Stockwerk',
    floor_ground: 'Nur Erdgeschoss',
    floor_not_ground: 'Nicht Erdgeschoss',

    // Features section
    features_label: 'Ausstattungspräferenzen',
    features_hint: 'Klicke zum Auswählen gewünschter Ausstattung',
    availability_label: 'Verfügbarkeit',
    availability_any: 'Jederzeit',
    availability_immediately: 'Sofort',
    availability_1month: 'Innerhalb 1 Monat',
    availability_3months: 'Innerhalb 3 Monate',
    availability_specific: 'Bestimmtes Datum',
    availability_placeholder: 'Verfügbarkeit auswählen',

    // Feature labels
    feature_balconygarden: 'Balkon / Garten',
    feature_parkingspace: 'Parkplatz',
    feature_garage: 'Garage',
    feature_lift: 'Lift',
    feature_dishwasher: 'Geschirrspüler',
    feature_washingmachine: 'Waschmaschine',
    feature_petsallowed: 'Haustiere erlaubt',
    feature_minergie: 'Minergie (Energieeffizient)',
    feature_parquetflooring: 'Parkettboden',
    feature_view: 'Aussicht',
    feature_cable: 'Kabelfernsehen',
    feature_accessiblewithwheelchair: 'Rollstuhlgerecht',

    // Dynamic fields section
    custom_criteria_label: 'Benutzerdefinierte Kriterien',
    custom_criteria_hint: 'Füge weitere Präferenzen mit Wichtigkeitsstufen hinzu',
    criterion_name_placeholder: 'Kriteriumsname',
    criterion_details_placeholder: 'Details (optional)',
    importance_placeholder: 'Wichtigkeit',
    add_criterion: '+ Kriterium hinzufügen',
    importance_critical: 'Kritisch',
    importance_high: 'Hoch',
    importance_medium: 'Mittel',
    importance_low: 'Niedrig',

    // Importance section
    importance_section_hint: 'Lege fest, wie wichtig jede Kategorie beim Bewerten von Inseraten ist',
    importance_location: 'Standort',
    importance_price: 'Preis & Budget',
    importance_size: 'Größe & Zimmer',
    importance_features: 'Ausstattung & Annehmlichkeiten',
    importance_condition: 'Zustand & Alter',
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
