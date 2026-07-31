# Costivra mobile foundation

This is the native Costivra companion app for iPhone, Android, and iPad. It is intentionally separate from the Next.js website so native navigation, push notifications, camera/document capture, secure device storage, and app-store releases can evolve safely.

## Current foundation

- Expo SDK 57 with Expo Router
- Native bottom navigation: Overview, Cases, Actions, More
- Touch-first command center and opportunity views
- Shared Costivra circuit-C asset and color system
- One responsive codebase for iOS, Android, iPad, and web preview

## Run it

```powershell
cd mobile-app
npm run start
```

Use Expo Go for early device testing. The next milestone is to connect these screens to the Costivra API, then add secure sign-in, notifications, and camera-based document capture.
