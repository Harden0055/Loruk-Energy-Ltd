import React from 'react';
import { useTheme, SurfaceStyle } from '../lib/theme';
import { Layers, Box, Wand2 } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'surface-switch';
  className?: string;
}

// The app uses a single fixed theme (green/violet on pitch black), so the only
// switchable visual option left is the surface rendering style.
export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { surfaceStyle, setSurfaceStyle } = useTheme();

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
