// Night Paper Cutaway — line engine (based on Line-Art Cutaway's tracer, from Lemo-Opuscar, MIT).
// Dark card ground, cream ink, three line tiers, paper grain, and a screen-space drop shadow so stacked card
// layers cast soft shadows onto what lies behind them.
import * as THREE from 'three';

export const PAL = {
  ground: '#1d1c1a', grid: 'rgba(236,229,211,0.045)', cross: 'rgba(236,229,211,0.13)',
  ink: '#ece5d3', ink2: '#b9b2a2', faint: '#8d877a', acc: '#ff6a2a', accGL: 0xff6a2a,
};
export const U = { uMode: { value: 0 }, uPath: { value: 0 }, uPath2: { value: 0 }, uFlood: { value: 0 } };

const VS = `
#include <clipping_planes_pars_vertex>
attribute float aS;
varying vec3 vN; varying vec3 vWN; varying vec2 vUv; varying float vVZ; varying vec3 vWP; varying float vS;
void main(){
  vec4 mv = modelViewMatrix * vec4(position,1.);
  vN = normalize(normalMatrix*normal); vWN = normalize(mat3(modelMatrix)*normal);
  vUv = uv; vVZ = -mv.z; vWP = (modelMatrix*vec4(position,1.)).xyz; vS = aS;
  gl_Position = projectionMatrix*mv;
  #include <clipping_planes_vertex>
}`;
const FS = `
#include <clipping_planes_pars_fragment>
uniform float uMode; uniform vec3 uColor; uniform vec3 uColor0; uniform float uKind; uniform sampler2D uMap; uniform float uHasMap;
uniform float uPath, uPath2, uFlood, uGrain;
varying vec3 vN; varying vec3 vWN; varying vec2 vUv; varying float vVZ; varying vec3 vWP; varying float vS;
float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
float hatch(float period){ float h = mod(gl_FragCoord.x + gl_FragCoord.y, period); return smoothstep(0.6, 1.6, h) * (1. - smoothstep(2.6, 3.6, h)); }
void main(){
  #include <clipping_planes_fragment>
  vec4 m = uHasMap > .5 ? texture2D(uMap, vUv) : vec4(1.);
  if(uHasMap > .5 && m.a < .5) discard;                       // cut paper: the cut-out is a real hole
  if(uMode>0.5){ vec3 n = normalize(vN); if(!gl_FrontFacing) n = vec3(0.,0.,1.); gl_FragColor = vec4(n, vVZ); return; }
  vec3 acc = vec3(1., .416, .165);
  vec3 col = uColor;
  if(uHasMap > .5) col = m.rgb;
  bool lit = false;
  if(uKind > 2.5 && uKind < 3.5){ lit = vS < uPath; col = lit ? acc : uColor0; }                // path 1
  if(uKind > 3.5 && uKind < 4.5){ lit = vS < uPath2; col = lit ? acc : uColor0; }               // path 2
  if(uKind > 4.5 && uKind < 5.5){ col = mix(col, acc, uFlood); lit = uFlood > .5; }             // a part that lights whole
  if(!gl_FrontFacing){ gl_FragColor = vec4(lit ? acc : mix(vec3(.17), vec3(.36), hatch(9.)), 1.); return; }
  vec3 n = normalize(vWN); vec3 L = normalize(vec3(-.45,1.,.6));
  float d = max(dot(n,L),0.);
  float tone = lit ? .96 + .04*d : .78 + .3*d;
  float g = h21(floor(vWP.xy*3.1 + vWP.z*1.7)) * .6 + h21(floor(vWP.yz*9.3)) * .4;           // card fibre grain
  if(!lit) col *= .95 + .09*g*uGrain;
  gl_FragColor = vec4(col*tone, 1.);
}`;
export function mat(hex, kind = 0, opt = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uColor: { value: new THREE.Color(hex) }, uColor0: { value: new THREE.Color(opt.off ?? hex) }, uKind: { value: kind },
      uMap: { value: opt.map || null }, uHasMap: { value: opt.map ? 1 : 0 }, uGrain: { value: opt.grain ?? 1 } },
    vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, clipping: !!opt.clip, clippingPlanes: opt.clip || null });
}

