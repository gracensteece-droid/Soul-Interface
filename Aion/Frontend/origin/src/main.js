import * as THREE from 'three';
import { getProject, types } from '@theatre/core';
import studio from '@theatre/studio';
studio.default.initialize();

// ── Theatre.js ────────────────────────────────────────────────────────────────
const project = getProject('Origin Scene v3');
const sheet   = project.sheet('Timeline');

// Playback — speed multiplier (set to 0 to pause from Theatre side)
const playbackObj = sheet.object('Playback', {
  speed: types.number(1.0, { range: [0, 4] }),
});

// Nebula — particle appearance during void/nebula phase
const nebulaObj = sheet.object('Nebula', {
  brightMult: types.number(1.0,  { range: [0, 3] }),
  warmBias:   types.number(0.0,  { range: [0, 1] }),
  formLock:   types.number(-1,   { range: [-1, 1] }), // -1 = auto, 0-1 = locked formation stage
});

// Collapse — how the spiral drain looks
const collapseObj = sheet.object('Collapse', {
  brightMult:   types.number(1.0, { range: [0, 3] }),
  warmBias:     types.number(0.0, { range: [0, 1] }),
  collapseLock: types.number(-1,  { range: [-1, 1] }), // -1 = auto, 0-1 = locked collapse stage
});

// Ignition — timing and intensity of the birth flash
const ignitionObj = sheet.object('Ignition', {
  duration:        types.number(4,    { range: [1, 30] }),
  flashIntensity:  types.number(1.0,  { range: [0, 3] }),
  distortAmt:      types.number(1.0,  { range: [0, 3] }),
  emergenceStart:  types.number(0.68, { range: [0, 0.99] }), // when sun texture appears (0=early, 0.99=late)
  coreGlow:        types.number(1.0,  { range: [0, 4] }),    // intensity of the ambient warm light halo
});

// Sun — post-ignition surface appearance
const sunObj = sheet.object('Sun', {
  hueMode:   types.number(0.0, { range: [0, 5] }),
  coronaGlow: types.number(1.0, { range: [0, 3] }),
  coronaHueShift:     types.number(0.0, { range: [0, 1] }),   // rotates the corona's color cycle
  coronaFlareStrength:types.number(1.0, { range: [0, 3] }),   // how bright/spiky the flare rays are
  coronaSpread:       types.number(1.0, { range: [0.2, 3] }), // how quickly the glow/flares fall off with distance
  spinSpeed:          types.number(0.0, { range: [-15, 15] }), // rotates the sun mesh on its own axis — negative = reverse direction
  sizeMult:           types.number(1.0, { range: [0.01, 6] }), // multiplies the sun's scale on top of its own growth/shrink animation
  ripple:             types.number(0.0, { range: [0, 3] }),    // traveling surface-wave crests, ported from sun-prototype.html
});

// Galaxy Cloud — takes over driving the shared cloud particle materials' color/warmth/
// brightness once ignition completes, since CollapseCloud's own keyframes stop at 74s
// and would otherwise just freeze in place for the rest of the scene.
const galaxyCloudObj = sheet.object('GalaxyCloud', {
  hue:        types.number(0.07, { range: [0, 1] }),
  satMult:    types.number(1.0,  { range: [0, 2] }),
  warmBias:   types.number(0.0,  { range: [0, 1] }),
  brightMult: types.number(1.0,  { range: [0, 3] }),
});

// Collapse Cloud — shape/color of the collapsing nebula as it nears ignition (T≈56-74, esp. the 72-74 tail)
const cloudShapeObj = sheet.object('CollapseCloud', {
  turbulence:  types.number(1.0,  { range: [0, 3] }),    // multiplies the inward-fall turbulence amplitude
  spiralTight: types.number(1.0,  { range: [0.3, 3] }),  // multiplies how tightly wound the drain spiral looks
  coreSize:    types.number(1.0,  { range: [0.2, 3] }),  // >1 = core cluster concentrates/brightens sooner
  hotHue:      types.number(0.07, { range: [0, 1] }),    // hue of the hottest (innermost) particles
  satMult:     types.number(1.0,  { range: [0, 2] }),    // saturation multiplier
  spinSpeed:   types.number(1.0,  { range: [0.2, 25] }),  // multiplies the whole collapse rotation rate
  spinRampShape: types.number(3.0, { range: [1, 6] }),    // shape of the ramp-in curve (3 = default cubic, 1 = linear)
  cloudSize:   types.number(1.0,  { range: [0.0005, 3] }),  // scales the collapse spiral's overall radius
  coreLightHue:types.number(0.0,  { range: [0, 1] }),    // hue rotation applied to the core-glow light/shells
  ballForm:    types.number(0.0,  { range: [0, 3] }),     // 0 = flat collapse to a point, higher = rounds into a ball
  coreGlowSize:types.number(1.0,  { range: [0.01, 3] }),  // scales the 4 fixed core-glow spheres (independent of cloudSize)
});

// Explosion Ball — shape/blend of the ignition flash + sun emergence (T≈74-80)
const ballObj = sheet.object('ExplosionBall', {
  radius:      types.number(1.0,  { range: [0.3, 3] }),   // flash sphere + sun peak-scale multiplier
  distortFreq: types.number(1.0,  { range: [0.2, 4] }),   // ripple frequency multiplier on the sun surface
  distortAmp:  types.number(1.0,  { range: [0, 3] }),     // ripple amplitude multiplier (stacks with Ignition.distortAmt)
  asymmetry:   types.number(0.0,  { range: [0, 1] }),     // lumpy/non-spherical distortion on the flash itself
  blendWidth:  types.number(0.36, { range: [0.05, 0.8] }),// how gradually the flash fades — widen to soften the handoff
  coronaStart: types.number(0.80, { range: [0.3, 0.95] }),// ignition-pct where corona begins fading in
  igniteLock:  types.number(-1,   { range: [-1, 1] }),    // -1 = auto, 0-1 = freeze ignition progress at a fixed pct
  flashHue:    types.number(0.08, { range: [0, 1] }),     // hue tint applied to the flash sphere
  flashTint:   types.number(0.0,  { range: [0, 1] }),     // 0 = default near-white flash, 1 = fully tinted to flashHue
  bgTintAmount:types.number(1.0,  { range: [0, 3] }),     // multiplies the background's warm shift during ignition
});

let tVals = {
  speed: 1, nebulaBright: 1, nebulaWarm: 0, formLock: -1,
  collapseBright: 1, collapseWarm: 0, collapseLock: -1,
  igniteDuration: 4, flashIntensity: 1, distortAmt: 1, emergenceStart: 0.68, coreGlow: 1,
  sunHue: 0, coronaGlow: 1, coronaHueShift: 0, coronaFlareStrength: 1, coronaSpread: 1, sunSpinSpeed: 0,
  sunSizeMult: 1, sunRipple: 0,
  flashHue: 0.08, flashTint: 0, bgTintAmount: 1,
  cloudTurb: 1, cloudSpiral: 1, cloudCore: 1, cloudHotHue: 0.07, cloudSat: 1,
  cloudSpin: 1, cloudSpinCurve: 3, cloudScale: 1, coreHue: 0, cloudBallForm: 0, coreGlowSize: 1,
  galaxyCloudHue: 0.07, galaxyCloudSat: 1, galaxyCloudWarm: 0, galaxyCloudBright: 1,
  ballRadius: 1, ballFreq: 1, ballAmp: 1, ballAsym: 0, ballBlend: 0.36, ballCoronaStart: 0.80, igniteLock: -1,
};
playbackObj.onValuesChange(v  => { tVals.speed           = v.speed; });
nebulaObj.onValuesChange(v    => { tVals.nebulaBright = v.brightMult; tVals.nebulaWarm = v.warmBias; tVals.formLock = v.formLock; });
collapseObj.onValuesChange(v  => { tVals.collapseBright = v.brightMult; tVals.collapseWarm = v.warmBias; tVals.collapseLock = v.collapseLock; });
ignitionObj.onValuesChange(v  => { tVals.igniteDuration = v.duration; tVals.flashIntensity = v.flashIntensity; tVals.distortAmt = v.distortAmt; tVals.emergenceStart = v.emergenceStart; tVals.coreGlow = v.coreGlow; });
sunObj.onValuesChange(v       => { tVals.sunHue = v.hueMode; tVals.coronaGlow = v.coronaGlow; tVals.coronaHueShift = v.coronaHueShift; tVals.coronaFlareStrength = v.coronaFlareStrength; tVals.coronaSpread = v.coronaSpread; tVals.sunSpinSpeed = v.spinSpeed; tVals.sunSizeMult = v.sizeMult; tVals.sunRipple = v.ripple; });
galaxyCloudObj.onValuesChange(v => { tVals.galaxyCloudHue = v.hue; tVals.galaxyCloudSat = v.satMult; tVals.galaxyCloudWarm = v.warmBias; tVals.galaxyCloudBright = v.brightMult; });
cloudShapeObj.onValuesChange(v => { tVals.cloudTurb = v.turbulence; tVals.cloudSpiral = v.spiralTight; tVals.cloudCore = v.coreSize; tVals.cloudHotHue = v.hotHue; tVals.cloudSat = v.satMult; tVals.cloudSpin = v.spinSpeed; tVals.cloudSpinCurve = v.spinRampShape; tVals.cloudScale = v.cloudSize; tVals.coreHue = v.coreLightHue; tVals.cloudBallForm = v.ballForm; tVals.coreGlowSize = v.coreGlowSize; });
ballObj.onValuesChange(v      => { tVals.ballRadius = v.radius; tVals.ballFreq = v.distortFreq; tVals.ballAmp = v.distortAmp; tVals.ballAsym = v.asymmetry; tVals.ballBlend = v.blendWidth; tVals.ballCoronaStart = v.coronaStart; tVals.igniteLock = v.igniteLock; tVals.flashHue = v.flashHue; tVals.flashTint = v.flashTint; tVals.bgTintAmount = v.bgTintAmount; });

