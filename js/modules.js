/* Emberfall — js/modules.js
 * Extends the registries for Thornwick (E0), Coldharrow (E2) and Ravenmoor
 * (E3), and declares MODULES (all four saga adventures, including E1 whose
 * maps live in data.js), the saga CAMPAIGN order, service names and rumors. */
'use strict';
var MODULES={},CAMPAIGNS={order:[],tabs:[]};

/* ================= Saga monsters ================= */
MO('skarrik',{n:'Skarrik, Kettle-Crown',hd:1.1,hp:'1d8+1',ac:6,mv:8,ml:'fanatic',xp:270,atk:['1d6-1'],size:'S',leader:1,fig:'humanoid',tags:['humanoid','kobold'],gold:'6d6x10',lore:'Crowned with a stolen kettle; fights beside the malt vats until the crown is dented.'});
MO('bat',{n:'Cave Bat',hd:.5,hp:'1d4-1',ac:7,mv:12,ml:4,xp:15,atk:['1d2'],size:'T',fig:'bird',tags:[],lore:'A whisper of wings in black air.'});
MO('orc',{n:'Deepcut Orc',hd:1,hp:'1d8+1',ac:6,mv:12,ml:9,xp:65,atk:['1d8+1'],fig:'humanoid',tags:['humanoid','orc'],gold:'3d6x10',lore:'Troll-blooded and patient underground.'});
MO('bugbear',{n:'Bugbear Lurker',hd:2.1,hp:'2d8+1',ac:6,mv:9,ml:10,xp:270,atk:['1d8+2'],fig:'humanoid',tags:['humanoid','goblinoid','bugbear'],gold:'4d6x10',stealth:1,lore:'Quiet for something that smells; the first of the dark to be heard is its axe.'});
MO('gorrak',{n:'Gorrak Skullsplitter',hd:3.2,hp:'3d8+2',ac:4,mv:9,ml:12,xp:650,atk:['1d10+4','1d6 claw'],leader:1,fig:'humanoid',tags:['humanoid','goblinoid','bugbear'],gold:'15d6x10',lore:'The bugbear who wears a miner\u2019s helm as a cup and drinks from it.'});
MO('wight',{n:'Barrow Wight',hd:3,hp:'3d8',ac:5,mv:12,ml:'fearless',xp:340,atk:['1d8+1 + drain'],undead:2,tags:['undead'],fig:'skeleton',lore:'Its cold touch takes a level of life. Silver, fire and holy turn it.'});
MO('ironking',{n:'The Iron King',hd:6.2,hp:'6d8+2',ac:2,mv:9,ml:'fearless',xp:2000,atk:['1d10+5 + drain','1d4 grip'],undead:3,size:'L',leader:1,tags:['undead'],fig:'humanoid',lore:'Dunmore\u2019s last king, crowned in the barrow with iron. His touch drains two levels. Only his seal and blade may be carried out.'});
MO('troll',{n:'Moor Troll',hd:6,hp:'6d8+6',ac:2,mv:12,ml:9,xp:2700,atk:['1d10+5','1d8 claw','bite'],size:'L',regen:3,tags:['troll'],fig:'humanoid',lore:'Regains 3 hp a round unless burned or acid-burned; fire is the long answer.'});
MO('gnashrot',{n:'Gnashrot of the Causeway',hd:7.2,hp:'7d8+2',ac:1,mv:12,ml:12,xp:4000,atk:['2d8+6','1d10 claw'],size:'L',regen:3,leader:1,tags:['troll'],fig:'humanoid',lore:'The troll that holds the burned village; smells of causeway mud and old horses.'});
MO('hillgiant',{n:'Hill Giant',hd:12.1,hp:'12d8+1',ac:2,mv:12,ml:9,xp:5000,atk:['2d12+7'],size:'H',fig:'humanoid',tags:['giantkin','giant'],gold:'6d6x10',lore:'Boulder-slinger; the ground is a mistake to stand on near one.'});
MO('grull',{n:'Grull the Boulder',hd:14.1,hp:'14d8+1',ac:1,mv:12,ml:12,xp:9000,atk:['2d12+8','1d10+8 slam'],size:'H',leader:1,tags:['giantkin','giant'],gold:'20d6x10',lore:'The thrower who guards the keep\u2019s high hall; stones leave holes in walls and men.'});
MO('ravenwitch',{n:'Raven Witch',hd:'caster 4',hp:'3d6',ac:6,mv:12,ml:8,xp:600,atk:['1d4'],fig:'humanoid',caster:4,casterList:['clw','scare','holdperson'],tags:['humanoid'],gold:'5d6x10',lore:'Circles the fire with the ravens, singing the patrol songs backwards.'});
MO('vharra',{n:'Vharra the Witch-Queen',hd:'caster 7',hp:'6d4+3',ac:5,mv:12,ml:'fanatic',xp:6000,atk:['1d4'],caster:7,casterList:['bolt','cloudkill','holdmon','flesh'],leader:1,fig:'humanoid',tags:['humanoid'],gold:'40d6x10',lore:'She wears the raven crown of the moors and the fort\u2019s lost seal; her spells fall like weather.'});
MO('hellhound',{n:'Hell Hound',hd:3.1,hp:'3d8+1',ac:4,mv:15,ml:10,xp:270,atk:['1d8+2 bite','breath 2d6 fire'],fig:'wolf',tags:['canine','summoned'],s:1,lore:'Belted with coals; its breath is short-tempered fire.'});
MO('worg',{n:'Grey Worg',hd:2.1,hp:'2d8+1',ac:6,mv:12,ml:9,xp:120,atk:['1d8+2'],fig:'wolf',tags:['canine'],lore:'Moored in the keep\u2019s stable-yard, and not kindly.'});
MO('gargoyle',{n:'Gargoyle',hd:4.2,hp:'4d8+2',ac:2,mv:12,ml:'fearless',xp:800,atk:['1d6+2','1d4 claw','bite'],fig:'blob',stone:1,tags:[],lore:'Asleep by day, stone-grey; ordinary steel rings off its hide \u2014 magic or nothing.'});

