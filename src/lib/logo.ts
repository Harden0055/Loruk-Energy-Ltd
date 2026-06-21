export const svgLogoStr = `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <rect width="300" height="300" fill="#ffffff" />
  <g transform="translate(150, 130)">
    <!-- Blue Path (Outer right, Inner left) -->
    <path d="M 50 45 C 115 -15, 10 -65, 0 -90 C -10 -65, -75 -15, -20 45" fill="none" stroke="#0C75BB" stroke-width="16" stroke-linejoin="miter" stroke-miterlimit="10" stroke-linecap="round" />
    
    <!-- White Mask for Orange Path to create cutout over Blue -->
    <path d="M -50 45 C -115 -15, -10 -90, 0 -120 C 10 -90, 75 -15, 20 45" fill="none" stroke="#ffffff" stroke-width="22" stroke-linejoin="miter" stroke-miterlimit="10" stroke-linecap="round" />
    
    <!-- Orange Path (Outer left, Inner right) -->
    <path d="M -50 45 C -115 -15, -10 -90, 0 -120 C 10 -90, 75 -15, 20 45" fill="none" stroke="#E15B26" stroke-width="16" stroke-linejoin="miter" stroke-miterlimit="10" stroke-linecap="round" />

    <!-- LE Text -->
    <text x="-2" y="38" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="34" fill="#0C75BB" text-anchor="end">L</text>
    <text x="2" y="38" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="34" fill="#E15B26" text-anchor="start">E</text>
  </g>
  <text x="150" y="235" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="18" fill="#0C75BB" text-anchor="middle" letter-spacing="1">LORUK ENERGY LTD</text>
  <rect x="55" y="245" width="190" height="20" fill="#E15B26" />
  <text x="150" y="259" font-family="Arial, sans-serif" font-size="11" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">Energy. Power. Progress</text>
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
