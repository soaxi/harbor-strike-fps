import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
export function createSurfaceLibrary(renderer:T.WebGLRenderer,scene:T.Scene,changed:()=>void){
 const textures:T.Texture[]=[];let environment:T.WebGLRenderTarget|undefined;
 const load=(file:string,color=false,repeat=1)=>{if(typeof document.createElementNS!=='function')return null;const t=new T.TextureLoader().load(import.meta.env.BASE_URL+'textures/'+file,changed);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(color)t.colorSpace=T.SRGBColorSpace;textures.push(t);return t;};
 const diffuse=load('concrete-Diffuse.jpg',true),normal=load('concrete-nor_gl.jpg'),rough=load('concrete-rough.jpg');
 if(typeof renderer.getContext==='function'){const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.08);scene.environment=environment.texture;scene.environmentIntensity=.38;room.dispose();pmrem.dispose();}
 const ground=new T.MeshStandardMaterial({color:0x9fa5a5,map:diffuse,normalMap:normal,normalScale:new T.Vector2(.65,.65),roughnessMap:rough,roughness:.95});
 const concrete=new T.MeshStandardMaterial({color:0x787b78,map:diffuse,normalMap:normal,normalScale:new T.Vector2(.45,.45),roughness:.92});
 const painted=(color:T.ColorRepresentation)=>new T.MeshStandardMaterial({color,metalness:.45,roughness:.67,roughnessMap:rough,bumpMap:rough,bumpScale:.018});
 return {ground,concrete,painted,dispose(){textures.forEach(t=>t.dispose());environment?.dispose();}};
}
export function buildWeapons(){
 const models:T.Group[]=[],magazines:T.Group[]=[],muzzles:T.Vector3[]=[];
 const steel=new T.MeshStandardMaterial({color:0x353b3e,metalness:.85,roughness:.3});
 const dark=new T.MeshStandardMaterial({color:0x131819,metalness:.52,roughness:.48});
 const polymer=new T.MeshStandardMaterial({color:0x383a33,metalness:.06,roughness:.84});
 const tan=new T.MeshStandardMaterial({color:0x6f6854,metalness:.17,roughness:.73});
 const rubber=new T.MeshStandardMaterial({color:0x171a18,roughness:.95});
 const cloth=new T.MeshStandardMaterial({color:0x4a5045,roughness:1});
 const glove=new T.MeshStandardMaterial({color:0x292c28,roughness:.95});
 const glass=new T.MeshStandardMaterial({color:0x203d42,metalness:.65,roughness:.09,emissive:0x102027,emissiveIntensity:.3});
 const brass=new T.MeshStandardMaterial({color:0x9e8959,metalness:.72,roughness:.32});
 // Small deterministic surface imperfections keep metal from looking like polished plastic.
 let finish:T.CanvasTexture|undefined;
 if(typeof document.createElement==='function'){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');
  if(ctx){ctx.fillStyle='#929292';ctx.fillRect(0,0,256,256);let seed=927;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
   for(let i=0;i<10000;i++){const v=100+Math.floor(random()*90);ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(random()*256,random()*256,1,1);}
   ctx.strokeStyle='#c4c4c4';ctx.lineWidth=.45;for(let i=0;i<100;i++){const x=random()*256,y=random()*256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*18,y+random()*3);ctx.stroke();}
   finish=new T.CanvasTexture(canvas);finish.wrapS=finish.wrapT=T.RepeatWrapping;finish.repeat.set(2,2);
   for(const m of [steel,dark,polymer,tan,rubber,cloth,glove]){m.roughnessMap=finish;m.bumpMap=finish;m.bumpScale=m===cloth?.002:.00065;}
  }
 }
 function mesh(parent:T.Group,geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=false;parent.add(m);return m;}
 function box(g:T.Group,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material=dark){return mesh(g,new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.12),m,x,y,z);}
 function cylinder(g:T.Group,x:number,y:number,z:number,r:number,length:number,m:T.Material=steel,axis='z'){const obj=mesh(g,new T.CylinderGeometry(r,r,length,16),m,x,y,z);if(axis==='z')obj.rotation.x=Math.PI/2;if(axis==='x')obj.rotation.z=Math.PI/2;return obj;}
 function profile(g:T.Group,points:number[][],thickness:number,m:T.Material){const shape=new T.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(z,y):shape.moveTo(z,y));shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.003,bevelThickness:.003});geo.rotateY(-Math.PI/2);geo.translate(thickness/2,0,0);return mesh(g,geo,m,0,0,0);}
 function limb(g:T.Group,from:number[],to:number[],radius:number,m:T.Material){const a=new T.Vector3(...from),b=new T.Vector3(...to),mid=a.clone().add(b).multiplyScalar(.5);const obj=mesh(g,new T.CapsuleGeometry(radius,Math.max(.01,a.distanceTo(b)-radius*2),5,10),m,mid.x,mid.y,mid.z);obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());return obj;}
 function hand(g:T.Group,x:number,y:number,z:number){const palm=mesh(g,new T.SphereGeometry(1,12,8),glove,x,y,z);palm.scale.set(.055,.065,.065);for(let i=0;i<4;i++){const finger=cylinder(g,x+.034,y+.025-i*.017,z-.043,.01,.072,glove,'x');finger.rotation.y=-.2;}box(g,x,y+.054,z,.05,.016,.045,polymer);}
 function batch(g:T.Group){g.updateMatrixWorld(true);const buckets=new Map<T.Material,T.Mesh[]>();for(const child of [...g.children]){if(!(child instanceof T.Mesh))continue;const material=child.material as T.Material;const arr=buckets.get(material)??[];arr.push(child);buckets.set(material,arr);}for(const [material,items]of buckets){const geos=items.map(m=>{const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();return geo.applyMatrix4(m.matrix);});const merged=mergeGeometries(geos);if(!merged)continue;const object=new T.Mesh(merged,material);object.frustumCulled=false;g.add(object);for(const old of items){g.remove(old);old.geometry.dispose();}geos.forEach(v=>v.dispose());}}
 for(let slot=0;slot<4;slot++){
  const g=new T.Group(),mag=new T.Group();models.push(g);magazines.push(mag);
  if(slot===3){const shell=mesh(g,new T.SphereGeometry(.078,20,14),polymer,0,-.07,-.12);shell.scale.y=1.3;for(let i=0;i<4;i++){const ring=mesh(g,new T.TorusGeometry(.076,.005,6,24),dark,0,-.12+i*.035,-.12);ring.rotation.x=Math.PI/2;}cylinder(g,0,.04,-.12,.026,.05,steel,'y');box(g,.035,-.005,-.12,.016,.14,.038,steel);const pin=mesh(g,new T.TorusGeometry(.026,.003,6,20),steel,-.035,.065,-.12);pin.rotation.y=Math.PI/2;hand(g,.02,-.13,-.08);limb(g,[.07,-.2,0],[.19,-.46,.3],.07,cloth);muzzles.push(new T.Vector3(0,0,-.2));batch(g);continue;}
  const sniper=slot===1,shotgun=slot===2;
  // Forward is -Z. Receiver, buffer tube and a separately shaped stock.
  const receiver=sniper?tan:dark;
  box(g,0,0,-.12,.082,.12,.29,receiver);
  box(g,0,-.074,-.09,.075,.085,.18,polymer);
  cylinder(g,0,.008,.1,.025,.22,dark);
  profile(g,[[.06,.038],[.27,.025],[.29,-.11],[.235,-.125],[.13,-.065],[.06,-.058]],.085,polymer);
  box(g,0,-.048,.282,.096,.155,.023,rubber);
  const grip=box(g,0,-.155,-.015,.065,.16,.07,polymer);grip.rotation.x=-.32;
  for(let i=0;i<5;i++)box(g,.033,-.105-i*.022,-.01,.003,.007,.052,rubber);
  // Trigger guard, trigger, ejection port, forward assist, screws and rail teeth.
  box(g,0,-.159,-.13,.044,.012,.11,steel);box(g,0,-.113,-.18,.044,.09,.012,steel);
  const trigger=box(g,0,-.113,-.116,.013,.044,.014,steel);trigger.rotation.x=.3;
  box(g,.043,.016,-.13,.007,.033,.092,steel);box(g,.048,.024,-.18,.009,.012,.032,dark);
  cylinder(g,.05,.004,-.018,.012,.035,steel,'x');
  for(const z of [-.04,-.23])cylinder(g,.043,-.023,z,.006,.005,brass,'x');
  const front=sniper?-.64:shotgun?-.59:-.55;
  if(shotgun){cylinder(g,0,.018,-.5,.025,.56,steel);cylinder(g,0,-.046,-.45,.021,.43,dark);box(g,0,-.023,-.41,.095,.092,.23,polymer);for(let i=0;i<9;i++)box(g,0,-.027,-.31-i*.024,.099,.096,.006,rubber);}else{
   box(g,0,0,(front-.27)/2,.075,.09,Math.abs(front+.27),sniper?polymer:tan);
   for(let i=0;i<7;i++){const z=-.295-i*.034;box(g,.04,0,z,.009,.022,.019,dark);box(g,-.04,0,z,.009,.022,.019,dark);}
   cylinder(g,0,.006,front-.12,.019,.28,steel);
   for(let i=0;i<17;i++)box(g,0,.073,-.04-i*.031,.065,.012,.01,steel);
   box(g,0,.061,-.25,.047,.013,.46,dark);
  }
  const muzzle=sniper?-.94:shotgun?-.8:-.79;
  cylinder(g,0,.006,muzzle,.028,.07,steel);cylinder(g,0,.006,muzzle-.037,.014,.003,rubber);
  for(let i=0;i<3;i++)box(g,.027,.007,muzzle+.016-i*.018,.004,.019,.01,dark);
  muzzles.push(new T.Vector3(0,.006,muzzle-.055));
  if(sniper){cylinder(g,0,.135,-.205,.035,.29,dark);cylinder(g,0,.135,-.36,.049,.06,steel);cylinder(g,0,.135,-.045,.043,.045,dark);cylinder(g,0,.135,-.02,.032,.004,glass);for(const z of [-.12,-.28]){box(g,0,.077,z,.06,.07,.026,steel);const ring=mesh(g,new T.TorusGeometry(.036,.006,6,20),steel,0,.135,z);}cylinder(g,0,.179,-.21,.02,.036,steel,'y');cylinder(g,.05,.135,-.21,.018,.035,steel,'x');}
  else if(!shotgun){for(const z of [-.08,-.4]){box(g,0,.087,z,.046,.025,.02,dark);}const ring=mesh(g,new T.TorusGeometry(.023,.007,6,18),steel,0,.12,-.08);box(g,0,.103,-.4,.008,.05,.008,steel);}
  else{box(g,0,.058,-.71,.013,.013,.02,brass);}
  if(!shotgun){profile(mag,[[-.185,-.092],[-.10,-.092],[-.10,-.19],[-.07,-.29],[-.16,-.31],[-.19,-.2]],.055,sniper?steel:polymer);for(let i=0;i<3;i++)box(mag,.029,-.16-i*.039,-.147,.004,.005,.063,steel);batch(mag);g.add(mag);}
  hand(g,.025,-.14,.013);limb(g,[.06,-.18,.055],[.22,-.44,.35],.064,cloth);
  hand(g,-.01,-.094,-.42);limb(g,[-.052,-.14,-.39],[-.22,-.37,.1],.067,cloth);
  box(g,.1,-.25,.13,.09,.04,.085,tan);
  batch(g);g.visible=slot===0;
 }
 return {models,magazines,muzzles,dispose(){finish?.dispose();}};
}

export function addPortMarkings(scene:T.Scene){
 const textures:T.Texture[]=[];
 if(typeof document.createElement!=='function')return {dispose(){}};
 const sites=[[-13,-12,12,5], [12,12,12,5],[-13,12,6,10],[13,-12,6,10],[-5,0,5,10],[7,0,5,7]];
 sites.forEach(([x,z,w,d],i)=>{
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.fillStyle='rgba(224,220,201,.83)';ctx.font='bold 60px monospace';ctx.fillText('HBRU '+(704820+i*132),18,72);ctx.font='26px monospace';ctx.fillText('MAX GROSS  30,480 KG',18,123);ctx.fillText('TARE        3,750 KG',18,161);ctx.font='bold 27px monospace';ctx.fillText('PORT 07 / CARGO',18,211);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);
  const sign=new T.Mesh(new T.PlaneGeometry(2.3,1.15),new T.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,roughness:.95,polygonOffset:true,polygonOffsetFactor:-1}));sign.position.set(x-w/2+1.5,2.45,z+d/2+.061);scene.add(sign);
 });
 return {dispose(){textures.forEach(t=>t.dispose());}};
}