/* ================= Saga items ================= */
I('cellarKey',{n:'Brass Cellar Key',t:'q',price:0,desc:'A brass key with a malt-stained bow.'});
I('marrowring',{n:'Widow Marrow\u2019s Ring',t:'q',price:0,desc:'A plain gold band; she will know it by the dent.'});
I('tallybook',{n:'Foreman\u2019s Tally Book',t:'q',price:0,desc:'Deepcut\u2019s dead foreman\u2019s book of shifts and silver.'});
I('ironseal',{n:'The Iron King\u2019s Seal',t:'q',price:0,desc:'A cold iron signet; the barrow\u2019s warrant of standing.'});
I('kingsblade',{n:'The Iron King\u2019s Blade',t:'w',d:'1d8+1',ench:1,fam:'longsword',spd:5,price:0,w:4,desc:'A long sword of cold steel, +1. It remembers a coronation.'});
I('patrolbadge',{n:'Sash of Patrol Badges',t:'q',price:0,desc:'Twelve tin star badges, corded together; the fort counts them.'});
I('dagger1',{n:'Dagger +1',t:'w',d:'1d6+1',ench:1,fam:'knife',spd:3,price:500,w:1});
I('ringprot1',{n:'Ring of Protection +1',t:'g',bonus:1,price:1000,w:0});
I('cloakprot',{n:'Cloak of Protection +1',t:'g',bonus:1,price:1000,w:1});
I('shield1',{n:'Shield +1',t:'s',ench:1,price:1000,w:7});
I('silveringot',{n:'Silver Ingot',t:'v',price:50,w:10,desc:'Dunmore\u2019s smiths will shoe a whole company in silver from one of these.'});

/* ================= E0 — The Cellars of Thornwick ================= */
MAPS.thornwick={
  name:'Thornwick',safe:1,locName:'the village of Thornwick',
  start:{x:9,y:13,dir:0},
  grid:[
  '###################',
  '#,HHH,HHH,HHH,,HHH#',
  '#,H1H,H2H,>HH,,HHH#',
  '#,,,,,,,,,,,,,,,,,#',
  '#,HHH,,HHH,,,HHH,,#',
  '#,H3H,,H5H,,,H4H,,#',
  '#,,,,,,,,,,,,,,,,,#',
  '#,,,,b,,,,,,,,,d,,#',
  '#,T,,,,,,,,,,,,,T,#',
  '#,HHH,,,,HHH,,,,,,#',
  '#,HHH,,,,HHH,,,,,,#',
  '#,,,,,,,,c,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,#',
  '#,,T,,,,,,,,,T,,,,#',
  '#########G#########'],
  locs:{
    '1':{svc:'inn',name:'The Sleepy Hen'},
    '2':{svc:'general',name:'Hesk\u2019s General Goods'},
    '3':{svc:'temple',name:'Shrine of the Dawn'},
    '4':{svc:'hall',name:'Elder\u2019s Longhouse'},
    '5':{svc:'training',name:'Sergeant Brask\u2019s Yard'}},
  stairs:{'10,2':{to:'thorn_cellar',x:1,y:2,dir:1,label:'The Brewery Cellar'}},
  exit:{G:{to:'thorn_wild',x:9,y:1,dir:2,label:'South Gate to Thornwick Vale'}},
  ev:{
    b:{chest:{text:'Under the old well-head, someone cached a strongbox behind the stones.',gold:'2d6x10',items:['oilflat']}},
    c:{chest:{text:'The Elder\u2019s charity strongbox, counted and sealed for the worser winter.',gold:'3d6x10'}},
    d:{chest:{text:'A tin sash of practice badges and a coin-burying dug under the flagpole by the boys of the yard.',gold:'2d6x10'}}},
  desc:'A sober farming village of stone and wattle; the brewery\u2019s chimney leans north, the gate south.'
};
MAPS.thorn_cellar={
  name:'The Brewery Cellar',locName:'the Brewery Cellar',
  start:{x:1,y:2,dir:1},
  grid:[
  '#####################',
  '#<....#..........#..#',
  '#.....D.....a....S.h#',
  '#..c..#..........#..#',
  '#.....#..........####',
  '####D######D#########',
  '#......#......#.....#',
  '#......#......D..g..#',
  '#...b..D......#.....#',
  '#......#......#######',
  '#......#..d...#.....#',
  '#..e...#......L..f..#',
  '#......########.....#',
  '#......########.....#',
  '#####################'],
  stairs:{'1,1':{to:'thornwick',x:10,y:3,dir:0,label:'Stair back to the brewery'}},
  traps:{'4,10':{kind:'darts',off:0},'16,12':{kind:'spear',off:0}},
  ev:{
    a:{enc:{mons:[['rat',4]],text:'The malt-store door bursts open on a sea of grey bodies.',surprise:1},text:'A smashed rat-nest.'},
    b:{enc:{mons:[['centipede',3]],text:'Something many-legged clicks out of a flour sack.'},text:'A centipede\u2019s larder.'},
    c:{enc:{mons:[['kobold',3]],text:'Kobolds at a stolen beer-barrel, one wearing a kettle like a crown\u2019s promise.',key:'cellarKey'},
      text:'A kobold drinking-watch, one of them carrying a brass key on a string.'},
    d:{enc:{mons:[['kobold',2],['kobold',2]],text:'A war-party of four herding a stolen goat down the corridor.'},text:'The kobold patrol route.'},
    e:{enc:{mons:[['beetle',2]],text:'The malt store stinks of scorched grain; bombardier beetles guard their nursery of it.'},text:'The scorched malt store.'},
    f:{enc:{mons:[['skarrik',1],['kobold',2]],text:'In the locked keg-room, Skarrik kettle-crowned rises from a throne of staves, shrieking in kobold.',leader:1,quest:'thorn_kobolds'},
      text:'Skarrik\u2019s keg throne is broken; the cellars are quiet.'},
    g:{chest:{text:'A small ring-chest lashed to a rail, needle-springs sighted in its lid.',gold:'2d6x10',items:['marrowring'],trap:'needles'}},
    h:{chest:{text:'A kobold \u201csecret\u201d cache behind a stone they clearly did not choose.',gold:'3d6x10',items:['dagger1'],hidden:1}}},
  keyItem:'cellarKey',lockText:'A brass-bound lock, new work, holds the keg-room door.',
  secret:{'17,2':{looksLike:'#'}},
  wander:[
    {p:.03,mons:[['rat',2],['rat',3]]},
    {p:.03,mons:[['kobold',1],['kobold',2]]},
    {p:.02,mons:[['centipede',1],['beetle',1]]}],
  desc:'Barrel-dark, malt-sweet, lately reeking of kobold smoke.'
};
QUESTS.thorn_kobolds={name:'The Kobold Council',lead:'Kobolds out of the brewery cellar have taken the malt and the peace with it.',goal:'Slay Skarrik, kettle-crown of the kobold councils, in the Brewery Cellar.',offer:'The Elder pledges 150 gp and the village\u2019s beer-tax share.',done:'Skarrik\u2019s kettle lies on the longhouse table.',gold:150,xp:800,final:1,reveal:'thorn_cellar'};
QUESTS.thorn_ring={name:'Widow Marrow\u2019s Ring',lead:'A kobold snatched the widow\u2019s ring from the well-head where she was rinsing it.',goal:'Recover Widow Marrow\u2019s Ring from the cellar ring-chest.',offer:'She cannot pay much. She will pay it.',gold:50,xp:200,side:1,needItem:'marrowring',reveal:'thorn_cellar'};

