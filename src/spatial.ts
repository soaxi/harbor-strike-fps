/** Small spatial buckets keep crowd separation local instead of scanning a team. */
export class SpatialGrid<T extends {p:{x:number;z:number};hp:number}> {
 private buckets=new Map<string,T[]>();
 private cellSize:number; constructor(cellSize=1.5){this.cellSize=cellSize;}
 rebuild(items:T[]){for(const bucket of this.buckets.values())bucket.length=0;for(const item of items){if(item.hp<=0)continue;const key=this.key(item.p.x,item.p.z);let bucket=this.buckets.get(key);if(!bucket){bucket=[];this.buckets.set(key,bucket);}bucket.push(item);}}
 private key(x:number,z:number){return `${Math.floor(x/this.cellSize)},${Math.floor(z/this.cellSize)}`;}
 *near(x:number,z:number){const cx=Math.floor(x/this.cellSize),cz=Math.floor(z/this.cellSize);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const bucket=this.buckets.get(`${cx+dx},${cz+dz}`);if(bucket)yield* bucket;}}
}

