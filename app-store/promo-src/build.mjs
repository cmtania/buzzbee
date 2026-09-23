// Generates the App Store promo slides in ../promo-6.9/ (1320x2868, the 6.9"
// Display size). Each slide is an HTML page rendered by headless Chrome.
//
//   node app-store/promo-src/build.mjs            # all slides
//   node app-store/promo-src/build.mjs 02 07      # just these
//
// Uses the app's own fonts (Manrope, DynaPuff from node_modules) and lucide
// icon paths, so the slides stay visually in step with the shipped app.
// Slide 01 (the bee brand slide) is not generated here — it predates this
// script and is still accurate, so it is left as-is.
//
// Keep every claim on these slides true of the shipped build: App Review
// treats marketing screenshots as metadata (guideline 2.3).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const outDir = resolve(here, '..', 'promo-6.9');
const tmpDir = join(here, '.render');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);

// ---- palette: mirrors src/constants/theme.ts ---------------------------------
const C = {
  bg: '#FBF3E4',
  ink: '#2B2420',
  inkSoft: '#6B5D4F',
  inkFaint: '#786853',
  card: '#FFFDF7',
  track: '#EDE2CE',
  accent: '#F5A623',
  accentDeep: '#E8790A',
  success: '#4CAF6E',
  // ringing screen (src/app/ringing.tsx)
  darkBg: '#1B1712',
  darkSoft: '#B8A98E',
};

// ---- lucide icons, read straight from the package the app uses --------------
function icon(name, { size = 40, color = C.accentDeep, stroke = 2 } = {}) {
  const file = join(repo, 'node_modules/lucide-react-native/dist/esm/icons', `${name}.mjs`);
  const src = readFileSync(file, 'utf8');
  const nodeSrc = src.slice(src.indexOf('node:') + 5, src.indexOf('};'));
  // The node array is a plain JS literal; key fields are irrelevant here.
  const nodes = Function(`return ${nodeSrc.trim().replace(/,\s*$/, '')}`)();
  const inner = nodes
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .filter(([k]) => k !== 'key')
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      return `<${tag} ${a}/>`;
    })
    .join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

const fontUrl = (p) => pathToFileURL(join(repo, 'node_modules/@expo-google-fonts', p)).href;
const beeLogo = pathToFileURL(resolve(repo, '..', 'buzzbee-docs/assets/bee-logo.svg')).href;

// ---- shared page shell ------------------------------------------------------
function page(body, extraCss = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Manrope; font-weight: 500; src: url('${fontUrl('manrope/500Medium/Manrope_500Medium.ttf')}'); }
@font-face { font-family: Manrope; font-weight: 600; src: url('${fontUrl('manrope/600SemiBold/Manrope_600SemiBold.ttf')}'); }
@font-face { font-family: Manrope; font-weight: 700; src: url('${fontUrl('manrope/700Bold/Manrope_700Bold.ttf')}'); }
@font-face { font-family: Manrope; font-weight: 800; src: url('${fontUrl('manrope/800ExtraBold/Manrope_800ExtraBold.ttf')}'); }
@font-face { font-family: DynaPuff; font-weight: 700; src: url('${fontUrl('dynapuff/700Bold/DynaPuff_700Bold.ttf')}'); }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1320px; height: 2868px; overflow: hidden; }
body { background: ${C.bg}; font-family: Manrope, sans-serif; color: ${C.ink}; position: relative; }
.blob { position: absolute; border-radius: 50%; background: rgba(245,166,35,0.22); }
.blob.t { top: -220px; right: -180px; width: 780px; height: 780px; }
.blob.b { bottom: -280px; left: -240px; width: 740px; height: 740px; }
.content { position: absolute; top: 470px; left: 0; right: 0; padding: 0 84px; text-align: center; }
.eyebrow { color: ${C.accentDeep}; font-weight: 800; font-size: 40px; letter-spacing: 3px; text-transform: uppercase; }
.headline { font-weight: 800; font-size: 112px; line-height: 1.06; letter-spacing: -2px; margin-top: 30px; text-wrap: balance; }
.lede { margin-top: 90px; font-weight: 700; font-size: 44px; line-height: 1.42; color: ${C.inkSoft}; text-wrap: balance; }
/* Glass: the app's surfaces are Liquid Glass with no tint (see glass-card.tsx). */
.glass { background: rgba(255,253,247,0.78); border: 2px solid rgba(255,255,255,0.95);
  backdrop-filter: blur(30px); border-radius: 48px; box-shadow: 0 30px 80px rgba(43,36,32,0.10); }
