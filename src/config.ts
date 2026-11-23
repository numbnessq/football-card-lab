export const version='1.0.0';
export type Points = [number,number][];
const points=(pairs:string):Points=>pairs.split(' ').map(pair=>pair.split(':').map(Number) as [number,number]).sort((a,b)=>a[0]-b[0]);
const basis='авторская игровая шкала';
const make=(pairs:string,reason:string)=>{const anchors=points(pairs);return {anchors,basis,reason,direction:anchors[0][1]<anchors.at(-1)![1]?'больше — лучше':'меньше — лучше'}};
export const continuous:Record<string,ReturnType<typeof make>>={
 P01:make('3:10 2.4:30 2.1:48 1.9:62 1.75:76 1.6:90 1.5:99','Ускорение с места по времени на первых 10 м'),
 P02:make('5:10 4.2:30 3.7:48 3.4:62 3.1:77 2.85:91 2.7:99','Первые 20 м, включая фазу разгона'),
 sprint:make('16:10 21:30 25:48 28:62 31:75 34:87 37:97 39:99','Пиковая или летучая скорость в км/ч'),
 '30':make('7:15 6:35 5.2:52 4.9:63 4.5:76 4.2:88 3.9:97','Общий темп на 30 м с места'),
 '40':make('8.5:15 7:35 6.4:52 6:63 5.5:76 5:88 4.7:97','Общий темп на 40 м с места'),
 '60':make('11:15 9.5:35 8.5:52 8:63 7.5:76 7.1:88 6.7:97','Общий темп на 60 м с места'),
 '100':make('18:15 16:35 14.5:52 13.5:63 12.5:76 11.5:88 10.5:97','Общий темп на 100 м с места'),
 P06:make('4.5:10 3.6:35 3:62 2.6:80 2.2:99','Время разворота с повторным разгоном'),
 'P07 pace':make('7:10 6:30 5.2:60 4.6:82 4:99','Медианное время шести спринтов'),
 'P07 drop':make('0:99 3:85 6:65 10:45 18:10','Падение относительно лучшего спринта, %'),
 P08:make('1200:10 1800:30 2200:47 2600:64 3000:78 3400:90 3800:99','Дистанция непрерывного бега'),
 P09:make('10:10 20:30 30:48 40:65 50:78 60:89 75:99','Разница высот касания'),
 B07:make('0.4:10 0.6:38 0.75:62 0.9:85 1:99','Доля темпа без мяча, сохранённая в змейке'),
 B08:make('0.5:10 0.68:38 0.8:62 0.93:85 1:99','Доля темпа без мяча, сохранённая при ведении'),
 radar:make('35:10 55:42 75:65 95:85 125:99','Скорость, показанная радаром у точки удара'),
 video:make('30:10 50:42 68:65 86:85 112:99','Средняя скорость полёта на видео'),
 D06:make('650:10 420:37 300:60 225:82 165:99','Задержка от появления сигнала до нажатия'),
 D07:make('850:10 550:37 400:60 280:82 200:99','Задержка от контакта с мячом до движения')
};
const ratioValues:Record<string,number[]> = {
 P10:[5,17,36,59,81,97],P11:[8,27,49,72,87,98],
 B01:[5,20,35,50,67,85],B02:[7,26,44,62,79,94],B03:[8,39,57,73,86,94],B04:[8,37,56,73,86,97],
 B05:[5,20,41,64,83,98],B06:[7,30,49,70,86,98],B09:[10,35,56,75,89,98],B10:[10,33,55,77,89,98],B11:[8,32,53,71,86,96],B12:[6,22,44,68,84,98],
 A01:[10,35,55,74,88,97],A02:[15,53,73,87,94,98],A04:[10,37,57,75,89,98],A05:[12,42,62,80,92,99],A06:[6,24,46,67,86,99],'A06 sector':[6,26,48,69,85,97],
 A07:[10,33,54,73,87,97],A08:[7,24,46,68,84,98],A09:[12,47,70,85,94,99],
 D01:[7,26,49,72,87,98],D02:[9,31,53,75,88,98],D03:[5,20,40,65,85,99],D04:[8,29,51,75,89,99],D05:[5,24,47,70,86,98],D08:[8,20,42,65,82,95],
 G01:[10,32,56,78,91,99],G02:[5,20,42,68,86,99],G03:[12,38,61,80,92,99],G04:[7,33,55,75,90,99],G05:[5,23,45,69,87,99],G06:[6,27,49,72,88,99],S01:[5,24,45,69,87,99],
};
export const ratios=Object.fromEntries(Object.entries(ratioValues).map(([id,values])=>[id,make(values.map((score,i)=>[0,.25,.5,.75,.9,1][i]+':'+score).join(' '),'Шкала доли успеха для условий данного протокола')]));
export const targetRatios=Object.fromEntries(['B09','B11','A01','A02','A04','A05','A07','A09'].map(id=>[id,make('0:4 .25:19 .5:37 .75:60 .9:80 1:98','Общий ориентир для промежуточного попадания в створ, обхода или точной передачи')]));
export const qualities:Record<string,number>={electronic:1,video:1,manual:.8,memory:.5};
export const testWeights:Record<string,number>={P02:.55,P05:.7,P07:.65,B02:.8,B10:.55,B11:.45,A09:.45,D06:.35,D08:.7,G06:.5};
export const dualWeights=[.35,.65];
export const weakWeights:Record<string,number>={B01:.4,B03:.25,A01:.35};
export const weakBounds=[.35,.55,.75,.9];
export const labels:Record<string,string>={
 acc:'Ускорение',sprint:'Скорость спринта',finish:'Завершение',distance:'Дальние удары',power:'Сила удара',volley:'Удары с лёта',free:'Штрафные',penalty:'Пенальти',heading:'Игра головой',attack:'Позиция в атаке',short:'Короткий пас',long:'Длинный пас',cross:'Навесы',control:'Контроль мяча',dribble:'Дриблинг',curve:'Подкрутка',vision:'Видение поля',composure:'Хладнокровие',tackle:'Отбор стоя',intercept:'Перехваты',mark:'Позиция в защите',slide:'Подкат',aggression:'Агрессия',reaction:'Реакция',agility:'Ловкость',stamina:'Выносливость',jump:'Прыжок',balance:'Баланс',strength:'Сила',gDive:'Броски',gHandle:'Игра руками',gReflex:'Рефлексы',gKick:'Удар ногой',gPos:'Позиция вратаря'
};
export type Weights=Record<string,number>;
export const composites:Record<string,Weights>={PAC:{acc:45,sprint:55},SHO:{finish:35,distance:15,power:20,volley:8,free:5,penalty:7,attack:10},PAS:{short:31,long:19,cross:17,curve:10,vision:18,free:5},DRI:{control:29,dribble:28,agility:15,balance:10,reaction:10,composure:8},DEF:{tackle:29,intercept:22,mark:23,slide:15,heading:11},PHY:{stamina:34,strength:33,jump:18,aggression:15},DIV:{gDive:100},HAN:{gHandle:100},KIC:{gKick:100},REF:{gReflex:100},POS:{gPos:100}};
export const positions:Record<string,{name:string,weights:Weights}> = {
 GK:{name:'ВРТ',weights:{gDive:23,gHandle:22,gKick:10,gReflex:25,gPos:20}},
 CB:{name:'ЦЗ',weights:{mark:22,tackle:21,intercept:17,heading:12,strength:12,jump:7,sprint:5,short:4}},
 FB:{name:'ПЗ / ЛЗ',weights:{tackle:18,mark:16,intercept:12,sprint:14,acc:8,stamina:14,cross:10,short:8}},
 CDM:{name:'ЦОП',weights:{intercept:17,mark:16,tackle:15,short:15,long:12,stamina:12,strength:8,control:5}},
 CM:{name:'ЦП',weights:{short:22,long:15,vision:16,control:15,stamina:12,intercept:8,dribble:6,composure:6}},
 CAM:{name:'ЦАП',weights:{vision:20,short:17,control:16,dribble:15,attack:11,finish:9,composure:7,acc:5}},
 WM:{name:'ПП / ЛП',weights:{cross:19,stamina:15,short:14,dribble:15,sprint:13,acc:10,control:9,vision:5}},
 W:{name:'ПВ / ЛВ',weights:{dribble:19,sprint:16,acc:13,finish:13,attack:12,cross:12,control:10,agility:5}},
 ST:{name:'ФРВ',weights:{finish:29,attack:22,composure:9,power:9,heading:8,acc:8,control:7,sprint:5,volley:3}}
};
export const formats=['5×5','8×8','11×11'];
