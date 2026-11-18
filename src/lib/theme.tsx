import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'deepcharts';

export type SurfaceStyle = 'solid' | 'gradient' | 'mesh';

export interface ThemeConfig {
  id: Theme;
  name: string;
  category: string;
  badge: string;
  tagline: string;
  accentColor: string;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  sparkColor: string;
  gradientFrom: string;
  gradientVia?: string;
  gradientTo: string;
  solidPreview: string;
  gradientPreview: string;
  borderClass: string;
  textAccentClass: string;
  harmonicPalette: {
    name: string;
    hex: string;
    role: string;
  }[];
  chartColors: string[];
}

export const THEME_CONFIGS: Record<Theme, ThemeConfig> = {
  'deepcharts': {
    id: 'deepcharts',
    name: 'DeepCharts Black',
    category: 'Pitch Black & Accounting Duality',
    badge: 'DeepCharts ⚡',
    tagline: 'Pure pitch-black canvas with candlestick green for positive revenue/payments and deep indigo for negative expenses/deliveries.',
    accentColor: '#34D399',
    primaryColor: '#34D399',
    secondaryColor: '#4F46E5',
    tertiaryColor: '#6366F1',
    sparkColor: '#10B981',
    gradientFrom: '#34D399',
    gradientVia: '#4F46E5',
    gradientTo: '#4F46E5',
    solidPreview: '#000000',
    gradientPreview: 'radial-gradient(ellipse 90% 65% at 50% 0%, #312E81 0%, #1E1B4B 45%, #000000 100%)',
    borderClass: 'border-[#4338CA]/40 shadow-[0_0_25px_rgba(67, 56, 202,0.3)]',
    textAccentClass: 'text-emerald-400',
    harmonicPalette: [
      { name: 'Candle Green', hex: '#34D399', role: 'Positive (Revenue / Inflow)' },
      { name: 'Deep Indigo', hex: '#4F46E5', role: 'Negative (Expense / Outflow)' },
      { name: 'Royal Indigo', hex: '#6366F1', role: 'Negative Accent' },
      { name: 'Mint Specular', hex: '#10B981', role: 'Positive Glow' },
      { name: 'Pitch Black', hex: '#000000', role: 'Deep Canvas' }
    ],
    chartColors: ['#34D399', '#4F46E5', '#10B981', '#6366F1', '#34D399'],
  }
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  surfaceStyle: SurfaceStyle;
  setSurfaceStyle: (style: SurfaceStyle) => void;
  toggleTheme: () => void;
  toggleSurfaceStyle: () => void;
  isDarkBlue: boolean;
  activeConfig: ThemeConfig;
  /** Dark (black canvas) vs Light (white canvas) color mode. */
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

export type ColorMode = 'dark' | 'light';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'loruk_ui_theme_mode';
const SURFACE_STORAGE_KEY = 'loruk_ui_surface_style';
const COLOR_MODE_STORAGE_KEY = 'loruk_ui_color_mode';

const ALL_THEME_CLASSES = [
  'theme-deepcharts'
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      if (saved && THEME_CONFIGS[saved]) {
        return saved;
      }
    } catch (e) {
      // LocalStorage access fallback
    }
    return 'deepcharts';
  });

  const [surfaceStyle, setSurfaceStyleState] = useState<SurfaceStyle>(() => {
    try {
      const saved = localStorage.getItem(SURFACE_STORAGE_KEY) as SurfaceStyle;
      if (saved === 'solid' || saved === 'gradient' || saved === 'mesh') {
        return saved;
      }
    } catch (e) {
      // fallback
    }
    return 'gradient';
  });

  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    try {
      const saved = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {
      // LocalStorage access fallback
    }
    return 'dark';
  });

  const applyThemeToDOM = (currentTheme: Theme, currentSurface: SurfaceStyle, currentMode: ColorMode) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    // Dark (black) vs Light (white) canvas — Tailwind `dark:` variants and the
    // light-mode CSS overrides in index.css key off these classes.
    root.classList.toggle('dark', currentMode === 'dark');
    root.classList.toggle('light', currentMode === 'light');

    // Remove all old theme classes
    ALL_THEME_CLASSES.forEach(cls => root.classList.remove(cls));
    
    // Add current theme class
    root.classList.add(`theme-${currentTheme}`);
    root.setAttribute('data-theme', currentTheme);
    root.setAttribute('data-surface-style', currentSurface);

    // Update surface style classes
    root.classList.remove('surface-solid', 'surface-gradient', 'surface-mesh');
    root.classList.add(`surface-${currentSurface}`);
  };

  useEffect(() => {
    applyThemeToDOM(theme, surfaceStyle, colorMode);
  }, [theme, surfaceStyle, colorMode]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Failed to save theme in localStorage', e);
    }
    applyThemeToDOM(newTheme, surfaceStyle, colorMode);
  };

  const setSurfaceStyle = (newSurface: SurfaceStyle) => {
    setSurfaceStyleState(newSurface);
    try {
      localStorage.setItem(SURFACE_STORAGE_KEY, newSurface);
    } catch (e) {
      console.warn('Failed to save surface style in localStorage', e);
    }
    applyThemeToDOM(theme, newSurface, colorMode);
  };

  const setColorMode = (newMode: ColorMode) => {
    setColorModeState(newMode);
    try {
      localStorage.setItem(COLOR_MODE_STORAGE_KEY, newMode);
    } catch (e) {
      console.warn('Failed to save color mode in localStorage', e);
    }
    applyThemeToDOM(theme, surfaceStyle, newMode);
  };

  const toggleColorMode = () => {
    setColorMode(colorMode === 'dark' ? 'light' : 'dark');
  };

  const toggleTheme = () => {
    const themeKeys = Object.keys(THEME_CONFIGS) as Theme[];
    const currentIndex = themeKeys.indexOf(theme);
    const nextTheme = themeKeys[(currentIndex + 1) % themeKeys.length];
    setTheme(nextTheme);
  };

  const toggleSurfaceStyle = () => {
    const nextStyle: SurfaceStyle = 
      surfaceStyle === 'solid' ? 'gradient' : surfaceStyle === 'gradient' ? 'mesh' : 'solid';
    setSurfaceStyle(nextStyle);
  };

  const activeConfig = THEME_CONFIGS[theme] || THEME_CONFIGS['deepcharts'];

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      surfaceStyle,
      setSurfaceStyle,
      toggleTheme,
      toggleSurfaceStyle,
      isDarkBlue: false,
      activeConfig,
      colorMode,
      setColorMode,
      toggleColorMode
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}


