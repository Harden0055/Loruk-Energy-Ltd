import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 
  | 'high-contrast' 
  | 'dark-blue' 
  | 'emerald-aurora' 
  | 'cyber-purple' 
  | 'sunset-amber' 
  | 'crimson-ruby' 
  | 'slate-titanium';

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
  'high-contrast': {
    id: 'high-contrast',
    name: 'Cyber Onyx',
    category: 'High Contrast Neon',
    badge: 'Onyx ⚡',
    tagline: 'Deep obsidian blacks with electric cyan, hyper cobalt, and vivid neon magenta sparks.',
    accentColor: '#00E5FF',
    primaryColor: '#00E5FF',
    secondaryColor: '#3B82F6',
    tertiaryColor: '#A855F7',
    sparkColor: '#38BDF8',
    gradientFrom: '#00E5FF',
    gradientVia: '#3B82F6',
    gradientTo: '#9333EA',
    solidPreview: '#070D1E',
    gradientPreview: 'linear-gradient(135deg, #02040A 0%, #09132D 50%, #170F38 100%)',
    borderClass: 'border-cyan-400/40 shadow-[0_0_20px_rgba(0,229,255,0.25)]',
    textAccentClass: 'text-cyan-400',
    harmonicPalette: [
      { name: 'Electric Cyan', hex: '#00E5FF', role: 'Primary Core' },
      { name: 'Hyper Cobalt', hex: '#3B82F6', role: 'Harmonious Mid' },
      { name: 'Neon Purple', hex: '#A855F7', role: 'Triadic Spark' },
      { name: 'Luminous Sky', hex: '#38BDF8', role: 'Specular Glow' },
      { name: 'Obsidian Slate', hex: '#030712', role: 'Deep Canvas' }
    ],
    chartColors: ['#00E5FF', '#3B82F6', '#A855F7', '#38BDF8', '#10B981'],
  },
  'dark-blue': {
    id: 'dark-blue',
    name: 'Ocean Sapphire',
    category: 'Deep Marina & Seafoam',
    badge: 'Navy 🌊',
    tagline: 'Calm oceanic slate navy with crystal azure, deep royal blue, and seafoam mint aqua.',
    accentColor: '#38BDF8',
    primaryColor: '#38BDF8',
    secondaryColor: '#2563EB',
    tertiaryColor: '#2DD4BF',
    sparkColor: '#818CF8',
    gradientFrom: '#38BDF8',
    gradientVia: '#2563EB',
    gradientTo: '#4338CA',
    solidPreview: '#0D1A38',
    gradientPreview: 'linear-gradient(135deg, #050D20 0%, #11234D 50%, #1E3A8A 100%)',
    borderClass: 'border-sky-400/40 shadow-[0_0_20px_rgba(56,189,248,0.25)]',
    textAccentClass: 'text-sky-400',
    harmonicPalette: [
      { name: 'Crystal Azure', hex: '#38BDF8', role: 'Primary Core' },
      { name: 'Seafoam Aqua', hex: '#2DD4BF', role: 'Harmonious Glow' },
      { name: 'Royal Sapphire', hex: '#2563EB', role: 'Deep Accent' },
      { name: 'Soft Lavender', hex: '#818CF8', role: 'Analogous Mist' },
      { name: 'Midnight Navy', hex: '#060D20', role: 'Deep Canvas' }
    ],
    chartColors: ['#38BDF8', '#2DD4BF', '#2563EB', '#818CF8', '#60A5FA'],
  },
  'emerald-aurora': {
    id: 'emerald-aurora',
    name: 'Emerald Aurora',
    category: 'Nordic Forest & Lime',
    badge: 'Aurora 🌿',
    tagline: 'Lush dark obsidian pine with radiant mint jade, electric lime gold, and glacier teal.',
    accentColor: '#10B981',
    primaryColor: '#34D399',
    secondaryColor: '#059669',
    tertiaryColor: '#84CC16',
    sparkColor: '#06B6D4',
    gradientFrom: '#34D399',
    gradientVia: '#10B981',
    gradientTo: '#047857',
    solidPreview: '#08251B',
    gradientPreview: 'linear-gradient(135deg, #02140D 0%, #073121 50%, #064E3B 100%)',
    borderClass: 'border-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    textAccentClass: 'text-emerald-400',
    harmonicPalette: [
      { name: 'Mint Jade', hex: '#34D399', role: 'Primary Core' },
      { name: 'Electric Lime', hex: '#84CC16', role: 'Triadic Spark' },
      { name: 'Nordic Pine', hex: '#059669', role: 'Harmonious Mid' },
      { name: 'Glacier Teal', hex: '#06B6D4', role: 'Cool Accent' },
      { name: 'Forest Obsidian', hex: '#02140D', role: 'Deep Canvas' }
    ],
    chartColors: ['#34D399', '#10B981', '#84CC16', '#06B6D4', '#059669'],
  },
  'cyber-purple': {
    id: 'cyber-purple',
    name: 'Ultraviolet Amethyst',
    category: 'Cosmic Velvet & Magenta',
    badge: 'Violet 🔮',
    tagline: 'Deep velvet violet canvas with vibrant neon orchid, cosmic magenta, and cyan stardust.',
    accentColor: '#C084FC',
    primaryColor: '#C084FC',
    secondaryColor: '#9333EA',
    tertiaryColor: '#F43F5E',
    sparkColor: '#38BDF8',
    gradientFrom: '#C084FC',
    gradientVia: '#9333EA',
    gradientTo: '#E11D48',
    solidPreview: '#1E0B38',
    gradientPreview: 'linear-gradient(135deg, #0C0418 0%, #260C45 50%, #581C87 100%)',
    borderClass: 'border-purple-400/40 shadow-[0_0_20px_rgba(192,132,252,0.25)]',
    textAccentClass: 'text-purple-400',
    harmonicPalette: [
      { name: 'Neon Orchid', hex: '#C084FC', role: 'Primary Core' },
      { name: 'Cosmic Magenta', hex: '#F43F5E', role: 'Harmonious Glow' },
      { name: 'Royal Amethyst', hex: '#9333EA', role: 'Deep Shadow' },
      { name: 'Cyan Stardust', hex: '#38BDF8', role: 'Complementary Pop' },
      { name: 'Velvet Noir', hex: '#0C0418', role: 'Deep Canvas' }
    ],
    chartColors: ['#C084FC', '#F43F5E', '#9333EA', '#38BDF8', '#E9D5FF'],
  },
  'sunset-amber': {
    id: 'sunset-amber',
    name: 'Solar Amber',
    category: 'Molten Gold & Ember',
    badge: 'Amber 🌅',
    tagline: 'Rich espresso charcoal with molten solar gold, sunset tangerine, and crimson embers.',
    accentColor: '#FBBF24',
    primaryColor: '#FBBF24',
    secondaryColor: '#EA580C',
    tertiaryColor: '#E11D48',
    sparkColor: '#FDE047',
    gradientFrom: '#FDE047',
    gradientVia: '#F59E0B',
    gradientTo: '#EA580C',
    solidPreview: '#2B1306',
    gradientPreview: 'linear-gradient(135deg, #120702 0%, #331506 50%, #7C2D12 100%)',
    borderClass: 'border-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.25)]',
    textAccentClass: 'text-amber-400',
    harmonicPalette: [
      { name: 'Solar Gold', hex: '#FBBF24', role: 'Primary Core' },
      { name: 'Sunset Tangerine', hex: '#EA580C', role: 'Harmonious Mid' },
      { name: 'Crimson Ember', hex: '#E11D48', role: 'Triadic Spark' },
      { name: 'Champagne Yellow', hex: '#FDE047', role: 'Specular Highlight' },
      { name: 'Espresso Charcoal', hex: '#120702', role: 'Deep Canvas' }
    ],
    chartColors: ['#FBBF24', '#EA580C', '#E11D48', '#FDE047', '#D97706'],
  },
  'crimson-ruby': {
    id: 'crimson-ruby',
    name: 'Midnight Ruby',
    category: 'Velvet Rose & Coral',
    badge: 'Ruby 💎',
    tagline: 'Luxury burgundy graphite with vivid rose ruby, royal crimson wine, and warm copper coral.',
    accentColor: '#FB7185',
    primaryColor: '#FB7185',
    secondaryColor: '#E11D48',
    tertiaryColor: '#FB923C',
    sparkColor: '#FDA4AF',
    gradientFrom: '#FB7185',
    gradientVia: '#E11D48',
    gradientTo: '#9F1239',
    solidPreview: '#2C0B14',
    gradientPreview: 'linear-gradient(135deg, #120307 0%, #360B18 50%, #881337 100%)',
    borderClass: 'border-rose-400/40 shadow-[0_0_20px_rgba(251,113,133,0.25)]',
    textAccentClass: 'text-rose-400',
    harmonicPalette: [
      { name: 'Rose Ruby', hex: '#FB7185', role: 'Primary Core' },
      { name: 'Royal Crimson', hex: '#E11D48', role: 'Harmonious Mid' },
      { name: 'Copper Coral', hex: '#FB923C', role: 'Complementary Spark' },
      { name: 'Champagne Rose', hex: '#FDA4AF', role: 'Specular Highlight' },
      { name: 'Burgundy Noir', hex: '#120307', role: 'Deep Canvas' }
    ],
    chartColors: ['#FB7185', '#E11D48', '#FB923C', '#9F1239', '#FDA4AF'],
  },
  'slate-titanium': {
    id: 'slate-titanium',
    name: 'Cool Titanium',
    category: 'Frosted Platinum & Glacier',
    badge: 'Steel ⚙️',
    tagline: 'Monochrome precision titanium slate with frosted platinum silver and glacier cyan specular light.',
    accentColor: '#E2E8F0',
    primaryColor: '#E2E8F0',
    secondaryColor: '#94A3B8',
    tertiaryColor: '#38BDF8',
    sparkColor: '#F8FAFC',
    gradientFrom: '#F8FAFC',
    gradientVia: '#94A3B8',
    gradientTo: '#475569',
    solidPreview: '#161F2E',
    gradientPreview: 'linear-gradient(135deg, #080B12 0%, #1A2536 50%, #334155 100%)',
    borderClass: 'border-slate-300/40 shadow-[0_0_20px_rgba(226,232,240,0.25)]',
    textAccentClass: 'text-slate-200',
    harmonicPalette: [
      { name: 'Platinum Silver', hex: '#E2E8F0', role: 'Primary Core' },
      { name: 'Glacier Cyan', hex: '#38BDF8', role: 'Complementary Spark' },
      { name: 'Slate Steel', hex: '#94A3B8', role: 'Harmonious Mid' },
      { name: 'Titanium Frost', hex: '#F8FAFC', role: 'Specular Highlight' },
      { name: 'Gunmetal Slate', hex: '#080B12', role: 'Deep Canvas' }
    ],
    chartColors: ['#E2E8F0', '#38BDF8', '#94A3B8', '#64748B', '#CBD5E1'],
  },
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
  'theme-high-contrast',
  'theme-dark-blue',
  'theme-emerald-aurora',
  'theme-cyber-purple',
  'theme-sunset-amber',
  'theme-crimson-ruby',
  'theme-slate-titanium'
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
    return 'high-contrast';
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

  const activeConfig = THEME_CONFIGS[theme] || THEME_CONFIGS['high-contrast'];

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      surfaceStyle,
      setSurfaceStyle,
      toggleTheme,
      toggleSurfaceStyle,
      isDarkBlue: theme === 'dark-blue',
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


