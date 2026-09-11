# AI Digital Standee / Virtual Try-On Kiosk

An interactive, production-quality AI Digital Standee & Virtual Try-On Kiosk application designed for Windows laptops and touchscreen displays. Users can capture a photo or scan a QR code to upload from their phone, pick a saree or luxury outfit, generate a high-resolution AI look, and scan an onscreen QR code to receive the final image directly on their mobile device.

---

## 🌟 Key Features

- **Full-Screen Touchscreen Kiosk UI**: Luxury gold gradient styling designed for 9:16 portrait standees or standard 16:9 laptop screens.
- **Webcam & Mobile Photo Upload**: Live webcam video feed capture with countdown flash, drag-and-drop file upload, or QR scan for instant phone upload via Server-Sent Events (SSE).
- **Extensible AI Provider Layer**: Fully functional `MockAIProvider` for immediate offline testing, plus modular adapters for `CustomAIProvider`, `ReplicateProvider`, and `OpenAIProvider`.
- **Dynamic Style Catalog**: Sarees (Pink, Red, Blue, Green, Temple, Bridal) and Luxury Outfits (Sherwani, Tuxedo, Indo-Western) backed by Prisma ORM and SQLite.
- **Real QR Code Generation**: Instant QR code pointing to mobile-optimized result page (`/result/:token`) with full LAN IP support.
- **Admin Console (`/admin`)**: Real-time analytics, generation log tracking, CRUD style catalog management, and automated image cleanup scheduler.
- **Automated Image Cleanup**: Configurable expiration policy (1h, 6h, 24h, 7d, Never) for privacy and disk space management.

---

## 🚀 Quick Start (Windows & PowerShell)

### Requirements
- **Node.js** v18+ or v20+
- **npm** v9+

### 1. Install Dependencies
```powershell
npm install
```

### 2. Push Database Schema & Seed Catalog
```powershell
npm run db:push
npm run db:seed
```

### 3. Start Frontend & Backend Concurrently
```powershell
npm run dev
```

- **Kiosk Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Admin Portal**: [http://localhost:5173/admin/login](http://localhost:5173/admin/login)
  - **Email**: `admin@standee.com`
  - **Password**: `admin123`

---

## 📲 Testing Mobile Upload & QR Scanning on Local Wi-Fi

When testing QR codes with your mobile phone on the same Wi-Fi network:

1. Find your laptop's local IPv4 address (e.g. `192.168.1.50`).
2. Update `.env`:
   ```env
   PUBLIC_BASE_URL=http://192.168.1.50:5000
   ```
3. Restart the dev server (`npm run dev`).
4. Scan the kiosk QR code with your phone camera!

---

## 🔌 Connecting Real AI API Credentials

Read the detailed guide in [`docs/API_INTEGRATION.md`](file:///c:/Users/cheve/OneDrive/Desktop/kiosk%20app/docs/API_INTEGRATION.md).

1. Change `AI_PROVIDER=custom` in `.env`.
2. Populate `AI_API_URL` and `AI_API_KEY`.
3. Fill in request/response parsing inside `backend/src/services/ai/CustomAIProvider.ts`.

---

## 🧪 Running Automated Tests

```powershell
npm test
```

---

## 📦 Building for Production

```powershell
npm run build
npm run start
```
