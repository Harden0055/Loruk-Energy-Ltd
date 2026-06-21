export const svgLogoStr = `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <g transform="translate(150, 110)">
    <!-- Orange Flame -->
    <path d="M 0 -70 C -60 -20, -70 40, -30 65 C -20 72, 10 70, 20 60 C 30 50, 40 30, 20 -10 C 10 -30, 0 -50, 0 -70" fill="none" stroke="#E15B26" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 0 -70 C 60 -20, 70 40, 30 65 C 20 72, -10 70, -20 60 C -30 50, -40 30, -20 -10 C -10 -30, 0 -50, 0 -70" fill="none" stroke="#0C75BB" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
    <!-- Overlapping center pieces -->
    <path d="M -15 20 C 0 30, 15 20, 15 20" fill="none" stroke="#E15B26" stroke-width="18" stroke-linecap="round" />
    <path d="M 15 20 C 0 30, -15 20, -15 20" fill="none" stroke="#0C75BB" stroke-width="18" stroke-linecap="round" />
    
    <text x="-5" y="45" font-family="'Arial Black', 'Impact', sans-serif" font-weight="900" font-size="42" fill="#E15B26" text-anchor="end">L</text>
    <text x="2" y="45" font-family="'Arial Black', 'Impact', sans-serif" font-weight="900" font-size="42" fill="#0C75BB" text-anchor="start">E</text>
  </g>
  <text x="150" y="235" font-family="Georgia, serif" font-weight="900" font-size="20" fill="#0C75BB" text-anchor="middle" letter-spacing="1">LORUK ENERGY LTD</text>
  <rect x="60" y="245" width="180" height="22" fill="#E15B26" />
  <text x="150" y="260" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">Energy . Power . Progress</text>
</svg>
`;

export const getLogoDataUrl = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgLogoStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 300);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Canvas context not supported'));
      }
      URL.revokeObjectURL(url);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load SVG into image'));
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  });
};