/* ================= E2 — Barrow of the Iron King ================= */
MAPS.cold_town={
  name:'Coldharrow',safe:1,locName:'the mining town of Coldharrow',
  start:{x:11,y:14,dir:0},
  grid:[
  '######>################',
  '#,HHHH,HHHH,HHHH,HHHH,#',
  '#,H1HH,H2HH,H3HH,H4HH,#',
  '#,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,#',
  '#,HHHH,,HHHH,,,,HHHHH,#',
  '#,H5HH,,HHHH,,,,HHHHH,#',
  '#,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,c,,,,#',
  '#,,,,,,,,,,,F,,,,,,,,,#',
  '#,HHHHH,,,,,,,,HHHHHH,#',
  '#,HHHHH,,,,,,,,HHHHHH,#',
  '#,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,a,,,,,,,,,,,,,,b,,#',
  '#,T,,,,,,,,,,,,,,,,,T,#',
  '#,,,,,,,,,,,,,,,,,,,,,#',
  '###########G###########'],
  locs:{
    '1':{svc:'inn',name:'The Grey Goose'},
    '2':{svc:'armory',name:'Dunmore\u2019s Forge'},
    '3':{svc:'temple',name:'Stonecradle Shrine'},
    '4':{svc:'hall',name:'Thane Bergen\u2019s Hall'},
    '5':{svc:'training',name:'Bergen\u2019s Watch-yard'}},
  stairs:{'6,0':{to:'cold_mine',x:1,y:2,dir:1,label:'Adit stair to Deepcut Mine'}},
  exit:{G:{to:'cold_wild',x:18,y:1,dir:2,label:'South Gate to Harrow Hills'}},
  ev:{
    a:{enc:{mons:[['bugbear',1],['bugbear',2]],text:'Something has been watching the south road from the scree. It does not want witnesses.',hidden:1,sight:4},
      text:'A bugbear lurker, dead in the scree.'},
    b:{text:'The mine office, shuttered since the troubles; the foreman\u2019s desk is a mess of unpaid tally slips.',deed:'mineOfficeClue',
      hint:'The last pay-wagon never came down from the mine. If Deepcut was ever rich, the proof is still inside it.'},
    c:{chest:{text:'A barn cache under the seed bins.',gold:'3d6x10',items:['silveringot']}}},
  desc:'A grey town against a grey fell; iron smoke, hard faces, and above it all the mine\u2019s black adit.'
};
MAPS.cold_mine={
  name:'Deepcut Mine',locName:'Deepcut Mine',
  start:{x:1,y:2,dir:1},
  grid:[
  '#########################',
  '#<.....#.........#......#',
  '#......#....b....D......#',
  '#..a...D.........#...ck.#',
  '#......#.........#......#',
  '#......###########......#',
  '##D######.......##......#',
  '#.......#.......#########',
  '#.......#...e...#.......#',
  '#.......#.......D.......#',
  '#...d...D.......#.......#',
  '#.......#.......#.......#',
  '#....f..####D####.......#',
  '#.......##..............#',
  '##########..............#',
  '#........#........#######',
  '#........#...h....#.....#',
  '#..g.....D........Dj....#',
  '#........#........#..i..#',
  '#........#........#....>#',
  '#########################'],
  stairs:{
    '1,1':{to:'cold_town',x:6,y:1,dir:0,label:'Adit stair down to Coldharrow'},
    '23,19':{to:'cold_barrow',x:2,y:3,dir:1,label:'Rat-run down to the Iron King\u2019s barrow'}},
  traps:{'5,8':{kind:'stones',off:0},'12,4':{kind:'pit',off:0},'21,16':{kind:'darts',off:0}},
  ev:{
    a:{text:'A ceiling of wings: cave bats pouring out of a stoped-out stope.',deed:'batStope'},
    b:{enc:{mons:[['orc',2],['orc',3]],text:'Orc assayers guard a winch-room, tallying ore they cannot read.',sight:6},text:'The winch-room.'},
    c:{enc:{mons:[['bugbear',2],['orc',2]],text:'Two lurkers and their drove of orc diggers work a fresh face of rock.',sight:7},text:'The new heading.'},
    d:{enc:{mons:[['zombie',2],['zombie',3]],text:'Dead miners shamble out of an old working, lamps still burning on their helmets.',hidden:1},text:'An old working.'},
    e:{text:'A bugbear scouting trail crosses the stoped-out levels, re-tied fresh at every corner.',deed:'scoutTrace'},
    f:{enc:{mons:[['centipede',3],['beetle',1]],text:'The floor of the lower gallery moves: centipede swarm over a beetle\u2019s shell.',sight:3},text:'The crawling gallery.'},
    g:{chest:{text:'A powder-magazine strongbox.',gold:'5d6x10',items:['potioncure'],trap:'fire'}},
    h:{chest:{text:'The pay-wagon, capsized at the incline; the strongbox is still chained.',gold:'8d6x10',items:['shield1']}},
    i:{enc:{mons:[['gorrak',1],['orc',2],['bugbear',2]],text:'At the far shaft-mouth sits Gorrak Skullsplitter on a windlass drum, miners\u2019 helmets rung around it like cups.',leader:1,quest:'cold_mine'},
      text:'Gorrak is dead; the far way into the barrow lies open.'},
    j:{chest:{text:'The dead foreman\u2019s tally book, wrapped in oilcloth on his shelf.',items:['tallybook'],gold:'2d6x10'}},
    k:{text:'An ore-sample crate marked in Dunmore\u2019s hand, empty \u2014 the best samples carried away toward the barrow.',deed:'oreTrace'}},
  wander:[
    {p:.03,mons:[['bat',2],['bat',4]]},
    {p:.03,mons:[['orc',2]]},
    {p:.02,mons:[['zombie',1],['zombie',2]]},
    {p:.02,mons:[['centipede',2]]}],
  desc:'Timber and lantern-smoke and ore that glitters wrong; lately, other lamps.'
};
MAPS.cold_barrow={
  name:'The Iron King\u2019s Barrow',locName:'the Iron King\u2019s barrow',
  start:{x:2,y:3,dir:1},
  grid:[
  '#########################',
  '#.......#....j...#......#',
  '#.<.....#........#...c..#',
  '#...a...D...b....D......#',
  '#.......#........#......#',
  '#.......#........#......#',
  '####D#######D#######D####',
  '####.#####......#.......#',
  '#........#......#.......#',
  '#........#..e...D.......#',
  '#...d....D......#...f...#',
  '#........#......#.......#',
  '#........#......#.......#',
  '#........#####D######D###',
  '####D#########.######.###',
  '#.........#.......#.....#',
  '#.........D.......D.....#',
  '#...g.....#...h...#..i..#',
  '#.........#.......#.....#',
  '#.........#.......#.....#',
  '#########################'],
  stairs:{'2,2':{to:'cold_mine',x:23,y:18,dir:3,label:'Rat-run back to the mine'}},
  traps:{'4,8':{kind:'darts',off:0},'12,10':{kind:'pit',off:0},'14,14':{kind:'stones',off:0}},
  ev:{
    a:{enc:{mons:[['skeleton',2],['skeleton',3]],text:'Grave-lights kindle; the barrow\u2019s household rises to receive guests.',sight:5},text:'The outer household.'},
    b:{enc:{mons:[['wight',1]],text:'A barrow-wight drifts down its own hall, offended by the living.',hidden:1},text:'The middle hall.'},
    c:{enc:{mons:[['zombie',2],['skeleton',1]],text:'The servants\u2019 barrow: the king\u2019s old serving-men at their posts.',sight:6},text:'The servants\u2019 ranks.'},
    d:{enc:{mons:[['wight',1],['skeleton',2]],text:'Two cold things and a bone-sentry guard the lord\u2019s chamber stair.'},text:'The lord\u2019s stair.'},
    e:{enc:{mons:[['skeleton',3],['zombie',2]],text:'A packed muster-hall of the dead, ranks rotted but standing.',sight:7},text:'The muster-hall.'},
    f:{enc:{mons:[['ironking',1],['wight',1]],text:'On an iron-framed barrow-seat sits the Iron King, crown and all, and the air goes out of the chamber. He rises.',leader:1,quest:'cold_king'},
      text:'The Iron King lies quiet, crown off, seal and blade surrendered to the light.'},
    g:{chest:{text:'A grave-gift casket of the household.',gold:'6d6x10',items:['geme']}},
    h:{chest:{text:'The king\u2019s own coffer, under the bier.',gold:'12d6x10',items:['ringprot1','gemd']}},
    i:{chest:{text:'The king\u2019s armory chest: one blade kept better than the rest.',gold:'5d6x10',items:['kingsblade']}},
    j:{chest:{text:'A sealed niche holding the king\u2019s seal-box.',items:['ironseal'],hidden:1}}},
  secret:{'13,1':{looksLike:'#'}},
  wander:[
    {p:.03,mons:[['skeleton',2]]},
    {p:.02,mons:[['zombie',2],['skeleton',1]]},
    {p:.02,mons:[['wight',1]]}],
  keyItem:'ironseal',lockText:'A stone has been set over the seal-niche; it answers to the seal itself.',
  desc:'Low iron-dark corridors under the fell, the whole mountain holding its breath.'
};
QUESTS.cold_mine={name:'Gorrak Skullsplitter',lead:'The mine went silent when the bugbears came up through the old workings.',goal:'Kill Gorrak Skullsplitter in Deepcut Mine.',offer:'Thane Bergen will pay 400 gp for the mine back.',done:'Gorrak\u2019s helmet-cups are empty; Deepcut is quiet.',gold:400,xp:2400,final:0,reveal:'cold_mine'};
QUESTS.cold_king={name:'Lay the Iron King',lead:'Something in the barrow under the fell pays the dead wages and drains the living.',goal:'Lay the Iron King to rest in his barrow chamber.',offer:'Bergen pledges 900 gp and the shrine\u2019s blessing on the company.',done:'The Iron King lies quiet; the fell keeps its own dead again.',gold:900,xp:5000,final:1,reveal:'cold_barrow'};
QUESTS.cold_tally={name:'The Foreman\u2019s Tally',lead:'The foreman went into Deepcut with the last pay-book and never came out.',goal:'Return the foreman\u2019s tally book to Thane Bergen.',offer:'The book is Coldharrow\u2019s ledger of what the mine owes.',gold:100,xp:1000,side:1,needItem:'tallybook',reveal:'cold_mine'};

