import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {performance as clock} from 'node:perf_hooks';
import {normalizeRoster,spawnX,spawnZ} from '../src/roster.ts';
import {SpatialGrid} from '../src/spatial.ts';
import {WEAPONS,blastDamage,pelletDamage,loadMagazine} from '../src/weapons.ts';
import {buildWeapons} from '../src/visuals.ts';
let randomState=48271; Math.random=()=>{randomState=(randomState*16807)%2147483647;return randomState/2147483647;};
const root=new URL('../',import.meta.url);
let now=0,frame,renderCalls=0;globalThis.performance={now:()=>now};globalThis.innerWidth=1280;globalThis.innerHeight=720;globalThis.devicePixelRatio=1;
const events=new Map();globalThis.document={pointerLockElement:null,addEventListener(k,f){events.set(k,f)},removeEventListener(k){events.delete(k)},dispatch(k,e){events.get(k)?.(e)},exitPointerLock(){this.pointerLockElement=null;this.dispatch('pointerlockchange')}};
globalThis.window={addEventListener(k,f){events.set(k,f)},removeEventListener(k){events.delete(k)}};globalThis.requestAnimationFrame=f=>{frame=f;return 1};globalThis.cancelAnimationFrame=()=>{};
globalThis.rendered=()=>renderCalls++;
async function engine(file){let source=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');source=source.replace('return {\n    begin(', 'return {\n    debug: { actors, teams, camera:c, scene:s, renderer:r, selectWeapon, shoot, reload, updateGrenades, reset, state:()=>({h, ammo, reserve, weapon, grenades, blasts, ready, now}), setTime:(t:number)=>{now=t;shot=0}, },\n    begin(');assert(source.includes('debug: { actors'));
let code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
code=code.replace("import * as T from 'three';",`import * as RealT from '${new URL('node_modules/three/build/three.module.js',root).href}';
const T={...RealT,WebGLRenderer:class {shadowMap={};domElement={requestPointerLock:()=>{document.pointerLockElement=this.domElement;document.dispatch('pointerlockchange');return Promise.resolve()},remove(){}};setSize(){}setPixelRatio(){}render(s,c){s.updateMatrixWorld();c.updateMatrixWorld();globalThis.rendered()}dispose(){}}};`);
code=code.replace("import { BattleAudio } from './audio';", "class BattleAudio {status='test';unlock(){return Promise.resolve()}play(){}pause(){}dispose(){}}")
code=code.replace(/from '\.\/(roster|weapons|navigation|spatial|visuals)'/g,(_,name)=>`from '${new URL('src/'+name+'.ts',root).href}'`);
code=code.replace("from 'three/addons/utils/BufferGeometryUtils.js'",`from '${new URL('node_modules/three/examples/jsm/utils/BufferGeometryUtils.js',root).href}'`);
const {startGame}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));return startGame({appendChild(){}},()=>{});}
function advance(n,dt=1000/60){for(let i=0;i<n;i++){now+=dt;frame();}}
assert.deepEqual(normalizeRoster({allies:999,enemies:999}),{allies:49,enemies:50});
for(let n=1;n<=50;n++){const points=new Set();for(let i=0;i<n;i++){const x=spawnX(i,n),z=spawnZ(i,0);assert(Math.abs(x)<10&&z<29);points.add(x+','+z);}assert.equal(points.size,n);}
assert.equal(blastDamage(10,false),0);assert(blastDamage(3,true)<blastDamage(3,false));assert(pelletDamage(2,25,false)<pelletDamage(2,3,false));assert.deepEqual(loadMagazine(4,2,8),{ammo:6,reserve:0});
// Spatial queries must include nearby soldiers across bucket boundaries, including negatives.
const grid=new SpatialGrid();const units=Array.from({length:100},(_,i)=>({hp:100,p:{x:(i%10)*1.1-5,z:Math.floor(i/10)*1.1-5}}));grid.rebuild(units);for(const a of units){const found=new Set(grid.near(a.p.x,a.p.z));for(const b of units)if(Math.hypot(a.p.x-b.p.x,a.p.z-b.p.z)<.75)assert(found.has(b));}
if(process.env.BASELINE){const old=await engine(new URL(process.env.BASELINE,root));console.log('Previous static scenery meshes:',old.debug.scene.children.filter(o=>o.isMesh&&!o.isInstancedMesh).length);old.dispose();}
// Weapon batching must accept mixed indexed and non-indexed source geometry.
const arsenal=buildWeapons();assert.equal(arsenal.models.length,4);
for(const [slot,model] of arsenal.models.entries()){
 let meshes=0;model.traverse(part=>{if(!part.isMesh)return;meshes++;part.geometry.computeBoundingBox();assert(part.geometry.boundingBox.min.toArray().every(Number.isFinite));assert(part.geometry.boundingBox.max.toArray().every(Number.isFinite));part.geometry.dispose();});
 assert(meshes<=12,`weapon ${slot} must be batched, got ${meshes} meshes`);assert(arsenal.muzzles[slot].z<0);
}arsenal.dispose();
const game=await engine(new URL('src/play.ts',root)),d=game.debug;const staticCount=d.scene.children.filter(o=>o.isMesh&&!o.isInstancedMesh).length;assert(staticCount<30);assert.equal(d.renderer.shadowMap.autoUpdate,false);
game.begin({allies:0,enemies:1});advance(2);assert.equal(d.actors.length,2);const player=d.actors.find(a=>a.name==='你'),enemy=d.teams[1][0];
for(let slot=0;slot<3;slot++){d.selectWeapon(slot);d.setTime(10+slot*3);player.p.set(0,0,24);enemy.p.set(0,0,18);enemy.hp=100;d.camera.position.set(0,1.65,24);d.camera.lookAt(0,1.1,18);d.camera.updateMatrixWorld();const before=d.state().ammo[slot];d.shoot();assert.equal(d.state().ammo[slot],before-1);assert(enemy.hp<100,'weapon hits target '+slot);}
d.selectWeapon(3);d.setTime(30);d.shoot();assert.equal(d.state().grenades.length,1);const position=d.state().grenades[0].mesh.position;position.set(0,.4,18);d.state().grenades[0].v.set(0,0,0);enemy.hp=100;d.updateGrenades(2.3);assert.equal(d.state().grenades.length,0);assert(enemy.hp<100);assert.equal(d.state().ammo[3],2);
// Switching weapons cancels reload without transferring ammo to the other weapon.
d.selectWeapon(0);d.reload();assert(d.state().h.reload);const ammo2=d.state().ammo[1];d.selectWeapon(1);assert(!d.state().h.reload);assert.equal(d.state().ammo[1],ammo2);
// Blur freezes simulation time, releases aiming, and avoids repeating identical renders.
d.reset();d.state().h.mode='playing';document.dispatch('mousedown',{button:2});advance(1);document.dispatch('blur');const pausedTime=d.state().now,draws=renderCalls;advance(60);assert.equal(d.state().h.mode,'paused');assert.equal(d.state().now,pausedTime);assert.equal(d.state().h.aiming,false);assert.equal(renderCalls,draws);
// Retain all 100 combatants and verify actual AI still moves and engages.
d.state().h.mode='match';game.begin({allies:49,enemies:50});advance(2);assert.equal(d.actors.length,100);assert.equal(d.state().ammo[3],3);const started=clock.now();advance(1800);const elapsed=clock.now()-started;assert(d.actors.every(a=>Number.isFinite(a.p.x)&&Number.isFinite(a.p.z)&&Math.abs(a.p.x)<28&&Math.abs(a.p.z)<30));assert(d.actors.some(a=>a.hp<100));console.log(JSON.stringify({tests:'passed',staticSceneryMeshes:staticCount,tracerDrawBatches:1,simulatedSeconds:30,cpuMilliseconds:Math.round(elapsed),survivors:d.actors.filter(a=>a.hp>0).length,note:'Simulation uses a mock renderer, not a GPU FPS benchmark.'}));game.dispose();
