import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch(process.env.CHROME_CHANNEL ? {channel:process.env.CHROME_CHANNEL} : {});
const output = process.env.REPORT_DIR || 'browser-report';
await mkdir(output, {recursive:true});
const url = process.env.SITE_URL || 'http://127.0.0.1:4173';
const media = [
  {name:'desktop', viewport:{width:1280,height:900}},
  {name:'phone', viewport:{width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:2}
];
// Независимый пример. Успех в половине попыток оставляет p = 0,5 после сглаживания.
const weighted = pairs => pairs.reduce((s,[v,w])=>s+v*w,0)/pairs.reduce((s,[,w])=>s+w,0);
function expected(sprint) {
  const acc=62;
  const finishing=.35*37+.65*55;
  const longShots=.35*37+.65*73;
  return [
    .45*acc+.55*sprint,
    weighted([[finishing,35],[longShots,15],[65,20]]),
    weighted([[35,31],[57,19],[56,17]]),
    weighted([[41,29],[62,28],[62,15]]),
    weighted([[49,29],[53,22],[40,23]]),
    weighted([[64,34],[49,33]]),
    weighted([[49,18],[40,16],[53,12],[sprint,14],[acc,8],[64,14],[56,10],[35,8]])
  ].map(Math.round).map(String);
}
try {
 for(const {name,...options} of media){
  const page=await browser.newPage({...options,locale:'ru-RU'});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const card=page.locator('.player-card');
  const read=async()=>[...await card.locator('.card-stats b').allTextContents(),await card.locator('.rating').innerText()];
  const submit=page.getByRole('button',{name:'Сохранить и дальше',exact:true});
  const form=page.locator('form');
  const label=(s)=>form.getByLabel(s,{exact:true});
  let count=0;
  async function record(id,fields){
   if(await page.locator('.step-meta span').last().innerText()!==id){
     const summary=page.locator('summary').filter({hasText:'Каталог упражнений'});
     const item=page.locator('article.test-item').filter({has:page.getByText(id,{exact:true})});
     if(!await item.isVisible())await summary.click();
     await item.getByRole('button',{name:'Ввести результат'}).click();
   }
   for(const [key,value] of Object.entries(fields))await label(key).fill(String(value));
   await submit.click();
   await page.getByText('Журнал замеров · '+(++count),{exact:true}).waitFor();
  }
  await page.goto(url);
  await card.waitFor();
  assert.deepEqual(await read(),Array(7).fill('—'));
  await submit.click();
  assert.ok(await page.getByRole('alert').isVisible());
  assert.deepEqual(await read(),Array(7).fill('—'));
  await page.getByLabel('Имя',{exact:true}).fill('Игрок Тест');
  await page.getByRole('combobox',{name:/^Позиция/}).selectOption('FB');
  await record('P04',{'60 м, с':'8,10'});
  await page.getByRole('heading',{name:'Ускорение на 10 м'}).waitFor();
  await page.reload();
  await page.getByRole('heading',{name:'Ускорение на 10 м'}).waitFor();
  assert.equal((await read())[0],'61');
  await page.locator('.note summary').click();
  assert.match(await page.locator('.note').innerText(),/60 м за 8,1 с/);
  console.log(name,'60 м за 8,10 с:',await read());
  await record('P01',{'Время, с':'1,90'});
  await page.getByRole('heading',{name:'Летучие 20 м'}).waitFor();
  await record('P03',{'Время, с':'2,40'});
  await record('P08',{'Дистанция, м':2600});
  await record('P06',{'Разворот через левую, с':3,'Разворот через правую, с':3});
  await record('P11',{'Единоборства':20,'Выиграно':10,'Матч':'Матч 1','Минуты игры':60});
  await record('B01',{'Попытки':20,'В створ':10});
  await page.getByRole('heading',{name:'Короткий пас · Левая'}).waitFor();
  await record('B01',{'Попытки':20,'В створ':10});
  await page.getByRole('heading',{name:'Завершение · Правая'}).waitFor();
  for(const id of ['B03','B04'])await record(id,{'Попытки':12,'В квадрат':6});
  await record('B05',{'Передачи':20,'Мяч в квадрате':10});
  await record('B07',{'Без мяча, с':9,'С мячом, с':12,'Пропущено конусов':0});
  for(const id of ['A01','A02'])await record(id,{'Удары':20,'В створ':10,'В сектор':10});
  await record('A03',{'Радар, км/ч':75});
  await record('D01',{'Чистые отборы':6,'Вытеснения':0,'Проходы':6,'Фолы':0});
  await record('D02',{'Возможности':20,'Перехваты':10});
  await record('D03',{'Рывки':20,'Позиция сохранена':10});
  const before=await read();
  console.log(name,'Карточка до правки',before,'ожидается',expected(62+(30-28)*(75-62)/(31-28)));
  assert.deepEqual(before,expected(62+2*13/3));
  await page.getByText('Журнал замеров · '+count,{exact:true}).click();
  await page.locator('.test-item').filter({hasText:'Летучие 20 м'}).getByRole('button',{name:'Изменить',exact:true}).click();
  await label('Время, с').fill('2,25');
  await page.getByRole('button',{name:'Сохранить изменения'}).click();
  await page.reload();
  await card.waitFor();
  const after=await read();
  console.log(name,'Карточка после правки',after,'ожидается',expected(75+(32-31)*(87-75)/(34-31)));
  assert.deepEqual(after,expected(79));
  await page.getByText('Журнал замеров · '+count,{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  const width=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.equal(width.page,options.viewport.width);
  assert.equal(width.viewport,options.viewport.width);
  await page.locator('.input-panel').scrollIntoViewIfNeeded();
  await page.screenshot({path:output+'/'+name+'-form.png'});
  await card.screenshot({path:output+'/'+name+'-card.png'});
  await page.close();
 }
} finally {await browser.close();}