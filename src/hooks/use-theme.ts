import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'nf-theme'

function readInitial(): Theme {
  if (typeof window === 'undefined') return 'light'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return 'light'
}

function apply(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
}

export function useTheme() {
  // SSR-safe: start with 'light' on the server; hydrate real value in effect.
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const initial = readInitial()
    setThemeState(initial)
    apply(initial)
    setMounted(true)
  }, [])

  const setTheme = (next: Theme) => {
    setThemeState(next)
    apply(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return { theme, setTheme, toggle, mounted }
}
