import React from 'react';

interface FireLEIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  glow?: boolean;
}

export default function FireLEIcon({ 
  size = "100%", 
  className = "w-6 h-6", 
  glow = true,
  ...props 
}: FireLEIconProps) {
  // SVG ID uniquely scoping the gradient
  const gradId = "fireIconGradient";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <defs>
        {/* Fire Gradient: Bottom to Top (deep reddish orange to yellow flame tip) */}
        <linearGradient id={gradId} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#EA580C" /> {/* deep sunset orange */}
          <stop offset="60%" stopColor="#FB923C" /> {/* warm orange */}
          <stop offset="100%" stopColor="#FACC15" /> {/* flame gold top */}
        </linearGradient>
        
        {/* Optional drop shadow or filter to make the text pop */}
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.5" stdDeviation="0.4" floodColor="#000000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Flame silhouette path (polished and organic shape) */}
      <path
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
        fill={`url(#${gradId})`}
        stroke="none"
      />

      {/* The LE abbreviation at the exact center of the fire icon */}
      <text
        x="12"
        y="16.5"
        fontFamily="Impact, 'Arial Black', -apple-system, sans-serif"
        fontWeight="900"
        fontSize="4.4"
        fill="#ffffff"
        textAnchor="middle"
        letterSpacing="-0.1"
        filter="url(#textShadow)"
      >
        LE
      </text>
    </svg>
  );
}
