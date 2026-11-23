import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {byId,catalog} from './catalog.ts';
import {formats,positions,version} from './config.ts';
import {calculate,empty,importData,load,makeEntry,round,save,serialize} from './model.ts';
import type {Data,Profile} from './model.ts';
import {Form,Pitch,numeric} from './form.tsx';
import {Method,Results,keepers,outfield,pct,statsNames,trust} from './results.tsx';
import './style.css';

const groups:Record<string,string>={P:'Скорость и физика',B:'Пас и контроль',A:'Удары и атака',D:'Защита и восприятие',G:'Вратари',S:'Финты'};
const download=(url:string,name:string)=>{const a=document.createElement('a');a.href=url;a.download=name;a.click()};
function exportProfile(data:Data){
 const url=URL.createObjectURL(new Blob([serialize(data)],{type:'application/json'}));
 download(url,'football-card-profile.json');setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function png(name:string,position:string,ovr:string|number,stats:[string,string|number][]){
 const canvas=document.createElement('canvas');canvas.width=660;canvas.height=740;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const gradient=ctx.createLinearGradient(0,0,660,740);gradient.addColorStop(0,'#dcefdb');gradient.addColorStop(1,'#8ebda2');
 ctx.fillStyle='#102b23';ctx.fillRect(0,0,660,740);
 ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(105,52);ctx.lineTo(555,52);ctx.lineTo(610,138);ctx.lineTo(610,591);ctx.lineTo(330,705);ctx.lineTo(50,591);ctx.lineTo(50,138);ctx.closePath();ctx.fill();
 ctx.fillStyle='#102e24';ctx.textAlign='center';ctx.font='700 26px sans-serif';ctx.fillText('МОЯ ФУТБОЛЬНАЯ КАРТОЧКА',330,130,480);
 ctx.font='700 116px sans-serif';ctx.fillText(String(ovr),330,280);ctx.font='700 25px sans-serif';ctx.fillText(position+' · OVR',330,330);ctx.font='700 38px sans-serif';ctx.fillText(name||'Игрок',330,416,490);
 stats.forEach(([key,value],i)=>{const x=120+i*420/(stats.length-1);ctx.font='700 36px sans-serif';ctx.fillText(String(value),x,512);ctx.font='700 20px sans-serif';ctx.fillText(key,x,546)});
 download(canvas.toDataURL('image/png'),'football-card.png');
}
function demo():Data{
 const data=empty();data.profile={...data.profile,name:'Алексей Орлов'};
 const rows:[string,number[],string?][]=[['P01',[1.82]],['P03',[2.4]],['A01',[20,15,10],'Правая'],['A01',[20,10,5],'Левая'],['B01',[20,15],'Правая'],['B01',[20,8],'Левая'],['P08',[2800]],['A08',[15,10]],['A03',[84]],['B05',[20,13]],['B12',[12,8]]];
 data.entries=rows.map(([id,values,side])=>{const row=makeEntry(id);return {...row,values,side:side??row.side,match:'Демонстрационный матч',minutes:60,quality:'video'}});
 return data;
}
function App(){
 const [data,setData]=useState(()=>load(localStorage));
 const [page,setPage]=useState('lab'),[route,setRoute]=useState('quick'),[selected,setSelected]=useState('P04');
 const [instruction,setInstruction]=useState<string|null>(null),[editing,setEditing]=useState<number|null>(null);
 const [session,setSession]=useState(0),[notice,setNotice]=useState('');
 const [fieldPosition,setFieldPosition]=useState('ST');
 const file=useRef<HTMLInputElement>(null),editor=useRef<HTMLDivElement>(null);
 const result=calculate(data);
 const isGK=data.profile.position==='GK',position=positions[data.profile.position].name;
 const statKeys=isGK?keepers:outfield,ovr=result.ovr;
 const setProfile=<K extends keyof Profile>(key:K,value:Profile[K])=>setData(d=>({...d,profile:{...d.profile,[key]:value}}));
 function changePosition(value:string){if(value!=='GK')setFieldPosition(value);setProfile('position',value)}
 useEffect(()=>{try{save(localStorage,data)}catch{setNotice('Автосохранение недоступно. Скачайте JSON, чтобы сохранить замеры.')}},[data]);
 const pick=(id:string)=>{setPage('lab');setSelected(id);setEditing(null);setSession(n=>n+1);requestAnimationFrame(()=>editor.current?.scrollIntoView({behavior:'smooth',block:'nearest'}))};
 const visible=catalog.filter(t=>route==='matches'?t.match:route==='field'?!t.match:true);
 const last=[...data.entries].reverse().find(e=>byId[e.id].match);
 const test=byId[selected];
 return <><header className="top"><div className="shell nav"><button className="brand" onClick={()=>setPage('lab')}><span className="mark">⚽</span> Футбольная карточка</button><nav aria-label="Разделы"><button className={page==='lab'?'active':''} onClick={()=>setPage('lab')}>Калькулятор</button><button className={page==='method'?'active':''} onClick={()=>setPage('method')}>Методика</button></nav></div></header>
 <main className="shell">{page==='method'?<Method/>:<>
 <div className="intro"><h1>Моя футбольная<br className="desktop"/> карточка</h1><p>Внесите то, что уже измерили. Карточка покажет ваши атрибуты и замеры, на которых они основаны.</p></div>
 <div className="layout"><div className="workspace">
 <div className="tabs" role="group" aria-label="Маршрут">{[['quick','Быстрый ввод'],['field','Полевой тест'],['matches','Матчи']].map(([key,label])=><button key={key} className={route===key?'chosen':''} onClick={()=>{setRoute(key);setSelected(key==='matches'?'A09':key==='field'?'P01':'P04');setEditing(null);setInstruction(null)}}>{label}</button>)}</div>
 <section className="panel input-panel" ref={editor}><div className="section-head"><h2>{editing===null?'Добавить замер':'Изменить замер'}</h2><span className="code">{selected}</span></div>
 <label className="picker">Упражнение<select value={selected} onChange={e=>pick(e.target.value)}>{!visible.some(t=>t.id===selected)&&<option value={selected}>{test.name}</option>}{Object.entries(groups).map(([key,label])=><optgroup key={key} label={label}>{visible.filter(t=>t.id.startsWith(key)).map(t=><option key={t.id} value={t.id}>{t.id==='P04'?'Бег на 30, 40, 60 или 100 м':t.name}</option>)}</optgroup>)}</select></label>
 <button className="link" onClick={()=>setInstruction(instruction===selected?null:selected)}>Как измерить</button>{(instruction===selected||route==='field')&&<div className="protocol"><p>{test.protocol}</p>{['B07','D01','G05','B01','B03','G04'].includes(selected)&&<Pitch id={selected}/>}</div>}
 <Form key={selected+'-'+session+'-'+editing} id={selected} initial={editing===null?undefined:data.entries[editing]} format={data.profile.format} last={last} onSave={entries=>{setData(d=>({...d,entries:editing===null?[...d.entries,...entries]:d.entries.map((e,i)=>i===editing?entries[0]:e)}));setNotice('Замер сохранён. Карточка обновлена.');setSession(n=>n+1);setEditing(null)}}/>
 {notice&&<p role="status" className="notice">{notice}</p>}</section>
 <details className="panel"><summary>Каталог упражнений · {visible.length}</summary>{visible.map(t=><article className="test-item" key={t.id}><div><span className="code">{t.id}</span><strong>{t.name}</strong></div><div className="actions"><button onClick={()=>pick(t.id)}>Ввести результат</button><button onClick={()=>setInstruction(instruction===t.id?null:t.id)}>Как измерить</button></div>{instruction===t.id&&<p>{t.protocol}</p>}</article>)}</details>
 <details className="panel"><summary>Журнал замеров · {data.entries.length}</summary>{data.entries.map((e,i)=><div className="test-item" key={i}><strong>{e.date} · {byId[e.id].name} {e.side}</strong><p>{e.values.map(numeric).map(v=>v||'—').join(' / ')} {e.match&&' · '+e.match+' · '+e.format+' · '+e.minutes+' мин'}</p><div className="actions"><button onClick={()=>{pick(e.id);setEditing(i)}}>Изменить</button><button onClick={()=>{setData(d=>({...d,entries:d.entries.filter((_,index)=>index!==i)}));setEditing(null)}}>Удалить</button></div></div>)}</details></div>
 <aside className="preview"><div className="section-head"><h2>Ваша карточка</h2><button className="link" onClick={()=>changePosition(isGK?fieldPosition:'GK')}>{isGK?'Полевой игрок':'Вратарь'}</button></div>
 <div className="card-frame"><div className="player-card"><div className="card-top"><span>{position}</span><span>OVR</span></div><strong className="rating">{round(ovr.score)}</strong><span className="card-name">{data.profile.name||'Ваш игрок'}</span><div className="card-stats">{statKeys.map(key=><div key={key} title={statsNames[key]}><b>{round(result.stats[key].score)}</b><span>{key}</span></div>)}</div></div></div>
 <div className="coverage"><div><span>Заполненность OVR</span><b>{pct(ovr.coverage)}</b></div><progress max={1} value={ovr.coverage}/><small>{ovr.score===null?'Для OVR нужно 60% веса позиции':ovr.preliminary?'Предварительный OVR':trust(ovr.trust)}</small></div>
 {result.paceDetail&&!isGK&&<div className="note"><b>Предварительный PAC</b><details><summary>Как посчитано</summary><p>{result.paceDetail}</p></details><div className="actions">{!result.attributes.acc&&<button onClick={()=>pick('P01')}>10 м с места</button>}{!result.attributes.sprint&&<button onClick={()=>pick('P03')}>Летучие 20 м</button>}</div></div>}
 <div className="actions"><button onClick={()=>png(data.profile.name,position,round(ovr.score),statKeys.map(key=>[key,round(result.stats[key].score)]))}>Скачать PNG</button><button onClick={()=>exportProfile(data)}>Экспорт JSON</button><button onClick={()=>file.current?.click()}>Импорт JSON</button></div>
 <input ref={file} hidden type="file" accept=".json,application/json" onChange={async e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';if(!f)return;try{setData(importData(await f.text()));setEditing(null);setSession(n=>n+1);setNotice('Профиль импортирован.')}catch(error){setNotice(error instanceof Error?error.message:'Не удалось открыть профиль.')}}}/></aside></div>
 <section className="panel lower"><div className="section-head"><h2>Профиль игрока</h2><button onClick={()=>{setData(d=>d.entries.length?d:demo());setNotice(data.entries.length?'Пример доступен при пустом журнале.':'Загружен вымышленный профиль.')}}>Пример</button></div><div className="fields">
 {([['name','Имя'],['age','Возраст'],['height','Рост, см'],['weight','Вес, кг']] as const).map(([key,label])=><label key={key}>{label}<input value={data.profile[key]} inputMode={key==='name'?'text':'decimal'} onChange={e=>setProfile(key,e.target.value)}/></label>)}
 <label>Позиция<select value={data.profile.position} onChange={e=>changePosition(e.target.value)}>{Object.entries(positions).map(([key,value])=><option key={key} value={key}>{value.name}</option>)}</select></label>
 <label>Рабочая нога<select value={data.profile.foot} onChange={e=>setProfile('foot',e.target.value)}><option>Правая</option><option>Левая</option></select></label>
 <label>Формат для расчёта<select value={data.profile.format} onChange={e=>setProfile('format',e.target.value)}>{formats.map(v=><option key={v}>{v}</option>)}</select></label>
 <label className="checkbox"><input type="checkbox" checked={data.profile.mix} onChange={e=>setProfile('mix',e.target.checked)}/> Объединять форматы матчей</label>
 </div></section><Results data={data} result={result} statKeys={statKeys} setProfile={setProfile} pick={pick}/>
 </>}</main><footer className="shell">Модель {version} · данные хранятся на устройстве</footer></>;
}
createRoot(document.getElementById('root')!).render(<App/>);