// ── Renderer ──────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000004, 1);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 2000);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clamp    = (v,a,b) => Math.max(a,Math.min(b,v));
const easeOut  = t => 1-Math.pow(1-t,3);
const easeIn   = t => t*t*t;
const slowForm = t => Math.pow(t, 2.4);
// Deterministic pseudo-random — same seed always gives the same value, so the
// emission-loop reseeding below plays out identically every run instead of
// drifting with wall-clock Math.random().
const detRand = seed => { const x = Math.sin(seed*127.1+311.7)*43758.5453; return x-Math.floor(x); };
// Seeded PRNG for one-time particle-geometry generation at module load — with a fixed
// seed, every reload builds the exact same nebula/spiral/collapse layout instead of a
// fresh random one, so the scene's look no longer depends on reload luck.
function mulberry32(seed){
  return function(){
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SCENE_SEED = 20260704;
const rand = mulberry32(SCENE_SEED);

// ── Spherical camera ──────────────────────────────────────────────────────────
const sph       = { r:380, theta:0.30, phi:0.46 };
const sphTarget = { r:380, theta:0.30, phi:0.46 };

function applyCamera(){
  camera.position.set(
    sph.r*Math.sin(sph.phi)*Math.sin(sph.theta),
    sph.r*Math.cos(sph.phi),
    sph.r*Math.sin(sph.phi)*Math.cos(sph.theta)
  );
  camera.lookAt(0,0,0);
}

// ── Clock HUD ─────────────────────────────────────────────────────────────────
const clockEl = document.createElement('div');
clockEl.style.cssText = [
  'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
  'font:15px/1 monospace', 'color:rgba(255,255,255,0.90)',
  'background:rgba(0,0,0,0.60)', 'backdrop-filter:blur(6px)',
  'padding:8px 18px', 'border-radius:20px',
  'border:1px solid rgba(255,255,255,0.15)',
  'cursor:grab', 'z-index:9999',
  'letter-spacing:0.04em', 'white-space:nowrap',
  'user-select:none'
].join(';');
document.body.appendChild(clockEl);

// Make clock draggable
{
  let dragging = false, ox = 0, oy = 0;
  clockEl.addEventListener('mousedown', e => {
    dragging = true;
    const r = clockEl.getBoundingClientRect();
    ox = e.clientX - r.left;
    oy = e.clientY - r.top;
    clockEl.style.transform = 'none';
    clockEl.style.cursor = 'grabbing';
    e.stopPropagation();
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    clockEl.style.left   = (e.clientX - ox) + 'px';
    clockEl.style.top    = (e.clientY - oy) + 'px';
    clockEl.style.bottom = 'auto';
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    clockEl.style.cursor = 'grab';
  });
}

// ── Live-controls status panel ────────────────────────────────────────────────
// Answers "which Theatre.js panel actually does something right now" — computed
// from real uniform/state values every frame, not guessed from a fixed time range,
// so it stays true even if a stage's timing or a control's wiring changes later.
// ── On-canvas transport (play/pause/reset) — no separate window needed ────────
const transportEl = document.createElement('div');
transportEl.style.cssText = [
  'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(calc(-50% - 160px))',
  'display:flex', 'gap:6px', 'z-index:9999',
].join(';');
const localPlayBtn = document.createElement('button');
const localResetBtn = document.createElement('button');
[localPlayBtn, localResetBtn].forEach(b => {
  b.style.cssText = [
    'font:13px monospace', 'padding:8px 12px', 'border-radius:8px',
    'background:rgba(0,0,0,0.65)', 'color:#fff', 'border:1px solid rgba(255,255,255,0.2)',
    'cursor:pointer',
  ].join(';');
});
localResetBtn.textContent = '⟲';
localResetBtn.title = 'Reset (R)';
localResetBtn.addEventListener('click', () => resetScene());
localPlayBtn.addEventListener('click', () => { paused = !paused; });
transportEl.appendChild(localPlayBtn); transportEl.appendChild(localResetBtn);
document.body.appendChild(transportEl);

// ── Live-controls status panel ────────────────────────────────────────────────
// Answers "which Theatre.js panel actually does something right now" — computed
// from real uniform/state values every frame, not guessed from a fixed time range,
// so it stays true even if a stage's timing or a control's wiring changes later.
// Each row's 🔁 loops playback within that group's own window — same loopGroupName
// state as the Controls popout, so toggling it here or there stays in sync.
const STATUS_ROWS = [
  { name:'Playback',      flag:'true',           text:()=>`0–90s      — always on` },
  { name:'Nebula',        flag:'fine',           text:f=>`~14–74s    — fine-spiral particles${f.fine?'':'  (inert now)'}` },
  { name:'Collapse',      flag:'cloud',          text:f=>`~12–74s    — cloud-puff warmBias only${f.cloud?'':'  (inert now)'}; brightMult ⚠ unwired` },
  { name:'CollapseCloud', flag:'collapseShape',  text:f=>`56–74s     — shape/color during collapse${f.collapseShape?'':'  (inert now)'}` },
  { name:'Ignition',      flag:'ignite',         text:f=>`74–${(74+tVals.igniteDuration).toFixed(1)}s  — flash + sun emergence${f.ignite?'':'  (inert now)'}` },
  { name:'ExplosionBall', flag:'ignite',         text:f=>`74–${(74+tVals.igniteDuration).toFixed(1)}s  — flash/sun ripple shape${f.ignite?'':'  (inert now)'}` },
  { name:'Sun',           flag:'sun',            text:f=>`74–90s     — hueMode + corona${f.sun?'':'  (inert now)'}` },
  { name:'Galaxy disc',   flag:'galaxy',         text:f=>`${(74+tVals.igniteDuration).toFixed(1)}–90s — disc formation${f.galaxy?'':'  (inert now)'}`, noLoop:true },
];

const statusEl = document.createElement('div');
statusEl.style.cssText = [
  'position:fixed', 'bottom:130px', 'left:50%', 'transform:translateX(-50%)',
  'font:12px/1.7 monospace', 'color:rgba(255,255,255,0.88)',
  'background:rgba(0,0,0,0.65)', 'backdrop-filter:blur(6px)',
  'padding:10px 16px', 'border-radius:10px',
  'border:1px solid rgba(255,255,255,0.15)',
  'cursor:grab', 'z-index:9999',
  'user-select:none'
].join(';');
document.body.appendChild(statusEl);
{
  let dragging = false, ox = 0, oy = 0;
  statusEl.addEventListener('mousedown', e => {
    if (e.target.tagName === 'BUTTON') return;
    dragging = true;
    const r = statusEl.getBoundingClientRect();
    ox = e.clientX - r.left; oy = e.clientY - r.top;
    statusEl.style.transform = 'none';
    statusEl.style.cursor = 'grabbing';
    e.stopPropagation();
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    statusEl.style.left   = (e.clientX - ox) + 'px';
    statusEl.style.top    = (e.clientY - oy) + 'px';
    statusEl.style.bottom = 'auto';
  });
  window.addEventListener('mouseup', () => { dragging = false; statusEl.style.cursor = 'grab'; });
}
const statusRowEls = STATUS_ROWS.map(row => {
  const rowEl = document.createElement('div');
  rowEl.style.cssText = 'display:flex;align-items:center;gap:6px;white-space:pre;';
  const dotEl = document.createElement('span');
  const nameEl = document.createElement('span');
  nameEl.style.cssText = 'display:inline-block;width:118px;';
  const textEl = document.createElement('span');
  rowEl.appendChild(dotEl); rowEl.appendChild(nameEl); rowEl.appendChild(textEl);
  if (!row.noLoop) {
    const loopBtn = document.createElement('button');
    loopBtn.textContent = '🔁';
    loopBtn.title = `Loop playback within ${row.name}'s own window`;
    loopBtn.style.cssText = 'margin-left:6px;font-size:10px;padding:0px 5px;border-radius:4px;background:rgba(255,255,255,0.08);color:#aaa;border:1px solid rgba(255,255,255,0.15);cursor:pointer;';
    loopBtn.addEventListener('click', () => {
      if (loopGroupName === row.name) {
        loopGroupName = null;
      } else {
        loopGroupName = row.name;
        customLoopRange = null;
        const g = CONTROL_GROUPS.find(cg => cg.name === row.name);
        if (g) T = g.window()[0];
      }
    });
    rowEl.appendChild(loopBtn);
    row._loopBtn = loopBtn;
  }
  row._dotEl = dotEl; row._nameEl = nameEl; row._textEl = textEl;
  statusEl.appendChild(rowEl);
  return row;
});
function updateStatusPanel(f){
  localPlayBtn.textContent = paused ? '▶' : '⏸';
  localPlayBtn.title = paused ? 'Play (Space)' : 'Pause (Space)';
  STATUS_ROWS.forEach(row => {
    const on = row.flag === 'true' ? true : f[row.flag];
    row._dotEl.textContent = on ? '●' : '○';
    row._nameEl.textContent = row.name;
    row._textEl.textContent = row.text(f);
    if (row._loopBtn) {
      const looping = loopGroupName === row.name;
      row._loopBtn.style.background = looping ? '#2a5a3a' : 'rgba(255,255,255,0.08)';
      row._loopBtn.style.color = looping ? '#9fe6b0' : '#aaa';
    }
  });
}

// ── Pop-out controls window ────────────────────────────────────────────────────
// Plain sliders bound straight to tVals (the same object Theatre.js writes into),
// grouped by scene stage, each labeled with the exact second-range it affects.
// Opens in a real separate browser window so it can live on a second monitor.
const CONTROL_GROUPS = [
  { name:'Playback', window: () => [0,90], range: () => `0–90s (always)`, props:[
    { key:'speed', label:'speed', min:0, max:4, step:0.01 },
  ]},
  { name:'Nebula', window: () => [14,74], range: () => `~14–74s (fine-spiral particles; fades fast once ignition starts)`, props:[
    { key:'nebulaBright', label:'brightMult', min:0, max:3, step:0.01 },
    { key:'nebulaWarm',   label:'warmBias',   min:0, max:1, step:0.01 },
    { key:'formLock',     label:'formLock',   min:-1, max:1, step:0.01 },
  ]},
  { name:'Collapse', window: () => [12,74], range: () => `~12–74s (cloud puffs — warmBias only; brightMult ⚠ unwired)`, props:[
    { key:'collapseBright', label:'brightMult ⚠', min:0, max:3, step:0.01 },
    { key:'collapseWarm',   label:'warmBias',      min:0, max:1, step:0.01 },
    { key:'collapseLock',   label:'collapseLock',  min:-1, max:1, step:0.01 },
  ]},
  { name:'CollapseCloud', window: () => [56,74], range: () => `56–74s`, props:[
    { key:'cloudTurb',   label:'turbulence',  min:0,   max:3, step:0.01 },
    { key:'cloudSpiral', label:'spiralTight', min:0.3, max:3, step:0.01 },
    { key:'cloudCore',   label:'coreSize',    min:0.2, max:3, step:0.01 },
    { key:'cloudHotHue', label:'hotHue',      min:0,   max:1, step:0.01 },
    { key:'cloudSat',    label:'satMult',     min:0,   max:2, step:0.01 },
    { key:'cloudSpin',   label:'spinSpeed',   min:0.2, max:25, step:0.05 },
    { key:'cloudSpinCurve', label:'spinRampShape', min:1, max:6, step:0.05 },
    { key:'cloudScale',  label:'cloudSize',   min:0.0005, max:3, step:0.001, log:true },
    { key:'coreHue',     label:'coreLightHue',min:0,   max:1, step:0.01 },
    { key:'cloudBallForm', label:'ballForm',  min:0,   max:3, step:0.02 },
    { key:'coreGlowSize',  label:'coreGlowSize', min:0.01, max:3, step:0.01, log:true },
  ]},
  { name:'Ignition', window: () => [74, 74+tVals.igniteDuration], range: () => `74–${(74+tVals.igniteDuration).toFixed(1)}s`, props:[
    { key:'igniteDuration', label:'duration',       min:1, max:30,   step:0.1 },
    { key:'flashIntensity', label:'flashIntensity', min:0, max:3,    step:0.01 },
    { key:'distortAmt',     label:'distortAmt',     min:0, max:3,    step:0.01 },
    { key:'emergenceStart', label:'emergenceStart', min:0, max:0.99, step:0.01 },
    { key:'coreGlow',       label:'coreGlow',       min:0, max:4,    step:0.01 },
  ]},
  { name:'ExplosionBall', window: () => [74, 74+tVals.igniteDuration], range: () => `74–${(74+tVals.igniteDuration).toFixed(1)}s (same window as Ignition)`, props:[
    { key:'ballRadius',      label:'radius',      min:0.3,  max:3,    step:0.01 },
    { key:'ballFreq',        label:'distortFreq', min:0.2,  max:4,    step:0.01 },
    { key:'ballAmp',         label:'distortAmp',  min:0,    max:3,    step:0.01 },
    { key:'ballAsym',        label:'asymmetry',   min:0,    max:1,    step:0.01 },
    { key:'ballBlend',       label:'blendWidth',  min:0.05, max:0.8,  step:0.01 },
    { key:'ballCoronaStart', label:'coronaStart', min:0.3,  max:0.95, step:0.01 },
    { key:'igniteLock',      label:'igniteLock',  min:-1,   max:1,    step:0.01 },
    { key:'flashHue',        label:'flashHue',    min:0,    max:1,    step:0.01 },
    { key:'flashTint',       label:'flashTint',   min:0,    max:1,    step:0.01 },
    { key:'bgTintAmount',    label:'bgTintAmount',min:0,    max:3,    step:0.01 },
  ]},
  { name:'Sun', window: () => [74,90], range: () => `74–90s (post-ignition)`, props:[
    { key:'sunHue',             label:'hueMode',           min:0, max:5, step:0.01 },
    { key:'coronaGlow',         label:'coronaGlow',        min:0, max:3, step:0.01 },
    { key:'coronaHueShift',     label:'coronaHueShift',    min:0, max:1, step:0.01 },
    { key:'coronaFlareStrength',label:'coronaFlareStrength',min:0, max:3, step:0.01 },
    { key:'coronaSpread',       label:'coronaSpread',      min:0.2, max:3, step:0.01 },
    { key:'sunSpinSpeed',       label:'spinSpeed',         min:-15, max:15, step:0.05 },
    { key:'sunSizeMult',        label:'size',              min:0.01, max:6, step:0.01, log:true },
    { key:'sunRipple',          label:'ripple',            min:0,   max:3, step:0.01 },
  ]},
  // The collapse cloud's own color controls (CollapseCloud group) only keyframe
  // within 56-74s — past that their last value just freezes and keeps silently
  // driving the same shared particle materials. This group takes over driving
  // those same materials once ignition completes, so the cloud's color/warmth/
  // brightness can be keyframed all the way through the galaxy phase — e.g. to
  // gradually blend it toward the sun's own color instead of staying frozen.
  { name:'GalaxyCloud', window: () => [74+tVals.igniteDuration, 90], range: () => `${(74+tVals.igniteDuration).toFixed(1)}–90s (post-ignition cloud color)`, props:[
    { key:'galaxyCloudHue',    label:'hue',        min:0, max:1, step:0.01 },
    { key:'galaxyCloudSat',    label:'satMult',    min:0, max:2, step:0.01 },
    { key:'galaxyCloudWarm',   label:'warmBias',   min:0, max:1, step:0.01 },
    { key:'galaxyCloudBright', label:'brightMult', min:0, max:3, step:0.01 },
  ]},
];

// ── Per-property keyframe sequencers ───────────────────────────────────────────
// Each control-group property can be keyframed on its own local timeline (that
// group's own active window mapped to 0–1) — a home-grown stand-in for Theatre.js
// sequencing, scoped per group so a 56–74s window isn't a sliver of one shared
// global timeline. Persisted to localStorage so keyframes survive reloads.
const SEQ_STORAGE_KEY = 'originSceneSequencers_v1';
let seqData = {};
try { seqData = JSON.parse(localStorage.getItem(SEQ_STORAGE_KEY)) || {}; } catch(e) { seqData = {}; }
function saveSeqData(){
  try { localStorage.setItem(SEQ_STORAGE_KEY, JSON.stringify(seqData)); } catch(e) {}
}

// Per-property "default" values — separate from keyframes. Each group gets a
// Reset button (snap every prop in that group back to its stored default) and
// a Set button (capture the current values as the new default going forward).
// Defaults start out equal to the code's built-in tVals values and persist once changed.
const DEFAULTS_STORAGE_KEY = 'originSceneParamDefaults_v1';
let paramDefaults = {};
try { paramDefaults = JSON.parse(localStorage.getItem(DEFAULTS_STORAGE_KEY)) || {}; } catch(e) { paramDefaults = {}; }
function saveParamDefaults(){
  try { localStorage.setItem(DEFAULTS_STORAGE_KEY, JSON.stringify(paramDefaults)); } catch(e) {}
}
function getKeyframes(groupName, key){
  if (!seqData[groupName]) seqData[groupName] = {};
  if (!seqData[groupName][key]) seqData[groupName][key] = [];
  return seqData[groupName][key];
}
// Easing shapes a segment's 0-1 progress before it's used to blend two keyframe
// values — "linear" is a flat rate of change, the others accelerate/decelerate.
// Stored per-keyframe as the curve used for the segment going OUT of it; missing
// or unrecognized values fall back to linear, so every keyframe saved before this
// feature existed keeps behaving exactly as it did.
// Each non-linear shape takes a "strength" exponent — 3 matches the original
// fixed cubic curve, so every keyframe saved before this existed looks identical.
// Lower = closer to linear, higher = a sharper hook (holds flat, then rockets).
const DEFAULT_EASE_STRENGTH = 3;
const EASE_FNS = {
  linear:    (t) => t,
  easeIn:    (t,k) => Math.pow(t, k),
  easeOut:   (t,k) => 1-Math.pow(1-t, k),
  easeInOut: (t,k) => t<0.5 ? 0.5*Math.pow(2*t, k) : 1-0.5*Math.pow(2-2*t, k),
};
const EASE_ORDER = ['linear','easeIn','easeOut','easeInOut'];
const EASE_LABEL = { linear:'', easeIn:'in', easeOut:'out', easeInOut:'in-out' };

function evalKeyframes(kfs, t){
  if (kfs.length === 0) return null;
  if (kfs.length === 1) return kfs[0].v;
  if (t <= kfs[0].t) return kfs[0].v;
  if (t >= kfs[kfs.length-1].t) return kfs[kfs.length-1].v;
  for (let i=0;i<kfs.length-1;i++){
    if (t >= kfs[i].t && t <= kfs[i+1].t){
      const span = kfs[i+1].t - kfs[i].t;
      const lt = span<=0 ? 0 : (t-kfs[i].t)/span;
      const ease = EASE_FNS[kfs[i].curve] || EASE_FNS.linear;
      const strength = kfs[i].strength || DEFAULT_EASE_STRENGTH;
      return kfs[i].v + (kfs[i+1].v - kfs[i].v)*ease(lt, strength);
    }
  }
  return kfs[kfs.length-1].v;
}
function applySequencers(){
  CONTROL_GROUPS.forEach(group => {
    const [start,end] = group.window();
    const span = end-start;
    const localT = span<=0 ? 0 : clamp((T-start)/span, 0, 1);
    group.props.forEach(p => {
      const kfs = getKeyframes(group.name, p.key);
      if (kfs.length >= 1) tVals[p.key] = evalKeyframes(kfs, localT);
    });
  });
}

const PANEL_FONT = "'JetBrains Mono','SF Mono',Consolas,monospace";
const panelStyleTag = document.createElement('style');
panelStyleTag.textContent = `
  .osc-panel input[type=range] { accent-color: #5cf; height:4px; }
  .osc-panel input[type=range]:hover { accent-color: #7de; }
  .osc-panel * { box-sizing: border-box; }
`;
document.head.appendChild(panelStyleTag);

const panelEl = document.createElement('div');
panelEl.className = 'osc-panel';
panelEl.style.cssText = `display:none;font:12px/1.4 ${PANEL_FONT};color:#e4e4ea;background:#0d0d13;padding:0;`;

const panelHeader = document.createElement('div');
panelHeader.style.cssText = `padding:12px 14px;border-bottom:1px solid #23232e;background:#111118;`;
const panelTitleRow = document.createElement('div');
panelTitleRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
panelTitleRow.innerHTML = `<div style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#8fd6ff;">ORIGIN SCENE — SEQUENCER</div>`;
const transportRow = document.createElement('div');
transportRow.style.cssText = 'display:flex;gap:6px;';
const playBtn = document.createElement('button');
const resetBtn = document.createElement('button');
const collapseAllBtn = document.createElement('button');
[playBtn, resetBtn, collapseAllBtn].forEach(b => {
  b.style.cssText = 'font:11px monospace;padding:4px 10px;border-radius:5px;background:#1c1c26;color:#cfe6ff;border:1px solid #33333f;cursor:pointer;';
});
resetBtn.textContent = '⟲ Reset';
resetBtn.addEventListener('click', () => resetScene());
playBtn.addEventListener('click', () => { paused = !paused; });
let allCollapsed = false;
collapseAllBtn.textContent = '▾ Collapse All';
collapseAllBtn.addEventListener('click', () => {
  allCollapsed = !allCollapsed;
  collapsibleGroups.forEach(({ groupBody, collapseBtn }) => {
    groupBody.style.display = allCollapsed ? 'none' : '';
    collapseBtn.textContent = allCollapsed ? '▸' : '▾';
  });
  collapseAllBtn.textContent = allCollapsed ? '▸ Expand All' : '▾ Collapse All';
});
const exportBtn = document.createElement('button');
exportBtn.textContent = '📋 Export Values';
exportBtn.style.cssText = 'font:11px monospace;padding:4px 10px;border-radius:5px;background:#1c1c26;color:#cfe6ff;border:1px solid #33333f;cursor:pointer;';
transportRow.appendChild(playBtn); transportRow.appendChild(resetBtn); transportRow.appendChild(collapseAllBtn); transportRow.appendChild(exportBtn);
panelTitleRow.appendChild(transportRow);
panelHeader.appendChild(panelTitleRow);

// Custom loop range — pick any arbitrary section to loop, independent of any
// single group's window (e.g. a transition that spans two groups). Mutually
// exclusive with the per-group 🔁 buttons — whichever was set most recently wins.
const loopRangeRow = document.createElement('div');
loopRangeRow.style.cssText = 'display:flex;align-items:center;gap:5px;margin-top:8px;';
const loopRangeLabel = document.createElement('span');
loopRangeLabel.textContent = 'Loop section:';
loopRangeLabel.style.cssText = 'font-size:11px;color:#8a8a9a;';
const loopStartInput = document.createElement('input');
const loopEndInput = document.createElement('input');
[loopStartInput, loopEndInput].forEach(inp => {
  inp.type = 'number'; inp.min = 0; inp.max = 90; inp.step = 0.1;
  inp.style.cssText = 'width:56px;font:11px monospace;background:#1c1c26;color:#cfe6ff;border:1px solid #33333f;border-radius:4px;padding:2px 4px;';
});
loopStartInput.value = '0'; loopEndInput.value = '90';
let loopRangeInputFocused = false;
[loopStartInput, loopEndInput].forEach(inp => {
  inp.addEventListener('focus', () => { loopRangeInputFocused = true; });
  inp.addEventListener('blur', () => { loopRangeInputFocused = false; });
});
const loopRangeToTxt = document.createElement('span');
loopRangeToTxt.textContent = 'to'; loopRangeToTxt.style.cssText = 'font-size:11px;color:#8a8a9a;';
const loopRangeToggleBtn = document.createElement('button');
loopRangeToggleBtn.textContent = '🔁 Off';
loopRangeToggleBtn.style.cssText = 'font:11px monospace;padding:3px 10px;border-radius:5px;background:#1c1c26;color:#cfe6ff;border:1px solid #33333f;cursor:pointer;';
loopRangeToggleBtn.addEventListener('click', () => {
  if (customLoopRange) {
    customLoopRange = null;
  } else {
    const s = parseFloat(loopStartInput.value) || 0;
    const e = parseFloat(loopEndInput.value) || 90;
    customLoopRange = [Math.min(s,e), Math.max(s,e)];
    loopGroupName = null;
    T = customLoopRange[0];
  }
});
loopRangeRow.appendChild(loopRangeLabel);
loopRangeRow.appendChild(loopStartInput);
loopRangeRow.appendChild(loopRangeToTxt);
loopRangeRow.appendChild(loopEndInput);
loopRangeRow.appendChild(loopRangeToggleBtn);
panelHeader.appendChild(loopRangeRow);

// Export current values — nothing about a live (non-keyframed) slider position
// is saved anywhere, so if a combination looks right, this is the only way to
// capture it before a reload (or anything else) resets it back to defaults.
const exportArea = document.createElement('textarea');
exportArea.readOnly = true;
exportArea.style.cssText = 'display:none;width:100%;height:200px;margin-top:8px;font:10px monospace;background:#0a0a10;color:#9fe6b0;border:1px solid #33333f;border-radius:4px;padding:6px;white-space:pre;box-sizing:border-box;';
exportBtn.addEventListener('click', () => {
  exportArea.value = JSON.stringify(tVals, null, 2);
  exportArea.style.display = 'block';
  exportArea.focus();
  exportArea.select();
});
panelHeader.appendChild(exportArea);

const panelHint = document.createElement('div');
panelHint.style.cssText = 'font-size:10px;color:#5a5a68;margin-top:6px;';
panelHint.textContent = 'click strip: add keyframe at that time/value · drag diamond: move in time + value · right-click: delete · shift+click: cycle ease curve · scroll over diamond: adjust ease strength';
panelHeader.appendChild(panelHint);
panelEl.appendChild(panelHeader);

const panelBody = document.createElement('div');
panelBody.style.cssText = 'padding:12px;';
panelEl.appendChild(panelBody);

const groupEls = []; // { dotEl, rangeEl, group, inputs:[{el,numEl,key}] }
const seqStrips = []; // { canvas, groupName, key, window: ()=>[start,end] }

// Canvas is drawn at native device-pixel resolution (not a fixed 260px) so text
// and ticks stay sharp at any popup/panel width and on HiDPI screens — a canvas
// stretched via CSS alone blurs badly, which was the "fuzzy numbers" complaint.
function syncCanvasRes(canvas){
  const dpr = window.devicePixelRatio || 1;
  const cssW = Math.max(1, canvas.clientWidth || 260);
  const cssH = Math.max(1, canvas.clientHeight || 32);
  const needW = Math.round(cssW*dpr), needH = Math.round(cssH*dpr);
  if (canvas.width !== needW || canvas.height !== needH) {
    canvas.width = needW; canvas.height = needH;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: cssW, h: cssH };
}

const collapsibleGroups = []; // { groupBody, collapseBtn } — for the panel-wide Collapse All toggle
CONTROL_GROUPS.forEach(group => {
  const box = document.createElement('div');
  box.style.cssText = 'margin-bottom:12px;padding:10px 12px;border:1px solid #26262f;border-left:3px solid #3a7ca8;border-radius:6px;background:#16161f;box-shadow:0 1px 3px rgba(0,0,0,0.3);';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;';
  const dotEl = document.createElement('span');
  dotEl.textContent = '○';
  dotEl.style.cssText = 'margin-right:7px;font-size:11px;';
  const title = document.createElement('span');
  title.style.cssText = 'font-weight:700;color:#bfe6ff;letter-spacing:.06em;font-size:12px;text-transform:uppercase;';
  title.textContent = group.name;
  const rangeEl = document.createElement('span');
  rangeEl.style.cssText = 'color:#7a7a8a;font-size:10px;';
  // Capture each prop's code default the first time it's ever seen — later
  // overwritten only by an explicit "Set" click, and persisted from then on.
  group.props.forEach(p => {
    if (!(p.key in paramDefaults)) paramDefaults[p.key] = tVals[p.key];
  });
  const groupPlayBtn = document.createElement('button');
  groupPlayBtn.style.cssText = 'margin-left:8px;font-size:10px;padding:1px 6px;border-radius:4px;background:#1c1c26;color:#cfe6ff;border:1px solid #33333f;cursor:pointer;';
  groupPlayBtn.addEventListener('click', () => { paused = !paused; });
  const loopBtn = document.createElement('button');
  loopBtn.textContent = '🔁';
  loopBtn.title = `Loop playback within ${group.name}'s own window`;
  loopBtn.style.cssText = 'margin-left:4px;font-size:10px;padding:1px 6px;border-radius:4px;background:#1c1c26;color:#7a7a8a;border:1px solid #33333f;cursor:pointer;';
  loopBtn.addEventListener('click', () => {
    if (loopGroupName === group.name) {
      loopGroupName = null;
    } else {
      loopGroupName = group.name;
      customLoopRange = null;
      const [ls] = group.window();
      T = ls;
    }
  });
  const resetDefaultsBtn = document.createElement('button');
  resetDefaultsBtn.textContent = '⟲';
  resetDefaultsBtn.title = `Reset all ${group.name} sliders to their stored default`;
  resetDefaultsBtn.style.cssText = 'margin-left:4px;font-size:10px;padding:1px 6px;border-radius:4px;background:#1c1c26;color:#cfa65c;border:1px solid #33333f;cursor:pointer;';
  resetDefaultsBtn.addEventListener('click', () => {
    group.props.forEach(p => { tVals[p.key] = paramDefaults[p.key]; });
  });
  const setDefaultsBtn = document.createElement('button');
  setDefaultsBtn.textContent = '💾';
  setDefaultsBtn.title = `Save ${group.name}'s current values as the new default`;
  setDefaultsBtn.style.cssText = 'margin-left:4px;font-size:10px;padding:1px 6px;border-radius:4px;background:#1c1c26;color:#8fd6ff;border:1px solid #33333f;cursor:pointer;';
  setDefaultsBtn.addEventListener('click', () => {
    group.props.forEach(p => { paramDefaults[p.key] = tVals[p.key]; });
    saveParamDefaults();
    setDefaultsBtn.style.background = '#2a5a3a';
    setTimeout(() => { setDefaultsBtn.style.background = '#1c1c26'; }, 300);
  });
  const collapseBtn = document.createElement('button');
  collapseBtn.textContent = '▾';
  collapseBtn.title = `Collapse ${group.name} down to just its name`;
  collapseBtn.style.cssText = 'margin-left:4px;font-size:10px;padding:1px 6px;border-radius:4px;background:#1c1c26;color:#7a7a8a;border:1px solid #33333f;cursor:pointer;';
  const left = document.createElement('span');
  left.appendChild(dotEl); left.appendChild(title); left.appendChild(groupPlayBtn);
  left.appendChild(loopBtn); left.appendChild(resetDefaultsBtn); left.appendChild(setDefaultsBtn); left.appendChild(collapseBtn);
  head.appendChild(left); head.appendChild(rangeEl);
  box.appendChild(head);
  const groupBody = document.createElement('div');
  box.appendChild(groupBody);
  collapseBtn.addEventListener('click', () => {
    const collapsed = groupBody.style.display === 'none';
    groupBody.style.display = collapsed ? '' : 'none';
    collapseBtn.textContent = collapsed ? '▾' : '▸';
  });
  collapsibleGroups.push({ groupBody, collapseBtn });
  const inputs = [];
  group.props.forEach(p => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin:4px 0;';
    const lab = document.createElement('span');
    lab.textContent = p.label; lab.style.cssText = 'width:112px;color:#c8c8d4;font-size:11px;flex-shrink:0;';
    const input = document.createElement('input');
    input.type = 'range'; input.min = p.min; input.max = p.max; input.step = p.step;
    input.value = tVals[p.key]; input.style.cssText = 'flex:1;';
    const num = document.createElement('span');
    num.style.cssText = 'width:50px;text-align:right;color:#8fd6ff;font-variant-numeric:tabular-nums;font-size:11px;';
    num.textContent = Number(tVals[p.key]).toFixed(2);
    let held = false; // tracked locally — never touch controlsWin.document (cross-window
                       // access can throw SecurityError depending on browser COOP policy)
    input.addEventListener('mousedown', () => {
      held = true;
      // Same cross-window issue as the keyframe drag below: if this slider lives
      // in the popped-out Controls window, a listener on this script's original
      // `window` would never see the mouseup that happens over that window.
      const releaseDoc = input.ownerDocument;
      function onRelease(){ held = false; releaseDoc.removeEventListener('mouseup', onRelease); }
      releaseDoc.addEventListener('mouseup', onRelease);
    });
    input.addEventListener('input', () => {
      tVals[p.key] = parseFloat(input.value);
      num.textContent = tVals[p.key].toFixed(2);
    });
    row.appendChild(lab); row.appendChild(input); row.appendChild(num);
    groupBody.appendChild(row);

    // Keyframe strip — click empty space to add/update a keyframe at that time
    // using the slider's current value, drag a diamond to retime it, right-click
    // a diamond to delete it. The blue line is the live playhead within this
    // group's own local window. The top ruler shows real scene-seconds (major
    // ticks) subdivided into tenths (minor ticks) for millisecond-level placement.
    const stripWrap = document.createElement('div');
    stripWrap.style.cssText = 'margin:0 0 2px 120px;';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:96px;background:#0a0a10;border:1px solid #262632;border-radius:4px;cursor:crosshair;display:block;user-select:none;-webkit-user-drag:none;touch-action:none;';
    canvas.draggable = false;
    stripWrap.appendChild(canvas);
    groupBody.appendChild(stripWrap);
    const readout = document.createElement('div');
    readout.style.cssText = 'margin:0 0 6px 120px;color:#8fd6ff;font-size:10px;height:12px;font-variant-numeric:tabular-nums;';
    groupBody.appendChild(readout);

    const timeAt = (xCss, wCss) => {
      const [start,end] = group.window();
      const t = Math.max(0, Math.min(1, xCss/wCss));
      return start + t*(end-start);
    };
    // Value axis: top of the track = p.max, bottom = p.min — so a keyframe's
    // vertical position on the strip directly shows its value, same range as its
    // slider. Dragging a diamond moves it in time (x) AND value (y) at once.
    // A handful of properties (e.g. cloudSize) span a huge min-to-max ratio so
    // a value can be shrunk toward ~0. On a linear scale, everything below a
    // small fraction of max gets squeezed into a few pixels at the bottom of
    // the track — technically reachable, but impossible to actually aim for
    // with a mouse. Logarithmic properties spread that low range out instead.
    const logMin = p.log ? Math.log(p.min) : 0, logMax = p.log ? Math.log(p.max) : 0;
    const valueAt = (yCss, hCss) => {
      const f = Math.max(0, Math.min(1, yCss/hCss));
      if (p.log) return Math.exp(logMax - f*(logMax-logMin));
      return p.max - f*(p.max-p.min);
    };
    const yForValue = (v, hCss) => {
      let f;
      if (p.log) f = (Math.log(Math.max(v,p.min))-logMin)/((logMax-logMin) || 1);
      else f = (v-p.min)/(p.max-p.min || 1);
      return Math.max(0, Math.min(1, 1-f)) * hCss;
    };
    const fmtVal = v => (Math.abs(v) < 0.1 ? v.toFixed(4) : v.toFixed(2));
    let dragIdx = -1;
    let dragStartX = 0, dragStartY = 0, dragMoved = false, dragShiftHeld = false;
    const hitTest = (xCss, yCss, wCss, hCss) => {
      const kfs = getKeyframes(group.name, p.key);
      for (let i=0;i<kfs.length;i++){
        const dx = kfs[i].t*wCss - xCss, dy = yForValue(kfs[i].v, hCss) - yCss;
        if (Math.sqrt(dx*dx+dy*dy) < 11) return i;
      }
      return -1;
    };
    canvas.addEventListener('mousedown', e => {
      e.preventDefault(); // stop native drag-ghost/text-select from hijacking the gesture
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX-rect.left, y = e.clientY-rect.top, wCss = rect.width, hCss = rect.height;
      const idx = hitTest(x, y, wCss, hCss);
      if (idx >= 0) {
        dragIdx = idx;
        dragShiftHeld = e.shiftKey;
      } else {
        const kfs = getKeyframes(group.name, p.key);
        const t = Math.max(0, Math.min(1, x/wCss));
        const v = valueAt(y, hCss);
        const kf = { t, v, curve: 'linear' };
        kfs.push(kf);
        kfs.sort((a,b) => a.t - b.t);
        dragIdx = kfs.indexOf(kf);
        dragShiftHeld = false;
        saveSeqData();
      }
      dragStartX = x; dragStartY = y; dragMoved = false;

      // The Controls panel can live in a popped-out window, which is a genuinely
      // separate `Window` object — mouse events over its canvas never reach a
      // listener registered on this script's original global `window`. Attach
      // the drag tracking to whichever window/document actually owns the canvas
      // right now, and tear it down when the drag ends instead of leaving it live.
      const dragDoc = canvas.ownerDocument;
      function onDragMove(ev){
        const r = canvas.getBoundingClientRect();
        const xx = ev.clientX-r.left, yy = ev.clientY-r.top, ww = r.width, hh = r.height;
        if (Math.abs(xx-dragStartX) > 2 || Math.abs(yy-dragStartY) > 2) dragMoved = true;
        const tt = Math.max(0, Math.min(1, xx/ww));
        const vv = valueAt(yy, hh);
        const kfs2 = getKeyframes(group.name, p.key);
        if (kfs2[dragIdx]) { kfs2[dragIdx].t = tt; kfs2[dragIdx].v = vv; }
        readout.textContent = `t = ${timeAt(xx, ww).toFixed(3)}s   v = ${fmtVal(vv)}`;
      }
      function onDragUp(){
        const kfs2 = getKeyframes(group.name, p.key);
        if (!dragMoved && dragShiftHeld && kfs2[dragIdx]) {
          // A real click (no drag) with shift held — cycle the ease curve instead.
          const cur = kfs2[dragIdx].curve || 'linear';
          const next = EASE_ORDER[(EASE_ORDER.indexOf(cur)+1) % EASE_ORDER.length];
          kfs2[dragIdx].curve = next;
          readout.textContent = `curve → ${next}`;
        }
        kfs2.sort((a,b) => a.t - b.t);
        dragIdx = -1;
        saveSeqData();
        dragDoc.removeEventListener('mousemove', onDragMove);
        dragDoc.removeEventListener('mouseup', onDragUp);
      }
      dragDoc.addEventListener('mousemove', onDragMove);
      dragDoc.addEventListener('mouseup', onDragUp);
    });
    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX-rect.left, y = e.clientY-rect.top;
      readout.textContent = `t = ${timeAt(x, rect.width).toFixed(3)}s   v = ${fmtVal(valueAt(y, rect.height))}`;
    });
    canvas.addEventListener('mouseleave', () => { if (dragIdx < 0) readout.textContent = ''; });
    canvas.addEventListener('contextmenu', e => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const idx = hitTest(e.clientX-rect.left, e.clientY-rect.top, rect.width, rect.height);
      if (idx >= 0) {
        getKeyframes(group.name, p.key).splice(idx, 1);
        saveSeqData();
      }
    });
    // Scroll wheel over a keyframe adjusts its ease strength — how sharply that
    // segment's curve bends, not just which shape it uses (shift+click for that).
    canvas.addEventListener('wheel', e => {
      const rect = canvas.getBoundingClientRect();
      const idx = hitTest(e.clientX-rect.left, e.clientY-rect.top, rect.width, rect.height);
      if (idx < 0) return;
      e.preventDefault();
      const kfs = getKeyframes(group.name, p.key);
      const kf = kfs[idx];
      const cur = kf.strength || DEFAULT_EASE_STRENGTH;
      kf.strength = Math.max(1, Math.min(8, cur + (e.deltaY < 0 ? 1 : -1)));
      saveSeqData();
      readout.textContent = `${kf.curve||'linear'} strength: ${kf.strength}`;
    }, { passive:false });
    seqStrips.push({ canvas, groupName: group.name, key: p.key, yForValue });
    inputs.push({ el: input, numEl: num, key: p.key, isHeld: () => held });
  });
  panelBody.appendChild(box);
  groupEls.push({ dotEl, rangeEl, group, inputs, loopBtn, groupPlayBtn });
});
document.body.appendChild(panelEl);

