import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from './catalog.ts';
import {composites,labels,positions} from './config.ts';
import {calculate,empty,importData,kmh,load,makeEntry,parseNumber,round,save,serialize,validate} from './model.ts';
import type {Entry} from './model.ts';
const row=(id:string,values:(number|null)[],more:Partial<Entry>={}):Entry=>({...makeEntry(id),date:'2026-10-02',values,match:'Контрольный матч',minutes:60,device:'Камера',...more});
const calc=(...entries:Entry[])=>calculate({...empty(),entries});
test('60 м за 8,10 с дают предварительный PAC 61',()=>{
 const r=calc(row('P04',[null,null,8.1]));
 assert.equal(round(r.stats.PAC.score),61);assert.equal(r.stats.PAC.preliminary,true);
 assert.equal(r.attributes.acc,undefined);assert.equal(r.attributes.sprint,undefined);
 assert.match(r.paceDetail,/60 м за 8,1 с/);
});
test('летучие 20 м и прямой PAC',()=>{
 assert.equal(kmh(20,2.4),30);
 const r=calc(row('P01',[1.9]),row('P03',[2.4]),row('P04',[null,null,8.1]));
 assert.equal(round(r.stats.PAC.score),67);assert.equal(r.stats.PAC.coverage,1);assert.equal(r.paceDetail,'');
});
test('явный нулевой результат и отсутствие замера различаются',()=>{
 assert.equal(calc().attributes.short,undefined);
 assert.equal(calc(row('B01',[0,0])).attributes.short,undefined);
 assert.ok(calc(row('B01',[20,0])).attributes.short.score>0);
});
test('валидация дробей, времени и вложенного попадания',()=>{
 for(const entry of [row('B01',[5,7]),row('P01',[-1]),row('A01',[20,8,9])])assert.ok(validate(entry));
});
test('десятичный разделитель',()=>assert.equal(parseNumber('8,1'),parseNumber('8.1')));
test('доверие зависит от выборки, качество не уменьшает одиночный балл',()=>{
 assert.ok(calc(row('A01',[1,1,1])).attributes.finish.trust<calc(row('A01',[20,20,20])).attributes.finish.trust);
 assert.equal(calc(row('P01',[1.9])).attributes.acc.score,calc(row('P01',[1.9],{quality:'video'})).attributes.acc.score);
});
test('смена позиции меняет OVR, сохраняя атрибуты',()=>{
 const data={...empty(),entries:[row('D01',[12,0,0,0]),row('D03',[20,0]),row('D02',[20,3]),row('P03',[2.4]),row('P01',[1.75]),row('P08',[3000]),row('A07',[12,9,6]),row('P11',[20,3])]};
 const fb=calculate({...data,profile:{...data.profile,position:'FB'}});
 const cb=calculate({...data,profile:{...data.profile,position:'CB'}});
 assert.notEqual(fb.ovr.score,null);assert.notEqual(cb.ovr.score,null);
 assert.notEqual(round(fb.ovr.score),round(cb.ovr.score));
 assert.deepEqual(fb.attributes,cb.attributes);
});
test('вратарские данные отсутствуют без вратарских тестов',()=>{
 const result=calc(row('P01',[1.9]));
 for(const key of ['DIV','HAN','KIC','REF','POS'])assert.equal(result.stats[key].score,null);
});
test('замер → сохранение → карточка → объяснение → экспорт → импорт',()=>{
 const map=new Map<string,string>();const storage={getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>{map.set(key,value)}};
 const data={...empty(),entries:[row('P04',[null,null,parseNumber('8,10')]),row('B01',[20,15])]};
 save(storage,data);const loaded=load(storage);assert.deepEqual(loaded,data);
 const before=calculate(loaded);assert.equal(round(before.stats.PAC.score),61);
 assert.match(before.attributes.short.sources[0].detail,/15 \/ 20/);
 assert.deepEqual(calculate(importData(serialize(loaded))),before);
});
const fixtures:Record<string,(number|null)[]>={P01:[1.9],P02:[3.5,null],P03:[2.4],P04:[null,null,8.1],P05:[30,3],P06:[3,3.1],P07:[5,5,5,5,5,5],P08:[2600],P09:[200,237,239,241],P10:[10,8],P11:[20,10],B01:[20,15],B02:[20,12],B03:[12,6],B04:[12,6],B05:[20,12],B06:[15,9],B07:[10,12,0],B08:[3.5,4,5,1],B09:[10,7,4],B10:[20,12],B11:[20,12,5],B12:[20,16],A01:[20,15,10],A02:[20,14,7],A03:[80],A04:[12,9,4],A05:[10,8,5],A06:[20,15],A07:[12,9,4],A08:[20,12],A09:[20,12,5],D01:[6,2,3,1],D02:[20,9],D03:[20,16],D04:[12,7,1,4],D05:[20,15,2],D06:[270],D07:[100,120,60],D08:[12,8],G01:[20,14],G02:[10,5,3,2],G03:[12,9,1],G04:[12,9],G05:[12,9],G06:[15,10,2],S01:[10,9,4,3]};
test('каждая форма связана с расчётом, вес позиций и составных статов равен 100',()=>{
 assert.equal(Object.keys(fixtures).length,catalog.length);
 for(const t of catalog){
   const e=row(t.id,fixtures[t.id],t.id==='G01'?{dimensions:[12,7.32,2.44]}:t.id==='G03'?{dimensions:[5]}:{});
   assert.equal(validate(e),null,t.id);
   const r=calc(e);
   if(t.id==='P04'){assert.ok(r.paceDetail);continue}
   assert.equal(r.attributes[t.attr].sources[0].id,t.id);assert.ok(r.attributes[t.attr].sources[0].detail);
 }
 for(const key of Object.keys(labels))assert.ok(catalog.some(t=>t.attr===key),key);
 for(const weights of [...Object.values(composites),...Object.values(positions).map(p=>p.weights)])assert.equal(Object.values(weights).reduce((a,b)=>a+b,0),100);
});
test('сопоставимые замеры складываются, форматы фильтруются',()=>{
 const a=row('B01',[10,5]), b=row('B01',[10,6],{date:'2026-10-03'});
 assert.match(calc(a,b).attributes.short.sources[0].detail,/11 \/ 20/);
 assert.equal(calc(row('D02',[20,12],{format:'5×5'})).attributes.intercept,undefined);
 assert.equal(calc(a,row('D02',[0,0])).attributes.intercept,undefined);
});
test('качество дистанции, слабая нога и видео удара',()=>{
 const r=calc(row('P04',[null,null,null,13],{quality:'memory',date:'2026-09-01'}),row('P04',[null,null,8.1]));
 assert.match(r.paceDetail,/60 м за 8,1 с.*100 м за 13 с/);
 assert.equal(calc(row('B01',[20,15]),row('B01',[20,8],{side:'Левая'})).weak,null);
 assert.equal(calc(row('B01',[20,15]),row('B01',[20,8],{side:'Левая'}),row('B03',[12,10]),row('B03',[12,6],{side:'Левая'})).weak,3);
 assert.match(calc(row('A03',[null,15,45,60])).attributes.power.sources[0].detail,/72 км\/ч · шкала video/);
});