/* ================= E3 — The Witch-Queen of Ravenmoor ================= */
MAPS.rav_fort={
  name:'Fort Ravel',safe:1,locName:'Fort Ravel',
  start:{x:10,y:9,dir:0},
  grid:[
  '#####################',
  '#,HHHH,HHHHH,HHHHHH,#',
  '#,H1HH,HH3HH,HH2HHH,#',
  '#,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,#',
  '#,HHHHH,,,,,,,HHHHH,#',
  '#,HH4HH,,,,,,,HHHHH,#',
  '#,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,#',
  '#,T,,,,,,,,,,,,,a,,,#',
  '#,,,,,,,,,,,,,,,,,,,#',
  '##########G##########'],
  locs:{
    '1':{svc:'general',name:'Quartermaster\u2019s Stores'},
    '2':{svc:'temple',name:'Garrison Shrine'},
    '3':{svc:'hall',name:'Commander Ysolde\u2019s Table'},
    '4':{svc:'training',name:'The Arms-quake Yard'}},
  exit:{G:{to:'rav_wild',x:10,y:1,dir:2,label:'Postern out onto the Northern Moors'}},
  ev:{
    a:{text:'A squad musters on the parade-stone, twelve badges counted twice before they go out. None of the last squad came back wearing theirs.'}},
  desc:'A squat ravel-stone fort on the moor-line: wet ditches, dry discipline, ravens overhead and ungreeted.'
};
MAPS.rav_moor={
  name:'Burned Village',locName:'the burned village',
  start:{x:3,y:19,dir:0},
  grid:[
  '#########################',
  '#.......#........#......#',
  '#..a....D...b....#...c..#',
  '#.......#........D......#',
  '#.......#........#......#',
  '#.......#........#......#',
  '####D####........###D####',
  '####.#######D#######.####',
  '#........#.......#......#',
  '#........#.......#......#',
  '#...d....D...e...D....h.#',
  '#........#.......#......#',
  '#........#.......#......#',
  '#........#.......#......#',
  '####D##########D#####D###',
  '#..........#.......#....#',
  '#..........#.......#....#',
  '#.....f....D...g...#....#',
  '#..........#.......#....#',
  '#..........#.......#....#',
  '#########################'],
  traps:{'13,12':{kind:'blade',off:0},'2,16':{kind:'darts',off:0}},
  ev:{
    a:{enc:{mons:[['gnashrot',1],['hellhound',2]],text:'Between the black cottages a causeway-mound breathes: Gnashrot, knee-deep in the old pond, hounds at its heels.',leader:1,quest:'rav_moor',sight:5},
      text:'Gnashrot of the causeway is dead; the burned village gives up its silence.'},
    b:{enc:{mons:[['hellhound',3]],text:'Coals walk: a hound-leash of them through the char, harnesses ringing.',sight:4},text:'The hound-leash.'},
    c:{enc:{mons:[['ravenwitch',1],['worg',2]],text:'A raven witch has tethered her wargs in the burned chapel and is singing to something out past the cairn.',sight:6},text:'The chapel song.'},
    d:{enc:{mons:[['wight',1],['zombie',2]],text:'The hearth-pits of the village will not stay cold; the burned rise from their own floors.',hidden:1},text:'The hearth-pits.'},
    e:{enc:{mons:[['worg',3],['orc',2]],text:'A worg-kennel in the granary ruin, gnawing at what the fire left them.',sight:6},text:'The granary kennel.'},
    f:{chest:{text:'The inn\u2019s hidden still-cache under the charred floor.',gold:'5d6x10',items:['potioncure']}},
    g:{chest:{text:'A family strongbox fused half-shut by the fire.',gold:'6d6x10',items:['cloakprot'],trap:'fire'}},
    h:{text:'The schoolmaster\u2019s slate still hangs in the burn wall, attendance scratched out one line at a time.',deed:'moorSlates',
      hint:'The slates record the patrol taken toward the keep \u2014 badges, not bodies, are what the fort counts.'}},
  wander:[
    {p:.03,mons:[['worg',2]]},
    {p:.03,mons:[['zombie',2],['wight',1]]},
    {p:.02,mons:[['hellhound',1],['hellhound',2]]}],
  desc:'A village burnt to chimneys and hearth-pits; the causeway beyond is mud with a pulse in it.'
};
MAPS.rav_keep={
  name:'Gnashrot\u2019s Causeway Keep',locName:'the causeway keep',
  start:{x:3,y:16,dir:1},
  grid:[
  '#########################',
  '#........#........#.....#',
  '#...i....D...k....D..h..#',
  '#......r.#........#.....#',
  '#........#....e...#..l..#',
  '#........####D#####.....#',
  '####D#####........###D###',
  '#........#........#.....#',
  '#........#........#.....#',
  '#...m....L...n....D..j..#',
  '#........#........#.....#',
  '#........#........#.....#',
  '#........#........#s....#',
  '####D#########D######D###',
  '#.........#........#.q..#',
  '#.........#........#....#',
  '#...o.....D...p....D..>.#',
  '#.........#........#....#',
  '#########################'],
  stairs:{'22,16':{to:'rav_pit',x:22,y:2,dir:0,label:'Down-cut to the Witch-Pit'}},
  traps:{'12,10':{kind:'pit',off:0},'20,8':{kind:'blade',off:0},'6,15':{kind:'stones',off:0}},
  ev:{
    e:{chest:{text:'A guardroom arms-chest, counted and clean.',gold:'4d6x10',items:['leather']}},
    h:{enc:{mons:[['gargoyle',2]],text:'Two stone shapes on the gatehouse wing unfold wings that were not there.',hidden:1,sight:4},
      text:'The gargoyles lie broken on the wing \u2014 steel shivered on them before magic bit.'},
    i:{enc:{mons:[['hellhound',2],['worg',2]],text:'The kennel-yard: hounds and wargs at one chain, both kinds eager.',sight:3},text:'The kennel-yard.'},
    j:{enc:{mons:[['ravenwitch',1],['cultist',2]],text:'A raven witch at a signal-fire, telling the pit the company has come up the causeway.'},text:'The signal-fire.'},
    k:{enc:{mons:[['grull',1],['hillgiant',1]],text:'In the high hall, Grull the Boulder regards you the way a mason regards weather.',leader:1,quest:'rav_keep',sight:7},
      text:'Grull is down in the high hall; the boulders stop coming.'},
    l:{chest:{text:'The pantry under the high hall, oddly untouched.',gold:'3d6x10',items:['rations','oilflat']}},
    m:{enc:{mons:[['worg',3]],text:'The stable-yards are worg-deep, and every one is off its leash.',sight:5},text:'The stable-yards.'},
    n:{text:'Along the great hall\u2019s bench, the fort\u2019s lost patrol \u2014 twelve tin badges on a sash, nailed to the wood as a tally.',deed:'patrolBadges',items:['patrolbadge']},
    o:{chest:{text:'A ransacked alms-coffer from the fort\u2019s own shrine.',gold:'5d6x10'}},
    p:{chest:{text:'A quartermaster\u2019s sealed crate marked with the fort\u2019s star.',gold:'7d6x10',items:['chain','patrolbadge']}},
    q:{chest:{text:'A war-chest under the dais.',gold:'6d6x10',items:['shield1']}},
    r:{enc:{mons:[['troll',1]],text:'A young troll squats at the kitchen stair, gorged and irritable, regenerating its way through your first good blow.',sight:5},text:'The kitchen troll.'},
    s:{enc:{mons:[['hillgiant',1],['gnoll',2]],text:'A hill giant and its gnoll hangers-on at the sally-port, boulders stacked like bread.',sight:6},text:'The sally-port.'}},
  wander:[
    {p:.03,mons:[['gnoll',2]]},
    {p:.03,mons:[['worg',2]]},
    {p:.02,mons:[['hellhound',2]]},
    {p:.02,mons:[['orc',3]]}],
  desc:'A causeway-keep of grey stone lately grown teeth: hound-chains, signal-smoke, and giant work in the high hall.'
};
MAPS.rav_pit={
  name:'The Witch-Pit',locName:'the Witch-Pit',
  start:{x:22,y:2,dir:2},
  grid:[
  '#########################',
  '#........#........#...<.#',
  '#........#........#.....#',
  '#...t....D...u....D..w..#',
  '#........#........#.....#',
  '#........#........#.....#',
  '####D########D#######D###',
  '####.######.......###.###',
  '#.........#.......#.....#',
  '#.........#...y...#.....#',
  '#...x.....D.......D.....#',
  '#.........#.......#.....#',
  '#.........#.......#.....#',
  '#####D#########D#####D###',
  '#...........#...........#',
  '#...a.z.....#...b..v....#',
  '#...........#...........#',
  '#########################'],
  stairs:{'22,1':{to:'rav_keep',x:22,y:15,dir:0,label:'Winch-stair up to the keep'}},
  traps:{'13,10':{kind:'pit',off:0},'6,9':{kind:'darts',off:0},'17,14':{kind:'stones',off:0}},
  ev:{
    a:{chest:{text:'An armour-rack cut down from the fort, spear-shafts snapped for pike-length.',gold:'4d6x10',items:['spear','dagger']}},
    b:{chest:{text:'A coffer of black silver votives, each cast from a fort badge.',gold:'8d6x10',items:['ringprot1']}},
    t:{enc:{mons:[['specter',1]],text:'A specter of the garrison\u2019s captain walks the armory range, still reporting to a dead commander.',hidden:1,sight:4},text:'The captain\u2019s last report.'},
    u:{enc:{mons:[['hellhound',1],['cultist',3]],text:'Hound and cult picket at the pit-line, chanting through the smoke.',sight:6},text:'The pit-line picket.'},
    v:{enc:{mons:[['vharra',1],['ravenwitch',2],['troll',1]],text:'In the pit\u2019s bottom dark, Vharra the Witch-Queen rises from the fort\u2019s own stolen seal-table, raven crown wet, weather gathering at her hands. This is the moor\u2019s whole quarrel.',leader:1,quest:'rav_witch'},
      text:'Vharra is dead; the ravens lift off the pit and do not come back.'},
    w:{enc:{mons:[['gargoyle',1]],text:'The rookry\u2019s stone guardian unfolds from the vault roof, bat-hide drumming.',hidden:1,sight:3},text:'The rookry.'},
    x:{enc:{mons:[['wight',1],['skeleton',2]],text:'The bound wight of the fort\u2019s last sergeant-major still drills its skeleton file on the parade floor of the pit.',sight:5},text:'The dead parade.'},
    y:{enc:{mons:[['ravenwitch',1],['ravenwitch',1]],text:'Two ravens in woman\u2019s shapes circle a brazier, trading the patrol songs back and forth.',sight:7},text:'The brazier council.'},
    z:{chest:{text:'The witch-queen\u2019s hoard-coffer, under the seal-table.',gold:'15d6x10',items:['gemd','geme','cloakprot']}}},
  wander:[
    {p:.03,mons:[['cultist',2]]},
    {p:.03,mons:[['skeleton',2],['skeleton',3]]},
    {p:.02,mons:[['wight',1]]},
    {p:.02,mons:[['hellhound',2]]}],
  desc:'A pit-mine under the keep grown cathedral-huge: smoke, ravens, and the drum of something patient.'
};
QUESTS.rav_moor={name:'Gnashrot of the Causeway',lead:'The troll in the burned village\u2019s pond-bed holds the road east and eats the toll.',goal:'Kill Gnashrot in the burned village. Fire ends what steel only delays.',offer:'Commander Ysolde pays 700 gp for the road and the moor\u2019s first night of quiet.',done:'Gnashrot is ash and silence; the causeway is open.',gold:700,xp:2400,final:0,reveal:'rav_moor'};
QUESTS.rav_keep={name:'Grull the Boulder',lead:'The causeway keep was taken by a thrower and his hill-giant cousins; boulders rule the road within it.',goal:'Break Grull the Boulder in the high hall of the keep.',offer:'The fort will pay 1,200 gp and count the company as post-friends.',done:'Grull is down; the high hall keeps no more weather.',gold:1200,xp:4000,final:0,reveal:'rav_keep'};
QUESTS.rav_witch={name:'The Witch-Queen',lead:'Vharra wears the fort\u2019s stolen seal in a raven crown and works the moors like weather.',goal:'End Vharra the Witch-Queen in the Witch-Pit below the keep.',offer:'Ysolde pledges 2,500 gp, the seal\u2019s return, and the saga\u2019s last page.',done:'The Witch-Queen is ended; the Northern Moors keep their own ravens again.',gold:2500,xp:12000,final:1,reveal:'rav_pit'};
QUESTS.rav_patrol={name:'Twelve Badges',lead:'The fort\u2019s last patrol went out with twelve badges and came back as none.',goal:'Recover the fort\u2019s twelve patrol badges from the causeway keep.',offer:'The fort counts its dead by tin; they will pay for the count.',gold:300,xp:1200,side:1,needItem:'patrolbadge',reveal:'rav_keep'};

