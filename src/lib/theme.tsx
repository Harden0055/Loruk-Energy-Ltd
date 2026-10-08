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
    tagline: 'Pure pitch-black canvas with candlestick green for positive revenue/payments and deep purple for negative expenses/deliveries.',
    accentColor: '#00E676',
    primaryColor: '#00E676',
    secondaryColor: '#9333EA',
    tertiaryColor: '#A855F7',
    sparkColor: '#10B981',
    gradientFrom: '#00E676',
    gradientVia: '#9333EA',
    gradientTo: '#7C3AED',
    solidPreview: '#000000',
    gradientPreview: 'radial-gradient(ellipse 90% 65% at 50% 0%, #4C1D95 0%, #1E0838 45%, #000000 100%)',
    borderClass: 'border-purple-500/40 shadow-[0_0_25px_rgba(147,51,234,0.3)]',
    textAccentClass: 'text-emerald-400',
    harmonicPalette: [
      { name: 'Candle Green', hex: '#00E676', role: 'Positive (Revenue / Inflow)' },
      { name: 'Deep Purple', hex: '#9333EA', role: 'Negative (Expense / Outflow)' },
      { name: 'Royal Orchid', hex: '#A855F7', role: 'Negative Accent' },
      { name: 'Mint Specular', hex: '#10B981', role: 'Positive Glow' },
      { name: 'Pitch Black', hex: '#000000', role: 'Deep Canvas' }
    ],
    chartColors: ['#00E676', '#9333EA', '#10B981', '#A855F7', '#34D399'],
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
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'loruk_ui_theme_mode';
const SURFACE_STORAGE_KEY = 'loruk_ui_surface_style';

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

  const applyThemeToDOM = (currentTheme: Theme, currentSurface: SurfaceStyle) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.add('dark'); // Always preserve dark mode for Tailwind

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
    applyThemeToDOM(theme, surfaceStyle);
  }, [theme, surfaceStyle]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Failed to save theme in localStorage', e);
    }
    applyThemeToDOM(newTheme, surfaceStyle);
  };

  const setSurfaceStyle = (newSurface: SurfaceStyle) => {
    setSurfaceStyleState(newSurface);
    try {
      localStorage.setItem(SURFACE_STORAGE_KEY, newSurface);
    } catch (e) {
      console.warn('Failed to save surface style in localStorage', e);
    }
    applyThemeToDOM(theme, newSurface);
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
      activeConfig 
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


