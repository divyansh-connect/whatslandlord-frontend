# WhatsLandlord - Expo Mobile App (SDK 54)

This directory contains the React Native mobile application for the **WhatsLandlord** management system, built using **Expo SDK 54**.

---

## 🚀 Getting Started

### 1. Prerequisites
Make sure you have Node.js installed, and your local WhatsLandlord backend is running at `http://localhost:5000`.

### 2. Install Dependencies
Run the following command inside the `app` folder to install dependencies:
```bash
npm install
```

### 3. Run Development Server
Start the Expo development server:
```bash
npm run start
```
You can press `a` to open the Android emulator, `i` to open the iOS simulator, or scan the QR code using the Expo Go app on your physical device.

---

## ⚙️ Backend API Configuration

By default, the application resolves the backend API endpoint dynamically:
- **iOS Simulator**: `http://localhost:5000/api/v1`
- **Android Emulator**: `http://10.0.2.2:5000/api/v1`
- **Physical Device**: Update the host in `app/src/api/client.ts` to your machine's local Wi-Fi IP address (e.g. `http://192.168.1.X:5000/api/v1`) to connect successfully from your mobile device.

---

## 👥 Demo Portals & Credentials

The application bypasses the landing/checkout flow and lands directly on the **Login Screen**. You can tap any of the **Quick Demo Logins** buttons on the screen or manually enter the emails below to login:

1. **Super Admin / Property Manager**:
   - Email: `admin@whatslandlord.com` or `manager@whatslandlord.com`
   - Features: Invite user modal, status toggle (Active/Suspended), and revoke user.

2. **Property Owner**:
   - Email: `owner@whatslandlord.com`
   - Features: View properties, add property form modal, delete property with confirmation, owner document uploads (Statements, Tax, Insurance, Contracts, etc.) with 5MB validation.

3. **Tenant**:
   - Email: `tenant@whatslandlord.com`
   - Features: Rent payment with zero balance validation, maintenance ticket submit, tenant document uploads with custom category support.