/* ================= Shops (module-flavored stock) ================= */
SHOPS.hesk={name:'Hesk\u2019s General Goods',kind:'general',
  stock:['club','dagger','staff','mace','sling','dart','shortbow','leather','backpack','bedroll','rations','waterskin','rope','torch','lantern','oil','spikes','thtools','potioncure','antivenom']};
SHOPS.dunmore={name:'Dunmore\u2019s Forge',kind:'armory',
  stock:['club','dagger','mace','warhammer','shortsword','longsword','broadsword','battleaxe','spear','flail','sling','shortbow','longbow','arrow','dart','leather','studded','chain','banded','shield','silveredclub','silvermace','silverlongsword','silveredshield','rations','rope','torch','lantern']};
SHOPS.ravel={name:'Quartermaster\u2019s Stores',kind:'armory',
  stock:['dagger','mace','warhammer','shortsword','longsword','spear','handaxe','sling','shortbow','longbow','arrow','dart','javellin','leather','studded','chain','shield','holy','rations','waterskin','rope','torch','lantern','oil','potioncure','antivenom']};

/* ================= Rumors ================= */
RUMORS.thorn=[
 'Kobolds in the brewery, and one wears the brewing-kettle like a crown \u2014 brass key on a string, the ones caught said.',
 'The Elder pays honest coin for the kettle-crown. Widow Marrow pays in tears for her ring.',
 'The vale\u2019s folk keep to the roads; the lookout on the north ridge isn\u2019t a village watchtower.',
 'Mother Brina at the croft will read an omen and mend a cut, though she\u2019ll deny both.',
 'Sergeant Brask trains any that can hold a sword and pay for the privilege.'];
