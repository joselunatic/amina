# Mobile Baseline

This folder contains the Android wrapper app based on Capacitor.

## First setup

1. Install mobile dependencies:
   - `npm run mobile:install`
2. Initialize Android project:
   - `npm run mobile:add:android`

## Daily workflow

- Sync config/plugins:
  - `npm run mobile:sync`
- Open in Android Studio:
  - `npm run mobile:open`
- Run on a connected device/emulator:
  - `npm run mobile:run`

## Notes

- The app loads the live web at `https://amina.joselun.xyz` by default.
- To change the remote URL, edit `mobile/capacitor.config.json` (`server.url`) and run:
  - `npm run mobile:sync`
