import QRCode from 'qrcode';

export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 2,
    width: 400,
    color: {
      dark: '#161b33',
      light: '#ffffff',
    },
  });
}

export async function generateQrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 2,
    color: {
      dark: '#161b33',
      light: '#ffffff',
    },
  });
}