RUMORS.cold=[
 'Deepcut went quiet three months back. Bugbears came up through the old workings, and something worse under them.',
 'The Iron King\u2019s barrow lies below the mine \u2014 Dunmore\u2019s own historians will tell you, sober, once.',
 'Silver, says Dunmore. The mine folk swore by silver the year the fell got hungry.',
 'Thane Bergen pays by the task, not by the tale: Skullsplitter first, then the King.',
 'There\u2019s a shrine of St. Brannoc up the hills where you may sleep without one eye open.'];
RUMORS.rav=[
 'Ysolde counts her dead by tin badges. Twelve went out from the fort; the counting is the paying.',
 'Gnashrot holds the causeway and no toll is coin. Fire, though \u2014 the old garrison burned trolls and wrote it up.',
 'The keep\u2019s high hall has a thrower in it. Boulders, says the fort. Boulders with aim.',
 'Ravens follow the witch-queen\u2019s weather. Where the ravens sit thickest, the pit lies open.',
 'Gargoyles at the gatehouse by day, wings by dusk; only magic sticks to them.'];

/* ================= MODULES ================= */
MODULES.thornwick={
  code:'E0',name:'The Cellars of Thornwick',lvl:1,levels:[1,2],diff:1,diffName:'Easy',size:'Short',length:'about an hour',
  hub:'thornwick',maps:['thornwick','thorn_cellar','thorn_wild'],gold:40,next:'hollow',
  quests:['thorn_kobolds'],side:['thorn_ring'],final:'thorn_kobolds',
  names:{hall:'Elder Maddoc',trainer:'Sergeant Brask'},
  rumors:'thorn',shops:{general:'hesk'},
  blurb:'Kettles, kobolds and a single brass key: the valley\u2019s first quarrel, and the first page of the saga.',
  intro:'The brewing-pan of Thornwick is cold, and the Brewery Cellar below it has grown a council of its own. Elder Maddoc looks at your company the way folk look at weather that has at least agreed, for now, on a direction.',
  hint:'Kobolds carry a brass cellar key. Search near the malt store; something behind a hidden stone rewards it.',
  victory:'Skarrik\u2019s kettle rolls across the longhouse floor and the village\u2019s laugh comes back all at once. The vale is ready for longer roads.',
  lose:'Thornwick bars its gates at dusk and tells no stories about what went under the brewery. Somewhere below, a kettle-crown settles back onto a wet head.'};
