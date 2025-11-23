/**
 * Coinbase Developer Platform (CDP) configuration and theme
 *
 * Uses Coinbase embedded wallets with the provided project ID.
 */

import type { Config, Theme } from '@coinbase/cdp-react'

export const CDP_PROJECT_ID = process.env.NEXT_PUBLIC_CDP_PROJECT_ID || '05251719-7f39-4589-a45e-e42063dabfa3'

export const cdpConfig: Config = {
  projectId: CDP_PROJECT_ID,
  appName: 'Bobasoda',
  appLogoUrl: '',
  authMethods: ['email', 'sms', 'oauth:google', 'oauth:apple', 'oauth:x'],
  showCoinbaseFooter: true,
  ethereum: {
    createOnLogin: 'smart',
  },
  solana: {
    createOnLogin: false,
  },
}

export const cdpTheme: Partial<Theme> = {
  "colors-bg-default": "#0a0b0d",
  "colors-bg-alternate": "#22252d",
  "colors-bg-primary": "#facc15",
  "colors-bg-secondary": "#22252d",
  "colors-fg-default": "#ffffff",
  "colors-fg-muted": "#8a919e",
  "colors-fg-primary": "#facc15",
  "colors-fg-onPrimary": "#0a0b0d",
  "colors-fg-onSecondary": "#ffffff",
  "colors-fg-positive": "#27ad75",
  "colors-fg-negative": "#f0616d",
  "colors-fg-warning": "#ed702f",
  "colors-line-default": "#252629",
  "colors-line-heavy": "#5a5d6a",
  "borderRadius-cta": "var(--cdp-web-borderRadius-full)",
  "borderRadius-link": "var(--cdp-web-borderRadius-full)",
  "borderRadius-input": "var(--cdp-web-borderRadius-lg)",
  "borderRadius-select-trigger": "var(--cdp-web-borderRadius-lg)",
  "borderRadius-select-list": "var(--cdp-web-borderRadius-lg)",
  "borderRadius-modal": "var(--cdp-web-borderRadius-xl)",
  "font-family-sans": "'Rethink Sans', 'Rethink Sans Fallback'"
}

export default cdpConfig
