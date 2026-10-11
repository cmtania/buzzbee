# BuzzBee — Free + Pro Plan

**Status:** planned 2026-10-08, nothing built yet. Replaces the parked
"Pro = custom sounds" idea on `feature/pro-custom-sound` (whose purchase code
is reused, see §3).

**Confidence markers:** *(verified)* = checked in this repo or in the
package's own code on 2026-10-08. *(to verify)* = must be proven in a spike
before building on it.

---

## 1. Decisions (from the human partner, 2026-10-08)

- **Business model:** BuzzBee changes from **paid upfront** (₱99, it has real
  sales) to **free with one in-app purchase, BuzzBee Pro**.
- **Price:** one-time, non-consumable, **$2.99 / ₱149**. No subscription.
- **Pro unlocks:**
  1. **Scan mission:** scan a QR code or barcode you registered earlier.
  2. **Steps mission:** walk a number of steps.
  3. **Hard mode & combos:** chain missions; an unskippable option.
  4. **Photo mission ("scan a mug"):** point the camera at an everyday
     object, such as a mug.
  5. **Stand Straight mission:** stand up straight in front of the camera.
  6. **Dance mission:** copy poses shown on screen in front of the camera.
- **Stays free:** everything in the app today, including the six current
  missions, Wake Window, Calendar Auto-Shift, Bedtime Reminder, calibration
  and **custom recorded sounds**. Nothing anyone has today gets locked.

---

## 2. People who already paid get Pro free

They paid for the whole app, so they must not be asked to pay again. This
is decided by Apple's own record of the original download. No server and no
account are involved.

- `expo-iap` exposes `getAppTransactionIOS()`, returning an `AppTransaction`
  with `originalAppVersion` *(verified: expo-iap 5.8.2 `build/types.d.ts`)*.
- **Gotcha:** on iOS, `originalAppVersion` is the **build number**
  (`CFBundleVersion`), not "1.0.1". BuzzBee's build numbers come from EAS
  (`appVersionSource: "remote"`, `autoIncrement: true`) *(verified:
  eas.json)*.
- **Rule:** Pro is unlocked if the Pro purchase is owned **or**
  `Number(originalAppVersion) < FIRST_FREE_BUILD`, where `FIRST_FREE_BUILD`
  is the build number of the first free build.
  - **Before release:** read the last paid build number from App Store
    Connect → TestFlight, set `FIRST_FREE_BUILD` one above it, and make sure
    the free build really gets that number or higher.
- In the sandbox and TestFlight, `originalAppVersion` is always `"1.0"`.
  Test the rule with a debug override, not by hoping.
- Cache the result the same way `pro.ts` caches a purchase, so an offline
  early buyer never loses Pro.
- The paywall says "Thanks for buying BuzzBee early — Pro is yours" for
  these users, instead of showing a price.

---

## 3. Purchase plumbing (reuse the parked branch)

`feature/pro-custom-sound` (`17d8870`) already has *(verified)*:
`src/lib/pro.ts` (StoreKit via expo-iap, cached offline state, restore),
`src/lib/pro-context.tsx`, the `src/app/pro.tsx` paywall, and the launch
checklist `app-store/PRO-LAUNCH.md`. It uses product id
`com.cmtania.buzzbeealarm.pro`.

Steps:
- Cherry-pick `pro.ts`, `pro-context.tsx`, `pro.tsx`, the `expo-iap`
  dependency and PRO-LAUNCH.md.
- **Drop** every custom-sound gate: custom sounds stay free.
- Add the early-buyer rule from §2 to the Pro state.
- Rewrite the paywall copy around the new missions.
- Keep the deliberate choice of no RevenueCat and no third party, so the
  privacy promise stays true.

---

## 4. The missions

All camera and motion analysis runs **on the phone**. Frames are analysed
in memory and discarded; nothing is saved or uploaded. The privacy policy
and review notes must say so (§7).

**Safety rule for every new mission:** an alarm must never leave someone
unable to turn it off. If the camera or motion permission is denied, the
camera won't start, or the mission can't succeed (a dark room, no space to
dance), the screen offers **"Switch to Math"** after **2 minutes**. This
mirrors today's `MicPermissionFallback`. Hard mode may lengthen that delay,
but never removes it.

### 4.1 Scan (QR / barcode) — low risk
- **Setup:** the user scans a code once (a toothpaste barcode, a printed QR
  stuck on the bathroom mirror). Only the code's text value is saved.
- **Ringing:** the camera opens, and the mission succeeds when the same
  value is scanned.
- **Tech:** `expo-camera`'s `CameraView` with built-in barcode scanning.
  This is a new dependency; check that it supports SDK 57 *(to verify)*.
- **Where:** a "Scan a code" step in the mission chooser. The mission can't
  be picked until a code is registered.

### 4.2 Steps — low risk
- **Ringing:** "Walk 40 steps", with a choice of 20 / 40 / 80. A live count
  and a progress bar.
- **Tech:** `expo-sensors` `Pedometer` (CoreMotion). It is already a
  dependency *(verified: package.json)*. Add `NSMotionUsageDescription`.
  - **Check on a device** whether live step updates arrive quickly enough
    while the app is in the foreground *(to verify)*.