MODULES.hollow={
  code:'E1',name:'The Hollow Vaults',lvl:1,levels:[1,3],diff:2,diffName:'Standard',size:'Large',length:'several hours',
  hub:'town',maps:['town','crypt1','crypt2','tower','wild'],gold:60,next:'coldharrow',
  quests:['redfang','reliquary','malvek'],side:['gnolls'],final:'malvek',
  names:{hall:'Reeve Halda',trainer:'Master Brennan'},
  rumors:'town',
  blurb:'Ogres in the abbey undercroft, an ash-fed circle beneath them, and a gnoll pack at Greywater holding a miller\u2019s daughter.',
  intro:'Emberfall\u2019s ruined abbey of the Dawn has taken on a second, wrong worship. Reeve Halda spreads the map on the town-hall board: the undercroft, the deep places, the watchtower out on the Greywater. \u201cBring back the reliquary,\u201d she says. \u201cBring back the fear of the Dawn, instead of the other kind.\u201d',
  hint:'Ogre spoor runs from the abbey steps to the Greywater watchtower. The ogre\u2019s iron key opens a locked descent in the undercroft.',
  victory:'The Dawn Reliquary stands lit in the temple again, and the undercroft\u2019s new silence is the old kind. Emberfall buys its beer in the open now.',
  lose:'The abbey\u2019s new hymn carries further every dusk, and the town board keeps a longer and longer list of companies under \u201cunreturned.\u201d'};
