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
});

// Collapse Cloud — shape/color of the collapsing nebula as it nears ignition (T≈56-74, esp. the 72-74 tail)
const cloudShapeObj = sheet.object('CollapseCloud', {
  turbulence:  types.number(1.0,  { range: [0, 3] }),    // multiplies the inward-fall turbulence amplitude
  spiralTight: types.number(1.0,  { range: [0.3, 3] }),  // multiplies how tightly wound the drain spiral looks
  coreSize:    types.number(1.0,  { range: [0.2, 3] }),  // >1 = core cluster concentrates/brightens sooner
  hotHue:      types.number(0.07, { range: [0, 1] }),    // hue of the hottest (innermost) particles
  satMult:     types.number(1.0,  { range: [0, 2] }),    // saturation multiplier
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
});

let tVals = {
  speed: 1, nebulaBright: 1, nebulaWarm: 0, formLock: -1,
  collapseBright: 1, collapseWarm: 0, collapseLock: -1,
  igniteDuration: 4, flashIntensity: 1, distortAmt: 1, emergenceStart: 0.68, coreGlow: 1,
  sunHue: 0, coronaGlow: 1,
  cloudTurb: 1, cloudSpiral: 1, cloudCore: 1, cloudHotHue: 0.07, cloudSat: 1,
  ballRadius: 1, ballFreq: 1, ballAmp: 1, ballAsym: 0, ballBlend: 0.36, ballCoronaStart: 0.80, igniteLock: -1,
};
playbackObj.onValuesChange(v  => { tVals.speed           = v.speed; });
nebulaObj.onValuesChange(v    => { tVals.nebulaBright = v.brightMult; tVals.nebulaWarm = v.warmBias; tVals.formLock = v.formLock; });
collapseObj.onValuesChange(v  => { tVals.collapseBright = v.brightMult; tVals.collapseWarm = v.warmBias; tVals.collapseLock = v.collapseLock; });
ignitionObj.onValuesChange(v  => { tVals.igniteDuration = v.duration; tVals.flashIntensity = v.flashIntensity; tVals.distortAmt = v.distortAmt; tVals.emergenceStart = v.emergenceStart; tVals.coreGlow = v.coreGlow; });
sunObj.onValuesChange(v       => { tVals.sunHue            = v.hueMode; tVals.coronaGlow = v.coronaGlow; });
cloudShapeObj.onValuesChange(v => { tVals.cloudTurb = v.turbulence; tVals.cloudSpiral = v.spiralTight; tVals.cloudCore = v.coreSize; tVals.cloudHotHue = v.hotHue; tVals.cloudSat = v.satMult; });
ballObj.onValuesChange(v      => { tVals.ballRadius = v.radius; tVals.ballFreq = v.distortFreq; tVals.ballAmp = v.distortAmp; tVals.ballAsym = v.asymmetry; tVals.ballBlend = v.blendWidth; tVals.ballCoronaStart = v.coronaStart; tVals.igniteLock = v.igniteLock; });

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
const statusEl = document.createElement('div');
statusEl.style.cssText = [
  'position:fixed', 'bottom:130px', 'left:50%', 'transform:translateX(-50%)',
  'font:12px/1.7 monospace', 'color:rgba(255,255,255,0.88)',
  'background:rgba(0,0,0,0.65)', 'backdrop-filter:blur(6px)',
  'padding:10px 16px', 'border-radius:10px',
  'border:1px solid rgba(255,255,255,0.15)',
  'cursor:grab', 'z-index:9999',
  'white-space:pre', 'user-select:none'
].join(';');
document.body.appendChild(statusEl);
{
  let dragging = false, ox = 0, oy = 0;
  statusEl.addEventListener('mousedown', e => {
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
function updateStatusPanel(f){
  const dot = on => on ? '●' : '○';
  const ignEnd = (74 + tVals.igniteDuration).toFixed(1);
  statusEl.textContent = [
    `${dot(true)}  Playback       0–90s      — always on`,
    `${dot(f.fine)}  Nebula         ~14–74s    — fine-spiral particles${f.fine?'':'  (inert now)'}`,
    `${dot(f.cloud)}  Collapse       ~12–74s    — cloud-puff warmBias only${f.cloud?'':'  (inert now)'}; brightMult ⚠ unwired`,
    `${dot(f.collapseShape)}  CollapseCloud  56–74s     — shape/color during collapse${f.collapseShape?'':'  (inert now)'}`,
    `${dot(f.ignite)}  Ignition       74–${ignEnd}s  — flash + sun emergence${f.ignite?'':'  (inert now)'}`,
    `${dot(f.ignite)}  ExplosionBall  74–${ignEnd}s  — flash/sun ripple shape${f.ignite?'':'  (inert now)'}`,
    `${dot(f.sun)}  Sun            74–90s     — hueMode + corona${f.sun?'':'  (inert now)'}`,
    `${dot(f.galaxy)}  Galaxy disc    ${ignEnd}–90s — disc formation${f.galaxy?'':'  (inert now)'}`,
  ].join('\n');
}

// ── Pop-out controls window ────────────────────────────────────────────────────
// Plain sliders bound straight to tVals (the same object Theatre.js writes into),
// grouped by scene stage, each labeled with the exact second-range it affects.
// Opens in a real separate browser window so it can live on a second monitor.
const CONTROL_GROUPS = [
  { name:'Playback', range: () => `0–90s (always)`, props:[
    { key:'speed', label:'speed', min:0, max:4, step:0.01 },
  ]},
  { name:'Nebula', range: () => `~14–74s (fine-spiral particles; fades fast once ignition starts)`, props:[
    { key:'nebulaBright', label:'brightMult', min:0, max:3, step:0.01 },
    { key:'nebulaWarm',   label:'warmBias',   min:0, max:1, step:0.01 },
    { key:'formLock',     label:'formLock',   min:-1, max:1, step:0.01 },
  ]},
  { name:'Collapse', range: () => `~12–74s (cloud puffs — warmBias only; brightMult ⚠ unwired)`, props:[
    { key:'collapseBright', label:'brightMult ⚠', min:0, max:3, step:0.01 },
    { key:'collapseWarm',   label:'warmBias',      min:0, max:1, step:0.01 },
    { key:'collapseLock',   label:'collapseLock',  min:-1, max:1, step:0.01 },
  ]},
  { name:'CollapseCloud', range: () => `56–74s`, props:[
    { key:'cloudTurb',   label:'turbulence',  min:0,   max:3, step:0.01 },
    { key:'cloudSpiral', label:'spiralTight', min:0.3, max:3, step:0.01 },
    { key:'cloudCore',   label:'coreSize',    min:0.2, max:3, step:0.01 },
    { key:'cloudHotHue', label:'hotHue',      min:0,   max:1, step:0.01 },
    { key:'cloudSat',    label:'satMult',     min:0,   max:2, step:0.01 },
  ]},
  { name:'Ignition', range: () => `74–${(74+tVals.igniteDuration).toFixed(1)}s`, props:[
    { key:'igniteDuration', label:'duration',       min:1, max:30,   step:0.1 },
    { key:'flashIntensity', label:'flashIntensity', min:0, max:3,    step:0.01 },
    { key:'distortAmt',     label:'distortAmt',     min:0, max:3,    step:0.01 },
    { key:'emergenceStart', label:'emergenceStart', min:0, max:0.99, step:0.01 },
    { key:'coreGlow',       label:'coreGlow',       min:0, max:4,    step:0.01 },
  ]},
  { name:'ExplosionBall', range: () => `74–${(74+tVals.igniteDuration).toFixed(1)}s (same window as Ignition)`, props:[
    { key:'ballRadius',      label:'radius',      min:0.3,  max:3,    step:0.01 },
    { key:'ballFreq',        label:'distortFreq', min:0.2,  max:4,    step:0.01 },
    { key:'ballAmp',         label:'distortAmp',  min:0,    max:3,    step:0.01 },
    { key:'ballAsym',        label:'asymmetry',   min:0,    max:1,    step:0.01 },
    { key:'ballBlend',       label:'blendWidth',  min:0.05, max:0.8,  step:0.01 },
    { key:'ballCoronaStart', label:'coronaStart', min:0.3,  max:0.95, step:0.01 },
    { key:'igniteLock',      label:'igniteLock',  min:-1,   max:1,    step:0.01 },
  ]},
  { name:'Sun', range: () => `74–90s (post-ignition)`, props:[
    { key:'sunHue',     label:'hueMode',    min:0, max:5, step:0.01 },
    { key:'coronaGlow', label:'coronaGlow', min:0, max:3, step:0.01 },
  ]},
];

const panelEl = document.createElement('div');
panelEl.style.cssText = 'display:none;font:12px/1.4 monospace;color:#eee;background:#0b0b10;padding:10px;';
const groupEls = []; // { dotEl, rangeEl, group, inputs:[{el,numEl,key}] }
CONTROL_GROUPS.forEach(group => {
  const box = document.createElement('div');
  box.style.cssText = 'margin-bottom:14px;padding:8px 10px;border:1px solid #333;border-radius:8px;background:#14141c;';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;';
  const dotEl = document.createElement('span');
  dotEl.textContent = '○';
  dotEl.style.cssText = 'margin-right:6px;';
  const title = document.createElement('span');
  title.style.cssText = 'font-weight:bold;color:#9cf;';
  title.textContent = group.name;
  const rangeEl = document.createElement('span');
  rangeEl.style.cssText = 'color:#888;font-size:11px;';
  const left = document.createElement('span'); left.appendChild(dotEl); left.appendChild(title);
  head.appendChild(left); head.appendChild(rangeEl);
  box.appendChild(head);
  const inputs = [];
  group.props.forEach(p => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:3px 0;';
    const lab = document.createElement('span');
    lab.textContent = p.label; lab.style.cssText = 'width:110px;color:#ccc;';
    const input = document.createElement('input');
    input.type = 'range'; input.min = p.min; input.max = p.max; input.step = p.step;
    input.value = tVals[p.key]; input.style.cssText = 'flex:1;';
    const num = document.createElement('span');
    num.style.cssText = 'width:48px;text-align:right;color:#9cf;';
    num.textContent = Number(tVals[p.key]).toFixed(2);
    input.addEventListener('input', () => {
      tVals[p.key] = parseFloat(input.value);
      num.textContent = tVals[p.key].toFixed(2);
    });
    row.appendChild(lab); row.appendChild(input); row.appendChild(num);
    box.appendChild(row);
    inputs.push({ el: input, numEl: num, key: p.key });
  });
  panelEl.appendChild(box);
  groupEls.push({ dotEl, rangeEl, group, inputs });
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
controlsBtn.addEventListener('click', () => {
  if (controlsWin && !controlsWin.closed) { controlsWin.focus(); return; }
  controlsWin = window.open('', 'OriginControls', 'width=420,height=920');
  controlsWin.document.title = 'Origin Scene — Controls';
  controlsWin.document.body.style.margin = '0';
  controlsWin.document.body.style.background = '#0b0b10';
  panelEl.style.display = 'block';
  controlsWin.document.body.appendChild(panelEl);
  controlsWin.addEventListener('beforeunload', () => {
    document.body.appendChild(panelEl);
    panelEl.style.display = 'none';
    controlsWin = null;
  });
});
document.body.appendChild(controlsBtn);

function updateControlsPanel(f){
  if (!controlsWin || controlsWin.closed) return;
  const liveMap = { Playback:true, Nebula:f.fine, Collapse:f.cloud, CollapseCloud:f.collapseShape,
    Ignition:f.ignite, ExplosionBall:f.ignite, Sun:f.sun };
  groupEls.forEach(({ dotEl, rangeEl, group, inputs }) => {
    dotEl.textContent = liveMap[group.name] ? '●' : '○';
    rangeEl.textContent = group.range();
    inputs.forEach(({ el, numEl, key }) => {
      if (controlsWin.document.activeElement !== el) {
        el.value = tVals[key];
        numEl.textContent = Number(tVals[key]).toFixed(2);
      }
    });
  });
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

function resetScene() {
  T = 0;
  paused = false;
  ignitionTriggered = false;
  coreVisibility = 0;

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
    const a=Math.random()*Math.PI*2, b=Math.acos(2*Math.random()-1);
    const r=30+Math.random()*280;
    p[i*3]=r*Math.sin(b)*Math.cos(a); p[i*3+1]=r*Math.sin(b)*Math.sin(a); p[i*3+2]=r*Math.cos(b);
    const t=Math.random();
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
    const t    = Math.random();
    const r    = 5 + t*130;
    const spin = r * 0.022;
    const base = (arm/NUM_ARMS)*Math.PI*2;
    const u    = Math.random()*0.999+0.0005;
    const g    = Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*Math.random());
    const angle  = base + spin + g*0.16;
    const rFinal = r + g*r*0.07;
    pos[i*3]   = rFinal*Math.cos(angle);
    pos[i*3+1] = g*r*0.022;
    pos[i*3+2] = rFinal*Math.sin(angle);
    seed[i]    = Math.random();
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('nSeed',   new THREE.BufferAttribute(seed,1));

  fineMat = new THREE.ShaderMaterial({
    uniforms:{ time:{value:0}, gAlpha:{value:0}, formT:{value:0}, rotSpeed:{value:0.058}, brightMult:{value:1.0}, warmBias:{value:0}, collapseT:{value:0}, galaxyT:{value:0}, turbMult:{value:1.0}, spiralMult:{value:1.0}, coreMult:{value:1.0}, hotHue:{value:0.07}, satMult:{value:1.0} },
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader: HSL_GLSL + HUE_REMAP_GLSL + `
      attribute float nSeed;
      uniform float time;
      uniform float formT;
      uniform float rotSpeed;
      uniform float warmBias;
      uniform float collapseT;
      uniform float galaxyT;
      uniform float turbMult;
      uniform float spiralMult;
      uniform float coreMult;
      uniform float hotHue;
      uniform float satMult;
      varying vec3  vColor;
      varying float vAlpha;
      void main(){
        float s=nSeed;
        float formFactor=0.5+0.5*sin(time*0.028+s*2.1);
        float amp=2.0+formFactor*11.0;
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
        float rotA=time*rotSpeed;
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
        float nebulaHue=mix(mix(radHue,sh,0.36),0.08+s*0.07,warmBias);
        float nebulaLum=0.28+s*0.20+(1.0-normR)*0.10;
        float formed=1.0-formFactor;
        float nebulaAlpha=0.75*(0.38+formed*0.68)*reveal*(1.0-cloudiness*0.42);
        float coreFactor=1.0+(1.0-normR)*0.9;
        float nebulaPtSz=2.4*(0.50+s*1.55)*coreFactor*(0.62+formed*0.48)*(1.0+cloudiness*1.1)*640.0;
        float cycleSpeed=0.095+s*0.042;
        float loopT=fract(time*cycleSpeed+s);
        float tc=pow(loopT,0.80);
        float initR=length(position.xz);
        float rc=initR*(1.0-pow(tc,1.70));
        float winds=(2.8+initR*0.060)*spiralMult;
        float anglec=atan(position.z,position.x)+tc*winds*6.2832;
        float hc=position.y*(1.0-tc*0.88);
        float turbAmp=(0.4+tc*3.2)*(0.8+s*0.4)*turbMult;
        float tv1=time*(1.8+s*1.2)+s*6.2832;
        float tv2=time*(2.5+s*0.8)+s*4.1888;
        vec3 turb=vec3(sin(tv1)*turbAmp,cos(tv2)*0.22*turbAmp,cos(tv1)*turbAmp);
        vec3 collapsePos=vec3(rc*cos(anglec),hc,rc*sin(anglec))+turb*tc;
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
    const t    = Math.random();
    const r    = 8 + t*125;
    const spin = r * 0.022;
    const base = (arm/NUM_ARMS)*Math.PI*2;
    const scatter = (Math.random()-0.5)*r*0.55;
    const angle   = base + spin + scatter/Math.max(r,1);
    const rFinal  = r + (Math.random()-0.5)*r*0.35;
    pos[i*3]   = rFinal*Math.cos(angle);
    pos[i*3+1] = (Math.random()-0.5)*r*0.12;
    pos[i*3+2] = rFinal*Math.sin(angle);
    seed[i]    = Math.random();
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('nSeed',   new THREE.BufferAttribute(seed,1));

  cloudMat = new THREE.ShaderMaterial({
    uniforms:{ time:{value:0}, gAlpha:{value:0}, rotSpeed:{value:0.026}, brightMult:{value:1.0}, warmBias:{value:0}, collapseT:{value:0}, turbMult:{value:1.0}, spiralMult:{value:1.0}, coreMult:{value:1.0}, hotHue:{value:0.07}, satMult:{value:1.0} },
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader: HSL_GLSL + HUE_REMAP_GLSL + `
      attribute float nSeed;
      uniform float time;
      uniform float rotSpeed;
      uniform float warmBias;
      uniform float collapseT;
      uniform float turbMult;
      uniform float spiralMult;
      uniform float coreMult;
      uniform float hotHue;
      uniform float satMult;
      varying vec3  vColor;
      varying float vAlpha;
      varying vec2  vSeedOff;
      void main(){
        float s=nSeed;
        float formFactor=0.5+0.5*sin(time*0.012+s*1.5);
        float amp=4.0+formFactor*10.0;
        float t1=time*(0.018+s*0.010)+s*6.2832;
        float t2=time*(0.024+s*0.008)+s*4.1888;
        float t3=time*(0.020+s*0.013)+s*2.0944;
        vec3 drift=vec3(
          sin(t1)*amp+cos(t2*0.55)*amp*0.40,
          (cos(t2)*0.10+sin(t3)*0.07)*amp,
          cos(t3)*amp+sin(t1*0.68)*amp*0.40
        );
        float rotA=time*rotSpeed;
        float cr=cos(rotA),sr=sin(rotA);
        vec3 basePos=vec3(position.x*cr-position.z*sr,position.y,position.x*sr+position.z*cr);
        vec3 nebulaPos=basePos+drift;
        float loopT=fract(time*0.040+s);
        float tc=pow(loopT,0.70);
        float rCC=length(position.xz)*(1.0-pow(tc,2.0));
        float angleCC=atan(position.z,position.x)+tc*4.5*spiralMult*6.2832;
        float hCC=position.y*(1.0-tc*0.70);
        float ampCC=(3.0+tc*8.0)*turbMult;
        float tv1=time*(0.12+s*0.08)+s*6.2832;
        float tv2=time*(0.18+s*0.06)+s*4.1888;
        vec3 driftCC=vec3(sin(tv1)*ampCC+cos(tv2*0.6)*ampCC*0.4,
                          (cos(tv2)*0.09+sin(tv1)*0.07)*ampCC,
                          cos(tv1)*ampCC+sin(tv2*0.7)*ampCC*0.4);
        vec3 collapsePos=vec3(rCC*cos(angleCC),hCC,rCC*sin(angleCC))+driftCC*tc;
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
    const t     = Math.random();
    const r     = 5 + t*130;
    const spin  = r*0.022;
    const base  = (arm/NUM_ARMS)*Math.PI*2;
    const angle = base + spin + (Math.random()-0.5)*0.08;
    const rF    = r + (Math.random()-0.5)*r*0.03;
    pos[i*3]   = rF*Math.cos(angle);
    pos[i*3+1] = (Math.random()-0.5)*1.5;
    pos[i*3+2] = rF*Math.sin(angle);
    seed[i]    = Math.random();
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('nSeed',   new THREE.BufferAttribute(seed,1));

  sparkMat = new THREE.ShaderMaterial({
    uniforms:{ time:{value:0}, gAlpha:{value:0}, rotSpeed:{value:0.058} },
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader: HSL_GLSL + HUE_REMAP_GLSL + `
      attribute float nSeed;
      uniform float time;
      uniform float rotSpeed;
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
        float rotA=time*rotSpeed;
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
    const a=Math.random()*Math.PI*2, b=Math.acos(2*Math.random()-1), r=700+Math.random()*300;
    p[i*3]=r*Math.sin(b)*Math.cos(a); p[i*3+1]=r*Math.sin(b)*Math.sin(a); p[i*3+2]=r*Math.cos(b);
    const sc=pal[Math.floor(Math.random()*pal.length)];
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
    const arm=i%3, t=Math.random(), r=4+t*125, spin=r*0.022;
    const base=(arm/3)*Math.PI*2;
    const u=Math.random()*0.999+0.0005;
    const g=Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*Math.random());
    const angle=base+spin+g*0.14, rF=r+g*r*0.06;
    pos[i*3]=rF*Math.cos(angle); pos[i*3+1]=g*r*0.018; pos[i*3+2]=rF*Math.sin(angle);
    seed[i]=Math.random();
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
    const arm=i%3, t=Math.random(), r=6+t*110, spin=r*0.022;
    const base=(arm/3)*Math.PI*2;
    const scatter=(Math.random()-0.5)*r*0.50;
    const angle=base+spin+scatter/Math.max(r,1), rF=r+(Math.random()-0.5)*r*0.30;
    pos[i*3]=rF*Math.cos(angle); pos[i*3+1]=(Math.random()-0.5)*r*0.10; pos[i*3+2]=rF*Math.sin(angle);
    seed[i]=Math.random();
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
      const t=Math.pow(Math.random(),0.65), yR=t*58, spread=t*t*0.30, a=Math.random()*Math.PI*2;
      pos[i*3]=Math.cos(a)*yR*spread; pos[i*3+1]=side*yR; pos[i*3+2]=Math.sin(a)*yR*spread;
      seed[i]=Math.random();
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

// ── Galaxy disc ───────────────────────────────────────────────────────────────
const GALAXY_DISC_N = 28000;
const galaxyDiscGeo = new THREE.BufferGeometry();
{
  const pos   = new Float32Array(GALAXY_DISC_N * 3);
  const seeds = new Float32Array(GALAXY_DISC_N);
  for(let i = 0; i < GALAXY_DISC_N; i++){
    const s = Math.random(); seeds[i] = s;
    const r = Math.random();
    let gR, tightness;
    if(r < 0.12){
      gR = Math.random() * 28; tightness = 12;
    } else if(r < 0.72){
      gR = 18 + Math.random() * 220; tightness = 16;
    } else {
      gR = 12 + Math.random() * 240; tightness = 48;
    }
    const armOff = Math.floor(Math.random() * 2) * Math.PI;
    const gTheta = armOff + (gR / 75.0) * 2.8 + (Math.random() - 0.5) * 0.38;
    const gPerp  = gTheta + Math.PI * 0.5;
    const gSpread = (Math.random() - 0.5) * tightness;
    pos[i*3]   = gR * Math.cos(gTheta) + gSpread * Math.cos(gPerp);
    pos[i*3+1] = (Math.random() - 0.5) * 7;
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
  uniforms:{ time:{value:0}, hueMode:{value:0.0}, emergence:{value:0}, distort:{value:0}, distFreqMult:{value:1.0}, distAmpMult:{value:1.0} },
  vertexShader:`
    varying vec3 vPos; varying vec3 vNormal;
    uniform float time, distort, distFreqMult, distAmpMult;
    void main(){
      float rAmp = distort * 0.09 * distAmpMult;
      float fq = distFreqMult;
      float r1 = sin(position.y*7.0*fq+time*5.2*fq)*sin(position.x*5.5*fq+time*4.1*fq);
      float r2 = cos(position.z*6.5*fq+time*4.7*fq)*cos(position.y*4.8*fq+time*3.8*fq);
      float r3 = sin(position.x*8.0*fq+time*3.5*fq)*cos(position.z*5.0*fq+time*5.0*fq);
      float ripple = (r1*0.5+r2*0.35+r3*0.15) * rAmp;
      vec3 displaced = position + normalize(position) * ripple;
      vPos = displaced;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `,
  fragmentShader:`
    varying vec3 vPos; varying vec3 vNormal;
    uniform float time,hueMode,emergence,distort,distFreqMult,distAmpMult;
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
  a1:(i/N_LOOPS)*Math.PI*2, a2:(i/N_LOOPS)*Math.PI*2+0.5+Math.random()*0.7,
  h:3.0+Math.random()*5.5, spd:0.14+Math.random()*0.12, phase:i/N_LOOPS,
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
  uniforms:{ time:{value:0}, opacity:{value:0}, asymmetry:{value:0} },
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
  fragmentShader:`
    uniform float opacity;
    void main(){ gl_FragColor = vec4(1.0,0.996,0.973, opacity); }
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
function lerpBg(spd){
  bg.r+=(bgTarget.r-bg.r)*spd; bg.g+=(bgTarget.g-bg.g)*spd; bg.b+=(bgTarget.b-bg.b)*spd;
  renderer.setClearColor(new THREE.Color(bg.r,bg.g,bg.b),1);
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

function timeline(){
  // T is set externally from Theatre playhead before this call

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
    fineMat.uniforms.rotSpeed.value  = 0.058 + cCurve * (0.32 - 0.058);
    cloudMat.uniforms.rotSpeed.value = 0.026 + cCurve * (0.32 - 0.026);
    sparkMat.uniforms.rotSpeed.value = 0.058 + cCurve * (0.32 - 0.058);
    fineMat.uniforms.warmBias.value  = easeOut(cSub) * 0.55;
    cloudMat.uniforms.warmBias.value = easeOut(cSub) * 0.55;
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
  // Theatre timeline is 10s wide, scene is 90s — scale so Theatre cursor syncs
  sheet.sequence.position = Math.min(9.99, T / 9);

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

  // Shader time only advances when not paused — Space truly freezes everything
  if (!paused) {
    fineMat.uniforms.time.value  += dt;
    cloudMat.uniforms.time.value += dt;
    sparkMat.uniforms.time.value += dt;
  }

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

  // ── Ignition trigger ──────────────────────────────────────────────────────
  if(!ignitionTriggered && fineMat.uniforms.collapseT.value >= 1.0) {
    ignitionTriggered = true;
    sunMesh.visible   = true;
    flashMesh.visible = true;
    sunMesh.scale.setScalar(22.0 * tVals.ballRadius);
    sunMat.uniforms.emergence.value = 0;
    sunMat.uniforms.distort.value   = 0;
    coreWhite.material.opacity = 0; coreAmber.material.opacity  = 0;
    coreOrange.material.opacity= 0; coreDark.material.opacity   = 0;
  }

  // ── Ignition sequence ──────────────────────────────────────────────────────
  if(ignitionTriggered) {
    const eO = t => 1 - Math.pow(1-t, 3);
    sunMat.uniforms.time.value  += dt;
    coronaMats.forEach(m => m.uniforms.time.value += dt);
    flashMat.uniforms.time.value += dt;
    flashMat.uniforms.asymmetry.value = tVals.ballAsym;
    flashMesh.scale.setScalar(tVals.ballRadius);

    if(!ignitionDone) {
      const pct = ignitionT / IGNITE_DUR_CUR;

      sunMesh.scale.setScalar((1.0 + 21.0 * Math.exp(-pct * 5.2)) * tVals.ballRadius);
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
      const bgWarm = Math.max(0, Math.sin(pct * Math.PI * 0.65) * 0.065);
      bgTarget.r = 0.003 + bgWarm;
      bgTarget.g = 0.001 + bgWarm * 0.28;
      bgTarget.b = 0.001;
      const coronaStart = tVals.ballCoronaStart;
      const cSub = Math.max(0, (pct - coronaStart) / (1.0 - coronaStart));
      coronaMats.forEach(m => m.uniforms.globalAlpha.value = eO(cSub));
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
        const c1 = new THREE.Color(CORONA_HUES[mi % 5][ci]);
        const c2 = new THREE.Color(CORONA_HUES[(mi+1) % 5][ci]);
        mat.uniforms.glowColor.value.lerpColors(c1, c2, mf);
        mat.uniforms.globalAlpha.value = 1.0;
      });
      coreLight.intensity = 8 + 4 * Math.sin(colorCycleT * 0.3);
      if(!drag) sphTarget.theta += 0.00042;
      updateLoops(sunMat.uniforms.time.value, SUN_R * sunMesh.scale.x);

      const galaxyTimeElapsed = postIgnitionT;
      const gt = Math.min(1.0, galaxyTimeElapsed / GALAXY_DUR);
      const gtCurve = gt * gt;
      fineMat.uniforms.galaxyT.value = gtCurve;
      galaxyDiscMat.uniforms.gAlpha.value = Math.min(1.0, gtCurve * 1.5);
      galaxyDiscMat.uniforms.time.value += dt;
      cloudMat.uniforms.gAlpha.value = Math.max(0, 1.0 - gtCurve * 2.5);
      sunMesh.scale.setScalar(1.0 + gtCurve * 3.5);
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
  fineMat.uniforms.brightMult.value  = tVals.nebulaBright;
  cloudMat.uniforms.brightMult.value = tVals.nebulaBright;
  drainMat.uniforms.gAlpha.value    *= tVals.collapseBright;
  cvortMat.uniforms.gAlpha.value    *= tVals.collapseBright;
  fineMat.uniforms.warmBias.value    = Math.max(fineMat.uniforms.warmBias.value, tVals.nebulaWarm);
  cloudMat.uniforms.warmBias.value   = Math.max(cloudMat.uniforms.warmBias.value, tVals.collapseWarm);
  fineMat.uniforms.turbMult.value    = tVals.cloudTurb;
  cloudMat.uniforms.turbMult.value   = tVals.cloudTurb;
  fineMat.uniforms.spiralMult.value  = tVals.cloudSpiral;
  cloudMat.uniforms.spiralMult.value = tVals.cloudSpiral;
  fineMat.uniforms.coreMult.value    = tVals.cloudCore;
  cloudMat.uniforms.coreMult.value   = tVals.cloudCore;
  fineMat.uniforms.hotHue.value      = tVals.cloudHotHue;
  cloudMat.uniforms.hotHue.value     = tVals.cloudHotHue;
  fineMat.uniforms.satMult.value     = tVals.cloudSat;
  cloudMat.uniforms.satMult.value    = tVals.cloudSat;
  if (ignitionTriggered) {
    sunMat.uniforms.hueMode.value    = tVals.sunHue > 0 ? tVals.sunHue : sunMat.uniforms.hueMode.value;
    coronaMats.forEach(m => { m.uniforms.baseGlowStrength.value *= tVals.coronaGlow; });
    sunMat.uniforms.distort.value   *= tVals.distortAmt;
    sunMat.uniforms.distFreqMult.value = tVals.ballFreq;
    sunMat.uniforms.distAmpMult.value  = tVals.ballAmp;
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
