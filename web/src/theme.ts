import { theme as antdTheme, type ThemeConfig } from 'antd'

/**
 * OneGate tasarım sistemi — tek kaynak (açık + koyu mod).
 * Marka kartelası: cyan #44D4E3 · blue #4E86FF (primary) · violet #9B5CF6 · ink #1B2138
 * AntD 6 token mimarisi: tüm ekranlar component tokenlarından beslenir; ekran içi inline hex YASAK.
 */

export const BRAND = {
  cyan: '#44D4E3',
  blue: '#4E86FF',
  violet: '#9B5CF6',
  ink: '#1B2138',
  navy: '#0E1B2E',
  navyDeep: '#0A1626',
  gradient: 'linear-gradient(135deg, #44D4E3 0%, #4E86FF 52%, #9B5CF6 100%)',
  gradientSoft: 'linear-gradient(135deg, rgba(68,212,227,.14), rgba(155,92,246,.14))',
} as const

const FONT_UI = "'Inter', -apple-system, 'Segoe UI', system-ui, sans-serif"
const FONT_DISPLAY = "'Plus Jakarta Sans', 'Inter', sans-serif"

export type ThemeMode = 'light' | 'dark'

// Mod-bağımsız ortak komponent tokenları
const baseComponents: ThemeConfig['components'] = {
  Layout: {
    headerBg: BRAND.navyDeep,
    headerHeight: 48,
    headerPadding: '0 16px',
    siderBg: BRAND.navy,
  },
  Menu: {
    darkItemBg: 'transparent',
    darkSubMenuItemBg: 'transparent',
    darkItemColor: '#A9BBD6',
    darkItemHoverColor: '#FFFFFF',
    darkItemHoverBg: 'rgba(255,255,255,.06)',
    darkItemSelectedBg: 'rgba(78,134,255,.20)',
    darkItemSelectedColor: '#FFFFFF',
    itemHeight: 30,
    itemMarginInline: 8,
    itemBorderRadius: 8,
    fontSize: 12,
    darkGroupTitleColor: '#5E6FA1',
  },
  Button: {
    fontWeight: 600,
    primaryShadow: '0 4px 12px rgba(78,134,255,.24)',
    defaultShadow: 'none',
    controlHeight: 30,
    paddingInline: 12,
  },
  Input: { controlHeight: 30, activeShadow: '0 0 0 3px rgba(78,134,255,.18)', paddingInline: 10 },
  Select: { controlHeight: 30 },
  InputNumber: { controlHeight: 30 },
  DatePicker: { controlHeight: 30 },
  Statistic: { titleFontSize: 11, contentFontSize: 20 },
  Tabs: { titleFontSize: 12.5, inkBarColor: BRAND.blue, itemSelectedColor: BRAND.blue },
  Modal: { borderRadiusLG: 14, titleFontSize: 14.5 },
  Tooltip: { borderRadius: 7 },
}

export function makeTheme(mode: ThemeMode = 'light'): ThemeConfig {
  const dark = mode === 'dark'
  return {
    cssVar: { key: 'og' },
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: BRAND.blue,
      colorInfo: BRAND.blue,
      colorSuccess: '#16A34A',
      colorWarning: '#F59E0B',
      colorError: '#EF4444',
      colorLink: dark ? '#6FA0FF' : BRAND.blue,

      fontFamily: FONT_UI,
      fontSize: 12,
      fontSizeSM: 11,
      fontSizeLG: 13,
      fontSizeHeading1: 22,
      fontSizeHeading2: 18,
      fontSizeHeading3: 15,
      fontSizeHeading4: 13,

      borderRadius: 8,
      borderRadiusLG: 11,
      borderRadiusSM: 6,
      controlHeight: 30,
      controlHeightLG: 36,
      controlHeightSM: 24,
      lineWidth: 1,
      wireframe: false,

      ...(dark
        ? {
            colorBgLayout: '#0E1626',
            colorBgContainer: '#141E33',
            colorBgElevated: '#1A2740',
            colorBorder: '#2A3650',
            colorBorderSecondary: '#222E45',
            colorText: '#E5ECF7',
            colorTextSecondary: '#9DB0CE',
            colorTextTertiary: '#74859F',
            colorFillQuaternary: '#18223A',
            colorFillTertiary: '#1C2740',
          }
        : {
            colorTextBase: '#1B2138',
            colorText: '#1F2937',
            colorTextSecondary: '#5A6B85',
            colorTextTertiary: '#8696AE',
            colorBorder: '#E3E8F0',
            colorBorderSecondary: '#EDF1F7',
            colorBgLayout: '#EEF2F8',
            colorBgContainer: '#FFFFFF',
            colorBgElevated: '#FFFFFF',
            colorFillQuaternary: '#F5F8FC',
            colorFillTertiary: '#EFF3F9',
          }),

      boxShadow: dark
        ? '0 1px 2px rgba(0,0,0,.4), 0 6px 22px rgba(0,0,0,.35)'
        : '0 1px 2px rgba(16,27,46,.06), 0 4px 16px rgba(16,27,46,.06)',
      boxShadowSecondary: dark ? '0 8px 28px rgba(0,0,0,.45)' : '0 6px 24px rgba(16,27,46,.10)',
      boxShadowTertiary: dark ? '0 1px 2px rgba(0,0,0,.35)' : '0 1px 2px rgba(16,27,46,.05)',
    },
    components: {
      ...baseComponents,
      Table: {
        headerBg: dark ? '#172238' : '#F4F7FC',
        headerColor: dark ? '#A9BBD6' : '#42536F',
        headerSplitColor: 'transparent',
        borderColor: dark ? '#222E45' : '#EDF1F7',
        rowHoverBg: dark ? '#1B2740' : '#F0F6FF',
        cellPaddingBlock: 5,
        cellPaddingBlockSM: 3,
        cellPaddingInline: 9,
        fontWeightStrong: 600,
        headerBorderRadius: 0,
      },
      Card: {
        borderRadiusLG: 12,
        paddingLG: 12,
        headerFontSize: 13,
        headerHeight: 38,
        boxShadowTertiary: dark ? '0 2px 12px rgba(0,0,0,.35)' : '0 1px 2px rgba(16,27,46,.05), 0 2px 10px rgba(16,27,46,.05)',
        colorBorderSecondary: dark ? '#222E45' : '#EBEFF6',
      },
      Tag: { borderRadiusSM: 6, defaultBg: dark ? '#1E2A42' : '#F1F5FB', defaultColor: dark ? '#A9BBD6' : '#42536F' },
      Segmented: { itemSelectedBg: dark ? '#27344E' : '#FFFFFF', trackBg: dark ? '#172238' : '#E7EDF6', borderRadius: 9 },
      Form: { labelColor: dark ? '#9DB0CE' : '#42536F', labelFontSize: 11.5, verticalLabelPadding: '0 0 3px' },
      Descriptions: { labelBg: dark ? '#172238' : '#F7F9FC' },
    },
  }
}

export const FONTS = { ui: FONT_UI, display: FONT_DISPLAY }