MODULES.coldharrow={
  code:'E2',name:'Barrow of the Iron King',lvl:3,levels:[3,5],diff:3,diffName:'Hard',size:'Medium',length:'two to three hours',
  hub:'cold_town',maps:['cold_town','cold_mine','cold_barrow','cold_wild'],gold:150,next:'ravenmoor',
  quests:['cold_mine','cold_king'],side:['cold_tally'],final:'cold_king',
  names:{hall:'Thane Bergen',trainer:'Sergeant Ilde'},
  rumors:'cold',shops:{armory:'dunmore'},
  blurb:'A mining town in arrears with the dead: bugbears in Deepcut, and under them a king who never agreed to stop reigning.',
  intro:'Coldharrow pays its smith in iron and its mine in people. Thane Bergen is a plain man with a plain ledger: the mine went quiet, the barrow under it woke up, and the pay-wagon sits capsized with its strongbox chained. \u201cBring the tally book back,\u201d he says. \u201cAnd whatever\u2019s paying the dead wages \u2014 stop paying it.\u201d',
  hint:'Buy silver at Dunmore\u2019s forge for what lives in the mine; the barrow\u2019s dead answer to silver, fire and holy. Gorrak keeps the far way down.',
  victory:'The Iron King\u2019s seal and blade come up out of the fell in a linen wrap, and Coldharrow\u2019s forge-smoke smells, suddenly, like an ordinary town.',
  lose:'The mine keeps its silence and its wages both. In Coldharrow they begin, quietly, to elect a new thane who will not be the one who sent you.'};
MODULES.ravenmoor={
  code:'E3',name:'The Witch-Queen of Ravenmoor',lvl:5,levels:[5,7],diff:4,diffName:'Deadly',size:'Large',length:'three hours or more',
  hub:'rav_fort',maps:['rav_fort','rav_moor','rav_keep','rav_pit','rav_wild'],gold:500,next:null,
  quests:['rav_moor','rav_keep','rav_witch'],side:['rav_patrol'],final:'rav_witch',
  names:{hall:'Commander Ysolde',trainer:'Marchwarden Cael'},
  rumors:'rav',shops:{general:'ravel'},
  blurb:'The Northern Moors wear a raven crown now: a troll on the causeway, a thrower in the keep, and weather with a woman\u2019s name in the pit below.',
  intro:'Fort Ravel stands wet and orderly on the moor-line, and Commander Ysolde has done the arithmetic the moors keep making: twelve badges out, none back, a troll tolling the causeway, a giant ruling the keep\u2019s high hall, and under it all a witch-queen wearing the fort\u2019s own stolen seal. \u201cPage by page,\u201d she says, \u201cor page last.\u201d',
  hint:'Gnashrot must be burned, Grull\u2019s boulders read the ground, and gargoyles admit only magic. The keep entry on the moor is the troll\u2019s to refuse and yours to earn.',
  victory:'The seal comes off the raven crown and back onto Ysolde\u2019s table, and the moors\u2019 weather goes back to being only weather. The Emberwild Saga closes where the maps run out.',
  lose:'The raven crown sits the moor-wide, and Fort Ravel\u2019s count of the dead gains a final, patient line.'};

/* ================= Campaign tabs ================= */
CAMPAIGNS.order=['thornwick','hollow','coldharrow','ravenmoor'];
CAMPAIGNS.tabs=[{id:'saga',name:'The Emberwild Saga',mods:CAMPAIGNS.order.slice()}];
/* Generated bands (b1..b5) are appended by adventures.js. */
