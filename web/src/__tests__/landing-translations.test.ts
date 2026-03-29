import { describe, it, expect } from 'vitest'
import { translations } from '@/lib/translations'

const LANDING_KEYS = [
  'landing_nav_signin',
  'landing_hero_overline', 'landing_hero_headline', 'landing_hero_subtitle', 'landing_hero_cta',
  'landing_problem_overline', 'landing_problem_headline',
  'landing_problem_bullet1', 'landing_problem_bullet2', 'landing_problem_bullet3',
  'landing_howit_overline', 'landing_howit_headline',
  'landing_howit_step1_label', 'landing_howit_step1_body',
  'landing_howit_step2_label', 'landing_howit_step2_body',
  'landing_howit_step3_label', 'landing_howit_step3_body',
  'landing_features_overline', 'landing_features_headline',
  'landing_feat1_title', 'landing_feat1_body',
  'landing_feat2_title', 'landing_feat2_body',
  'landing_feat3_title', 'landing_feat3_body',
  'landing_cta_overline', 'landing_cta_headline', 'landing_cta_subtext', 'landing_cta_button',
  'landing_footer_copyright',
  'landing_globe_headline', 'landing_globe_body',
] as const

describe('landing page translations', () => {
  LANDING_KEYS.forEach((key) => {
    it(`has "${key}" in English`, () => {
      expect(translations.en[key as keyof typeof translations.en]).toBeTruthy()
    })
    it(`has "${key}" in German`, () => {
      expect(translations.de[key as keyof typeof translations.de]).toBeTruthy()
    })
  })
})
