import React, { useState, useRef, useEffect } from 'react';
import { useTheme, Theme, SurfaceStyle, THEME_CONFIGS } from '../lib/theme';
import { Sparkles, Moon, Check, Palette, Layers, Box, Wand2, ChevronDown } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'button' | 'pill' | 'cards' | 'surface-switch';
  className?: string;
}

export default function ThemeToggle({ variant = 'button', className = '' }: ThemeToggleProps) {
  const { theme, setTheme, surfaceStyle, setSurfaceStyle, toggleTheme, activeConfig } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Surface Style Selector Component
  if (variant === 'surface-switch') {
    const surfaceOptions: { id: SurfaceStyle; label: string; icon: any; desc: string }[] = [
      {
        id: 'solid',
        label: 'Solid Matte',
        icon: Box,
        desc: 'Crisp flat matte panels, solid uniform fills, clean high-contrast edges.'
      },
      {
        id: 'gradient',
        label: 'Ambient Gradient',
        icon: Wand2,
        desc: 'Luminous solid-to-gradient atmospheric depth, radial canvas glow & shimmering highlights.'
      },
      {
        id: 'mesh',
        label: 'Cosmic Mesh',
        icon: Layers,
        desc: 'Multi-point layered radial aura, radiant accent halo & glass shimmer.'
      }
    ];

    return (
      <div className={`space-y-2 ${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {surfaceOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = surfaceStyle === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSurfaceStyle(opt.id)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-500/60 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-400'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {opt.label}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_#3B82F6]" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Cards layout for Settings Page
  if (variant === 'cards') {
    const themeList = Object.values(THEME_CONFIGS);

    return (
      <div className={`space-y-6 ${className}`}>
        {/* Surface Style Selector */}
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Surface Rendering Style</span>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
              Active: {surfaceStyle}
            </span>
          </div>
          <ThemeToggle variant="surface-switch" />
        </div>

        {/* Color Palette Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Aesthetic Color Atmospheres</span>
            </div>
            <span className="text-xs text-slate-400">7 Handcrafted Combinations</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {themeList.map((t) => {
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`p-3.5 rounded-xl text-left transition-all duration-200 cursor-pointer border relative overflow-hidden flex flex-col justify-between group ${
                    isActive
                      ? `${t.borderClass} bg-white/[0.06]`
                      : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
                  }`}
                >
                  {/* Solid-to-Gradient Visual Swatch Strip */}
                  <div 
                    className="h-14 w-full rounded-lg border border-white/15 mb-3 flex items-center justify-between px-3 relative overflow-hidden transition-all group-hover:scale-[1.01]"
                    style={{ background: t.gradientPreview }}
                  >
                    {/* Visual Color Dots with harmonious companions */}
                    <div className="flex items-center gap-1.5 z-10">
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm" 
                        style={{ backgroundColor: t.primaryColor, boxShadow: `0 0 8px ${t.primaryColor}` }} 
                        title={`Primary: ${t.primaryColor}`}
                      />
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm" 
                        style={{ backgroundColor: t.secondaryColor, boxShadow: `0 0 8px ${t.secondaryColor}` }} 
                        title={`Secondary Companion: ${t.secondaryColor}`}
                      />
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm" 
                        style={{ backgroundColor: t.tertiaryColor, boxShadow: `0 0 8px ${t.tertiaryColor}` }} 
                        title={`Tertiary Blend: ${t.tertiaryColor}`}
                      />
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm" 
                        style={{ backgroundColor: t.sparkColor, boxShadow: `0 0 8px ${t.sparkColor}` }} 
                        title={`Spark Accent: ${t.sparkColor}`}
                      />
                    </div>
                    
                    {/* Badge */}
                    <span 
                      className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md border z-10 backdrop-blur-md shadow-sm"
                      style={{ 
                        backgroundColor: `${t.accentColor}30`, 
                        color: '#FFFFFF', 
                        borderColor: `${t.accentColor}60` 
                      }}
                    >
                      {t.badge}
                    </span>
                  </div>

                  {/* Harmonic Palette Preview Chips */}
                  <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
                    <span className="text-[10px] font-mono text-slate-400">Harmony:</span>
                    <div className="flex items-center gap-1 flex-1">
                      <span 
                        className="h-1.5 flex-1 rounded-full" 
                        style={{ backgroundColor: t.primaryColor }} 
                        title={`Primary: ${t.primaryColor}`} 
                      />
                      <span 
                        className="h-1.5 flex-1 rounded-full" 
                        style={{ backgroundColor: t.secondaryColor }} 
                        title={`Secondary: ${t.secondaryColor}`} 
                      />
                      <span 
                        className="h-1.5 flex-1 rounded-full" 
                        style={{ backgroundColor: t.tertiaryColor }} 
                        title={`Tertiary: ${t.tertiaryColor}`} 
                      />
                      <span 
                        className="h-1.5 flex-1 rounded-full" 
                        style={{ backgroundColor: t.sparkColor }} 
                        title={`Spark: ${t.sparkColor}`} 
                      />
                    </div>
                  </div>

                  {/* Details */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: t.accentColor }} 
                        />
                        {t.name}
                      </h4>
                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                          <Check className="w-2.5 h-2.5" /> Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {t.tagline}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Pill variant with quick select dots
  if (variant === 'pill') {
    return (
      <div className={`inline-flex items-center gap-1 p-1 rounded-xl glass-panel border border-theme-border/60 bg-black/20 ${className}`}>
        {Object.values(THEME_CONFIGS).map((t) => {
          const isSelected = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                isSelected ? 'scale-110 ring-2 ring-white/50' : 'opacity-60 hover:opacity-100'
              }`}
              style={{ backgroundColor: t.accentColor }}
              title={`${t.name} (${t.badge})`}
            >
              {isSelected && <Check className="w-3 h-3 text-white drop-shadow" />}
            </button>
          );
        })}
      </div>
    );
  }

  // Default dropdown/button for Header
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border transition-all duration-300 cursor-pointer shadow-sm ${className}`}
        style={{
          backgroundColor: `${activeConfig.accentColor}18`,
          borderColor: `${activeConfig.accentColor}40`,
          color: activeConfig.primaryColor,
          boxShadow: `0 0 15px ${activeConfig.accentColor}25`
        }}
        title={`Current Theme: ${activeConfig.name} (${surfaceStyle})`}
        aria-label="Theme & Aesthetic Palette Switcher"
      >
        <span 
          className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" 
          style={{ backgroundColor: activeConfig.accentColor }} 
        />
        <span className="hidden sm:inline font-bold">{activeConfig.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Quick Dropdown */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 p-3 rounded-2xl glass-panel border border-white/15 shadow-2xl z-50 animate-fade-in backdrop-blur-2xl">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Aesthetic Theme</span>
            <button
              type="button"
              onClick={() => {
                const nextSurface: SurfaceStyle = surfaceStyle === 'solid' ? 'gradient' : surfaceStyle === 'gradient' ? 'mesh' : 'solid';
                setSurfaceStyle(nextSurface);
              }}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Click to toggle surface rendering"
            >
              Mode: {surfaceStyle}
            </button>
          </div>

          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
            {Object.values(THEME_CONFIGS).map((t) => {
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: t.accentColor, boxShadow: `0 0 6px ${t.accentColor}` }} 
                    />
                    <span>{t.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{t.badge}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