const VQ = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;
export function makeEngine(renderer, scene, PX, PY, SS = 1, JIT = 4) {
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const edgeMat = new THREE.ShaderMaterial({
    uniforms: { tC: { value: null }, tN: { value: null }, px: { value: new THREE.Vector2() }, rS: { value: 2.7 }, rO: { value: 1.7 }, rC: { value: 1.05 }, thD: { value: 0.0016 }, thO: { value: 0.012 }, thN: { value: 0.12 }, shD: { value: 9.0 } },
    vertexShader: VQ,
    fragmentShader: `
    uniform sampler2D tC, tN; uniform vec2 px; uniform float rS, rO, rC, thD, thO, thN, shD; varying vec2 vUv;
    float iz(vec4 s){ return s.a>0. ? 1./s.a : 0.; }
    void main(){
      vec4 c = texture2D(tC, vUv); vec4 n0 = texture2D(tN, vUv); float z0 = iz(n0); bool f0 = n0.a > 0.;
      float dS = 99.;
      for(int i=0;i<12;i++){ float a = float(i)*0.5235988; vec2 d = vec2(cos(a), sin(a));
        for(int k=1;k<=3;k++){ float r = float(k)*rS*0.4; vec4 s = texture2D(tN, vUv + d*px*r); if((s.a>0.) != f0){ dS = min(dS, r); } } }
      float eS = 1. - smoothstep(rS*0.62, rS*1.12, dS);
      float eO = 0., eC = 0.;
      vec2 dirs[4]; dirs[0]=vec2(1.,0.); dirs[1]=vec2(0.,1.); dirs[2]=vec2(.7071,.7071); dirs[3]=vec2(.7071,-.7071);
      for(int i=0;i<4;i++){
        vec4 a = texture2D(tN, vUv + dirs[i]*px*rO), b = texture2D(tN, vUv - dirs[i]*px*rO);
        if(f0 && a.a>0. && b.a>0.){ float za = iz(a), zb = iz(b), m = max(z0, max(za, zb)); eO = max(eO, smoothstep(thO, thO*1.8, abs(za + zb - 2.*z0) / m)); }
        vec4 a2 = texture2D(tN, vUv + dirs[i]*px*rC), b2 = texture2D(tN, vUv - dirs[i]*px*rC);
        if(f0 && a2.a>0. && b2.a>0.){ float za = iz(a2), zb = iz(b2), m = max(z0, max(za, zb));
          eC = max(eC, smoothstep(thD, thD*2.2, abs(za + zb - 2.*z0) / m));
          eC = max(eC, smoothstep(thN, thN*1.8, 1.-dot(n0.xyz, a2.xyz)));
          eC = max(eC, smoothstep(thN, thN*1.8, 1.-dot(n0.xyz, b2.xyz))); }
      }
      // drop shadow: a nearer layer up-left of this pixel shades it (card stacked over card)
      float sh = 0.;
      for(int k=1;k<=4;k++){ vec4 s = texture2D(tN, vUv + vec2(-.6, .8)*px*shD*float(k)*.5);
        if(s.a > 0. && (!f0 || iz(s) < z0 * .985)) sh += .25; }
      vec3 inkS = vec3(.925,.898,.827), inkO = vec3(.80,.77,.70), inkC = vec3(.55,.53,.48);
      float wS = eS, wO = eO*.95, wC = eC*.8;
      float e = max(wS, max(wO, wC));
      vec3 ink = wS >= max(wO, wC) ? inkS : (wO >= wC ? inkO : inkC);
      if(f0){ vec3 col = mix(c.rgb * (1. - .3*sh), ink, e); gl_FragColor = vec4(col, 1.); }
      else { float al = max(e, .42*sh); gl_FragColor = vec4(ink*e, al); }
    }`, depthTest: false, depthWrite: false, blending: THREE.NoBlending });
  const downMat = new THREE.ShaderMaterial({
    uniforms: { tE: { value: null }, px: { value: new THREE.Vector2() }, w: { value: 1 } }, vertexShader: VQ,
    fragmentShader: `uniform sampler2D tE; uniform vec2 px; uniform float w; varying vec2 vUv;
    void main(){ vec4 s = texture2D(tE, vUv + px*vec2(.5,.5)) + texture2D(tE, vUv + px*vec2(-.5,.5)) + texture2D(tE, vUv + px*vec2(.5,-.5)) + texture2D(tE, vUv + px*vec2(-.5,-.5)); gl_FragColor = s*.25*w; }`,
    depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
  const copyMat = new THREE.ShaderMaterial({
    uniforms: { tA: { value: null }, circ: { value: new THREE.Vector3() }, size: { value: new THREE.Vector2() } }, vertexShader: VQ,
    fragmentShader: `uniform sampler2D tA; uniform vec3 circ; uniform vec2 size; varying vec2 vUv;
    void main(){ vec4 s = texture2D(tA, vUv); s = vec4(min(s.rgb, vec3(s.a)), min(s.a, 1.));
      if(circ.z > 0.){ float d = distance(vUv*size, circ.xy); if(d > circ.z) discard; vec3 g = vec3(.114,.110,.102); gl_FragColor = vec4(s.rgb + g*(1.-s.a), 1.); return; }
      gl_FragColor = s; }`,
    depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), edgeMat); const quadScene = new THREE.Scene(); quadScene.add(quad);
  const RT = {};
  function targets(key, w, h) {
    if (RT[key]) return RT[key];
    const lin = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    return RT[key] = {
      c: new THREE.WebGLRenderTarget(w * SS, h * SS, { type: THREE.UnsignedByteType, ...lin }),
      n: new THREE.WebGLRenderTarget(w * SS, h * SS, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }),
      e: new THREE.WebGLRenderTarget(w * SS, h * SS, { type: THREE.UnsignedByteType, ...lin }),
      a: new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, ...lin }),
    };
  }
  function pass(t, cam, wgt) {
    U.uMode.value = 1;
    const hid = []; scene.traverse(o => { if (o.userData.noND && o.visible) { o.visible = false; hid.push(o); } });
    renderer.setRenderTarget(t.n); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, cam);
    hid.forEach(o => { o.visible = true; });
    U.uMode.value = 0;
    renderer.setRenderTarget(t.c); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, cam);
    quad.material = edgeMat; edgeMat.uniforms.tC.value = t.c.texture; edgeMat.uniforms.tN.value = t.n.texture;
    edgeMat.uniforms.px.value.set(1 / t.c.width, 1 / t.c.height);
    renderer.setRenderTarget(t.e); renderer.clear(); renderer.render(quadScene, quadCam);
    quad.material = downMat; downMat.uniforms.tE.value = t.e.texture; downMat.uniforms.px.value.set(1 / t.e.width, 1 / t.e.height); downMat.uniforms.w.value = wgt;
    renderer.setRenderTarget(t.a); renderer.render(quadScene, quadCam);
  }
  const JOFF = [[-0.125, -0.375], [0.375, -0.125], [0.125, 0.375], [-0.375, 0.125], [0, 0], [0.25, 0.25], [-0.25, 0.25], [0.25, -0.25]];
  const SHUTTER = 0.12 / 24;
  return function renderView(key, rect, setup, opt = {}) {
    const t = targets(`${key}-${rect.w}x${rect.h}`, rect.w, rect.h);
    renderer.setRenderTarget(t.a); renderer.setClearColor(0x000000, 0); renderer.clear();
    for (let k = 0; k < JIT; k++) { const dt = JIT > 1 ? (k / (JIT - 1) - 0.5) * SHUTTER : 0; pass(t, setup(dt, JOFF[k % JOFF.length]), 1 / JIT); }
    quad.material = copyMat; copyMat.uniforms.tA.value = t.a.texture;
    copyMat.uniforms.size.value.set(rect.w, rect.h); copyMat.uniforms.circ.value.set(rect.w / 2, rect.h / 2, opt.circle ? rect.w / 2 : 0);
    renderer.setRenderTarget(null); renderer.setViewport(rect.x, PY - rect.y - rect.h, rect.w, rect.h); renderer.setScissor(rect.x, PY - rect.y - rect.h, rect.w, rect.h); renderer.setScissorTest(true);
    renderer.render(quadScene, quadCam); renderer.setScissorTest(false); renderer.setViewport(0, 0, PX, PY);
  };
}
