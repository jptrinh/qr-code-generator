---
name: QR Code Generator
description: A customizable QR code generator component that creates scannable QR codes from text or URLs with download capability
keywords: [qr code, generator, download, customizable, scanner]
---

### QR Code Generator

Properties:
- `text`: `string` - The content to encode in the QR code (text or URL). Default: `'https://www.weweb.io'`
- `size`: `string` - The size of the QR code (CSS length). Default: `'200px'`
- `foregroundColor`: `string` - The color of the QR code pattern. Default: `'#000000'`
- `backgroundColor`: `string` - The background color of the QR code. Default: `'#FFFFFF'`
- `errorCorrection`: `'L' | 'M' | 'Q' | 'H'` - Error correction level. Default: `'M'`
  - L: Low (7% damage recovery)
  - M: Medium (15% damage recovery)
  - Q: Quartile (25% damage recovery)
  - H: High (30% damage recovery)

Actions:
- `downloadQR`: Downloads the current QR code as a PNG image

Variables:
- `qrDataUrl`: `string` - The generated QR code as a data URL (can be used in workflows)

Special features:
- Real-time QR code generation when properties change
- High-quality PNG download support
- Customizable colors and size
- Multiple error correction levels for reliability
- Mobile-friendly and responsive design