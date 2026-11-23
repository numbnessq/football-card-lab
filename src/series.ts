import {catalog,sides} from './catalog.ts';

export type Route = 'quick' | 'field' | 'matches';
export type Step = {id:string; side?:string};
const quickFirst = ['P04','P01','P03','B01','A01'];
const paired = new Set(['P10','B01','B02','B03','A01','B04','G01']);

export function stepsFor(route:Route):Step[]{
 const tests=route==='quick'
   ? [...quickFirst,...catalog.map(t=>t.id).filter(id=>!quickFirst.includes(id))]
   : catalog.filter(t=>route==='matches'?t.match:!t.match).map(t=>t.id);
 return tests.flatMap((id):Step[]=>paired.has(id)?sides[id].map(side=>({id,side})):[{id}]);
}

type Cursor={route:Route; offsets:Record<Route,number>};
export const progressKey='football-card-series-v1';
export function resume(storage:Pick<Storage,'getItem'>):Cursor{
 const fallback:Cursor={route:'quick',offsets:{quick:0,field:0,matches:0}};
 try{
   const saved=JSON.parse(storage.getItem(progressKey)??'null');
   if(saved && Object.hasOwn(fallback.offsets,saved.route)){
     fallback.route=saved.route;
     for(const route of Object.keys(fallback.offsets) as Route[]){
       const index=saved.offsets?.[route];
       if(Number.isInteger(index)&&index>=0&&index<=stepsFor(route).length)fallback.offsets[route]=index;
     }
   }
 }catch{/* Начать серию с первого шага, если прогресс недоступен. */}
 return fallback;
}