.footer { position: absolute; bottom: 120px; left: 0; right: 0; display: flex; align-items: center; justify-content: center; gap: 16px; }
.footer img { width: 76px; height: 76px; }
.footer span { font-family: DynaPuff; font-weight: 700; font-size: 50px; }
${extraCss}
</style></head><body>
<div class="blob t"></div><div class="blob b"></div>
${body}
<div class="footer"><img src="${beeLogo}"><span>BuzzBee</span></div>
</body></html>`;
}

// ---- slides -----------------------------------------------------------------
const slides = {
  // Wake Window is a deterministic quiet-to-loud ramp. It does NOT sense
  // motion or sleep stage (that mechanism was removed) — never imply it does.
  '02-wake-window': () =>
    page(
      `<div class="content">
        <div class="eyebrow">Wake Window</div>
        <div class="headline">Starts Gentle.<br>Never Late.</div>
        <div class="pair">
          <div class="glass tcard">
            ${icon('volume-1', { size: 64, color: C.inkSoft })}
            <div class="tlabel">Window opens</div>
            <div class="ttime">6:30<small>AM</small></div>
            <div class="tnote">Rings softly</div>
          </div>
          <div class="glass tcard hot">
            ${icon('volume-2', { size: 64 })}
            <div class="tlabel">Hard deadline</div>
            <div class="ttime">7:00<small>AM</small></div>
            <div class="tnote">Full volume</div>
          </div>
        </div>
        <div class="ramp">${Array.from({ length: 14 }, (_, i) => `<i style="height:${24 + i * 11}px;opacity:${0.25 + i * 0.055}"></i>`).join('')}</div>
        <div class="lede">Set a window instead of one fixed time. BuzzBee starts ringing softly the moment it opens and builds to full volume by your deadline — never any later.</div>
      </div>`,
      `.pair { display: flex; gap: 40px; margin-top: 100px; }
       .tcard { flex: 1; padding: 56px 20px 60px; }
       .tcard.hot { border-color: ${C.accent}; }
       .tlabel { margin-top: 30px; font-weight: 800; font-size: 32px; letter-spacing: 2px; text-transform: uppercase; color: ${C.inkFaint}; }
       .ttime { margin-top: 12px; font-weight: 800; font-size: 128px; letter-spacing: -3px; line-height: 1.05; }
       .ttime small { font-size: 40px; letter-spacing: 0; color: ${C.inkFaint}; margin-left: 10px; }
       .tnote { margin-top: 12px; font-weight: 700; font-size: 34px; color: ${C.inkSoft}; }
       .tcard.hot .tnote { color: ${C.accentDeep}; }
       .ramp { display: flex; align-items: flex-end; justify-content: center; gap: 14px; height: 190px; margin-top: 70px; }
       .ramp i { display: block; width: 30px; border-radius: 15px; background: ${C.accent}; }`,
    ),

  '04-smart-features': () => {
    const row = (name, title, desc, badge = '') => `
      <div class="row">
        <div class="ic">${icon(name, { size: 48 })}</div>
        <div class="rm"><div class="rt">${title}</div><div class="rd">${desc}</div>${badge}</div>
      </div>`;
    return page(
      `<div class="content">
        <div class="eyebrow">Beyond the alarm</div>
        <div class="headline">What BuzzBee<br>Can Do For You</div>
        <div class="glass list">
          ${row('bed-double', 'Bedtime Reminder', 'A calm reminder and breathing screen before bed.')}
          ${row('calendar', 'Calendar Auto-Shift', 'A heads-up the day before if tomorrow’s first event clashes with your wake window.')}
          ${row('calendar-check', 'Wake Calendar', 'See which mornings you finished the mission, day by day.')}
          ${row('tag', 'Name Every Alarm', '“Meds,” “Morning run” — the name shows on the alarm and when it rings.')}
          ${row('mic', 'Record Your Own Sound', 'Your voice, a song clip, anything — up to 15 seconds, saved on your phone only.')}
        </div>
        <div class="lede">Bedtime Reminder and Calendar Auto-Shift are on by default.</div>
      </div>`,
      `.list { margin-top: 90px; padding: 10px 56px; text-align: left; }
       .row { display: flex; gap: 34px; align-items: flex-start; padding: 50px 0; }
       .row + .row { border-top: 3px solid ${C.track}; }
       .ic { width: 100px; height: 100px; border-radius: 30px; background: rgba(245,166,35,0.18);
             display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
       .rt { font-weight: 800; font-size: 44px; }
       .rd { margin-top: 10px; font-weight: 600; font-size: 31px; line-height: 1.42; color: ${C.inkFaint}; }`,
    );
  },

  // Mirrors the real ringing screen (src/app/ringing.tsx): dark background,
  // white text, amber counter, ShakeArt.
  '05-dismiss-missions': () =>
    page(
      `<div class="content">
        <div class="eyebrow">No snooze. No cheating.</div>
        <div class="headline">Shake It Off.<br>Literally.</div>
        <div class="phone">
          <div class="clock">6:58<small> AM</small></div>
          <div class="alabel">Morning run</div>
          <div><div class="pill">${icon('audio-waveform', { size: 30, color: C.accent })}<span>Deadline reached</span></div></div>
          <div class="brow">Shake to dismiss</div>
          <div class="count">27<small>/50</small></div>
          <div class="track"><b></b></div>
          <svg width="400" height="208" viewBox="0 0 230 120" fill="none" class="art">
            <path d="M66 40 Q46 60 66 80" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity="0.6"/>
            <path d="M42 26 Q14 60 42 94" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity="0.3"/>
            <path d="M164 40 Q184 60 164 80" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity="0.6"/>
            <path d="M188 26 Q216 60 188 94" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity="0.3"/>
            <rect x="93" y="12" width="44" height="96" rx="12" fill="${C.darkBg}" stroke="#fff" stroke-width="4.5" transform="rotate(-13 115 60)"/>
            <rect x="101" y="24" width="28" height="66" rx="6" fill="${C.accent}" opacity="0.55" transform="rotate(-13 115 60)"/>
          </svg>
          <div class="hint">Keep shaking — 23 to go!</div>
        </div>
        <div class="lede">Six missions to prove you’re awake — and you can preview any of them before you pick.</div>
      </div>`,
      `.phone { margin: 80px auto 0; width: 1000px; background: ${C.darkBg}; border-radius: 72px; padding: 70px 70px 80px;
               box-shadow: 0 40px 90px rgba(43,36,32,0.28); color: #fff; }
       .clock { font-weight: 800; font-size: 150px; letter-spacing: -3px; line-height: 1; }
       .clock small { font-size: 52px; letter-spacing: 0; opacity: 0.85; }
       .alabel { margin-top: 16px; font-weight: 800; font-size: 44px; }
       .pill { display: inline-flex; align-items: center; gap: 14px; margin-top: 28px; padding: 16px 30px; border-radius: 100px;
               background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.16); }
       .pill span { font-weight: 800; font-size: 30px; color: ${C.accent}; }
       .brow { display: block; width: fit-content; margin: 60px auto 0; padding: 18px 40px; border-radius: 100px; background: rgba(245,166,35,0.2);
               color: ${C.accent}; font-weight: 800; font-size: 32px; letter-spacing: 1.5px; text-transform: uppercase; }
       .count { margin-top: 30px; font-weight: 800; font-size: 170px; line-height: 1.1; color: ${C.accent}; }
       .count small { font-size: 54px; font-weight: 700; color: ${C.darkSoft}; }
       .track { margin: 26px 20px 0; height: 28px; border-radius: 14px; background: rgba(255,255,255,0.08); overflow: hidden; }
       .track b { display: block; width: 54%; height: 100%; border-radius: 14px; background: ${C.accent}; }
       .art { margin-top: 50px; }
       .hint { margin-top: 36px; font-weight: 800; font-size: 44px; }`,
    ),

  '06-reliability': () =>
    page(
      `<div class="content">
        <div class="eyebrow">Built to actually ring</div>
        <div class="headline">Always Rings.<br>Never Late.</div>
        <div class="glass rc">
          <svg width="400" height="400" viewBox="0 0 200 200" class="dial">
            <circle cx="100" cy="100" r="80" stroke="${C.track}" stroke-width="18" fill="none"/>
            <circle cx="100" cy="100" r="80" stroke="${C.accent}" stroke-width="18" fill="none" stroke-linecap="round"
              stroke-dasharray="${2 * Math.PI * 80}" stroke-dashoffset="${2 * Math.PI * 80 * 0.28}" transform="rotate(-90 100 100)"/>
          </svg>
          <div class="bell">${icon('bell-ring', { size: 110 })}</div>
          <div class="rl">Next alarm</div>
          <div class="rt">6:30<small>AM</small></div>
          <div class="rs">Every weekday</div>
          <div class="chips">
            <span>${icon('bell-off', { size: 34, color: C.inkSoft })}Silent mode</span>
            <span>${icon('moon', { size: 34, color: C.inkSoft })}Focus</span>
            <span>${icon('x', { size: 34, color: C.inkSoft })}App closed</span>
          </div>
        </div>
        <div class="lede">Built on Apple’s AlarmKit — it rings at full volume through Silent mode and Focus, even if you’ve closed the app.</div>
      </div>`,
      `.rc { margin-top: 90px; padding: 80px 50px 70px; position: relative; }
       .dial { display: block; margin: 0 auto; }
       .bell { position: absolute; top: 225px; left: 0; right: 0; display: flex; justify-content: center; }
       .rl { margin-top: 50px; font-weight: 800; font-size: 34px; letter-spacing: 2px; text-transform: uppercase; color: ${C.inkFaint}; }
       .rt { font-weight: 800; font-size: 150px; letter-spacing: -3px; line-height: 1.1; }
       .rt small { font-size: 46px; letter-spacing: 0; color: ${C.inkFaint}; margin-left: 12px; }
       .rs { font-weight: 700; font-size: 38px; color: ${C.inkSoft}; }
       .chips { display: flex; justify-content: center; gap: 18px; margin-top: 50px; }
       .chips span { display: inline-flex; align-items: center; gap: 12px; padding: 18px 28px; border-radius: 100px;
                     background: rgba(245,166,35,0.14); font-weight: 700; font-size: 30px; color: ${C.inkSoft}; }`,
    ),

  // Same honesty rule as 02: the difference is a gradual ramp, not sensing.
  '07-comparison': () =>
    page(
      `<div class="content">
        <div class="eyebrow">Not all alarms ring the same</div>
        <div class="headline">One Loud Jolt.<br>vs. A Gentle Build.</div>
        <div class="vs-wrap">
          <div class="side other">
            <div class="mark">${icon('x', { size: 40, color: '#fff', stroke: 3 })}</div>
            <div class="who">Any other alarm</div>
            <div class="when">7:00 AM</div>
            <div class="bars">${Array.from({ length: 14 }, () => `<i style="height:150px"></i>`).join('')}</div>
            <div class="what">Full blast, all at once.</div>
          </div>
          <div class="vs">VS</div>
          <div class="side glass bb">
            <div class="mark ok">${icon('check', { size: 40, color: '#fff', stroke: 3 })}</div>
            <div class="who hot">BuzzBee</div>
            <div class="when">6:30–7:00 AM</div>
            <div class="bars">${Array.from({ length: 14 }, (_, i) => `<i class="a" style="height:${20 + i * 10}px;opacity:${0.3 + i * 0.05}"></i>`).join('')}</div>
            <div class="what">Starts soft, full volume by 7:00.</div>
          </div>
        </div>
        <div class="lede">Same hard deadline either way — BuzzBee just gets you there gently.</div>
      </div>`,
      `.vs-wrap { margin-top: 90px; position: relative; }
       .side { position: relative; border-radius: 48px; padding: 56px 40px 60px; }
       .other { background: ${C.track}; color: ${C.inkSoft}; }
       .bb { border: 4px solid ${C.accent}; }
       .mark { position: absolute; top: 36px; right: 36px; width: 76px; height: 76px; border-radius: 50%; background: #9C8C7A;
               display: flex; align-items: center; justify-content: center; }
       .mark.ok { background: ${C.accent}; }
       .who { font-weight: 800; font-size: 34px; letter-spacing: 2px; text-transform: uppercase; }
       .who.hot { color: ${C.accentDeep}; }
       .when { margin-top: 14px; font-weight: 800; font-size: 104px; letter-spacing: -2px; color: ${C.ink}; }
       .other .when { color: ${C.inkSoft}; }
       .bars { display: flex; align-items: flex-end; justify-content: center; gap: 12px; height: 150px; margin-top: 24px; }
       .bars i { display: block; width: 26px; border-radius: 13px; background: #B3A38F; }
       .bars i.a { background: ${C.accent}; }
       .what { margin-top: 28px; font-weight: 700; font-size: 36px; }
       .vs { position: relative; margin: -50px auto; z-index: 2;
             width: 130px; height: 130px; border-radius: 50%; background: ${C.ink}; color: #fff;
             display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 44px;
             box-shadow: 0 16px 40px rgba(43,36,32,0.3); }`,
    ),

  // Honest about the one limit: a custom recording plays on BuzzBee's own
  // ringing screen; if the app is fully closed, the lock-screen alert uses a
  // built-in tone (iOS only allows bundled sounds there). So no "loops right
  // when your alarm rings" — that overpromised the closed-app case.
  '08-record-sound': () =>
    page(
      `<div class="content">
        <div class="eyebrow">Make it yours</div>
        <div class="headline">Record Your Own<br>Alarm Sound</div>
        <div class="glass rec">
          <div class="mic">${icon('mic', { size: 150, color: C.ink, stroke: 2.2 })}</div>
          <div class="cap">Tap to record — up to 15 seconds.</div>
          <div class="tiles">
            <div class="tile sel">
              <div class="top"><span class="play">${icon('mic', { size: 34, color: C.ink })}</span><span class="ck">${icon('check', { size: 26, color: '#fff', stroke: 3 })}</span></div>
              <div class="nm">My Wake-Up Call</div>
            </div>
            <div class="tile">
              <div class="top"><span class="play">${icon('bell', { size: 34, color: C.ink })}</span></div>
              <div class="nm">Classic Alarm</div>
            </div>
          </div>
        </div>
        <div class="lede">Your voice, a song clip, anything — saved on your device only, never uploaded.</div>
      </div>`,
      `.rec { margin-top: 90px; padding: 80px 56px 60px; }
       .mic { width: 380px; height: 380px; margin: 0 auto; border-radius: 50%; background: ${C.accent};
              display: flex; align-items: center; justify-content: center; box-shadow: 0 30px 70px rgba(232,121,10,0.3); }
       .cap { margin-top: 56px; font-weight: 700; font-size: 38px; color: ${C.inkSoft}; }
       .tiles { display: flex; gap: 32px; margin-top: 60px; text-align: left; }
       .tile { flex: 1; border: 4px solid ${C.track}; border-radius: 40px; padding: 36px; background: rgba(255,255,255,0.5); }
       .tile.sel { border-color: ${C.accent}; }
       .top { display: flex; justify-content: space-between; align-items: center; }
       .play { width: 80px; height: 80px; border-radius: 50%; background: ${C.accent}; display: flex; align-items: center; justify-content: center; }
       .ck { width: 56px; height: 56px; border-radius: 50%; background: ${C.success}; display: flex; align-items: center; justify-content: center; }
       .nm { margin-top: 36px; font-weight: 800; font-size: 38px; }`,
    ),
};

// ---- render -------------------------------------------------------------------
const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) throw new Error('No Chrome/Edge found — set CHROME_PATH.');
mkdirSync(tmpDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const wanted = process.argv.slice(2);
const names = Object.keys(slides).filter((n) => !wanted.length || wanted.some((w) => n.startsWith(w)));

for (const name of names) {
  const html = join(tmpDir, `${name}.html`);
  writeFileSync(html, slides[name]());
  const png = join(outDir, `${name}.png`);
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--force-device-scale-factor=1',
    '--virtual-time-budget=4000',
    `--user-data-dir=${join(tmpDir, 'profile')}`,
    '--window-size=1320,2868',
    `--screenshot=${png}`,
    pathToFileURL(html).href,
  ], { stdio: 'ignore' });
  console.log('wrote', png);
}
