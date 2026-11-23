import {byId,catalog,geometry,sides} from './catalog.ts';
import {composites,continuous,dualWeights,formats,positions,qualities,ratios,targetRatios,testWeights,weakBounds,weakWeights} from './config.ts';
import type {Points,Weights} from './config.ts';

export type Entry={id:string;date:string;values:(number|null)[];quality:string;side:string;surface:string;start:string;dimensions:number[];device:string;format:string;match:string;minutes:number|null};
export type Profile={name:string;position:string;foot:string;age:string;height:string;weight:string;format:string;mix:boolean;weak:number|null;skills:number|null};
export type Data={version:1;profile:Profile;entries:Entry[]};
export const empty=():Data=>({version:1,profile:{name:'',position:'ST',foot:'Правая',age:'',height:'',weight:'',format:'11×11',mix:false,weak:null,skills:null},entries:[]});
export const day=()=>new Date().toLocaleDateString('sv-SE');
export function makeEntry(id:string):Entry{
 return {id,date:day(),values:[],quality:'manual',side:sides[id]?.[0]??'',surface:'Искусственный газон',start:'С места',dimensions:[...(geometry[id]??[])],device:'',format:'11×11',match:'',minutes:null};
}
export function parseNumber(value:string):number|null{
 const input=value.trim().replace(',','.');
 if(!input)return null;
 return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(input)?Number(input):NaN;
}
export const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);const i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2};
export const jeffreys=(success:number,n:number)=>n>0?(success+.5)/(n+1):null;
export const kmh=(metres:number,seconds:number)=>3.6*metres/seconds;
export function interpolate(x:number,anchors:Points){
 const first=anchors[0],last=anchors.at(-1)!;
 if(x<=first[0])return first[1];
 if(x>=last[0])return last[1];
 const i=anchors.findIndex(([value])=>x<=value);
 const [x1,s1]=anchors[i-1], [x2,s2]=anchors[i];
 return s1+(x-x1)*(s2-s1)/(x2-x1);
}
const inList=(id:string,list:string)=>list.split(' ').includes(id);
const validDomain=(obj:object,key:string)=>Object.hasOwn(obj,key);
export function validate(e:Entry):string|null{
 const test=validDomain(byId,e.id)?byId[e.id]:undefined;
 if(!test||!validDomain(qualities,e.quality)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(e.date)||e.values.length>test.labels.length)return 'Проверьте тест, дату и способ замера.';
 const {id,values}=e;
 const [a,b,c,d]=values;
 const has=(x:number|null|undefined):x is number=>x!==null&&x!==undefined;
 const filled=values.filter(has);
 if(!filled.length||filled.some(n=>!Number.isFinite(n)||n<0))return 'Введите корректные неотрицательные числа.';
 if(sides[id]&&!sides[id].includes(e.side))return 'Выберите сторону или вариант теста.';
 if(test.match&&(!formats.includes(e.format)||!e.match.trim()||typeof e.minutes!=='number'||!Number.isFinite(e.minutes)||e.minutes<=0))return 'Укажите матч, формат и положительное число минут.';
 if(e.dimensions.some(n=>!Number.isFinite(n)||n<=0))return 'Размеры и расстояния должны быть положительными.';
 if(geometry[id]&&e.dimensions.length!==(id==='G01'?3:id==='G03'?1:geometry[id].length))return 'Заполните расстояние и размеры цели.';
 if(id==='A04'&&(e.dimensions[0]<8||e.dimensions[0]>12))return 'Для этого протокола допустимо 8–12 м.';
 if(geometry[id]?.length&&id!=='A04'&&geometry[id].some((n,i)=>n!==e.dimensions[i]))return 'Введите условия из протокола. Для других размеров шкала пока отсутствует.';
 if(inList(id,'P05 D06')&&!e.device.trim())return 'Укажите устройство.';
 if(id==='P04')return filled.every(n=>n>0)?null:'Время должно быть больше нуля.';
 if(id==='P02')return has(a)&&a>0&&(!has(b)||(b>0&&a>b))?null:'Отсечка 10 м должна быть раньше отсечки 20 м.';
 if(id==='P05')return has(a)&&a>0&&has(b)&&Number.isInteger(b)&&b>0?null:'Введите скорость и целое число забегов.';
 if(id==='P09')return has(a)&&a>0&&values.slice(1).some(has)&&values.slice(1).filter(has).every(n=>n>=a)?null:'Введите высоту стоя и хотя бы одно касание в прыжке.';
 if(id==='A03')return (has(a)&&a>0&&!has(b)&&!has(c)&&!has(d))||(!has(a)&&has(b)&&b>0&&has(c)&&Number.isInteger(c)&&c>0&&has(d)&&d>0)?null:'Введите радар или все три параметра видео.';
 if(id==='D07')return has(a)&&has(b)&&has(c)&&Number.isInteger(a)&&Number.isInteger(b)&&b>a&&c>=60?null:'Проверьте порядок кадров и частоту от 60 кадр/с.';
 if(id==='B07'||id==='B08')return has(a)&&has(b)&&a>0&&b>0&&(id==='B07'?c===0:has(c)&&Number.isInteger(c)&&c>=4&&d===1)?null:'Повторите чистую попытку и укажите времена и условия.';
 if(filled.length!==test.labels.length)return 'Заполните все поля результата. Ноль можно указать явно.';
 if(test.ratio||id==='D01'||id==='G02'){
   if(filled.some(n=>!Number.isInteger(n)))return 'Число действий должно быть целым.';
   const [n,x,y,z]=filled;
   const invalid=id==='S01'?x>n||z>y:id==='G06'?x+y>n:id==='D04'?x+y+z!==n:id==='D05'||id==='G03'?x>n||y>n:id==='D01'||id==='G02'?false:x>n||(filled.length>2&&y>x);
   return invalid?'Успехи и исходы должны согласовываться с числом попыток.':null;
 }
 return filled.every(n=>n>0)?null:'Значение должно быть больше нуля.';
}
type Signal={id:string;score:number;quality:number;sufficiency:number;weight:number;detail:string;indirect:boolean};
type Attribute={score:number;trust:number;sources:Signal[];indirect:boolean};
const sum=(values:number[])=>values.reduce((a,b)=>a+b,0);
const show=(n:number)=>Number(n.toFixed(3)).toLocaleString('ru-RU');
const rate=(success:number,n:number)=>show(success)+' / '+n+' → p = '+show(jeffreys(success,n)!);
const protocol=(e:Entry)=>JSON.stringify([e.side,e.surface,e.start,e.dimensions,e.device,e.quality,e.format,e.id==='A03'&&e.values[0]!=null]);
const weakProtocol=(e:Entry)=>JSON.stringify([e.surface,e.start,e.dimensions]);
function signal(entries:Entry[]):Signal|null{
 const first=entries[0], {id}=first, test=byId[id];
 const values=entries.map(e=>e.values as number[]);
 const total=test.labels.map((_,i)=>sum(values.map(row=>row[i]??0)));
 let suff=entries.length, score=0,detail='';
 const set=(scale:string,measurements:number[],unit:string)=>{
   suff=measurements.length;
   const value=median(measurements);
   score=interpolate(value,continuous[scale].anchors);
   detail='Медиана '+measurements.map(show).join(', ')+' → '+show(value)+' '+unit+' · шкала '+scale;
 };
 const ratio=(n:number,s:number,scale=id)=>{
   if(!n)return false;
   suff=n;score=interpolate(jeffreys(s,n)!,ratios[scale].anchors);detail=rate(s,n)+' · шкала '+scale;return true;
 };
 switch(id){
 case 'P01':case 'P08':case 'D06':set(id,values.map(v=>v[0]),id==='P01'?'с':id==='P08'?'м':'мс');break;
 case 'P02':{
   const splits=values.flatMap(v=>v[1]==null?[]:[v[1]]);
   if(splits.length)set('P01',splits,'с на 10 м');else set('P02',values.map(v=>v[0]),'с на 20 м');
   break;
 }
 case 'P03':{
   const seconds=values.map(v=>v[0]);
   const time=median(seconds),speed=kmh(20,time);
   score=interpolate(speed,continuous.sprint.anchors);
   detail='20 м за '+show(time)+' с → '+show(speed)+' км/ч (3,6 × 20 / с) · шкала sprint · попытки '+seconds.map(show).join(', ')+' с';
   break;
 }
 case 'P05':set('sprint',values.map(v=>v[0]),'км/ч');suff=total[1];break;
 case 'P06':set(id,values.flatMap(v=>[v[0],v[1]]),'с');break;
 case 'P07':{
   const drops=values.map(v=>100*(sum(v)/(6*Math.min(...v))-1));
   const pace=median(values.map(median)),drop=median(drops);
   const absolute=interpolate(pace,continuous['P07 pace'].anchors);
   score=absolute*.8+interpolate(drop,continuous['P07 drop'].anchors)*.2;
   detail=values.map(v=>v.map(show).join(' / ')+' с').join('; ')+' · темп '+show(pace)+' с (80%), падение '+show(drop)+'% (20%)';suff=6*values.length;break;
 }
 case 'P09':set(id,values.flatMap(v=>v.slice(1).filter(n=>n!=null).map(n=>n-v[0])),'см');break;
 case 'B07':case 'B08':set(id,values.map(v=>v[0]/v[1]),'без мяча / с мячом');detail+=' · '+values.map(v=>show(v[0])+' / '+show(v[1])+' с').join('; ');break;
 case 'A03':set(first.values[0]!=null?'radar':'video',values.map(v=>v[0]??kmh(v[1],v[2]/v[3])),'км/ч');break;
 case 'D07':set(id,values.map(v=>1000*(v[1]-v[0])/v[2]),'мс');break;
 case 'D01':if(!ratio(sum(total),total[0]+.5*total[1]))return null;detail+=' · отбор + 0,5 × вытеснение';break;
 case 'G02':if(!ratio(sum(total),total[0]+.65*total[1]))return null;detail+=' · поймал + 0,65 × безопасно отбил';break;
 case 'D05':if(!ratio(total[0],Math.max(0,total[1]-total[2])))return null;detail+=' · вступления за вычетом фолов';break;
 case 'S01':if(!ratio(total[0]+total[2],total[1]+total[3]))return null;detail+=' · обе серии';break;
 default:
   if(!ratio(total[0],targetRatios[id]?total[2]:total[1],id==='A06'&&first.side==='Без вратаря'?'A06 sector':id))return null;
   if(targetRatios[id]){
     const p=jeffreys(total[1],total[0])!;
     score=dualWeights[0]*interpolate(p,targetRatios[id].anchors)+dualWeights[1]*score;
     detail=rate(total[1],total[0])+' (35%); '+detail+' (65%)';
   }
 }
 const quality=qualities[first.quality];
 const sufficiency=Math.min(1,suff/test.target);
 return {id,score,quality,sufficiency,weight:(testWeights[id]??1)*quality*sufficiency,detail:detail+' · '+entries.map(e=>e.date+(test.match?' '+e.match+' ('+e.format+', '+e.minutes+' мин)':'')).join(', '),indirect:test.indirect};
}
export const aggregate=(weights:Weights,attributes:Record<string,Attribute>)=>{
 const entries=Object.entries(weights).filter(([key])=>attributes[key]);
 const weight=sum(entries.map(([,w])=>w));
 const coverage=weight/100;
 const score=coverage<.6?null:sum(entries.map(([key,w])=>attributes[key].score*w))/weight;
 const trust=weight?sum(entries.map(([key,w])=>attributes[key].trust*w))/weight:0;
 return {score,coverage,trust,preliminary:coverage<.85};
};
export function calculate(data:Data,until?:string){
 const rows=data.entries.filter(e=>(!until||e.date<=until)&&!validate(e)&&(!byId[e.id].match||data.profile.mix||e.format===data.profile.format));
 const groups=new Map<string,Entry[]>();
 for(const e of rows.filter(e=>e.id!=='P04')){
   const key=e.id+protocol(e);
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key)!.push(e);
 }
 const signals=Array.from(groups.values(),signal).filter((s):s is Signal=>s!==null);
 const attributes:Record<string,Attribute>={};
 for(const attr of new Set(catalog.map(t=>t.attr))){
   let sources=signals.filter(s=>byId[s.id].attr===attr);
   if(attr==='acc'&&sources.some(s=>s.id==='P01'))sources=sources.filter(s=>s.id==='P01');
   if(attr==='sprint'&&sources.some(s=>s.id==='P03'))sources=sources.filter(s=>s.id==='P03');
   const weight=sum(sources.map(s=>s.weight));
   if(weight)attributes[attr]={score:sum(sources.map(s=>s.weight*s.score))/weight,trust:sum(sources.map(s=>s.weight*s.quality*s.sufficiency))/weight,sources,indirect:sources.every(s=>s.indirect)};
 }
 const stats=Object.fromEntries(Object.entries(composites).map(([key,weights])=>[key,aggregate(weights,attributes)]));
 const pace=rows.filter(e=>e.id==='P04').flatMap(e=>e.values.flatMap((value,i)=>value==null?[]:[{e,value,distance:[30,40,60,100][i]}]));
 pace.sort((a,b)=>qualities[b.e.quality]-qualities[a.e.quality]||b.e.date.localeCompare(a.e.date)||Math.abs(a.distance-60)-Math.abs(b.distance-60));
 let paceDetail='';
 if(stats.PAC.score===null&&pace.length){
   const {e,value,distance}=pace[0];
   stats.PAC={...stats.PAC,score:interpolate(value,continuous[String(distance)].anchors),preliminary:true,trust:qualities[e.quality]};
   paceDetail=distance+' м за '+show(value)+' с · '+e.date+' · доверие '+show(qualities[e.quality])+' · '+e.start+'.';
   if(pace.length>1)paceDetail+=' Приоритет у качества хронометража, затем даты и близости к 60 м. Остальные замеры: '+pace.slice(1).map(p=>p.distance+' м за '+show(p.value)+' с ('+p.e.date+', качество '+show(qualities[p.e.quality])+')').join('; ')+'.';
 }
 const position=positions[data.profile.position]??positions.ST;
 const ovr=aggregate(position.weights,attributes);
 const next=catalog.map(test=>({test,gain:attributes[test.attr]?0:position.weights[test.attr]??0})).filter(x=>x.gain>0).sort((a,b)=>b.gain-a.gain).filter((x,i,list)=>list.findIndex(entry=>entry.test.attr===x.test.attr)===i).slice(0,3);
 let successes=0;
 const weakParts=Object.entries(weakWeights).flatMap(([id,weight])=>{
   const tests=rows.filter(e=>e.id===id);
   const keys=Array.from(new Set(tests.map(weakProtocol)));
   const matching=keys.flatMap(key=>{
     const totals=(foot:string)=>tests.filter(e=>weakProtocol(e)===key&&e.side===foot).reduce(([n,s],e)=>[n+(e.values[0]??0),s+(e.values[id==='A01'?2:1]??0)],[0,0]);
     const working=totals(data.profile.foot),other=totals(data.profile.foot==='Правая'?'Левая':'Правая');
     return working[0]>=10&&other[0]>=10?[{working,other}]:[];
   });
   if(!matching.length)return [];
   const {working,other}=matching[0];
   successes+=working[1];
   return [{id,weight,value:jeffreys(other[1],other[0])!/jeffreys(working[1],working[0])!,detail:rate(other[1],other[0])+' ÷ '+rate(working[1],working[0])}];
 });
 const weakRatio=weakParts.length>=2&&successes>=5?sum(weakParts.map(p=>p.value*p.weight))/sum(weakParts.map(p=>p.weight)):null;
 const weak=weakRatio==null?null:1+weakBounds.filter(v=>weakRatio>=v).length;
 const skillRows=rows.filter(e=>e.id==='S01');
 const moves=(sides.S01??[]).filter(move=>{
   const selected=skillRows.filter(e=>e.side===move);
   const totals=[0,1,2,3].map(i=>sum(selected.map(e=>e.values[i]??0)));
   return totals[0]>=10&&totals[2]>=3&&jeffreys(totals[1],totals[0])!>=.65&&jeffreys(totals[3],totals[2])!>=.5;
 });
 const hasSkillSample=(sides.S01??[]).some(move=>{
   const attempts=skillRows.filter(e=>e.side===move);
   return sum(attempts.map(e=>e.values[0]??0))>=10&&sum(attempts.map(e=>e.values[2]??0))>=3;
 });
 const skills=hasSkillSample?Math.min(5,1+moves.length):null;
 return {attributes,stats,ovr,paceDetail,next,weak,weakParts,skills,moves};
}
export const round=(score:number|null|undefined)=>score==null?'—':Math.round(score);
export function importData(raw:string):Data{
 const data=JSON.parse(raw) as Data;
 if(!data||data.version!==1||!data.profile||!Array.isArray(data.entries))throw Error('Формат профиля версии 1 не распознан.');
 const reference=empty().profile;
 const profile={...reference,...data.profile};
 if(Object.keys(reference).some(k=>{const key=k as keyof Profile;const value=profile[key];return key==='weak'||key==='skills'?value!==null&&(!Number.isInteger(value)||Number(value)<1||Number(value)>5):typeof value!==typeof reference[key];})||!Object.hasOwn(positions,profile.position)||!formats.includes(profile.format)||!['Правая','Левая'].includes(profile.foot))throw Error('Некорректные поля профиля.');
 for(const e of data.entries){
   if(!e||!Array.isArray(e.values)||!Array.isArray(e.dimensions)||['id','date','side','quality','device','surface','start','format','match'].some(k=>typeof e[k as keyof Entry]!=='string')||validate(e))throw Error('В файле есть некорректный замер.');
 }
 return {version:1,profile,entries:data.entries};
}
export const storageKey='football-card-lab-v1';
export const serialize=(data:Data)=>JSON.stringify(data,null,2);
export function load(storage:Pick<Storage,'getItem'>):Data{
 try{const value=storage.getItem(storageKey);return value?importData(value):empty()}catch{return empty()}
}
export function save(storage:Pick<Storage,'setItem'>,data:Data){storage.setItem(storageKey,serialize(data))}