### 4.3 Hard mode & combos — low risk, pure TypeScript
- **Combos:** an alarm can chain 2–3 missions, e.g. Math → Scan → Shake.
  - **Data:** a new `missionChain TEXT` column (JSON array), added both to
    `CREATE TABLE` and through a guarded `ALTER TABLE` (see db.ts's
    migration pattern). An empty chain means the existing single
    `dismissMethod`, so old alarms behave exactly as today.
- **Hard mode** (per alarm):
  - harder targets (more claps, harder maths, more steps);
  - hides **Close** on the ringing screen;
  - the "Switch to Math" escape waits 5 minutes instead of 2.

### 4.4 Photo ("scan a mug") — medium risk
- **Setup:** the user picks an object from a short list Apple's on-device
  classifier recognises reliably, e.g. a mug, toothbrush, sink, fridge or
  shoe.
- **Ringing:** "Show me a mug". The mission succeeds when that label is
  detected with enough confidence for about 1 second.
- **Tech:** Apple Vision `VNClassifyImageRequest` (built-in, no model to
  ship), run on camera frames.
  - Needs a small native module, the same pattern as `expo-alarm-kit`.
  - Needs a camera library with frame access, most likely
    `react-native-vision-camera` with a Swift frame-processor plugin.
  - **Spike first:** the exact label names, the confidence needed in a dim
    bedroom, and Expo SDK 57 compatibility *(to verify)*.

### 4.5 Stand Straight — medium risk
- **Ringing:** prop the phone up, step back, stand straight with your whole
  body in frame, and hold it for 5 seconds.
- **Tech:** Vision `VNDetectHumanBodyPoseRequest` on camera frames.
  - "Straight" means the shoulder, hip, knee and ankle joints are detected
    and roughly vertical.
  - It uses the same native module as 4.4.

### 4.6 Dance — highest risk, most fun
- **Ringing:** 4–6 random poses shown as bee illustrations (arms up, T-pose,
  hands on hips, one arm up…). Hold each for about 1 second; a live outline
  shows when you match.
- **Tech:** the same body-pose detection as 4.5, plus simple angle checks per
  pose.
- **Risks:** it needs light and some room, so the 2-minute escape matters
  most here. Tune the poses on a real device.

---

## 5. Releases

Ship value early instead of waiting for the hardest mission.

| Version | Contents |
|---|---|
| **1.0.2** | Sound matching + Settings → Calibrate (in progress on `feature/sound-matching`). Ship first. |
| **1.1.0 — Free + Pro launch** | The app becomes free. Purchase plumbing + early-buyer unlock (§2–3). Pro missions: **Scan, Steps, Hard mode & combos**. Paywall. |
| **1.2.0 — Camera missions** | **Photo ("mug"), Stand Straight, Dance**, added to Pro at no extra cost. Good "new in Pro" marketing for people still deciding. |

Doing the camera missions in 1.2.0 keeps the risky native Vision work out of
the monetisation launch. The spike for §4.4–4.6 can start in parallel.

---

## 6. App Store Connect steps (1.1.0)

1. **Create the IAP:** a non-consumable `com.cmtania.buzzbeealarm.pro` at the
   $2.99 tier, with display name, description and a review screenshot of
   the paywall. Attach it to the 1.1.0 version.
2. **Release manually.** Set 1.1.0 to "Manually release this version". On
   release day, switch **Pricing → Free** and release the build together,
   so nobody downloads a paid build that then asks for money.
3. **Update the description** to say "Free, with an optional one-time Pro
   upgrade". Apple lists the IAP on the store page automatically.
4. **Review notes:**
   - how to reach the paywall;
   - that earlier paid buyers get Pro automatically;
   - that Restore Purchases is in Settings → BuzzBee Pro.
5. **Paid Apps Agreement:** already active, since the app has had sales.

---

## 7. Privacy and docs to update

- **New permissions:**
  - `NSCameraUsageDescription`: "BuzzBee uses the camera for the Scan,
    Photo, Stand Straight and Dance missions. Images are analysed on your
    phone and never saved or uploaded."
  - `NSMotionUsageDescription` for Steps.
- **Privacy policy:**
  - Camera and motion: analysed on the phone, never stored or sent.
  - Purchases: handled by Apple; BuzzBee only learns "Pro: yes/no".
  - The saved QR/barcode value stays on the phone.
- **Still owed from 2026-10-08:** remove the "rings at full volume" claims.
  - A locked-phone AlarmKit alarm plays at the Ringer volume, which apps
    can't raise.
  - The claims are in APP-REVIEW-GUIDE.md, SCREEN-RECORDING-GUIDE.md, the
    landing page, support.html and terms.html.
  - Add a "turn up your ringer" tip in onboarding.
- **TEST-PLAN.md:** a Pro section covering purchase, restore, the
  early-buyer unlock (debug override), and every new mission including its
  escape.

---

## 8. Open questions

1. What is the last paid build number? Needed for `FIRST_FREE_BUILD` (§2).
2. Paywall placement: only when tapping a locked Pro mission, or also one
   soft screen at the end of onboarding? Recommended: on tap only, plus a
   Settings → BuzzBee Pro row. A paywall right after a free download feels
   pushy.
3. The Photo mission's object list: confirm the final 5–6 objects after the
   Vision spike.