let controlsWin = null;
const controlsBtn = document.createElement('button');
controlsBtn.textContent = 'Controls ↗';
controlsBtn.style.cssText = [
  'position:fixed', 'bottom:80px', 'right:20px',
  'font:13px monospace', 'padding:8px 14px', 'border-radius:8px',
  'background:rgba(0,0,0,0.65)', 'color:#fff', 'border:1px solid rgba(255,255,255,0.2)',
  'cursor:pointer', 'z-index:9999',
].join(';');
function showPanelInline(){
  // Fallback when a real popup window isn't usable (browser COOP isolation can
  // block cross-window document access even for same-origin popups) — dock the
  // panel as a floating, scrollable box in the main page instead.
  controlsWin = null;
  panelEl.style.cssText = `display:block;position:fixed;top:20px;right:20px;width:360px;max-height:85vh;overflow:auto;font:12px/1.4 ${PANEL_FONT};color:#e4e4ea;background:#0d0d13;border:1px solid #262632;border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,0.5);z-index:9998;`;
  document.body.appendChild(panelEl);
}
controlsBtn.addEventListener('click', () => {
  if (controlsWin && !controlsWin.closed) { controlsWin.focus(); return; }
  if (panelEl.parentElement === document.body && panelEl.style.display === 'block') {
    // already docked inline from a previous fallback — nothing more to do
    return;
  }
  try {
    const win = window.open('', 'OriginControls', 'width=420,height=920');
    if (!win) throw new Error('popup blocked');
    win.document.title = 'Origin Scene — Controls';
    win.document.body.style.margin = '0';
    win.document.body.style.background = '#0b0b10';
    panelEl.style.cssText = `display:block;font:12px/1.4 ${PANEL_FONT};color:#e4e4ea;background:#0d0d13;`;
    win.document.body.appendChild(panelEl);
    win.addEventListener('beforeunload', () => {
      document.body.appendChild(panelEl);
      panelEl.style.display = 'none';
      controlsWin = null;
    });
    controlsWin = win;
  } catch (e) {
    console.warn('Popup controls window unavailable, docking inline instead:', e);
    showPanelInline();
  }
});
document.body.appendChild(controlsBtn);

// Picks a "nice" major-tick interval (in seconds) so a strip shows roughly 4-10
// labeled ticks regardless of whether its window is 4s (Ignition) or 90s (Playback).
function niceTickStep(span){
  const candidates = [0.05,0.1,0.2,0.25,0.5,1,2,5,10,15,30,60];
  for (const c of candidates) if (span/c <= 10) return c;
  return 60;
}

// Snaps a coordinate to a half-pixel so a 1px-wide canvas stroke lands exactly on
// one physical pixel row/column instead of straddling two and anti-aliasing into
// a soft 2px smudge — the actual remaining source of "blur" once DPI is correct.
const snap = v => Math.round(v) + 0.5;

