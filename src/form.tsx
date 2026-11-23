import {useEffect,useRef,useState} from 'react';
import {byId,geometry,sides} from './catalog.ts';
import {formats} from './config.ts';
import {makeEntry,parseNumber,validate} from './model.ts';
import type {Entry} from './model.ts';

export const methods:Record<string,string>={manual:'Ручной секундомер / подсчёт',video:'Видео',electronic:'Электронный замер',memory:'По памяти'};
export const numeric=(n:number|null|undefined)=>n==null?'':String(n).replace('.',',');
export function Pitch({id}:{id:string}){
 return <svg className="pitch" viewBox="0 0 400 170" role="img" aria-label="Схема расстановки"><rect x="8" y="8" width="384" height="154" rx="8" fill="#e9f3ed" stroke="#a6c8b4"/>
 {id==='B07'?<>{[86,143,200,257,314].map(x=><path key={x} d={`M${x-7} 87l7 -14 7 14z`} fill="#c87332"/>)}<path d="M30 85Q86 40 114 85T171 85T228 85T285 85T370 85" fill="none" stroke="#176b47" strokeWidth="2"/><text x="22" y="130">Старт</text><text x="170" y="130">Шаг 2 м</text><text x="310" y="130">Разворот</text></>:id==='G05'?<><path d="M120 39V22H280V39" fill="none" stroke="#176b47" strokeWidth="4"/><line x1="285" y1="141" x2="200" y2="22" stroke="#176b47" strokeDasharray="8 5"/><circle cx="243" cy="82" r="12" fill="#176b47"/><circle cx="285" cy="141" r="7" fill="#142d24"/><text x="262" y="86">Вратарь</text></>:id==='D01'?<><rect x="103" y="18" width="194" height="133" fill="none" stroke="#176b47" strokeWidth="2"/><circle cx="200" cy="108" r="9" fill="#176b47"/><circle cx="200" cy="62" r="9" fill="#4555a2"/><text x="140" y="37">Линия прохода</text><text x="115" y="142">Коридор 8 × 12 м</text></>:<><circle cx="59" cy="82" r="7" fill="#142d24"/><line x1="70" y1="82" x2="300" y2="82" stroke="#176b47" strokeDasharray="6 5"/><path d="M310 44H354V122H310Z" fill="none" stroke="#176b47" strokeWidth="2"/><text x="26" y="137">Старт</text><text x="310" y="145">Цель</text></>}</svg>
}
function Reaction({onFinish}:{onFinish:(values:number[])=>void}){
 const [stage,setStage]=useState('ready'),[attempts,setAttempts]=useState<number[]>([]);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined), start=useRef(0);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 function run(){
   if(stage==='waiting'){clearTimeout(timer.current);setStage('early');return}
   if(stage==='go'){const updated=[...attempts,Math.max(1,Math.round(performance.now()-start.current))];setAttempts(updated);setStage(updated.length===12?'done':'ready');return}
   setStage('waiting');timer.current=setTimeout(()=>{start.current=performance.now();setStage('go')},900+Math.random()*2200);
 }
 const captions:Record<string,string>={ready:'Начать попытку',waiting:'Ждите сигнала',go:'Нажмите сейчас',early:'Слишком рано · повторить'};
 return <div className="exercise"><p>Попытки {attempts.length} из 12 · первые две тренировочные</p>{stage==='done'?<button type="button" onClick={()=>onFinish(attempts.slice(2))}>Сохранить 10 замеров</button>:<button type="button" className={stage==='go'?'go':''} onClick={run}>{captions[stage]}</button>}</div>
}
function Vision({onFinish}:{onFinish:(value:number)=>void}){
 const [i,setI]=useState(0),[correct,setCorrect]=useState(0),[stage,setStage]=useState('ready');
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const from=100+(i%3)*100, answer=(i*5+Math.floor(i/4))%3;
 const players=[[74,50+(i%4)*11],[200,34+(i%3)*24],[326,80-(i%4)*12]];
 return <div className="exercise"><p>Схемы {i} из 12. Найдите адресата со свободной линией паса. Синие точки — соперники.</p>
 {stage==='ready'&&<button type="button" onClick={()=>{setStage('show');timer.current=setTimeout(()=>setStage('answer'),2000)}}>Показать схему на 2 секунды</button>}
 {stage==='show'&&<svg className="pitch" viewBox="0 0 400 220" role="img" aria-label="Схема паса"><rect width="400" height="220" fill="#dfeee5"/>{players.map(([x,y],j)=><g key={j}><line x1={from} y1={196} x2={x} y2={y} stroke="#82a88e" strokeDasharray="5 5"/><path d={`M${x} ${y-8}v-19m-5 5 5 -5 5 5`} fill="none" stroke="#176b47"/><circle cx={x} cy={y} r="13" fill="#176b47"/><text x={x} y={y+4} textAnchor="middle" fill="white">{['А','Б','В'][j]}</text>{j!==answer&&<circle cx={(x+from)/2} cy={(y+196)/2} r="9" fill="#4555a2"/>}</g>)}<circle cx={from} cy="196" r="7" fill="#142d24"/></svg>}
 {stage==='answer'&&<div className="actions">{['А','Б','В'].map((letter,j)=><button type="button" key={letter} onClick={()=>{setCorrect(correct+Number(answer===j));setI(i+1);setStage(i===11?'done':'ready')}}>{letter}</button>)}</div>}
 {stage==='done'&&<button type="button" onClick={()=>onFinish(correct)}>Сохранить {correct} из 12</button>}</div>
}
export function Form({id,initial,side,onSave,format,last}:{id:string;initial?:Entry;side?:string;onSave:(entries:Entry[])=>void;format:string;last?:Entry}){
 const test=byId[id];
 const [entry,setEntry]=useState(()=>initial??{...makeEntry(id),side:side??makeEntry(id).side,format:last?.format??format,match:last?.match??'',minutes:last?.minutes??null});
 const [input,setInput]=useState<string[]>(entry.values.map(numeric)),[dims,setDims]=useState<string[]>(entry.dimensions.map(numeric));
 const [minutes,setMinutes]=useState(numeric(entry.minutes)),[error,setError]=useState('');
 const set=<K extends keyof Entry>(key:K,value:Entry[K])=>setEntry(e=>({...e,[key]:value}));
 const dimensions=geometry[id]?(id==='G01'?3:id==='G03'?1:geometry[id].length):0;
 const raw=()=>({...entry,values:test.labels.map((_,i)=>parseNumber(input[i]??'')),dimensions:Array.from({length:dimensions},(_,i)=>parseNumber(dims[i]??'')??NaN),minutes:parseNumber(minutes)});
 function submit(entries:Entry[]){
   const message=entries.map(validate).find(Boolean);
   if(message){setError(message);return}
   setError('');onSave(entries);
 }
 return <form className="form" onSubmit={e=>{e.preventDefault();submit([raw()])}}><div className="fields">
 {test.labels.map((label,i)=><label key={label}>{label}<input inputMode="decimal" placeholder={id==='P04'&&i===2?'8,10':'—'} value={input[i]??''} onChange={e=>{const values=[...input];values[i]=e.target.value;setInput(values)}}/></label>)}
 {sides[id]&&(!side||initial)&&<label>{id==='S01'?'Движение':'Сторона / вариант'}<select value={entry.side} onChange={e=>set('side',e.target.value)}>{sides[id].map(v=><option key={v}>{v}</option>)}</select></label>}
 {Array.from({length:dimensions},(_,i)=><label key={i}>{['Дистанция, м','Ширина цели, м',id==='G01'?'Высота ворот, м':'Высота или глубина цели, м'][i]}<input inputMode="decimal" value={dims[i]??''} onChange={e=>{const values=[...dims];values[i]=e.target.value;setDims(values)}}/></label>)}
 <label>Дата<input type="date" value={entry.date} onChange={e=>set('date',e.target.value)}/></label>
 <label>Как измерили<select value={entry.quality} onChange={e=>set('quality',e.target.value)}>{Object.entries(methods).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label>
 {!['D06','D08'].includes(id)&&<label>Покрытие<select value={entry.surface} onChange={e=>set('surface',e.target.value)}>{['Искусственный газон','Натуральный газон','Зал','Трек','Грунт','Не указано'].map(v=><option key={v}>{v}</option>)}</select></label>}
 {['P01','P02','P04'].includes(id)&&<label>Старт<select value={entry.start} onChange={e=>set('start',e.target.value)}>{['С места','Высокий с места','Низкий с места'].map(v=><option key={v}>{v}</option>)}</select></label>}
 {['P05','D06'].includes(id)&&<label>Устройство<input placeholder={id==='D06'?'Телефон, сенсорный экран':'Модель устройства'} value={entry.device} onChange={e=>set('device',e.target.value)}/></label>}
 {test.match&&<><label>Матч<input placeholder="Например, тур 3" value={entry.match} onChange={e=>set('match',e.target.value)}/></label><label>Формат<select value={entry.format} onChange={e=>set('format',e.target.value)}>{formats.map(v=><option key={v}>{v}</option>)}</select></label><label>Минуты игры<input inputMode="decimal" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label></>}
 </div>
 {id==='D06'&&!initial&&<Reaction onFinish={values=>submit(values.map(value=>({...raw(),quality:'electronic',values:[value]})))}/>}
 {id==='D08'&&!initial&&<Vision onFinish={success=>submit([{...raw(),quality:'electronic',values:[12,success]}])}/>}
 {error&&<p className="error" role="alert">{error}</p>}
 <button className="primary" type="submit" >{initial?'Сохранить изменения':'Сохранить и дальше'}</button></form>
}
