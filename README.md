# TaxTrail

Self-employed quarterly estimated taxes helper — React Native + Expo (iOS & Android)

## Features
- Authentication with Supabase (email/password, Google OAuth)
- Dashboard with totals and estimates
- Income & Expenses tracking (basic CRUD)
- Receipt scanning:
  - AI-based parsing with OpenAI (image → structured data)
  - OCR (non-AI) path via native OCR lib — needs dev client
- 1040-ES assistant (estimate + generate PDF with pdf-lib; stored to Supabase)
- Mileage tracking:
  - Automatic background tracking (Expo Location + Task Manager)
  - Manual entry + Apple MapKit (iOS) or Google Directions (Android/iOS) distance with graceful fallbacks
- Modern UI components, dark mode support, Expo Router navigation
- Unified `Screen` component for keyboard dismissal + scrolling

## Setup
1. Install dependencies:
```powershell
npm install
```
2. Create `.env` from `.env.example` and fill keys. These are read by `app.config.ts` into `extra`.
3. Create Supabase Storage buckets:
  - `receipts` (private)
  - `forms` (private or public as you prefer)
  - (Optional) `maps-cache` if you later cache route polyline data
4. (Optional) Replace app icon/splash in `assets/` and uncomment in `app.config.ts`.

## Run
```powershell
npm run start
```
- Press `a` for Android emulator or `i` for iOS (on macOS), or scan the QR with Expo Go. For OCR native path, MapKit routing and background tasks on iOS you may need a dev client.

## Native Modules and Notes
- Background Location (automatic mileage): uses `expo-location` + `expo-task-manager`. `app.config.ts` preconfigures iOS & Android permissions. On iOS, ensure background location is enabled.
- Routing (Apple MapKit vs Google):
  - iOS attempts a native MapKit directions module (see `src/services/routing.ts`). If the module is missing it falls back to geocoding + Google Directions (if key) or a straight-line Haversine approximation.
  - To enable true MapKit driving routes, add a config plugin & native module:
    1. Create `plugins/mapkit-routing.ts` and list it in `plugins` of `app.config.ts`.
    2. Run `npx expo prebuild` to generate the iOS project.
    3. Add a Swift Expo Module (simplified example):
       ```swift
       import ExpoModulesCore, MapKit, CoreLocation
       public class MapKitRoutingModule: Module { public func definition() -> ModuleDefinition { Name("MapKitRouting")
         AsyncFunction("getRouteDistance") { (start: String, end: String) -> [String: Any] in
           let geocoder = CLGeocoder(); var startItem: MKMapItem?; var endItem: MKMapItem?
           let group = DispatchGroup();
           group.enter(); geocoder.geocodeAddressString(start){ placemarks,_ in if let p=placemarks?.first?.location { startItem = MKMapItem(placemark: MKPlacemark(coordinate: p.coordinate)) }; group.leave() }
           group.enter(); geocoder.geocodeAddressString(end){ placemarks,_ in if let p=placemarks?.first?.location { endItem = MKMapItem(placemark: MKPlacemark(coordinate: p.coordinate)) }; group.leave() }
           group.wait(); guard let s=startItem, let e=endItem else { throw Exception("GEOCODE_FAIL") }
           let req = MKDirections.Request(); req.source=s; req.destination=e; req.transportType=.automobile; let directions = MKDirections(request:req)
           var result:[String:Any] = [:]; let semaphore = DispatchSemaphore(value:0)
           directions.calculate { resp,_ in if let route = resp?.routes.first { let miles = route.distance / 1609.34; let coords = route.polyline.coordinates; result=["distanceMiles": miles, "points": coords.map{ ["latitude": $0.latitude, "longitude": $0.longitude] }] }; semaphore.signal() }
           semaphore.wait(); return result }
       } }
       extension MKPolyline { var coordinates:[CLLocationCoordinate2D]{ var arr=[CLLocationCoordinate2D](repeating:kCLLocationCoordinate2DInvalid,count:self.pointCount); self.getCoordinates(&arr, range:NSRange(location:0,length:self.pointCount)); return arr } }
       ```
    4. Rebuild the dev client: `npx expo run:ios`.
  - Android continues using Google Directions when key present.
- OCR (non-AI): choose one approach:
  1. VisionCamera + `vision-camera-ocr` (recommended; on-device; requires Custom Dev Client)
  2. `react-native-mlkit-ocr`
- OpenAI: AI receipt parser sends base64 image as data URL; no public URL required.
- PDF: Uses `pdf-lib`. Provide official template in `assets/` to fill fields.
- Google Directions: Set `GOOGLE_MAPS_API_KEY` for `src/services/google.ts` (still used as fallback / Android path).

## Testing Notes
- Add income/expense entries and verify dashboard totals.
- Test receipt AI flow with a sample receipt; confirm review values.
- On a physical device, grant Always location permission to test automatic mileage.
- Validate routing on iOS: with native module you should see road distance > straight-line.
- Generate a 1040-ES PDF and verify upload in Supabase Storage.

## Future Improvements
- Full offline-first sync via SQLite + background sync queues
- Advanced charts with `react-native-svg-charts` or Reanimated graphs
- Better receipt itemization and category suggestions
- Drive detection heuristics (speed thresholds, motion activity)
- State/local tax support and safe harbor strategies
- i18n and currency/locale options
- True native MapKit route polyline visualization & turn-by-turn summary when module installed

## Folder Structure
- `app/`: Expo Router routes (auth, tabs, assistant, onboarding)
- `src/components/`: UI primitives + `Screen` layout helper
- `src/hooks/`: permissions, location
- `src/providers/`: AuthProvider
- `src/services/`: supabase, receipts, taxes, pdf, google, routing
- `src/stores/`: zustand stores (finance, mileage, settings)
- `src/tasks/`: background location task
