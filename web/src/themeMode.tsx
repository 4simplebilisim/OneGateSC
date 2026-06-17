import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ConfigProvider, App as AntApp } from 'antd'
import trTR from 'antd/locale/tr_TR'
import { makeTheme, type ThemeMode } from './theme'

type Ctx = { mode: ThemeMode; toggle: () => void; setMode: (m: ThemeMode) => void; isAuto: boolean }
const ThemeModeContext = createContext<Ctx>({ mode: 'light', toggle: () => {}, setMode: () => {}, isAuto: true })

export const useThemeMode = () => useContext(ThemeModeContext)

const STORAGE_KEY = 'og_theme'
const mql = () => window.matchMedia?.('(prefers-color-scheme: dark)')
const systemPrefersDark = () => !!mql()?.matches
const savedMode = (): ThemeMode | null => {
  const s = localStorage.getItem(STORAGE_KEY)
  return s === 'dark' || s === 'light' ? s : null
}

export const ThemeModeProvider = ({ children }: { children: ReactNode }) => {
  // İlk açılış: kullanıcı daha önce seçtiyse onu, yoksa cihaz/sistem tercihini kullan
  const [mode, setModeState] = useState<ThemeMode>(() => savedMode() ?? (systemPrefersDark() ? 'dark' : 'light'))
  const [isAuto, setIsAuto] = useState<boolean>(() => savedMode() === null)

  // <html data-theme> daima güncel mod'u yansıtır
  useEffect(() => {
    document.documentElement.dataset.theme = mode
  }, [mode])

  // Kullanıcı açık bir tercih yapmadıysa (auto), sistem teması değiştikçe izle
  useEffect(() => {
    if (!isAuto) return
    const mq = mql()
    if (!mq) return
    const handler = (e: MediaQueryListEvent) => setModeState(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [isAuto])

  const ctx = useMemo<Ctx>(() => {
    const setMode = (m: ThemeMode) => {
      setIsAuto(false)
      localStorage.setItem(STORAGE_KEY, m)
      setModeState(m)
    }
    return { mode, isAuto, setMode, toggle: () => setMode(mode === 'dark' ? 'light' : 'dark') }
  }, [mode, isAuto])

  return (
    <ThemeModeContext.Provider value={ctx}>
      <ConfigProvider theme={makeTheme(mode)} locale={trTR}>
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </ThemeModeContext.Provider>
  )
}