function drawSeqStrips(){
  const RULER_H = 14;
  seqStrips.forEach(({ canvas, groupName, key, yForValue }) => {
    const { ctx, w, h } = syncCanvasRes(canvas);
    const trackY = RULER_H + 2, trackH = h - trackY;
    ctx.clearRect(0,0,w,h);
    ctx.textBaseline = 'alphabetic';

    const group = CONTROL_GROUPS.find(g => g.name === groupName);
    const [start,end] = group.window();
    const span = Math.max(0.001, end-start);

    // Ruler: major ticks every niceTickStep seconds (labeled), minor ticks at
    // tenths of that step (unlabeled) for sub-second/millisecond placement.
    const step = niceTickStep(span);
    const minorStep = step/10;
    const totalMinor = Math.ceil(span/minorStep);
    ctx.font = `10px ${PANEL_FONT}`; ctx.textAlign = 'left';
    ctx.lineWidth = 1;
    for (let i=0;i<=totalMinor;i++){
      const s = i*minorStep;
      if (s > span+1e-6) break;
      const xRaw = (s/span)*w;
      const x = snap(xRaw);
      const isMajor = (i%10 === 0);
      ctx.strokeStyle = isMajor ? '#6b7690' : '#25252f';
      ctx.beginPath();
      ctx.moveTo(x, isMajor ? 0 : Math.round(RULER_H*0.45));
      ctx.lineTo(x, RULER_H);
      ctx.stroke();
      if (isMajor) {
        ctx.fillStyle = '#9db3d6';
        ctx.fillText((start+s).toFixed(step<1?2:0), Math.round(xRaw)+3, 10);
      }
    }
    ctx.strokeStyle = '#3a3a48';
    ctx.beginPath(); ctx.moveTo(0,snap(RULER_H)); ctx.lineTo(w,snap(RULER_H)); ctx.stroke();

    // Playhead — a thin line plus a small cap at the top, like a pro NLE cursor
    const localT = clamp((T-start)/span, 0, 1);
    const pxRaw = localT*w, px = snap(pxRaw);
    ctx.strokeStyle = '#5cf';
    ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,h); ctx.stroke();
    ctx.fillStyle = '#5cf';
    ctx.beginPath(); ctx.moveTo(Math.round(pxRaw)-3,0); ctx.lineTo(Math.round(pxRaw)+3,0); ctx.lineTo(Math.round(pxRaw),4); ctx.closePath(); ctx.fill();

    const kfs = getKeyframes(groupName, key);

    // Connecting curve — samples the actual eased shape between each pair of
    // keyframes, so you can see whether a segment is linear or accelerating/
    // decelerating, not just where the keyframes sit in time.
    if (kfs.length >= 2) {
      ctx.strokeStyle = '#5a7aa0'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i=0;i<kfs.length-1;i++){
        const a = kfs[i], b = kfs[i+1];
        const ease = EASE_FNS[a.curve] || EASE_FNS.linear;
        const strength = a.strength || DEFAULT_EASE_STRENGTH;
        const STEPS = 16;
        for (let s=0;s<=STEPS;s++){
          const lt = s/STEPS;
          const vVal = a.v + (b.v-a.v)*ease(lt, strength);
          const xPx = (a.t + (b.t-a.t)*lt)*w, yPx = yForValue(vVal, h);
          if (i===0 && s===0) ctx.moveTo(xPx,yPx); else ctx.lineTo(xPx,yPx);
        }
      }
      ctx.stroke();
    }

    // Keyframes — diamond positioned by both time (x) and value (y), filled with
    // a dark outline so it reads clearly against the track and ruler. A small
    // label shows the ease curve going OUT of this keyframe (shift+click to cycle).
    kfs.forEach(k => {
      const x = Math.round(k.t*w), cy = Math.round(yForValue(k.v, h)), r = 6;
      ctx.beginPath();
      ctx.moveTo(x,cy-r); ctx.lineTo(x+r,cy); ctx.lineTo(x,cy+r); ctx.lineTo(x-r,cy);
      ctx.closePath();
      ctx.fillStyle = '#ffc85c'; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = '#3a2a08'; ctx.stroke();
      const label = EASE_LABEL[k.curve];
      if (label) {
        ctx.font = `8px ${PANEL_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#9fe6b0';
        ctx.fillText(label, x, Math.min(h-2, cy+r+9));
      }
    });
  });
}

function updateControlsPanel(f){
  // Check panelEl's own visibility rather than controlsWin — the inline fallback
  // (showPanelInline) never sets controlsWin, so gating on that would leave the
  // fallback panel permanently stale (sliders/strips/buttons never refreshing).
  if (panelEl.style.display !== 'block') return;
  // Defensive: cross-window access to a popup can throw (browser COOP isolation),
  // and this runs every frame inside tick() before the render call — letting it
  // throw here would silently freeze the whole scene, not just the controls panel.
  try {
    playBtn.textContent = paused ? '▶ Play' : '⏸ Pause';
    if (customLoopRange) {
      loopRangeToggleBtn.textContent = `🔁 ${customLoopRange[0].toFixed(1)}–${customLoopRange[1].toFixed(1)}s`;
      loopRangeToggleBtn.style.background = '#2a5a3a';
      if (!loopRangeInputFocused) {
        loopStartInput.value = customLoopRange[0].toFixed(1);
        loopEndInput.value = customLoopRange[1].toFixed(1);
      }
    } else {
      loopRangeToggleBtn.textContent = '🔁 Off';
      loopRangeToggleBtn.style.background = '#1c1c26';
    }
    const liveMap = { Playback:true, Nebula:f.fine, Collapse:f.cloud, CollapseCloud:f.collapseShape,
      Ignition:f.ignite, ExplosionBall:f.ignite, Sun:f.sun };
    groupEls.forEach(({ dotEl, rangeEl, group, inputs, loopBtn, groupPlayBtn }) => {
      dotEl.textContent = liveMap[group.name] ? '●' : '○';
      rangeEl.textContent = group.range();
      groupPlayBtn.textContent = paused ? '▶' : '⏸';
      const looping = loopGroupName === group.name;
      loopBtn.style.background = looping ? '#2a5a3a' : '#1c1c26';
      loopBtn.style.color = looping ? '#9fe6b0' : '#7a7a8a';
      inputs.forEach(({ el, numEl, key, isHeld }) => {
        if (isHeld()) return;
        el.value = tVals[key];
        numEl.textContent = Number(tVals[key]).toFixed(2);
      });
    });
    drawSeqStrips();
  } catch (e) {
    console.warn('Controls panel update skipped:', e);
  }
}

function updateClock(T, paused, igniteDur){
  const phase =
    T < 12              ? 'Void' :
    T < 56              ? 'Nebula' :
    T < 74              ? 'Collapse' :
    T < 74 + igniteDur  ? 'Ignition' : 'Galaxy';
  const pct = Math.min(100, (T / 90) * 100).toFixed(0);
  clockEl.textContent = `${T.toFixed(1)}s  /  90s   [${phase}]   ${pct}%   ${paused ? '⏸' : '▶'}`;
}

// ── Play / Pause ──────────────────────────────────────────────────────────────
let paused = false;
let loopGroupName = null; // when set, T bounces within that group's own window instead of advancing past it
let customLoopRange = null; // [start,end] in seconds — an arbitrary section, independent of any group's window

function resetScene() {
  T = 0;
  paused = false;
  ignitionTriggered = false;
  coreVisibility = 0;
  rotAngleFine = 0; rotAngleCloud = 0; rotAngleSpark = 0;
  // Full reset also snaps every slider back to its stored default — the per-group
  // ⟲ buttons in the Controls panel do this scoped to one group only.
  CONTROL_GROUPS.forEach(group => {
    group.props.forEach(p => {
      if (p.key in paramDefaults) tVals[p.key] = paramDefaults[p.key];
    });
  });

  sunMesh.visible    = false;
  flashMesh.visible  = false;
  flashMesh.material.uniforms.opacity.value = 0;
  coronaGroup.visible = false;

  coreWhite.material.opacity  = 0;
  coreAmber.material.opacity  = 0;
  coreOrange.material.opacity = 0;
  coreDark.material.opacity   = 0;
  coreLight.intensity = 0;

  fineMat.uniforms.collapseT.value  = 0;
  cloudMat.uniforms.collapseT.value = 0;
  fineMat.uniforms.gAlpha.value     = 0;
  cloudMat.uniforms.gAlpha.value    = 0;
  fineMat.uniforms.galaxyT.value    = 0;
  galaxyDiscMat.uniforms.gAlpha.value = 0;
  voidMat.opacity = 0;
  starMat.opacity = 0;

  // Clear loop geometry so old particles don't ghost on restart
  loopAlp.fill(0);
  loopPos.fill(0);
  loopGeo.attributes.alpha.needsUpdate    = true;
  loopGeo.attributes.position.needsUpdate = true;
}

window.addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target === document.body) {
    e.preventDefault();
    paused = !paused;
  }
  if (e.code === 'KeyR') resetScene();
  if (e.code === 'ArrowLeft')  { paused = true; T = Math.max(0,  T - 1); }
  if (e.code === 'ArrowRight') { paused = true; T = Math.min(90, T + 1); }
});

let drag=false, prev={x:0,y:0};
canvas.addEventListener('mousedown', e=>{ drag=true; prev={x:e.clientX,y:e.clientY}; });
window.addEventListener('mouseup', ()=>drag=false);
window.addEventListener('mousemove', e=>{
  if(!drag) return;
  sphTarget.theta -= (e.clientX-prev.x)*0.004;
  sphTarget.phi    = clamp(sphTarget.phi+(e.clientY-prev.y)*0.004, 0.05, Math.PI*0.88);
  prev={x:e.clientX,y:e.clientY};
  sph.theta=sphTarget.theta; sph.phi=sphTarget.phi;
});
window.addEventListener('wheel', e=>{
  sphTarget.r = clamp(sphTarget.r+e.deltaY*0.20, 50, 700);
},{passive:true});

// ── Shared GLSL ───────────────────────────────────────────────────────────────
const HSL_GLSL = `
  vec3 hsl2rgb(float h,float s,float l){
    vec3 rgb=clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0);
    return l+s*(rgb-0.5)*(1.0-abs(2.0*l-1.0));
  }
`;
const HUE_REMAP_GLSL = `
  float remapHue(float h){
    if     (h<0.20) return h*0.30;
    else if(h<0.45) return 0.55+(h-0.20)*0.60;
    else if(h<0.65) return 0.48+(h-0.45)*0.35;
    else if(h<0.82) return 0.75+(h-0.65)*0.59;
    else            return 0.08+(h-0.82)*0.67;
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// VOID — quantum foam field
// ═══════════════════════════════════════════════════════════════════════════════
const VOID_N = 3200;
const voidGeo = new THREE.BufferGeometry();
{
  const p = new Float32Array(VOID_N*3);
  const c = new Float32Array(VOID_N*3);
  for(let i=0;i<VOID_N;i++){
    const a=rand()*Math.PI*2, b=Math.acos(2*rand()-1);
    const r=30+rand()*280;
    p[i*3]=r*Math.sin(b)*Math.cos(a); p[i*3+1]=r*Math.sin(b)*Math.sin(a); p[i*3+2]=r*Math.cos(b);
    const t=rand();
    c[i*3]=0.18+t*0.22; c[i*3+1]=0.04+t*0.08; c[i*3+2]=0.45+t*0.35;
  }
  voidGeo.setAttribute('position',new THREE.BufferAttribute(p,3));
  voidGeo.setAttribute('color',  new THREE.BufferAttribute(c,3));
}
const voidMat = new THREE.PointsMaterial({
  size:1.8, sizeAttenuation:true, vertexColors:true,
  transparent:true, opacity:0, depthWrite:false,
  blending:THREE.AdditiveBlending
});
scene.add(new THREE.Points(voidGeo, voidMat));

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1 — FINE SPIRAL PARTICLES
// ═══════════════════════════════════════════════════════════════════════════════
const NUM_ARMS = 3;
const FINE_N   = 14000;
let fineMat;
{
  const geo  = new THREE.BufferGeometry();
  const pos  = new Float32Array(FINE_N*3);
  const seed = new Float32Array(FINE_N);
  for(let i=0;i<FINE_N;i++){
    const arm  = i % NUM_ARMS;
    const t    = rand();
    const r    = 5 + t*130;
    const spin = r * 0.022;
    const base = (arm/NUM_ARMS)*Math.PI*2;
    const u    = rand()*0.999+0.0005;
    const g    = Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rand());
    const angle  = base + spin + g*0.16;
    const rFinal = r + g*r*0.07;
    pos[i*3]   = rFinal*Math.cos(angle);
    pos[i*3+1] = g*r*0.022;
    pos[i*3+2] = rFinal*Math.sin(angle);
    seed[i]    = rand();
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('nSeed',   new THREE.BufferAttribute(seed,1));

  fineMat = new THREE.ShaderMaterial({
    uniforms:{ time:{value:0}, gAlpha:{value:0}, formT:{value:0}, rotSpeed:{value:0.058}, rotAngle:{value:0}, brightMult:{value:1.0}, warmBias:{value:0}, collapseT:{value:0}, galaxyT:{value:0}, turbMult:{value:1.0}, spiralMult:{value:1.0}, coreMult:{value:1.0}, hotHue:{value:0.07}, satMult:{value:1.0}, cloudScale:{value:1.0}, ballForm:{value:0.0} },
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader: HSL_GLSL + HUE_REMAP_GLSL + `
      attribute float nSeed;
      uniform float time;
      uniform float formT;
      uniform float rotSpeed;
      uniform float rotAngle;
      uniform float warmBias;
      uniform float collapseT;
      uniform float galaxyT;
      uniform float turbMult;
      uniform float spiralMult;
      uniform float coreMult;
      uniform float hotHue;
      uniform float satMult;
      uniform float cloudScale;
      uniform float ballForm;
      varying vec3  vColor;
      varying float vAlpha;
      void main(){
        float s=nSeed;
        float formFactor=0.5+0.5*sin(time*0.028+s*2.1);
        float formEnvelope=smoothstep(0.0,0.35,formT);
        float amp=(2.0+formFactor*11.0)*formEnvelope;
        float t1=time*(0.052+s*0.038)+s*6.2832;
        float t2=time*(0.079+s*0.026)+s*4.1888;
        float t3=time*(0.065+s*0.044)+s*2.0944;
        vec3 drift=vec3(
          sin(t1)*amp+cos(t2*0.67)*amp*0.36,
          (cos(t2)*0.12+sin(t3)*0.08)*amp,
          cos(t3)*amp+sin(t1*0.73)*amp*0.36
        );
        float breathe=1.0+0.05*sin(time*0.14+s*4.0);
        vec3 basePos=vec3(position.x*breathe,position.y,position.z*breathe);
        float rotA=rotAngle;
        float cr=cos(rotA),sr=sin(rotA);
        basePos=vec3(basePos.x*cr-basePos.z*sr,basePos.y,basePos.x*sr+basePos.z*cr);
        float cloudiness=1.0-smoothstep(0.18,0.92,formT);
        vec3 cloudScatter=vec3(
          sin(s*71.9+time*0.042)*88.0+cos(s*43.1+time*0.031)*42.0,
          sin(s*53.7+time*0.038)*58.0+cos(s*29.3+time*0.055)*32.0,
          cos(s*83.5+time*0.036)*88.0+sin(s*37.7+time*0.043)*42.0
        )*cloudiness;
        vec3 nebulaPos=basePos+drift+cloudScatter;
        float normR=length(position.xz)/130.0;
        float reveal=smoothstep(0.0,0.22,formT*1.30-normR);
        float radHue;
        if     (normR<0.10) radHue=0.60;
        else if(normR<0.38) radHue=0.58;
        else if(normR<0.58) radHue=0.50;
        else if(normR<0.78) radHue=0.04;
        else                radHue=0.80;
        float sh=remapHue(fract(s*1.618+time*0.008));
        // sh mix ramps in with formation — at formT=0 the color is pure radHue (blue/cyan
        // radial bands), avoiding the linear hue-mix-through-green artifact you get from
        // blending a red-band radHue with a blue-ish sh at full 0.36 weight from frame one.
        float shWeight=0.36*smoothstep(0.0,0.5,formT);
        float nebulaHue=mix(mix(radHue,sh,shWeight),0.08+s*0.07,warmBias);
        float nebulaLum=0.28+s*0.20+(1.0-normR)*0.10;
        float formed=1.0-formFactor;
        float nebulaAlpha=0.75*(0.38+formed*0.68)*reveal*(1.0-cloudiness*0.42);
        float coreFactor=1.0+(1.0-normR)*0.9;
        float nebulaPtSz=2.4*(0.50+s*1.55)*coreFactor*(0.62+formed*0.48)*(1.0+cloudiness*1.1)*640.0;
        float cycleSpeed=0.095+s*0.042;
        float loopT=fract(time*cycleSpeed+s);
        float tc=pow(loopT,0.80);
        float initR=length(position.xz);
        float rc=initR*(1.0-pow(tc,1.70))*cloudScale;
        float winds=(2.8+initR*0.060)*spiralMult;
        float anglec=atan(position.z,position.x)+tc*winds*6.2832;
        // ballForm=0 (default) is bit-identical to before. Above 0, particles get
        // pushed outward vertically as they converge inward radially, so as rc
        // shrinks toward 0 the vertical spread stays comparable instead of also
        // collapsing to nearly flat — the cloud rounds into a ball instead of a point.
        float ballScatter=(fract(s*13.7)-0.5)*2.0;
        float hc=position.y*(1.0-tc*0.88)*cloudScale + ballForm*rc*ballScatter;
        float turbAmp=(0.4+tc*3.2)*(0.8+s*0.4)*turbMult;
        float tv1=time*(1.8+s*1.2)+s*6.2832;
        float tv2=time*(2.5+s*0.8)+s*4.1888;
        vec3 turb=vec3(sin(tv1)*turbAmp,cos(tv2)*0.22*turbAmp,cos(tv1)*turbAmp);
        vec3 collapsePos=vec3(rc*cos(anglec),hc,rc*sin(anglec))+turb*tc*cloudScale;
        float heat=pow(tc,1.80/max(0.2,coreMult));
        float collapseHue=mix(remapHue(fract(s*1.618+time*0.012)),hotHue+s*0.06,heat);
        float collapseLum=mix(0.28+s*0.18,0.72,pow(heat,1.5));
        float brightFlare=1.0+pow(tc,4.0)*5.0;
        float pulse=0.55+0.45*sin(time*(3.0+s*2.0)+s*6.28);
        float cFadeIn=smoothstep(0.0,0.06,loopT);
        float cFadeOut=smoothstep(1.0,0.90,loopT);
        float collapseAlpha=cFadeIn*cFadeOut*(0.55+heat*0.55);
        float collapsePtSz=(1.4+(1.0-heat)*s*1.2)*640.0;
        float ct=collapseT;
        vec3 pos=mix(nebulaPos,collapsePos,ct);
        float collapseHueBiased=mix(collapseHue,hotHue+s*0.06,(1.0-heat)*warmBias);
        float hue=mix(nebulaHue,collapseHueBiased,ct);
        float lum=mix(nebulaLum,collapseLum,ct);
        float sat=mix(0.86,mix(0.84,0.96,heat),ct)*satMult;
        float brt=mix((0.22+formed*0.78)*0.90,brightFlare*(0.55+pulse*0.55),ct);
        vColor=hsl2rgb(hue,sat,lum)*brt;
        vAlpha=mix(nebulaAlpha,collapseAlpha,ct);
        float armIdx=step(0.5,fract(s*3.71));
        float armOff=armIdx*3.14159265;
        float gR=25.0+fract(s*7.31)*230.0;
        float gTheta=armOff+(gR/75.0)*2.8+(fract(s*5.19)-0.5)*0.55;
        float gSpread=(fract(s*11.3)-0.5)*50.0;
        float gX=gR*cos(gTheta)+gSpread*cos(gTheta+1.5708);
        float gZ=gR*sin(gTheta)+gSpread*sin(gTheta+1.5708);
        float gY=(fract(s*13.7)-0.5)*8.0;
        vec3 galaxyPos=vec3(gX,gY,gZ);
        pos=mix(pos,galaxyPos,galaxyT);
        float coolStar=step(0.78,fract(s*8.11));
        float starHue=mix(mix(0.06,0.11,fract(s*4.3)),mix(0.57,0.65,fract(s*6.1)),coolStar);
        float starSat=0.45+fract(s*3.1)*0.30;
        float starLum=0.65+fract(s*7.9)*0.30;
        vColor=mix(vColor,hsl2rgb(starHue,starSat,starLum)*(1.2+fract(s*2.7)*0.8),galaxyT);
        vAlpha=mix(vAlpha,0.92,galaxyT);
        vec4 mvPos=modelViewMatrix*vec4(pos,1.0);
        float ptSz=mix(nebulaPtSz,collapsePtSz,ct)/-mvPos.z;
        float starPtSz=clamp((0.8+fract(s*5.2)*1.4)*640.0/-mvPos.z,1.0,6.0);
        gl_PointSize=clamp(mix(ptSz,starPtSz,galaxyT),0.5,13.0);
        gl_Position=projectionMatrix*mvPos;
      }
    `,
    fragmentShader:`
      uniform float gAlpha;
      uniform float brightMult;
      varying vec3  vColor;
      varying float vAlpha;
      void main(){
        if(gAlpha<0.004) discard;
        vec2  c=gl_PointCoord-0.5;
        float d=length(c)*2.0;
        if(d>1.0) discard;
        float crisp=smoothstep(0.42,0.0,d);
        float core=max(0.0,1.0-d*9.0)*0.65;
        float alpha=(crisp*0.40+core)*(0.50+vAlpha*0.60)*gAlpha;
        if(alpha<0.003) discard;
        gl_FragColor=vec4(vColor*brightMult,alpha);
      }
    `,
  });
  scene.add(new THREE.Points(geo, fineMat));
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2 — VOLUMETRIC CLOUD PUFFS
// ═══════════════════════════════════════════════════════════════════════════════
const CLOUD_N = 2800;
let cloudMat;
{
  const geo  = new THREE.BufferGeometry();
  const pos  = new Float32Array(CLOUD_N*3);
  const seed = new Float32Array(CLOUD_N);
  for(let i=0;i<CLOUD_N;i++){
    const arm  = i % NUM_ARMS;
    const t    = rand();
    const r    = 8 + t*125;
    const spin = r * 0.022;
    const base = (arm/NUM_ARMS)*Math.PI*2;
    const scatter = (rand()-0.5)*r*0.55;
    const angle   = base + spin + scatter/Math.max(r,1);
    const rFinal  = r + (rand()-0.5)*r*0.35;
    pos[i*3]   = rFinal*Math.cos(angle);
    pos[i*3+1] = (rand()-0.5)*r*0.12;
    pos[i*3+2] = rFinal*Math.sin(angle);
    seed[i]    = rand();
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('nSeed',   new THREE.BufferAttribute(seed,1));

  cloudMat = new THREE.ShaderMaterial({
    uniforms:{ time:{value:0}, gAlpha:{value:0}, rotSpeed:{value:0.026}, rotAngle:{value:0}, brightMult:{value:1.0}, warmBias:{value:0}, collapseT:{value:0}, turbMult:{value:1.0}, spiralMult:{value:1.0}, coreMult:{value:1.0}, hotHue:{value:0.07}, satMult:{value:1.0}, cloudScale:{value:1.0}, ballForm:{value:0.0} },
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader: HSL_GLSL + HUE_REMAP_GLSL + `
      attribute float nSeed;
      uniform float time;
      uniform float gAlpha;
      uniform float rotSpeed;
      uniform float rotAngle;
      uniform float warmBias;
      uniform float collapseT;
      uniform float turbMult;
      uniform float spiralMult;
      uniform float coreMult;
      uniform float hotHue;
      uniform float satMult;
      uniform float cloudScale;
      uniform float ballForm;
      varying vec3  vColor;
      varying float vAlpha;
      varying vec2  vSeedOff;
      void main(){
        float s=nSeed;
        float formFactor=0.5+0.5*sin(time*0.012+s*1.5);
        float amp=(4.0+formFactor*10.0)*smoothstep(0.0,0.5,gAlpha);
        float t1=time*(0.018+s*0.010)+s*6.2832;
        float t2=time*(0.024+s*0.008)+s*4.1888;
        float t3=time*(0.020+s*0.013)+s*2.0944;
        vec3 drift=vec3(
          sin(t1)*amp+cos(t2*0.55)*amp*0.40,
          (cos(t2)*0.10+sin(t3)*0.07)*amp,
          cos(t3)*amp+sin(t1*0.68)*amp*0.40
        );
        float rotA=rotAngle;
        float cr=cos(rotA),sr=sin(rotA);
        vec3 basePos=vec3(position.x*cr-position.z*sr,position.y,position.x*sr+position.z*cr);
        vec3 nebulaPos=basePos+drift;
        float loopT=fract(time*0.040+s);
        float tc=pow(loopT,0.70);
        float rCC=length(position.xz)*(1.0-pow(tc,2.0))*cloudScale;
        float angleCC=atan(position.z,position.x)+tc*4.5*spiralMult*6.2832;
        float ballScatterCC=(fract(s*13.7)-0.5)*2.0;
        float hCC=position.y*(1.0-tc*0.70)*cloudScale + ballForm*rCC*ballScatterCC;
        float ampCC=(3.0+tc*8.0)*turbMult;
        float tv1=time*(0.12+s*0.08)+s*6.2832;
        float tv2=time*(0.18+s*0.06)+s*4.1888;
        vec3 driftCC=vec3(sin(tv1)*ampCC+cos(tv2*0.6)*ampCC*0.4,
                          (cos(tv2)*0.09+sin(tv1)*0.07)*ampCC,
                          cos(tv1)*ampCC+sin(tv2*0.7)*ampCC*0.4);
        vec3 collapsePos=vec3(rCC*cos(angleCC),hCC,rCC*sin(angleCC))+driftCC*tc*cloudScale;
        vec3 pos=mix(nebulaPos,collapsePos,collapseT);
        float globalHue=fract(time*0.0048);
        float nebulaHue=mix(remapHue(fract(globalHue+s*0.42)),0.08+s*0.06,warmBias);
        float heatCC=pow(tc,1.6/max(0.2,coreMult));
        float collapseHue=mix(remapHue(fract(s*0.618+time*0.004)),hotHue+s*0.04,heatCC);
        float hue=mix(nebulaHue,collapseHue,collapseT);
        float sat=mix(0.80,mix(0.78,0.94,heatCC),collapseT)*satMult;
        float lum=mix(0.22+s*0.14,mix(0.14+s*0.10,0.55,heatCC),collapseT);
        float fadeCC=0.5+0.5*sin(time*0.055+s*3.14);
        float pulseCC=0.40+0.60*sin(time*(0.55+s*0.45)+s*8.37);
        float brt=mix(0.62,(0.25+fadeCC*0.55+pulseCC*0.28)*(1.0+heatCC*1.5),collapseT);
        vColor=hsl2rgb(hue,sat,lum)*brt;
        float cAlphaCC=fadeCC*fadeCC*(0.40+pulseCC*0.30)*smoothstep(1.0,0.85,loopT)*smoothstep(0.0,0.08,loopT);
        vAlpha=mix(0.55,cAlphaCC,collapseT);
        vSeedOff=vec2(s*17.31+time*0.030, s*11.73+time*0.020);
        vec4 mvPos=modelViewMatrix*vec4(pos,1.0);
        float ptSz=(22.0+s*38.0)*0.92*640.0/-mvPos.z;
        gl_PointSize=clamp(ptSz,4.0,400.0);
        gl_Position=projectionMatrix*mvPos;
      }
    `,
    fragmentShader: HSL_GLSL + HUE_REMAP_GLSL + `
      uniform float gAlpha;
      uniform float brightMult;
      varying vec3  vColor;
      varying float vAlpha;
      varying vec2  vSeedOff;
      float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n2(vec2 p){
        vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
        return mix(mix(h2(i),h2(i+vec2(1,0)),u.x),
                   mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),u.x),u.y);
      }
      float fbm(vec2 p){
        float v=0.0,a=0.5;
        for(int i=0;i<4;i++){v+=a*n2(p);p=p*2.1+vec2(1.3,7.9);a*=0.5;}
        return v;
      }
      void main(){
        if(gAlpha<0.004) discard;
        vec2  c=gl_PointCoord-0.5;
        float d=length(c);
        if(d>0.52) discard;
        float n=fbm(c*4.5+vSeedOff);
        float edge=d - n*0.32 + 0.04;
        float shape=smoothstep(0.48,0.06,edge);
        float detail=fbm(c*9.0+vSeedOff*1.8)*0.45+0.55;
        float alpha=shape*detail*vAlpha*0.48*gAlpha;
        if(alpha<0.002) discard;
        gl_FragColor=vec4(vColor*detail*brightMult, alpha);
      }
    `,
  });
  scene.add(new THREE.Points(geo, cloudMat));
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3 — EJECTION SPARKS
// ═══════════════════════════════════════════════════════════════════════════════
const SPARK_N = 9000;
let sparkMat;
{
  const geo   = new THREE.BufferGeometry();
  const pos   = new Float32Array(SPARK_N*3);
  const seed  = new Float32Array(SPARK_N);
  for(let i=0;i<SPARK_N;i++){
    const arm   = i % NUM_ARMS;
    const t     = rand();
    const r     = 5 + t*130;
    const spin  = r*0.022;
    const base  = (arm/NUM_ARMS)*Math.PI*2;
    const angle = base + spin + (rand()-0.5)*0.08;
    const rF    = r + (rand()-0.5)*r*0.03;
    pos[i*3]   = rF*Math.cos(angle);
    pos[i*3+1] = (rand()-0.5)*1.5;
    pos[i*3+2] = rF*Math.sin(angle);
    seed[i]    = rand();
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('nSeed',   new THREE.BufferAttribute(seed,1));

  sparkMat = new THREE.ShaderMaterial({
    uniforms:{ time:{value:0}, gAlpha:{value:0}, rotSpeed:{value:0.058}, rotAngle:{value:0} },
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader: HSL_GLSL + HUE_REMAP_GLSL + `
      attribute float nSeed;
      uniform float time;
      uniform float rotSpeed;
      uniform float rotAngle;
      varying vec3  vColor;
      varying float vAlpha;
      void main(){
        float s=nSeed;
        float cycleLen=5.0+s*9.0;
        float phase=fract((time+s*cycleLen)/cycleLen);
        float activeWin=0.22;
        float t=clamp(phase/activeWin,0.0,1.0);
        float isActive=step(phase,activeWin);
        vec2 radDir=normalize(position.xz+vec2(0.0002,0.0002));
        vec2 tangDir=normalize(vec2(-position.z, position.x));
        vec2 ejectDir=normalize(radDir*0.25+tangDir*0.75);
        float reach=t*(24.0+s*44.0);
        vec3 ejPos=vec3(
          position.x+ejectDir.x*reach,
          position.y+(s-0.5)*reach*0.04,
          position.z+ejectDir.y*reach
        );
        float rotA=rotAngle;
        float cr=cos(rotA),sr=sin(rotA);
        ejPos=vec3(ejPos.x*cr-ejPos.z*sr,ejPos.y,ejPos.x*sr+ejPos.z*cr);
        float normR=length(position.xz)/130.0;
        float tipHue=0.60;
        float armHue=mix(0.58,0.04,normR);
        float hue=mix(tipHue,remapHue(armHue),t);
        float lum=0.70-t*0.32;
        vColor=hsl2rgb(hue,0.80,lum)*(1.2-t*0.65)*isActive;
        vAlpha=isActive*(1.0-t)*(1.0-t)*0.48;
        vec4 mvPos=modelViewMatrix*vec4(ejPos,1.0);
        float ptSz=(0.7+s*0.6)*isActive*640.0/-mvPos.z;
        gl_PointSize=clamp(ptSz,0.6,5.0);
        gl_Position=projectionMatrix*mvPos;
      }
    `,
    fragmentShader:`
      uniform float gAlpha;
      varying vec3  vColor;
      varying float vAlpha;
      void main(){
        if(gAlpha<0.004||vAlpha<0.004) discard;
        vec2  c=gl_PointCoord-0.5;
        float d=length(c)*2.0;
        if(d>1.0) discard;
        float alpha=vAlpha*smoothstep(0.5,0.05,d)*gAlpha;
        gl_FragColor=vec4(vColor,alpha);
      }
    `,
  });
  scene.add(new THREE.Points(geo, sparkMat));
}

const hazeRed  = { material:{ opacity:0 } };
const hazeBlue = { material:{ opacity:0 } };
const hazeGold = { material:{ opacity:0 } };

// ── Star field ────────────────────────────────────────────────────────────────
const starMat = new THREE.PointsMaterial({
  size:2.0, sizeAttenuation:true, vertexColors:true,
  transparent:true, opacity:0, depthWrite:false,
  blending:THREE.AdditiveBlending
});
{
  const N=3500, geo=new THREE.BufferGeometry();
  const p=new Float32Array(N*3), c=new Float32Array(N*3);
  const pal=[[0.88,0.94,1],[1,1,0.88],[0.68,0.80,1],[1,0.82,0.62]];
  for(let i=0;i<N;i++){
    const a=rand()*Math.PI*2, b=Math.acos(2*rand()-1), r=700+rand()*300;
    p[i*3]=r*Math.sin(b)*Math.cos(a); p[i*3+1]=r*Math.sin(b)*Math.sin(a); p[i*3+2]=r*Math.cos(b);
    const sc=pal[Math.floor(rand()*pal.length)];
    c[i*3]=sc[0]; c[i*3+1]=sc[1]; c[i*3+2]=sc[2];
  }
  geo.setAttribute('position',new THREE.BufferAttribute(p,3));
  geo.setAttribute('color',  new THREE.BufferAttribute(c,3));
  scene.add(new THREE.Points(geo, starMat));
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLLAPSE ELEMENTS
// ═══════════════════════════════════════════════════════════════════════════════
const HSL_C   = HSL_GLSL;
const REMAP_C = HUE_REMAP_GLSL;

// ── Collapse Layer 1: Spiral Drain ────────────────────────────────────────────
let drainMat;
{
  const N=20000, geo=new THREE.BufferGeometry();
  const pos=new Float32Array(N*3), seed=new Float32Array(N);
  for(let i=0;i<N;i++){
    const arm=i%3, t=rand(), r=4+t*125, spin=r*0.022;
    const base=(arm/3)*Math.PI*2;
    const u=rand()*0.999+0.0005;
    const g=Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rand());
    const angle=base+spin+g*0.14, rF=r+g*r*0.06;
    pos[i*3]=rF*Math.cos(angle); pos[i*3+1]=g*r*0.018; pos[i*3+2]=rF*Math.sin(angle);
    seed[i]=rand();
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('nSeed',   new THREE.BufferAttribute(seed,1));
  drainMat=new THREE.ShaderMaterial({
    uniforms:{ time:{value:0}, gAlpha:{value:0} },
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader: HSL_C+REMAP_C+`
      attribute float nSeed;
      uniform float time;
      varying vec3  vColor;
      varying float vAlpha;
      void main(){
        float s=nSeed;
        float initR=length(position.xz);
        float initAngle=atan(position.z,position.x);
        float initY=position.y;
        float cycleSpeed=0.095+s*0.042;
        float loopT=fract(time*cycleSpeed+s);
        float t=pow(loopT,0.80);
        float r=initR*(1.0-pow(t,1.70));
        float winds=2.8+initR*0.060;
        float angle=initAngle+t*winds*6.2832;
        float h=initY*(1.0-t*0.88);
        float turbAmp=(0.4+t*3.2)*(0.8+s*0.4);
        float tv1=time*(1.8+s*1.2)+s*6.2832;
        float tv2=time*(2.5+s*0.8)+s*4.1888;
        vec3 turb=vec3(sin(tv1)*turbAmp,(cos(tv2)*0.22)*turbAmp,cos(tv1)*turbAmp);
        vec3 pos=vec3(r*cos(angle),h,r*sin(angle))+turb*t;
        float heat=pow(t,1.80);
        float coldHue=remapHue(fract(s*1.618+time*0.012));
        float hotHue=0.07+s*0.06;
        float hue=mix(coldHue,hotHue,heat);
        float sat=mix(0.84,0.96,heat);
        float lum=mix(0.28+s*0.18,0.72,pow(heat,1.5));
        float brightFlare=1.0+pow(t,4.0)*5.0;
        float pulse=0.55+0.45*sin(time*(3.0+s*2.0)+s*6.28);
        float fadeIn=smoothstep(0.0,0.06,loopT);
        float fadeOut=smoothstep(1.0,0.90,loopT);
        vColor=hsl2rgb(hue,sat,lum)*brightFlare*(0.55+pulse*0.55);
        vAlpha=fadeIn*fadeOut*(0.55+heat*0.55);
        vec4 mvPos=modelViewMatrix*vec4(pos,1.0);
        float ptSz=(1.4+(1.0-heat)*s*1.2)*640.0/-mvPos.z;
        gl_PointSize=clamp(ptSz,0.8,10.0);
        gl_Position=projectionMatrix*mvPos;
      }
    `,
    fragmentShader:`
      uniform float gAlpha;
      varying vec3  vColor;
      varying float vAlpha;
      void main(){
        if(gAlpha<0.004||vAlpha<0.004) discard;
        vec2  c=gl_PointCoord-0.5;
        float d=length(c)*2.0;
        if(d>1.0) discard;
        float crisp=smoothstep(0.44,0.0,d);
        float core=max(0.0,1.0-d*9.0)*0.6;
        float alpha=(crisp*0.38+core)*(0.50+vAlpha*0.60)*gAlpha;
        if(alpha<0.003) discard;
        gl_FragColor=vec4(vColor,alpha);
      }
    `,
  });
  scene.add(new THREE.Points(geo,drainMat));
}

// ── Collapse Layer 2: Cloud Vortex ────────────────────────────────────────────
let cvortMat;
{
  const N=1600, geo=new THREE.BufferGeometry();
  const pos=new Float32Array(N*3), seed=new Float32Array(N);
  for(let i=0;i<N;i++){
    const arm=i%3, t=rand(), r=6+t*110, spin=r*0.022;
    const base=(arm/3)*Math.PI*2;
    const scatter=(rand()-0.5)*r*0.50;
    const angle=base+spin+scatter/Math.max(r,1), rF=r+(rand()-0.5)*r*0.30;
    pos[i*3]=rF*Math.cos(angle); pos[i*3+1]=(rand()-0.5)*r*0.10; pos[i*3+2]=rF*Math.sin(angle);
    seed[i]=rand();
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('nSeed',   new THREE.BufferAttribute(seed,1));
  cvortMat=new THREE.ShaderMaterial({
    uniforms:{ time:{value:0}, gAlpha:{value:0} },
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader: HSL_C+REMAP_C+`
      attribute float nSeed;
      uniform float time;
      varying vec3  vColor;
      varying float vAlpha;
      varying vec2  vSeedOff;
      void main(){
        float s=nSeed;
        float loopT=fract(time*0.040+s);
        float t=pow(loopT,0.70);
        float r=length(position.xz)*(1.0-pow(t,2.0));
        float angle=atan(position.z,position.x)+t*4.5*6.2832;
        float h=position.y*(1.0-t*0.70);
        float amp=3.0+t*8.0;
        float tv1=time*(0.12+s*0.08)+s*6.2832;
        float tv2=time*(0.18+s*0.06)+s*4.1888;
        vec3 drift=vec3(sin(tv1)*amp+cos(tv2*0.6)*amp*0.4,
                        (cos(tv2)*0.09+sin(tv1)*0.07)*amp,
                        cos(tv1)*amp+sin(tv2*0.7)*amp*0.4);
        float rotA=time*0.32;
        float cr=cos(rotA),sr=sin(rotA);
        vec3 basePos=vec3(r*cos(angle),h,r*sin(angle));
        basePos=vec3(basePos.x*cr-basePos.z*sr,basePos.y,basePos.x*sr+basePos.z*cr);
        vec3 finalPos=basePos+drift*t;
        float heat=pow(t,1.6);
        float hue=mix(remapHue(fract(s*0.618+time*0.004)), 0.07+s*0.04, heat);
        float sat=mix(0.78,0.94,heat);
        float lum=mix(0.14+s*0.10,0.55,heat);
        float fade=0.5+0.5*sin(time*0.055+s*3.14);
        float pulse=0.40+0.60*sin(time*(0.55+s*0.45)+s*8.37);
        vColor=hsl2rgb(hue,sat,lum)*(0.25+fade*0.55+pulse*0.28)*(1.0+heat*1.5);
        vAlpha=fade*fade*(0.40+pulse*0.30)*smoothstep(1.0,0.85,loopT)*smoothstep(0.0,0.08,loopT);
        vSeedOff=vec2(s*17.31+time*0.045, s*11.73+time*0.030);
        vec4 mvPos=modelViewMatrix*vec4(finalPos,1.0);
        gl_PointSize=clamp((18.0+s*32.0)*(0.70+fade*0.40)*640.0/-mvPos.z,3.0,350.0);
        gl_Position=projectionMatrix*mvPos;
      }
    `,
    fragmentShader: HSL_C+REMAP_C+`
      uniform float gAlpha;
      varying vec3  vColor;
      varying float vAlpha;
      varying vec2  vSeedOff;
      float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n2(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
        return mix(mix(h2(i),h2(i+vec2(1,0)),u.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),u.x),u.y);}
      float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*n2(p);p=p*2.1+vec2(1.3,7.9);a*=0.5;}return v;}
      void main(){
        if(gAlpha<0.004||vAlpha<0.004) discard;
        vec2  c=gl_PointCoord-0.5;
        float d=length(c);
        if(d>0.52) discard;
        float n=fbm(c*4.2+vSeedOff);
        float shape=smoothstep(0.48,0.06,d-n*0.30+0.04);
        float detail=fbm(c*8.5+vSeedOff*1.9)*0.42+0.58;
        float alpha=shape*detail*vAlpha*0.60*gAlpha;
        if(alpha<0.002) discard;
        gl_FragColor=vec4(vColor*detail,alpha);
      }
    `,
  });
  scene.add(new THREE.Points(geo,cvortMat));
}

// ── Collapse Layer 3: Bipolar Jets ────────────────────────────────────────────
let jetTopMat, jetBotMat;
{
  const makeJet=(side,colA,colB)=>{
    const N=4000, geo=new THREE.BufferGeometry();
    const pos=new Float32Array(N*3), seed=new Float32Array(N);
    for(let i=0;i<N;i++){
      const t=Math.pow(rand(),0.65), yR=t*58, spread=t*t*0.30, a=rand()*Math.PI*2;
      pos[i*3]=Math.cos(a)*yR*spread; pos[i*3+1]=side*yR; pos[i*3+2]=Math.sin(a)*yR*spread;
      seed[i]=rand();
    }
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    geo.setAttribute('nSeed',   new THREE.BufferAttribute(seed,1));
    const mat=new THREE.ShaderMaterial({
      uniforms:{ time:{value:0}, gAlpha:{value:0} },
      transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
      vertexShader: HSL_C+`
        attribute float nSeed;
        uniform float time;
        varying vec3  vColor;
        varying float vAlpha;
        void main(){
          float s=nSeed;
          float phase=fract(time*(0.32+s*0.40)+s*7.3);
          vec3 pos=position*phase;
          float tv=time*(2.2+s*1.4)+s*6.28;
          float turbR=length(position.xz)*phase*0.14;
          pos.x+=sin(tv)*turbR; pos.z+=cos(tv)*turbR;
          vec3 cA=vec3(${colA}), cB=vec3(${colB});
          float pulse=0.50+0.50*sin(time*(3.5+s*2.0)+s*6.28);
          vColor=mix(cA,cB,phase)*(1.8-phase*1.0)*(0.6+pulse*0.5);
          vAlpha=(1.0-phase)*(1.0-phase)*0.88*smoothstep(0.0,0.05,phase);
          vec4 mvPos=modelViewMatrix*vec4(pos,1.0);
          gl_PointSize=clamp((1.2+s*0.8)*640.0/-mvPos.z,0.8,8.0);
          gl_Position=projectionMatrix*mvPos;
        }
      `,
      fragmentShader:`
        uniform float gAlpha;
        varying vec3  vColor;
        varying float vAlpha;
        void main(){
          if(gAlpha<0.004||vAlpha<0.004) discard;
          vec2 c=gl_PointCoord-0.5;
          float d=length(c)*2.0;
          if(d>1.0) discard;
          float alpha=vAlpha*smoothstep(0.5,0.02,d)*gAlpha;
          gl_FragColor=vec4(vColor,alpha);
        }
      `,
    });
    scene.add(new THREE.Points(geo,mat));
    return mat;
  };
  jetTopMat=makeJet( 1,'1.0,0.95,0.80','1.0,0.28,0.06');
  jetBotMat=makeJet(-1,'0.85,0.95,1.0','0.10,0.45,1.0');
}

// ── Collapse Core Glow ────────────────────────────────────────────────────────
function coreGlow(r,col){
  const m=new THREE.Mesh(new THREE.SphereGeometry(r,20,20),
    new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0,
      blending:THREE.AdditiveBlending,depthWrite:false}));
  scene.add(m); return m;
}
const coreWhite  = coreGlow(1.2, 0xffffff);
const coreAmber  = coreGlow(2.8, 0xff8800);
const coreOrange = coreGlow(5.5, 0xff3300);
const coreDark   = coreGlow(8.0, 0x220800);
const coreLight  = new THREE.PointLight(0xffaa40, 0, 400);
scene.add(coreLight);
let coreVisibility = 0;

// Core-glow hue control — rotates all four glow shells + the point light around
// the color wheel together, preserving their relative hue/brightness spread
// (white core, then amber/orange/dark) rather than recoloring them independently.
const CORE_GLOW_MESHES = [coreWhite, coreAmber, coreOrange, coreDark];
const CORE_BASE_HSL = CORE_GLOW_MESHES.map(m => { const hsl={h:0,s:0,l:0}; m.material.color.getHSL(hsl); return hsl; });
const coreLightBaseHSL = {h:0,s:0,l:0};
coreLight.color.getHSL(coreLightBaseHSL);
function applyCoreHueShift(shift){
  CORE_GLOW_MESHES.forEach((m,i) => {
    const b = CORE_BASE_HSL[i];
    m.material.color.setHSL((b.h+shift)%1, b.s, b.l);
  });
  coreLight.color.setHSL((coreLightBaseHSL.h+shift)%1, coreLightBaseHSL.s, coreLightBaseHSL.l);
}

// ── Galaxy disc ───────────────────────────────────────────────────────────────
const GALAXY_DISC_N = 28000;
const galaxyDiscGeo = new THREE.BufferGeometry();
{
  const pos   = new Float32Array(GALAXY_DISC_N * 3);
  const seeds = new Float32Array(GALAXY_DISC_N);
  for(let i = 0; i < GALAXY_DISC_N; i++){
    const s = rand(); seeds[i] = s;
    const r = rand();
    let gR, tightness;
    if(r < 0.12){
      gR = rand() * 28; tightness = 12;
    } else if(r < 0.72){
      gR = 18 + rand() * 220; tightness = 16;
    } else {
      gR = 12 + rand() * 240; tightness = 48;
    }
    const armOff = Math.floor(rand() * 2) * Math.PI;
    const gTheta = armOff + (gR / 75.0) * 2.8 + (rand() - 0.5) * 0.38;
    const gPerp  = gTheta + Math.PI * 0.5;
    const gSpread = (rand() - 0.5) * tightness;
    pos[i*3]   = gR * Math.cos(gTheta) + gSpread * Math.cos(gPerp);
    pos[i*3+1] = (rand() - 0.5) * 7;
    pos[i*3+2] = gR * Math.sin(gTheta) + gSpread * Math.sin(gPerp);
  }
  galaxyDiscGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  galaxyDiscGeo.setAttribute('nSeed',    new THREE.BufferAttribute(seeds, 1));
}
const galaxyDiscMat = new THREE.ShaderMaterial({
  uniforms:{ time:{value:0}, gAlpha:{value:0} },
  transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
  vertexShader: HSL_GLSL + `
    attribute float nSeed;
    uniform float time, gAlpha;
    varying vec3  vColor;
    varying float vAlpha;
    void main(){
      float s = nSeed;
      float radius = length(position.xz);
      float rotT = time * max(0.003, 0.014 - radius * 0.000042);
      float cr = cos(rotT), sr = sin(rotT);
      vec3 rotPos = vec3(
        position.x*cr - position.z*sr,
        position.y,
        position.x*sr + position.z*cr
      );
      float cool = step(0.78, fract(s*8.11));
      float hue = mix(mix(0.06,0.11,fract(s*4.3)), mix(0.57,0.65,fract(s*6.1)), cool);
      float lum = 0.62 + fract(s*7.9)*0.36;
      float sat = 0.42 + fract(s*3.1)*0.35;
      vColor = hsl2rgb(hue, sat, lum) * (1.1 + fract(s*2.3)*0.9);
      vAlpha = 0.65 + fract(s*5.7)*0.35;
      vec4 mvPos = modelViewMatrix * vec4(rotPos, 1.0);
      gl_PointSize = clamp((0.7+fract(s*4.2)*1.5)*640.0/-mvPos.z, 0.8, 7.0);
      gl_Position  = projectionMatrix * mvPos;
    }
  `,
  fragmentShader:`
    uniform float gAlpha;
    varying vec3  vColor;
    varying float vAlpha;
    void main(){
      if(gAlpha < 0.004) discard;
      vec2  c = gl_PointCoord - 0.5;
      float d = length(c) * 2.0;
      if(d > 1.0) discard;
      float crisp = smoothstep(0.55, 0.0, d);
      float core  = max(0.0, 1.0 - d*8.0) * 0.72;
      float alpha = (crisp*0.42 + core) * vAlpha * gAlpha;
      if(alpha < 0.003) discard;
      gl_FragColor = vec4(vColor, alpha);
    }
  `
});
scene.add(new THREE.Points(galaxyDiscGeo, galaxyDiscMat));

// ── Sun ───────────────────────────────────────────────────────────────────────
const SUN_R = 2.4;
const sunMat = new THREE.ShaderMaterial({
  uniforms:{ time:{value:0}, hueMode:{value:0.0}, emergence:{value:0}, distort:{value:0}, distFreqMult:{value:1.0}, distAmpMult:{value:1.0}, rippleStr:{value:0.0} },
  vertexShader:`
    varying vec3 vPos; varying vec3 vNormal;
    uniform float time, distort, distFreqMult, distAmpMult, rippleStr;
    float rippleWave(vec3 pn, vec3 c, float t, float off){
      float p    = fract(t + off);
      float cosA = clamp(dot(pn, normalize(c)), -1.0, 1.0);
      float ang  = acos(cosA);
      float env  = exp(-ang*1.5) * pow(max(0.0,1.0-p), 0.55);
      return sin(ang*20.0 - p*26.0) * env;
    }
    void main(){
      float rAmp = distort * 0.09 * distAmpMult;
      float fq = distFreqMult;
      float r1 = sin(position.y*7.0*fq+time*5.2*fq)*sin(position.x*5.5*fq+time*4.1*fq);
      float r2 = cos(position.z*6.5*fq+time*4.7*fq)*cos(position.y*4.8*fq+time*3.8*fq);
      float r3 = sin(position.x*8.0*fq+time*3.5*fq)*cos(position.z*5.0*fq+time*5.0*fq);
      float ripple = (r1*0.5+r2*0.35+r3*0.15) * rAmp;
      vec3 pn = normalize(position);
      float rt = time * 0.17;
      float rd = 0.0;
      rd += rippleWave(pn, vec3( 0.82, 0.40, 0.41), rt, 0.00);
      rd += rippleWave(pn, vec3(-0.65, 0.72, 0.25), rt, 0.20);
      rd += rippleWave(pn, vec3( 0.15,-0.88, 0.45), rt, 0.40);
      rd += rippleWave(pn, vec3(-0.50,-0.30, 0.81), rt, 0.60);
      rd += rippleWave(pn, vec3( 0.30, 0.85,-0.43), rt, 0.80);
      vec3 displaced = position + normalize(position) * ripple + pn * rd * rippleStr * 0.38;
      vPos = displaced;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `,
  fragmentShader:`
    varying vec3 vPos; varying vec3 vNormal;
    uniform float time,hueMode,emergence,distort,distFreqMult,distAmpMult,rippleStr;
    float crestGlow(vec3 pn, vec3 c, float t, float off){
      float p    = fract(t + off);
      float cosA = clamp(dot(pn, normalize(c)), -1.0, 1.0);
      float ang  = acos(cosA);
      float env  = exp(-ang*1.5) * pow(max(0.0,1.0-p), 0.50);
      return max(0.0, sin(ang*20.0 - p*26.0)) * env;
    }
    float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
    float noise(vec3 p){
      vec3 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
      return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),u.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),u.x),u.y),
                 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),u.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),u.x),u.y),u.z);
    }
    float fbm(vec3 p){float v=0.,a=0.5;for(int i=0;i<7;i++){v+=a*noise(p);p*=2.1;a*=0.48;}return v;}
    vec3 getDeep(float m){
      if(m<1.0)return mix(vec3(0.22,0.04,0.0),vec3(0.18,0.01,0.0),m);
      if(m<2.0)return mix(vec3(0.18,0.01,0.0),vec3(0.0,0.06,0.10),m-1.0);
      if(m<3.0)return mix(vec3(0.0,0.06,0.10),vec3(0.0,0.01,0.16),m-2.0);
      if(m<4.0)return mix(vec3(0.0,0.01,0.16),vec3(0.06,0.0,0.16),m-3.0);
      return mix(vec3(0.06,0.0,0.16),vec3(0.22,0.04,0.0),m-4.0);
    }
    vec3 getHot(float m){
      if(m<1.0)return mix(vec3(1.0,0.88,0.08),vec3(1.0,0.15,0.03),m);
      if(m<2.0)return mix(vec3(1.0,0.15,0.03),vec3(0.06,0.95,0.88),m-1.0);
      if(m<3.0)return mix(vec3(0.06,0.95,0.88),vec3(0.14,0.52,1.0),m-2.0);
      if(m<4.0)return mix(vec3(0.14,0.52,1.0),vec3(0.68,0.14,1.0),m-3.0);
      return mix(vec3(0.68,0.14,1.0),vec3(1.0,0.88,0.08),m-4.0);
    }
    vec3 getBright(float m){
      if(m<1.0)return mix(vec3(1.6,0.90,0.28),vec3(1.8,0.30,0.05),m);
      if(m<2.0)return mix(vec3(1.8,0.30,0.05),vec3(0.1,1.8,1.6),m-1.0);
      if(m<3.0)return mix(vec3(0.1,1.8,1.6),vec3(0.2,0.7,2.0),m-2.0);
      if(m<4.0)return mix(vec3(0.2,0.7,2.0),vec3(1.1,0.2,2.0),m-3.0);
      return mix(vec3(1.1,0.2,2.0),vec3(1.6,0.90,0.28),m-4.0);
    }
    void main(){
      float dAmp=distort*0.65*distAmpMult;
      float dfq=distFreqMult;
      float dx=sin(vPos.y*2.2*dfq+time*2.0*dfq)*sin(vPos.z*2.8*dfq+time*1.7*dfq)*dAmp;
      float dy=cos(vPos.x*2.0*dfq+time*2.3*dfq)*cos(vPos.z*2.5*dfq+time*1.5*dfq)*dAmp;
      float dz=sin(vPos.x*3.0*dfq+time*1.8*dfq)*cos(vPos.y*2.4*dfq+time*2.1*dfq)*dAmp;
      vec3 dp=vPos+vec3(dx,dy,dz);
      vec3 p=dp*4.5+vec3(time*0.10,time*0.07,time*0.13);
      vec3 q=vec3(fbm(p),fbm(p+vec3(5.2,1.3,2.8)),fbm(p+vec3(1.7,9.2,3.1)));
      float n=fbm(p+0.5*q); n=pow(n,1.5); n=clamp(n*1.8+0.2,0.0,1.0);
      float spot=fbm(vPos*2.8+vec3(time*0.018)); spot=smoothstep(0.62,0.45,spot); n*=0.70+spot*0.30;
      float limb=abs(dot(normalize(vNormal),vec3(0.0,0.0,1.0))); n*=0.55+0.45*limb;
      float m=mod(hueMode,5.0);
      vec3 col=mix(getDeep(m),getHot(m),n);
      col+=smoothstep(0.68,1.0,n)*1.5*getBright(m);
      if(rippleStr > 0.01){
        vec3 rpn = normalize(vPos);
        float rt = time * 0.17;
        float rg = 0.0;
        rg += crestGlow(rpn, vec3( 0.82, 0.40, 0.41), rt, 0.00);
        rg += crestGlow(rpn, vec3(-0.65, 0.72, 0.25), rt, 0.20);
        rg += crestGlow(rpn, vec3( 0.15,-0.88, 0.45), rt, 0.40);
        rg += crestGlow(rpn, vec3(-0.50,-0.30, 0.81), rt, 0.60);
        rg += crestGlow(rpn, vec3( 0.30, 0.85,-0.43), rt, 0.80);
        col += rg * getBright(m) * 5.0 * rippleStr;
      }
      vec3 whiteHot=vec3(1.8,1.5,1.0);
      gl_FragColor=vec4(mix(whiteHot,col,emergence),1.0);
    }
  `,
  transparent:false,
});
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUN_R,64,64), sunMat);
sunMesh.scale.setScalar(0.001);
sunMesh.visible = false;
scene.add(sunMesh);

// ── Corona ────────────────────────────────────────────────────────────────────
const coronaGroup = new THREE.Group();
coronaGroup.visible = false;
scene.add(coronaGroup);
const coronaMats = [];
const CORONA_HUES = [
  [0xfffde8,0xffcc44,0xff7700,0xff3300,0xff8822],
  [0xffeeaa,0xffaa22,0xff5500,0xdd1100,0xff7700],
  [0xaaffee,0x44ddcc,0x009988,0x004455,0x22bbaa],
  [0xaabbff,0x5577ff,0x2244dd,0x111166,0x4466ee],
  [0xffddff,0xcc55ff,0x8811cc,0x440066,0xaa44dd],
];
// Pre-converted once — the per-frame corona color cycle used to call `new THREE.Color()`
// twice per layer (10 allocations/frame) for the entire galaxy phase, real GC pressure.
const CORONA_HUES_RGB = CORONA_HUES.map(row => row.map(hex => new THREE.Color(hex)));
{
  function makeCoronaMat(color,flareStr,glowStr,falloff,fFalloff,sz){
    const mat=new THREE.ShaderMaterial({
      uniforms:{ time:{value:0}, glowColor:{value:new THREE.Color(color)},
        flareStrength:{value:flareStr}, baseGlowStrength:{value:glowStr},
        radialFalloff:{value:falloff}, flareFalloff:{value:fFalloff}, globalAlpha:{value:0} },
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`
        varying vec2 vUv;
        uniform float time,flareStrength,baseGlowStrength,radialFalloff,flareFalloff,globalAlpha;
        uniform vec3 glowColor;
        float hash(float n){return fract(sin(n)*43758.5453);}
        float noise(float x){float i=floor(x),f=fract(x),u=f*f*(3.0-2.0*f);return mix(hash(i),hash(i+1.0),u);}
        void main(){
          vec2 uv=vUv-0.5; float dist=length(uv); if(dist>0.5)discard;
          float angle=atan(uv.y,uv.x); float aN=(angle+3.14159)/6.28318;
          float fN=noise(aN*38.0+time*0.22)*noise(aN*19.0+time*0.14);
          float fA=noise(aN*52.0-time*0.18)*noise(aN*11.0+time*0.10);
          float flare=pow(max(0.0,fN*0.6+fA*0.4),flareFalloff);
          float radFade=pow(max(0.0,1.0-dist*1.8),radialFalloff);
          float flareFade=max(0.0,1.0-dist*1.5);
          float baseG=smoothstep(0.42,0.0,dist)*(0.85+0.15*sin(time*0.4));
          float intensity=(baseGlowStrength*baseG + flareStrength*flare*flareFade)*radFade*globalAlpha;
          if(intensity<0.005)discard;
          gl_FragColor=vec4(glowColor*intensity,intensity*0.92);
        }
      `,
    });
    coronaGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(sz,sz),mat));
    coronaMats.push(mat); return mat;
  }
  makeCoronaMat(0xfffde8, 5.5, 3.0, 2.0, 1.4, 18);
  makeCoronaMat(0xffcc44, 7.0, 1.2, 1.6, 1.8, 34);
  makeCoronaMat(0xff7700, 5.0, 0.6, 1.3, 2.2, 56);
  makeCoronaMat(0xff3300, 3.0, 0.3, 1.1, 2.6, 85);
  makeCoronaMat(0xff8822, 8.5, 0.2, 1.5, 1.2, 28);
}
// Base values captured once, so per-frame multipliers always scale from a fixed
// starting point instead of compounding onto whatever the value already drifted
// to — `baseGlowStrength.value *= tVals.coronaGlow` every frame would otherwise
// double/halve indefinitely for any coronaGlow != 1, blowing out within seconds.
const CORONA_BASE_GLOW        = coronaMats.map(m => m.uniforms.baseGlowStrength.value);
const CORONA_BASE_FLARE       = coronaMats.map(m => m.uniforms.flareStrength.value);
const CORONA_BASE_RADIAL      = coronaMats.map(m => m.uniforms.radialFalloff.value);
const CORONA_BASE_FLAREFALLOFF= coronaMats.map(m => m.uniforms.flareFalloff.value);
const CORONA_BASE_COLORS      = coronaMats.map(m => m.uniforms.glowColor.value.clone());
const coronaHueShiftScratch = {h:0,s:0,l:0};
function applyCoronaHueShift(shift){
  if (!shift) return; // shift=0 is a no-op, so untouched behavior is bit-identical to before
  coronaMats.forEach(m => {
    const hsl = coronaHueShiftScratch;
    m.uniforms.glowColor.value.getHSL(hsl);
    m.uniforms.glowColor.value.setHSL((hsl.h+shift)%1, hsl.s, hsl.l);
  });
}

// ── Solar emission loops ──────────────────────────────────────────────────────
const FLARE_COLORS = [
  new THREE.Color(1.0,0.55,0.10), new THREE.Color(1.0,0.92,0.28),
  new THREE.Color(0.28,0.82,1.0), new THREE.Color(1.0,0.28,0.62),
  new THREE.Color(0.68,0.28,1.0), new THREE.Color(0.18,1.0,0.78),
  new THREE.Color(1.0,1.0,1.0),
];
const N_LOOPS=10, LOOP_PTS=90;
const loopGeo=new THREE.BufferGeometry();
const loopPos=new Float32Array(N_LOOPS*LOOP_PTS*3);
const loopCol=new Float32Array(N_LOOPS*LOOP_PTS*3);
const loopAlp=new Float32Array(N_LOOPS*LOOP_PTS);
loopGeo.setAttribute('position',new THREE.BufferAttribute(loopPos,3));
loopGeo.setAttribute('color',   new THREE.BufferAttribute(loopCol,3));
loopGeo.setAttribute('alpha',   new THREE.BufferAttribute(loopAlp,1));
const loopMat=new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`attribute float alpha;attribute vec3 color;varying vec3 vC;varying float vA;
    void main(){vC=color;vA=alpha;vec4 mv=modelViewMatrix*vec4(position,1.0);
      gl_PointSize=max(2.0,6.0*90.0/-mv.z);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying vec3 vC;varying float vA;
    void main(){vec2 c=gl_PointCoord-0.5;if(length(c)>0.5||vA<0.01)discard;
      float a=vA*(1.0-length(c)*2.0);gl_FragColor=vec4(vC*a,a);}`,
});
const loopPoints = new THREE.Points(loopGeo,loopMat);
scene.add(loopPoints);
const loopStates=Array.from({length:N_LOOPS},(_,i)=>({
  a1:(i/N_LOOPS)*Math.PI*2, a2:(i/N_LOOPS)*Math.PI*2+0.5+rand()*0.7,
  h:3.0+rand()*5.5, spd:0.14+rand()*0.12, phase:i/N_LOOPS,
  col:FLARE_COLORS[i%FLARE_COLORS.length].clone(),
}));
function bezP(t,p0,p1,p2){const m=1-t;return{x:m*m*p0.x+2*m*t*p1.x+t*t*p2.x,y:m*m*p0.y+2*m*t*p1.y+t*t*p2.y,z:m*m*p0.z+2*m*t*p1.z+t*t*p2.z};}
function updateLoops(t, worldR){
  const R=worldR||SUN_R;
  const hScale=R/SUN_R;
  loopStates.forEach((lp,li)=>{
    const ph=(t*lp.spd+lp.phase)%1.0;
    if(ph<0.015){
      lp.reseedN = lp.reseedN||0;
      const seedBase = li*13.1+lp.reseedN*7.77;
      if(detRand(seedBase)<0.08){
        lp.reseedN++;
        const sb2=li*13.1+lp.reseedN*7.77;
        lp.a1=detRand(sb2+1)*Math.PI*2;
        lp.a2=lp.a1+0.4+detRand(sb2+2)*1.0;
        lp.h=3.0+detRand(sb2+3)*6.0;
        lp.spd=0.12+detRand(sb2+4)*0.14;
        lp.col=FLARE_COLORS[Math.floor(detRand(sb2+5)*FLARE_COLORS.length)].clone();
      }
    }
    const h=lp.h*hScale;
    const p0={x:R*Math.cos(lp.a1),y:0,z:R*Math.sin(lp.a1)};
    const p2={x:R*Math.cos(lp.a2),y:0,z:R*Math.sin(lp.a2)};
    const mx=(p0.x+p2.x)*0.5,mz=(p0.z+p2.z)*0.5,ml=Math.sqrt(mx*mx+mz*mz)||1;
    const p1={x:mx/ml*(R+h),y:h*0.42,z:mz/ml*(R+h)};
    const base=li*LOOP_PTS;
    for(let j=0;j<LOOP_PTS;j++){
      const u=j/(LOOP_PTS-1),bp=bezP(u,p0,p1,p2);
      loopPos[(base+j)*3]=bp.x;loopPos[(base+j)*3+1]=bp.y;loopPos[(base+j)*3+2]=bp.z;
      loopCol[(base+j)*3]=lp.col.r;loopCol[(base+j)*3+1]=lp.col.g;loopCol[(base+j)*3+2]=lp.col.b;
      const dist=Math.abs(u-ph),wrap=Math.min(dist,1.0-dist);
      loopAlp[base+j]=Math.max(0,1.0-wrap*12.0)*1.1;
    }
  });
  loopGeo.attributes.position.needsUpdate = true;
  loopGeo.attributes.color.needsUpdate    = true;
  loopGeo.attributes.alpha.needsUpdate    = true;
}

// ── Ignition flash ────────────────────────────────────────────────────────────
const flashMat = new THREE.ShaderMaterial({
  uniforms:{ time:{value:0}, opacity:{value:0}, asymmetry:{value:0}, flashHue:{value:0.08}, flashTint:{value:0} },
  transparent:true, side:THREE.BackSide, blending:THREE.AdditiveBlending, depthWrite:false,
  vertexShader:`
    uniform float time, asymmetry;
    void main(){
      vec3 pn = normalize(position);
      float lump = sin(pn.x*2.3+time*0.6)*sin(pn.y*1.7+time*0.4)*sin(pn.z*2.1+time*0.5);
      vec3 displaced = position * (1.0 + lump*asymmetry*0.35);
      gl_Position = projectionMatrix*modelViewMatrix*vec4(displaced,1.0);
    }
  `,
  fragmentShader: HSL_GLSL + `
    uniform float opacity, flashHue, flashTint;
    void main(){
      vec3 baseCol = vec3(1.0,0.996,0.973);
      vec3 tintCol = hsl2rgb(flashHue, 0.85, 0.72) * 1.3;
      gl_FragColor = vec4(mix(baseCol, tintCol, flashTint), opacity);
    }
  `,
});
const flashMesh = new THREE.Mesh(new THREE.SphereGeometry(55,32,32), flashMat);
flashMesh.visible = false;
scene.add(flashMesh);

let ignitionTriggered = false;
const GALAXY_DUR = 12;
const IGNITE_DUR = 4;
let colorCycleT = 0;
const COLOR_PERIOD = 45;

// ── Background color ──────────────────────────────────────────────────────────
const bg = { r:0, g:0, b:0.016 };
const bgTarget = { r:0, g:0, b:0.016 };
const bgColorScratch = new THREE.Color(); // reused every frame — allocating a new Color here every frame was real, continuous GC pressure
function lerpBg(spd){
  bg.r+=(bgTarget.r-bg.r)*spd; bg.g+=(bgTarget.g-bg.g)*spd; bg.b+=(bgTarget.b-bg.b)*spd;
  renderer.setClearColor(bgColorScratch.setRGB(bg.r,bg.g,bg.b),1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE — driven by Theatre.js sequence position (T)
// ═══════════════════════════════════════════════════════════════════════════════
const T_VOID_END   = 12;
const T_FINE_END   = 44;
const T_CLOUD_END  = 50;
const T_SPARK_END  = 56;
const T_FULL       = 56;
const T_COLL_START = 56;
const T_COLL_END   = 74;

let T = 0; // driven by sheet.sequence.position
let autoWarmBias = 0; // recomputed fresh each frame in timeline() — never self-referential, so the
                       // warmBias sliders can never get stuck ratcheted at a stale high value
let rotAngleFine = 0, rotAngleCloud = 0, rotAngleSpark = 0; // properly integrated rotation angles
let sunSpinAngle = 0; // integrated the same way — speed*dt each frame, not time*speed

function timeline(){
  // T is set externally from Theatre playhead before this call
  autoWarmBias = 0;

  const voidBreath = 0.5 + 0.5*Math.sin(T*0.55);

  if(T < T_VOID_END) {
    const sub = T / T_VOID_END;
    starMat.opacity = easeOut(sub) * 0.16;
    voidMat.opacity = easeOut(sub) * (0.12 + voidBreath * 0.07);
    bgTarget.r = 0.004; bgTarget.g = 0; bgTarget.b = 0.022;
    sphTarget.r = 380 - easeOut(sub) * 60;
    fineMat.uniforms.rotSpeed.value  = easeOut(sub) * 0.012;
    cloudMat.uniforms.rotSpeed.value = easeOut(sub) * 0.005;
    sparkMat.uniforms.rotSpeed.value = easeOut(sub) * 0.012;
  }

  if(T >= T_VOID_END) {
    const bloomSub = clamp((T - T_VOID_END) / (T_FULL - T_VOID_END), 0, 1);
    starMat.opacity = 0.16 + easeOut(bloomSub) * 0.32;
    voidMat.opacity = Math.max(0, 0.12 - easeOut(bloomSub) * 0.12);
    bgTarget.r = easeOut(bloomSub) * 0.011;
    bgTarget.g = 0;
    bgTarget.b = 0.022 - bloomSub * 0.006;
    const cloudSub = clamp((T - T_VOID_END) / (T_CLOUD_END - T_VOID_END), 0, 1);
    cloudMat.uniforms.gAlpha.value = easeOut(cloudSub) * 0.92;
    hazeRed.material.opacity  = easeOut(cloudSub) * 0.10;
    hazeBlue.material.opacity = easeOut(cloudSub) * 0.08;
    hazeGold.material.opacity = easeOut(cloudSub) * 0.06;
    const fineSub = clamp((T - (T_VOID_END+2)) / (T_FINE_END - (T_VOID_END+2)), 0, 1);
    fineMat.uniforms.formT.value  = fineSub;
    fineMat.uniforms.gAlpha.value = slowForm(fineSub);
    const sparkSub = clamp((T - (T_VOID_END+16)) / (T_SPARK_END - (T_VOID_END+16)), 0, 1);
    sparkMat.uniforms.gAlpha.value = slowForm(sparkSub);
    const rotSub = clamp((T - T_VOID_END) / (T_FINE_END - T_VOID_END), 0, 1);
    fineMat.uniforms.rotSpeed.value  = 0.012 + easeOut(rotSub) * 0.046;
    cloudMat.uniforms.rotSpeed.value = 0.005 + easeOut(rotSub) * 0.021;
    sparkMat.uniforms.rotSpeed.value = 0.012 + easeOut(rotSub) * 0.046;
  }

  if(T >= T_COLL_START) {
    const cSub   = clamp((T - T_COLL_START) / (T_COLL_END - T_COLL_START), 0, 1);
    const cCurve = cSub * cSub * cSub;
    fineMat.uniforms.collapseT.value  = cCurve;
    cloudMat.uniforms.collapseT.value = cCurve;
    // spinRampShape is its own exponent, independent of cCurve above — cCurve
    // drives how fast particles visually converge inward, spinRamp only shapes
    // how the rotation speed ramps in. Default 3 matches cCurve's own cubic
    // shape exactly (no change from before); 1 = a fully even/linear ramp,
    // higher = stays slow longer then rushes at the end.
    const spinRamp = Math.pow(cSub, tVals.cloudSpinCurve);
    // Only the ramp-ABOVE-baseline is scaled by cloudSpin — the baseline itself
    // (0.058 / 0.026 / 0.058) must stay untouched so it exactly matches the speed
    // the nebula phase was already at when collapse begins, or spinSpeed>1 causes
    // a discontinuous jump right at T=56 instead of a smooth ramp from there.
    fineMat.uniforms.rotSpeed.value  = 0.058 + spinRamp * (0.32 - 0.058) * tVals.cloudSpin;
    cloudMat.uniforms.rotSpeed.value = 0.026 + spinRamp * (0.32 - 0.026) * tVals.cloudSpin;
    sparkMat.uniforms.rotSpeed.value = 0.058 + spinRamp * (0.32 - 0.058) * tVals.cloudSpin;
    autoWarmBias = easeOut(cSub) * 0.55;
    sparkMat.uniforms.gAlpha.value = Math.max(0, 1.0 - cSub * 3.0);
    coreVisibility = cCurve * cCurve;
    sphTarget.r = 320 - cCurve * 185;
    bgTarget.r = 0.011 + cCurve * 0.014;
    bgTarget.g = cCurve * 0.004;
    bgTarget.b = Math.max(0, 0.016 - cCurve * 0.013);
    hazeRed.material.opacity  = 0.10 + cCurve * 0.08;
    hazeBlue.material.opacity = Math.max(0, 0.08 - cCurve * 0.08);
    hazeGold.material.opacity = 0.06 + cCurve * 0.07;
  }
}

// ── Render loop ───────────────────────────────────────────────────────────────
let last = performance.now();
let prevT = -1;

function tick(){
  requestAnimationFrame(tick);
  const now = performance.now();
  const dt  = Math.min((now-last)/1000, 0.05); last=now;

  // Auto-clock drives T; push scaled position to Theatre so its cursor tracks the scene
  if (!paused) T += dt * tVals.speed;
  if (loopGroupName) {
    const loopGroup = CONTROL_GROUPS.find(g => g.name === loopGroupName);
    if (loopGroup) {
      const [ls, le] = loopGroup.window();
      if (T < ls || T > le) T = ls;
    }
  } else if (customLoopRange) {
    const [ls, le] = customLoopRange;
    if (T < ls || T > le) T = ls;
  }
  // Theatre timeline is 10s wide, scene is 90s — scale so Theatre cursor syncs
  sheet.sequence.position = Math.min(9.99, T / 9);

  // Keyframed properties win over Theatre/sliders for this frame — applied early
  // so every later read of tVals (timeline(), ignition sequence, overrides) sees it.
  applySequencers();

  // Reset one-shot state when scrubbing/jumping back
  if (T < prevT - 0.1) {
    ignitionTriggered = false;
    sunMesh.visible   = false;
    flashMesh.visible = false;
    flashMesh.material.uniforms.opacity.value = 0;
    coronaGroup.visible = false;
    coreVisibility = 0;
    coreWhite.material.opacity = 0; coreAmber.material.opacity  = 0;
    coreOrange.material.opacity= 0; coreDark.material.opacity   = 0;
    coreLight.intensity = 0;
    galaxyDiscMat.uniforms.gAlpha.value = 0;
    fineMat.uniforms.galaxyT.value = 0;
    fineMat.uniforms.collapseT.value  = 0;
    cloudMat.uniforms.collapseT.value = 0;
    loopAlp.fill(0);
    loopPos.fill(0);
    loopGeo.attributes.alpha.needsUpdate    = true;
    loopGeo.attributes.position.needsUpdate = true;
  }
  prevT = T;

  // Shader time is derived directly from T (not accumulated independently) so
  // the visual is a pure function of scene position — jumping T via a loop,
  // scrub, or reset always reproduces the exact same look, with no memory of
  // how many times a section has looped or whether speed was ever changed.
  fineMat.uniforms.time.value  = T;
  cloudMat.uniforms.time.value = T;
  sparkMat.uniforms.time.value = T;

  // Derived time values
  const IGNITE_DUR_CUR   = tVals.igniteDuration;
  const collapseTime     = Math.max(0, T - T_COLL_START);
  let   ignitionT        = Math.min(Math.max(0, T - T_COLL_END), IGNITE_DUR_CUR);
  if (tVals.igniteLock >= 0) ignitionT = tVals.igniteLock * IGNITE_DUR_CUR;
  const ignitionDone     = ignitionT >= IGNITE_DUR_CUR;
  const postIgnitionT    = Math.max(0, T - (T_COLL_END + IGNITE_DUR_CUR));

  let bigFlash = 0;
  if(coreVisibility > 0 && !ignitionTriggered) {
    const pulse  = Math.pow(Math.max(0, Math.sin(collapseTime*0.9)), 2.5);
    bigFlash     = Math.pow(Math.max(0, Math.sin(collapseTime*0.28)), 8.0) * 1.4;
    const core   = (pulse + bigFlash) * coreVisibility;
    coreWhite.material.opacity  = core * 1.10;
    coreAmber.material.opacity  = core * 0.88;
    coreOrange.material.opacity = core * 0.58;
    coreDark.material.opacity   = coreVisibility * 0.65 + core * 0.30;
    coreLight.intensity         = core * 24;
  }

  timeline();

  // Rotation angle is properly accumulated (speed × dt each frame) instead of
  // "current speed × absolute elapsed time" — the old formula overstated rotation
  // any time rotSpeed was still ramping up, which is exactly the formation window.
  if (!paused) {
    rotAngleFine  += fineMat.uniforms.rotSpeed.value  * dt;
    rotAngleCloud += cloudMat.uniforms.rotSpeed.value * dt;
    rotAngleSpark += sparkMat.uniforms.rotSpeed.value * dt;
    sunSpinAngle  += tVals.sunSpinSpeed * dt;
  }
  fineMat.uniforms.rotAngle.value  = rotAngleFine;
  cloudMat.uniforms.rotAngle.value = rotAngleCloud;
  sparkMat.uniforms.rotAngle.value = rotAngleSpark;
  sunMesh.rotation.y = sunSpinAngle;

  // ── Ignition trigger ──────────────────────────────────────────────────────
  if(!ignitionTriggered && fineMat.uniforms.collapseT.value >= 1.0) {
    ignitionTriggered = true;
    sunMesh.visible   = true;
    flashMesh.visible = true;
    sunMesh.scale.setScalar(22.0 * tVals.ballRadius * tVals.sunSizeMult);
    sunMat.uniforms.emergence.value = 0;
    sunMat.uniforms.distort.value   = 0;
    coreWhite.material.opacity = 0; coreAmber.material.opacity  = 0;
    coreOrange.material.opacity= 0; coreDark.material.opacity   = 0;
  }

  // ── Ignition sequence ──────────────────────────────────────────────────────
  if(ignitionTriggered) {
    const eO = t => 1 - Math.pow(1-t, 3);
    // Same fix as above — derive from T (time since ignition began) instead of
    // accumulating independently, so replaying/looping ignition is reproducible.
    const ignitionClock = Math.max(0, T - T_COLL_END);
    sunMat.uniforms.time.value  = ignitionClock;
    coronaMats.forEach(m => m.uniforms.time.value = ignitionClock);
    flashMat.uniforms.time.value = ignitionClock;
    flashMat.uniforms.asymmetry.value = tVals.ballAsym;
    flashMat.uniforms.flashHue.value = tVals.flashHue;
    flashMat.uniforms.flashTint.value = tVals.flashTint;
    flashMesh.scale.setScalar(tVals.ballRadius);

    if(!ignitionDone) {
      const pct = ignitionT / IGNITE_DUR_CUR;

      sunMesh.scale.setScalar((1.0 + 21.0 * Math.exp(-pct * 5.2)) * tVals.ballRadius * tVals.sunSizeMult);
      const distBell = Math.max(0, Math.sin(Math.PI * Math.min(1.0, pct / 0.78)));
      sunMat.uniforms.distort.value = Math.pow(distBell, 0.75);
      const eStart = tVals.emergenceStart;
      const ePct = Math.max(0, (pct - eStart) / Math.max(0.01, 1.0 - eStart));
      sunMat.uniforms.emergence.value = ePct * ePct * (3.0 - 2.0 * ePct);
      const fArc = pct < 0.14 ? pct / 0.14 : Math.max(0, 1.0 - (pct - 0.14) / tVals.ballBlend);
      flashMat.uniforms.opacity.value = fArc * fArc * 0.44;
      const coreBright  = 50.0 * Math.exp(-pct * 3.8);
      const preBurst    = 20.0 * Math.max(0, (pct - 0.62) / 0.20) * Math.exp(-Math.pow((pct - 0.84) / 0.09, 2));
      coreLight.intensity = (8 + coreBright + preBurst) * tVals.coreGlow;
      fineMat.uniforms.gAlpha.value  = Math.max(0, 1.0 - pct * 7);
      cloudMat.uniforms.gAlpha.value = Math.max(0, 1.0 - pct * 7);
      sphTarget.r = 95 + 42 * Math.exp(-pct * 4.0);
      const bgWarm = Math.max(0, Math.sin(pct * Math.PI * 0.65) * 0.065) * tVals.bgTintAmount;
      bgTarget.r = 0.003 + bgWarm;
      bgTarget.g = 0.001 + bgWarm * 0.28;
      bgTarget.b = 0.001;
      const coronaStart = tVals.ballCoronaStart;
      const cSub = Math.max(0, (pct - coronaStart) / (1.0 - coronaStart));
      coronaMats.forEach((m,i) => {
        m.uniforms.globalAlpha.value = eO(cSub);
        m.uniforms.baseGlowStrength.value = CORONA_BASE_GLOW[i] * tVals.coronaGlow;
        m.uniforms.flareStrength.value    = CORONA_BASE_FLARE[i] * tVals.coronaFlareStrength;
        m.uniforms.radialFalloff.value    = CORONA_BASE_RADIAL[i] * tVals.coronaSpread;
        m.uniforms.flareFalloff.value     = CORONA_BASE_FLAREFALLOFF[i] * tVals.coronaSpread;
        m.uniforms.glowColor.value.copy(CORONA_BASE_COLORS[i]);
      });
      applyCoronaHueShift(tVals.coronaHueShift);
      if(pct > coronaStart){
        coronaGroup.visible = true;
        updateLoops(sunMat.uniforms.time.value, SUN_R * sunMesh.scale.x);
      }
      if(pct >= 1.0) { flashMesh.visible = false; }

    } else {
      // Post-ignition: color cycles, loops run, galaxy forms
      flashMesh.visible = false;
      flashMat.uniforms.opacity.value = 0;
      colorCycleT = postIgnitionT;
      sunMat.uniforms.hueMode.value = (colorCycleT / COLOR_PERIOD) * 5.0;
      const mode = sunMat.uniforms.hueMode.value % 5;
      const mi = Math.floor(mode), mf = mode - mi;
      coronaMats.forEach((mat, ci) => {
        const c1 = CORONA_HUES_RGB[mi % 5][ci];
        const c2 = CORONA_HUES_RGB[(mi+1) % 5][ci];
        mat.uniforms.glowColor.value.lerpColors(c1, c2, mf);
        mat.uniforms.globalAlpha.value = 1.0;
        mat.uniforms.baseGlowStrength.value = CORONA_BASE_GLOW[ci] * tVals.coronaGlow;
        mat.uniforms.flareStrength.value    = CORONA_BASE_FLARE[ci] * tVals.coronaFlareStrength;
        mat.uniforms.radialFalloff.value    = CORONA_BASE_RADIAL[ci] * tVals.coronaSpread;
        mat.uniforms.flareFalloff.value     = CORONA_BASE_FLAREFALLOFF[ci] * tVals.coronaSpread;
      });
      applyCoronaHueShift(tVals.coronaHueShift);
      coreLight.intensity = 8 + 4 * Math.sin(colorCycleT * 0.3);
      if(!drag) sphTarget.theta += 0.00042;
      updateLoops(sunMat.uniforms.time.value, SUN_R * sunMesh.scale.x);

      const galaxyTimeElapsed = postIgnitionT;
      const gt = Math.min(1.0, galaxyTimeElapsed / GALAXY_DUR);
      const gtCurve = gt * gt;
      fineMat.uniforms.galaxyT.value = gtCurve;
      galaxyDiscMat.uniforms.gAlpha.value = Math.min(1.0, gtCurve * 1.5);
      galaxyDiscMat.uniforms.time.value = postIgnitionT;
      cloudMat.uniforms.gAlpha.value = Math.max(0, 1.0 - gtCurve * 2.5);
      sunMesh.scale.setScalar((1.0 + gtCurve * 3.5) * tVals.sunSizeMult);
      if(gt < 0.96) {
        sphTarget.r = 95 + gtCurve * 210;
        sphTarget.phi += (1.10 - sphTarget.phi) * 0.006;
      }
    }

    if(coronaGroup.visible) coronaGroup.quaternion.copy(camera.quaternion);
  }

  lerpBg(0.022);

  const rotNorm = clamp((fineMat.uniforms.rotSpeed.value - 0.058) / (0.32 - 0.058), 0, 1);
  const autoRotate = ignitionDone ? 0 : (0.00038 + rotNorm * (0.00055 - 0.00038));
  if(!drag) sphTarget.theta += autoRotate;
  sph.r     += (sphTarget.r-sph.r)*0.040;
  sph.theta += (sphTarget.theta-sph.theta)*0.08;
  sph.phi   += (sphTarget.phi-sph.phi)*0.08;
  applyCamera();

  // Formation locks — override timeline-driven values when set above -1
  if (tVals.formLock >= 0) {
    fineMat.uniforms.formT.value    = tVals.formLock;
    fineMat.uniforms.gAlpha.value   = tVals.formLock;
    cloudMat.uniforms.gAlpha.value  = tVals.formLock;
  }
  if (tVals.collapseLock >= 0) {
    fineMat.uniforms.collapseT.value  = tVals.collapseLock;
    cloudMat.uniforms.collapseT.value = tVals.collapseLock;
  }

  // Theatre overrides — applied last so they always win
  // Once ignition completes, GalaxyCloud takes over driving these same four
  // uniforms instead of CollapseCloud/Nebula — otherwise they'd just freeze at
  // whichever value their last keyframe left them at (those groups' windows
  // both end at/before 74s) for the rest of the scene, including the galaxy phase.
  fineMat.uniforms.brightMult.value  = ignitionDone ? tVals.galaxyCloudBright : tVals.nebulaBright;
  cloudMat.uniforms.brightMult.value = ignitionDone ? tVals.galaxyCloudBright : tVals.nebulaBright;
  drainMat.uniforms.gAlpha.value    *= tVals.collapseBright;
  cvortMat.uniforms.gAlpha.value    *= tVals.collapseBright;
  fineMat.uniforms.warmBias.value    = ignitionDone ? tVals.galaxyCloudWarm : Math.max(autoWarmBias, tVals.nebulaWarm);
  cloudMat.uniforms.warmBias.value   = ignitionDone ? tVals.galaxyCloudWarm : Math.max(autoWarmBias, tVals.collapseWarm);
  fineMat.uniforms.turbMult.value    = tVals.cloudTurb;
  cloudMat.uniforms.turbMult.value   = tVals.cloudTurb;
  fineMat.uniforms.spiralMult.value  = tVals.cloudSpiral;
  cloudMat.uniforms.spiralMult.value = tVals.cloudSpiral;
  fineMat.uniforms.coreMult.value    = tVals.cloudCore;
  cloudMat.uniforms.coreMult.value   = tVals.cloudCore;
  fineMat.uniforms.hotHue.value      = ignitionDone ? tVals.galaxyCloudHue : tVals.cloudHotHue;
  cloudMat.uniforms.hotHue.value     = ignitionDone ? tVals.galaxyCloudHue : tVals.cloudHotHue;
  fineMat.uniforms.satMult.value     = ignitionDone ? tVals.galaxyCloudSat : tVals.cloudSat;
  cloudMat.uniforms.satMult.value    = ignitionDone ? tVals.galaxyCloudSat : tVals.cloudSat;
  fineMat.uniforms.cloudScale.value  = tVals.cloudScale;
  cloudMat.uniforms.cloudScale.value = tVals.cloudScale;
  fineMat.uniforms.ballForm.value  = tVals.cloudBallForm;
  cloudMat.uniforms.ballForm.value = tVals.cloudBallForm;
  applyCoreHueShift(tVals.coreHue);
  CORE_GLOW_MESHES.forEach(m => m.scale.setScalar(tVals.coreGlowSize));
  if (ignitionTriggered) {
    sunMat.uniforms.hueMode.value    = tVals.sunHue > 0 ? tVals.sunHue : sunMat.uniforms.hueMode.value;
    // (corona glow/flare/spread/hue are already set from fixed bases in the
    // ignition-sequence block above — no separate override needed here)
    sunMat.uniforms.distort.value   *= tVals.distortAmt;
    sunMat.uniforms.distFreqMult.value = tVals.ballFreq;
    sunMat.uniforms.distAmpMult.value  = tVals.ballAmp;
    sunMat.uniforms.rippleStr.value    = tVals.sunRipple;
    flashMat.uniforms.opacity.value  *= tVals.flashIntensity;
  }

  const liveFlags = {
    fine:          fineMat.uniforms.gAlpha.value  > 0.01,
    cloud:         cloudMat.uniforms.gAlpha.value > 0.01,
    collapseShape: (fineMat.uniforms.collapseT.value  > 0.01 && fineMat.uniforms.gAlpha.value  > 0.01) ||
                   (cloudMat.uniforms.collapseT.value > 0.01 && cloudMat.uniforms.gAlpha.value > 0.01),
    ignite:        ignitionTriggered && !ignitionDone,
    sun:           ignitionTriggered,
    galaxy:        fineMat.uniforms.galaxyT.value > 0.01,
  };
  updateStatusPanel(liveFlags);
  updateControlsPanel(liveFlags);
  updateClock(T, paused, tVals.igniteDuration);
  renderer.render(scene, camera);
}
tick();
