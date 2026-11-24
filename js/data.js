/* Emberfall — js/data.js
 * Base registries for the Emberfall half of the saga: ITEMS, SHOPS, SPELLS
 * (40 wizard + 34 priest), MONSTERS (Emberfall set), MAPS (Emberfall town,
 * Abbey Undercroft crypt1/crypt2, Bloodmane Watchtower), QUESTS (E1),
 * rumors, item(id) lookup, and the six pre-generated heroes.
 * Data only: no rules, no drawing, no DOM. */
'use strict';
var ITEMS={},SHOPS={},SPELLS={},MONSTERS={},MAPS={},QUESTS={},PREGENS=[],RUMORS={};

/* ================= Spells ================= */
/* Shape: n name, c 'M'age|'C'leric class list, l spell level, tgt target kind,
 * rng squares (0=self), r radius, d duration (minutes; 'c' battle only,
 * 'i' instant, 'h' hours), s save kind, plus flags: explore, camp, corpse,
 * len (line), pd (on paladin subset). */
function S(id,o){SPELLS[id]=Object.assign({id:id,tgt:'enemy',rng:0},o);return SPELLS[id];}
/* --- Wizard, 40 --- */
S('mmissile',{n:'Magic Missile',c:'M',l:1,tgt:'enemy',rng:5,d:'i',desc:'1d4+1 per missile; min(5,ceil(level/2)) missiles, auto-hit; negated by Shield.'});
S('sleep',{n:'Sleep',c:'M',l:1,tgt:'area',rng:8,r:1.5,d:'h',noSave:1,undeadOK:0,desc:'2d4 HD pool, weakest first; affects friends; not undead/constructs.'});
S('burnhands',{n:'Burning Hands',c:'M',l:1,tgt:'cone',rng:0,cone:4,d:'i',s:'half',desc:'1d4/level (max 5+? capped by dice) cone 4 sq, save half.'});
S('armor',{n:'Armor',c:'M',l:1,tgt:'self',d:'i',explore:0,desc:'AC 6 field on self/caster; expires after 8+level damage absorbed.'});
S('shield',{n:'Shield',c:'M',l:1,tgt:'self',d:'c',desc:'-4 vs missiles, -1 melee; blocks Magic Missile.'});
S('cspray',{n:'Color Spray',c:'M',l:1,tgt:'cone',rng:0,cone:3,d:'c',hdLimit:2,desc:'Blinds/stuns HD<=2 (level 1) cone; living only.'});
S('spook',{n:'Spook',c:'M',l:1,tgt:'enemy',rng:6,d:'c',s:'part',desc:'Small phantom sounds/figments; intelligent foes save to disbelieve.'});
S('stink',{n:'Stinking Cloud',c:'M',l:2,tgt:'area',rng:6,r:2,d:'c',persist:1,s:'part',desc:'Persists on squares; repeated save or nauseated, stagger out.'});
S('mirror',{n:'Mirror Image',c:'M',l:2,tgt:'self',d:'c',desc:'1d4+1 images intercept attacks until struck.'});
S('strength',{n:'Strength',c:'M',l:2,tgt:'touch',d:'h',desc:'+1/+1 per point over 16 (double vs giant-kin); 1 hour/level.'});
S('knock',{n:'Knock',c:'M',l:2,tgt:'explore',explore:1,desc:'Opens a locked door (exploration option, not a weapon).' });
S('web',{n:'Web',c:'M',l:2,tgt:'area',rng:6,r:1,d:'c',s:'part',desc:'Bounds caught creatures; Dex save or held; fire destroys.'});
S('acid',{n:'Acid Arrow',c:'M',l:2,tgt:'enemy',rng:4,d:'i',desc:'2d+1 hit +1/round for 3 rounds (save ends).' });
S('invis',{n:'Invisibility',c:'M',l:2,tgt:'touch',d:'c',desc:'Subject unseen; attacks and hostile spells end it.'});
S('blind',{n:'Blindness',c:'M',l:2,tgt:'enemy',rng:0,s:'neg',d:'i',afflict:1,desc:'Struck blind until cured; -4 to hit, immune to visual.'});
S('scare',{n:'Scare',c:'M',l:2,tgt:'enemy',rng:6,s:'neg',d:'i',desc:'Foe flees in panic (living, HD<=5; else shakes off).' });
S('fireball',{n:'Fireball',c:'M',l:3,tgt:'area',rng:12,r:2.3,d:'i',s:'half',desc:'1d6/level max 10d6, radius 2.3 sq, save half — allies included.'});
S('bolt',{n:'Lightning Bolt',c:'M',l:3,tgt:'line',rng:12,len:10,d:'i',s:'half',desc:'1d6/level max 10d6, 1 sq wide line until obstructed, save half.'});
S('haste',{n:'Haste',c:'M',l:3,tgt:'touch',d:'c',desc:'Doubles movement and attacks until combat ends; slows after (undone by Slow).' });
S('slow',{n:'Slow',c:'M',l:3,tgt:'area',rng:8,r:1.5,d:'c',s:'neg',desc:'Halves movement/attacks; can undo Haste.'});
S('dispel',{n:'Dispel Magic',c:'M',l:3,tgt:'point',rng:6,d:'i',desc:'Ends one magic effect/creature spell on target; counters ongoing.'});
S('vamp',{n:'Vampiric Touch',c:'M',l:3,tgt:'touch',d:'i',desc:'2d6/level (max 20d6?) drained, caster heals half.'});
S('icestorm',{n:'Ice Storm',c:'M',l:4,tgt:'area',rng:6,r:2,d:'i',s:'half',desc:'3d6 + 1d6/level (max +10) in radius, save half.'});
S('stoneskin',{n:'Stoneskin',c:'M',l:4,tgt:'self',d:'c',desc:'Negates up to 2+1/level ordinary blows.'});
S('fear',{n:'Fear',c:'M',l:4,tgt:'enemy',rng:6,s:'neg',d:'i',desc:'Foe drops weapons and flees 1d4 rounds at -2.'});
S('cone',{n:'Cone of Cold',c:'M',l:5,tgt:'cone',rng:0,cone:9,d:'i',s:'half',desc:'1d4/level +1 (max 10d4+1), cone 9 sq, save half.'});
S('holdmon',{n:'Hold Monster',c:'M',l:5,tgt:'enemy',rng:8,r:1,d:'c',s:'neg',desc:'Paralysed, helpless to melee; save negates.'});
S('cloudkill',{n:'Cloudkill',c:'M',l:5,tgt:'area',rng:8,r:2,d:'c',persist:1,s:'part',desc:'Rolling gas, 1d4+1/round, no save for HD<5; dispersed by wind.'});
S('chainlite',{n:'Chain Lightning',c:'M',l:6,tgt:'enemy',rng:8,d:'i',s:'half',desc:'10d6 arcs to extra targets, save half each.'});
S('disint',{n:'Disintegrate',c:'M',l:6,tgt:'enemy',rng:6,s:'part',desc:'Line to target; failed save = destroyed (matter unmade).' });
S('flesh',{n:'Flesh to Stone',c:'M',l:6,tgt:'enemy',rng:6,s:'neg',d:'i',desc:'Save negates, else petrified; creatures save at -2.'});
S('deathspell',{n:'Death Spell',c:'M',l:6,tgt:'area',rng:8,r:2,d:'i',hdLimit:8,desc:'Slays sum HD<=8 in area (no save); undead dismissed instead.'});
S('dbf',{n:'Delayed Blast Fireball',c:'M',l:7,tgt:'area',rng:8,r:3,d:'i',s:'half',desc:'Charges up to 12d6, detonates next round; save half.'});
S('finger',{n:'Finger of Death',c:'M',l:7,tgt:'enemy',rng:4,s:'part',desc:'20+d6 dealt; save half or dies.'});
S('pwstun',{n:'Power Word Stun',c:'M',l:7,tgt:'enemy',rng:6,hpLimit:80,d:'i',desc:'Stuns living target with <=80 hp (no save); stunned = helpless.'});
S('incencloud',{n:'Incendiary Cloud',c:'M',l:8,tgt:'area',rng:8,r:2,d:'c',persist:1,s:'half',desc:'Rolling fire: 2d6/round in area, save half.'});
S('pwblind',{n:'Power Word Blind',c:'M',l:8,tgt:'enemy',rng:6,hpLimit:130,d:'i',desc:'Blinds (no save) if <=130 hp; permanent unless magical cure.'});
S('meteor',{n:'Meteor Swarm',c:'M',l:9,tgt:'area',rng:12,r:2,d:'i',s:'half',desc:'Four balls of 6d6+2, each save half.'});
S('pwkill',{n:'Power Word Kill',c:'M',l:9,tgt:'enemy',rng:6,hpLimit:40,d:'i',desc:'Slays living target with <=40 hp, no save.'});
/* --- Priest, 34 --- */
S('clw',{n:'Cure Light Wounds',c:'C',l:1,tgt:'touch',d:'i',camp:1,pd:1,desc:'Heals 1d8 (caster level>=7: 2d8); restores consciousness at 0+.'});
S('bless',{n:'Bless',c:'C',l:1,tgt:'area',rng:0,r:2,d:'c',pd:1,desc:'+1 hit/damage, +1 vs undead within radius.'});
S('pfe',{n:'Protection From Evil',c:'C',l:1,tgt:'touch',d:'c',desc:'+2 AC/saves vs evil; blocks summoned/evil melee for 1 round per touch.'});
S('command',{n:'Command',c:'C',l:1,tgt:'enemy',rng:6,d:'i',desc:'One word: halt/flee/grovel/knead; humanoid obeys one round (living, >1/2 HD save negates).' });
S('caw',{n:'Cause Light Wounds',c:'C',l:1,tgt:'touch',d:'i',pd:1,desc:'Touch deals 1d8 (2d8 at 7th+); undead turn save instead.'});
S('magstone',{n:'Magical Stone',c:'C',l:1,tgt:'self',d:'c',desc:'One stone becomes +1 magical, glows on command — hits creature immunities.'});
S('hold_p',{n:'Hold Person',c:'C',l:3,tgt:'enemy',rng:8,r:1,d:'c',s:'neg',shares:'holdperson',desc:'Paralysed humanoid, helpless to melee; save negates.'});
S('aid',{n:'Aid',c:'C',l:2,tgt:'party',d:'h',pd:1,desc:'+1 hp and +1 attack rolls for the company for 2 hours.'});
S('slowpoison',{n:'Slow Poison',c:'C',l:2,tgt:'touch',d:'i',camp:1,pd:1,desc:'Halves venom damage and buys time for neutralize.'});
S('silence15',{n:'Silence 15\u2032 Radius',c:'C',l:2,tgt:'area',rng:6,r:1.5,d:'c',desc:'Magic silence: no verbal casting inside, muffled sounds.'});
S('resfc',{n:'Resist Fire/Cold',c:'C',l:2,tgt:'touch',d:'h',desc:'+1 saves and half elemental damage vs one type, 2 hours.'});
S('prayer',{n:'Prayer',c:'C',l:3,tgt:'party',d:'c',desc:'Party +1 all; foes -1 all, until battle ends.'});
S('dispel_p',{n:'Dispel Magic',c:'C',l:3,tgt:'point',rng:6,d:'i',shares:'dispel',desc:'As the wizard spell.'});
S('rempara',{n:'Remove Paralysis',c:'C',l:3,tgt:'touch',d:'i',camp:1,desc:'Frees hold/paralysis/web on one ally.'});
S('magvest',{n:'Magical Vestment',c:'C',l:3,tgt:'touch',d:'c',desc:'Armor acts as +1 (up to +5 at high level) for battle.'});
S('cablind',{n:'Cause Blindness',c:'C',l:3,tgt:'enemy',rng:0,s:'neg',desc:'As blindness; save negates.'});
S('cublind',{n:'Cure Blindness',c:'C',l:3,tgt:'touch',d:'i',camp:1,desc:'Ends natural or magical blindness.'});
S('csw',{n:'Cure Serious Wounds',c:'C',l:4,tgt:'touch',d:'i',camp:1,pd:1,desc:'Heals 2d8+1.'});
S('neutpoison',{n:'Neutralize Poison',c:'C',l:4,tgt:'touch',d:'i',camp:1,desc:'Ends venom (save vs. fatal dose); cleanses contaminated food.'});
S('casw',{n:'Cause Serious Wounds',c:'C',l:4,tgt:'touch',d:'i',pd:1,desc:'Touch deals 2d8+1; undead turn save.'});
S('freeaction',{n:'Free Action',c:'C',l:4,tgt:'touch',d:'h',desc:'Immune to hold/web/paralysis for 1 hour/level.'});
S('pfe10',{n:'Protection From Evil 10\u2032 Radius',c:'C',l:4,tgt:'self',d:'c',desc:'Wards the whole company nearby from evil attacks.'});
S('ccw',{n:'Cure Critical Wounds',c:'C',l:5,tgt:'touch',d:'i',camp:1,pd:1,desc:'Heals 3d8+3.'});
S('flamestrike',{n:'Flame Strike',c:'C',l:5,tgt:'area',rng:0,r:1,d:'i',s:'half',desc:'Column of fire: 1d6/level (max 10d6? by dice), save half; burns undead extra.'});
S('cacw',{n:'Cause Critical Wounds',c:'C',l:5,tgt:'touch',d:'i',desc:'Touch deals 3d8+3; undead turn save.'});
S('slayliving',{n:'Slay Living',c:'C',l:5,tgt:'touch',d:'i',s:'neg',desc:'Touch: save at -4 or die.'});
S('dispel evil',{n:'Dispel Evil',c:'C',l:5,tgt:'area',rng:0,r:1.5,d:'c',desc:'Banishes summoned/evil outsiders; -4 attack vs evil in area.'});
S('raisedead',{n:'Raise Dead',c:'C',l:5,tgt:'touch',explore:1,camp:1,desc:'Recall a dead companion (not killed instantly): CON roll or beyond recall; returns at 1 hp, -1 CON.'});
S('heal',{n:'Heal',c:'C',l:6,tgt:'touch',d:'i',desc:'Restores all but 1d4 missing hp; cures blindness/disease/poison; -10 to drained.'});
S('bladebarrier',{n:'Blade Barrier',c:'C',l:6,tgt:'area',rng:4,r:1,d:'c',persist:1,desc:'Ring of blades: 6d6/round to those passing or starting in it.'});
S('harm',{n:'Harm',c:'C',l:6,tgt:'touch',d:'i',desc:'Deals all but 1 hp (save half); on undead heals them 1d4+? — turn save.'});
S('holyword',{n:'Holy Word',c:'C',l:7,tgt:'area',rng:0,r:2,d:'i',desc:'Deafens/locks/stuns/kills evil and undead by HD tier in radius.'});
S('destruction',{n:'Destruction',c:'C',l:7,tgt:'enemy',rng:6,s:'part',desc:'Touch or near target unmade; save at -4 avoids death.'});
S('resurrect',{n:'Resurrection',c:'C',l:7,tgt:'explore',explore:1,camp:1,desc:'Returns a lost companion at full hp, even slain long ago; year-old body OK.'});
/* Priest ring-2 hold person appears in lists both ways; the wizard version: */
S('holdperson',{n:'Hold Person',c:'M',l:2,tgt:'enemy',rng:8,r:1,d:'c',s:'neg',desc:'Paralysed humanoid; save negates.'});
/* (holdperson doubles as the wizard ring-2 entry; hold_p is the priest ring-3 copy. Totals: 40 wizard + 34 priest.) */

/* ================= Items ================= */
/* t codes: w/r/a/s/g primary equipment; m misc worn, p potion, d device,
 * x scroll, k ability book, v valuable, q quest. fam = weapon family for
 * specialization; spd = weapon speed; bands = missile range in 30-ft units. */
function I(id,o){ITEMS[id]=Object.assign({id:id},o);return ITEMS[id];}
/* Melee weapons */
I('club',{n:'Club',t:'w',d:'1d6',fam:'club',spd:4,price:1,w:1});
I('dagger',{n:'Dagger',t:'w',d:'1d6',fam:'knife',spd:3,price:2,w:1});
I('staff',{n:'Staff',t:'w',d:'1d6',fam:'staff',spd:5,price:5,w:10,two:1});
I('mace',{n:'Mace',t:'w',d:'1d6',fam:'mace',spd:5,price:5,w:8,blunt:1});
I('warhammer',{n:'War Hammer',t:'w',d:'1d6+1',fam:'hammer',spd:5,price:5,w:12,blunt:1});
I('shortsword',{n:'Short Sword',t:'w',d:'1d6',fam:'shortsword',spd:3,price:10,w:3});
I('longsword',{n:'Long Sword',t:'w',d:'1d8',fam:'longsword',spd:5,price:15,w:4});
I('broadsword',{n:'Broad Sword',t:'w',d:'1d12',fam:'broadsword',spd:7,price:10,w:7});
I('bastardsword',{n:'Bastard Sword',t:'w',d:'1d8+2',fam:'bastardsword',spd:9,price:35,w:10});
I('twohandsword',{n:'Two-Handed Sword',t:'w',d:'2d8+1',fam:'twohandsword',spd:14,price:50,w:15,two:1});
I('handaxe',{n:'Hand Axe',t:'w',d:'1d6',fam:'axe',spd:4,price:6,w:4,thrown:2});
I('battleaxe',{n:'Battle Axe',t:'w',d:'1d8',fam:'axe',spd:7,price:7,w:7});
I('spear',{n:'Spear',t:'w',d:'1d6',fam:'spear',spd:5,price:3,w:6,thrown:3});
I('falchion',{n:'Falchion',t:'w',d:'1d8+1',fam:'falchion',spd:9,price:40,w:10});
I('flail',{n:'Footman\u2019s Flail',t:'w',d:'2d4',fam:'flail',spd:6,price:4,w:7,blunt:1});
I('silveredclub',{n:'Silvered Club',t:'w',d:'1d6',fam:'club',spd:5,price:60,w:1,silver:1,blunt:1});
I('silvermace',{n:'Silver Mace',t:'w',d:'1d6',fam:'mace',spd:5,price:125,w:8,silver:1,blunt:1});
I('silverlongsword',{n:'Silver Long Sword',t:'w',d:'1d8',fam:'longsword',spd:5,price:150,w:4,silver:1});
/* Missile weapons */
I('sling',{n:'Sling',t:'r',d:'1d4',bands:5,rof:1,spd:4,price:2,w:2});
I('shortbow',{n:'Short Bow',t:'r',d:'1d6',bands:5,rof:2,spd:4,price:30,w:2});
I('longbow',{n:'Long Bow',t:'r',d:'1d8',bands:6,rof:2,spd:5,price:75,w:3});
I('dart',{n:'Elven Dart',t:'r',d:'1d3',bands:2,rof:2,spd:3,price:2,w:1});
I('javellin',{n:'Javelin',t:'r',d:'1d6+1',bands:4,rof:2,spd:6,price:1,w:2});
I('arrow',{n:'Arrows (12)',t:'r',ammo:1,d:'0',price:1,w:1});
/* Armor & shields */
I('leather',{n:'Leather Armor',t:'a',ac:8,price:5,w:15});
I('studded',{n:'Studded Leather',t:'a',ac:7,price:20,w:20});
I('chain',{n:'Chain Mail',t:'a',ac:6,price:40,w:35});
I('banded',{n:'Banded Mail',t:'a',ac:5,price:90,w:50});
I('plate',{n:'Plate Mail',t:'a',ac:3,price:200,w:70});
I('shield',{n:'Wooden Shield',t:'s',price:10,w:7});
I('silveredshield',{n:'Silvered Shield',t:'s',price:150,w:7,silver:1});
/* Adventuring gear */
I('backpack',{n:'Backpack',t:'g',price:2,w:2});
I('bedroll',{n:'Bedroll',t:'g',price:1,w:5});
I('rations',{n:'Iron Rations (3 days)',t:'g',price:3,w:3});
I('waterskin',{n:'Waterskin',t:'g',price:1,w:4});
I('rope',{n:'Hempen Rope (50\u2032)',t:'g',price:1,w:10});
I('torch',{n:'Torch',t:'g',price:1,w:1});
I('lantern',{n:'Lantern',t:'g',price:7,w:2});
I('oil',{n:'Flask of Oil',t:'g',price:1,w:2});
I('holy',{n:'Holy Symbol',t:'g',price:5,w:1});
I('thtools',{n:'Thieves\u2019 Tools',t:'g',price:25,w:1});
I('spikes',{n:'Iron Spikes (6)',t:'g',price:1,w:5});
I('mirror',{n:'Steel Mirror',t:'g',price:10,w:2});
/* Consumables & valuables */
I('oilflat',{n:'Potion of Healing (common)',t:'p',cure:'1d6+1',price:50});
I('potioncure',{n:'Potion of Cure Light Wounds',t:'p',cure:'1d8',price:75});
I('antivenom',{n:'Antivenom',t:'p',purge:'poison',price:80});
I('gemr',{n:'Ruby (50 gp)',t:'v',price:50});
I('geme',{n:'Emerald (100 gp)',t:'v',price:100});
I('gemd',{n:'Diamond (500 gp)',t:'v',price:500});
I('jewelneck',{n:'Gold Necklace (120 gp)',t:'v',price:120});
/* Quest items (Emberfall saga; module quest items live in modules.js) */
I('reliquary',{n:'The Dawn Reliquary',t:'q',price:0,gold:0,desc:'A silver reliquary of the Dawn, warm to the touch.'});
I('ironkey',{n:'Ogre\u2019s Iron Key',t:'q',price:0,desc:'A heavy iron key, rust-flecked and cold.'});
I('tamsin',{n:'Tamsin Hask (rescued)',t:'q',price:0,desc:'The miller\u2019s daughter, safe in your keeping.',giverCarry:1});

/* ================= Monsters (Emberfall set) ================= */
/* Shape: name, hd (4.3=4d8+3), hp dice or fixed, ac, mv, thac0, atk:[dice…],
 * size S/M/L/H/G, ml, xp, gold dice, tags, fig, lore; undead rank, caster. */
function MO(id,o){
  var m=Object.assign({id:id,mv:12,ac:10,size:'M',ml:8,xp:0,gold:'',tags:[],fig:'humanoid'},o);
  if(m.thac0===undefined){var h=typeof m.hd==='number'?Math.floor(m.hd):1;m.thac0=20-Math.max(0,h-1);}
  MONSTERS[id]=m;return m;
}
MO('rat',{n:'Giant Rat',hd:.5,hp:'1d4',ac:7,mv:12,ml:5,xp:15,gold:'',atk:['1d4-1'],size:'S',fig:'rat',tags:[],lore:'Cellar vermin emboldened by dark winters.'});
MO('centipede',{n:'Large Centipede',hd:1,hp:'1d8',ac:6,mv:9,ml:7,xp:15,atk:['1d2 + bite'],fig:'centipede',tags:[],lore:'Its bite brings fever; a stench precedes it.'});
MO('kobold',{n:'Kobold',hd:0.5,hp:'1d4-2',ac:7,mv:8,ml:6,xp:65,atk:['1d6-1'],size:'S',fig:'humanoid',tags:['humanoid','kobold'],gold:'2d6',lore:'Sneaky and spiteful; they swarm in the dark.'});
MO('beetle',{n:'Bombardier Beetle',hd:2,hp:'2d8',ac:4,mv:9,ml:12,xp:140,atk:['1d8 + spray'],fig:'insect',tags:[],lore:'Searing spray, 2 rounds per burst.'});
MO('wolf',{n:'Winter Wolf',hd:2,hp:'2d8+1',ac:6,mv:12,ml:8,xp:140,atk:['1d6 bite'],fig:'wolf',tags:['canine'],lore:'Pale-coated hunters of the vale.'});
MO('gnoll',{n:'Gnoll',hd:2,hp:'2d8+1',ac:7,mv:12,ml:10,xp:140,atk:['1d8+1'],fig:'humanoid',tags:['humanoid','gnoll'],gold:'2d6x10',lore:'Hyena-men of the watchtower pack.'});
MO('gnollpacklord',{n:'Bloodmane Packlord',hd:4.3,hp:'4d8+3',ac:4,mv:12,ml:12,xp:600,atk:['1d8+4','1d4 claws'],fig:'humanoid',leader:1,tags:['humanoid','gnoll'],gold:'8d6x10',lore:'Chieftain of the Bloodmane; wears a mane-crown of teeth.'});
MO('ogre',{n:'Ogre Brute',hd:4.2,hp:'4d8+2',ac:5,mv:12,ml:12,xp:270,atk:['1d10+4'],size:'L',fig:'humanoid',tags:['giantkin','ogre'],gold:'2d6x10',lore:'Dim, brutal, and stronger than plate looks.'});
MO('redfang',{n:'Redfang the Chieftain',hd:5.2,hp:'5d8+2',ac:3,mv:12,ml:14,xp:650,atk:['2d8+5'],size:'L',leader:1,fig:'humanoid',tags:['giantkin','ogre'],gold:'12d6x10',lore:'The red-crowned ogre who holds the abbey undercroft.'});
MO('ogrewatcher',{n:'Ogre Watcher',hd:4.2,hp:'4d8+2',ac:5,mv:12,ml:10,xp:270,atk:['1d10+3'],size:'L',fig:'humanoid',tags:['giantkin','ogre'],lore:'Set to mind the abbey stair.'});
MO('skeleton',{n:'Skeleton',hd:1,hp:'1d8',ac:7,mv:12,ml:'fearless',xp:35,atk:['1d6+1'],fig:'skeleton',undead:1,tags:['undead'],lore:'Bone turns half non-blunt damage. Fire and bludgeons serve.'});
MO('zombie',{n:'Shambling Zombie',hd:2,hp:'2d8',ac:8,mv:6,ml:'fearless',xp:65,atk:['1d8+1'],undead:1,tags:['undead'],lore:'Slow, numbed to pain; fire is the friendliest mercy.'});
MO('ghoul',{n:'Ghoul',hd:2,hp:'2d8',ac:6,mv:9,ml:'fearless',xp:120,atk:['1d6+1','paralysis'],undead:1,tags:['undead'],lore:'A frozen touch: failed save sleeps for hours. Elves shrug it off.'});
MO('shadow',{n:'Shadow',hd:3,hp:'3d8',ac:5,mv:12,ml:'fearless',xp:270,atk:['drain 1 point'],undead:1,tags:['undead'],fig:'blob',lore:'No flesh, only cold: ordinary steel passes through.'});
MO('specter',{n:'Specter',hd:5.1,hp:'5d8+1',ac:4,mv:12,ml:'fearless',xp:600,atk:['1d10 + level drain'],undead:2,tags:['undead'],size:'L',fig:'orb',lore:'Its touch drains a year of life. Turning and silver bite.'});
MO('spider',{n:'Rider Spider',hd:3,hp:'3d8',ac:5,mv:15,ml:8,xp:140,atk:['bite 1d6+1 + web'],fig:'spider',tags:[],lore:'Webs the ground before it strikes.'});
MO('cultist',{n:'Ashen Cultist',hd:1,hp:'1d8',ac:8,mv:12,ml:8,xp:65,atk:['1d6'],fig:'humanoid',tags:['humanoid','cult'],gold:'3d6x10',lore:'Tongue-singed zealots of the Ash.'});
MO('zealot',{n:'Ashen Zealot',hd:3,hp:'3d8+1',ac:6,mv:12,ml:12,xp:270,atk:['1d8+2'],fig:'humanoid',tags:['humanoid','cult'],gold:'6d6x10',lore:'Veterans of the circle; scarred lips, iron faith.'});
MO('malvek',{n:'Malvek the Ashen',hd:'caster 5',hp:'4d4+2',ac:6,mv:12,ml:'fearless',xp:1400,atk:['1d4'],fig:'humanoid',caster:5,casterList:['bolt','scare','invis'],leader:1,tags:['humanoid','cult'],gold:'20d6x10',lore:'Once a temple scribe; his circle desecrates the undercroft.'});
MO('werehyena',{n:'Bloodmane (were-hyena)',hd:4.3,hp:'4d8+3',ac:3,mv:15,ml:12,xp:600,atk:['1d8+3'],fig:'wolf',tags:['lycanthrope'],silver:1,lore:'Only silver or magic bites; in human guise, a gnoll laugh.'});
MO('brigand',{n:'Brigand',hd:1,hp:'1d8+1',ac:7,mv:12,ml:8,xp:65,atk:['1d8'],fig:'humanoid',tags:['humanoid','bandit'],gold:'5d6x10',lore:'Fallen folk of the Emberwild roads.'});
MO('brigandchief',{n:'Brigand Lord',hd:4.1,hp:'4d8+1',ac:5,mv:12,ml:12,xp:420,atk:['1d8+2','1d4 dagger'],leader:1,fig:'humanoid',tags:['humanoid','bandit'],gold:'20d6x10',lore:'The tall man at the Bloodmane camp fireside.'});
MO('merchant',{n:'Country Merchant',hd:1,hp:'1d6',ac:9,mv:12,ml:6,xp:0,fig:'humanoid',neutral:1,reaction:7,tags:['humanoid'],gold:'2d6x10',lore:'Belted with coin, guarded by a mule and prayers.'});
MO('pilgrim',{n:'Dawn Pilgrim',hd:1,hp:'1d6',ac:9,mv:9,ml:6,xp:0,fig:'humanoid',neutral:1,reaction:9,tags:['humanoid'],lore:'Walking to the Dawnstones with a candle in a lantern.'});
MO('farmer',{n:'Emberwild Farmer',hd:1,hp:'1d8',ac:9,mv:12,ml:7,xp:0,fig:'humanoid',neutral:1,reaction:8,tags:['humanoid'],lore:'Knows every shortcut and half the rumors.'});

/* ================= Maps ================= */
/* Local legend: # wall, H/B timber/brick, 1-9 service doors, G gate,
 * . street, , grass, T tree, F fountain, D door, L locked, S secret,
 * < > stairs, a-z event sites. Coordinates zero-based, x right, y down. */
MAPS.town={
  name:'Emberfall',safe:1,locName:'the town of Emberfall',
  start:{x:12,y:16,dir:0},
  grid:[
  '#########################',
  '#,,T,,T,,,,T,,T,,,,T,,T,#',
  '#,HHHH..BBBB..HHHH..BBB,#',
  '#,H1HH..B2BB..H3HH..B>B,#',
  '#......................,#',
  '#,HHHH...BBBBB..HHHHH,,T#',
  '#,H4HH...BB5BB..HH7HH,,,#',
  '#,.....,,,.,,,.,,,,,,...#',
  '#,,T,,,,,,a,,,,,,,,,,,,,#',
  '#,,T,,,T,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,T,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,T#'.slice(0,25),
  '#,,HHH...BBB....HHH,,,,,#',
  '#,,HHH...B6B....HHH,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,##'.slice(0,25),
  '#,,T,,T,,,,,T,,,,T,,T,,,#',
  '#,T,,,,,,,,,,,,,,,,,,,,,#',
  '#,,.....,,.....,,.....,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,##'.slice(0,25),
  '#,T,,,,,,,,,,,,,,,,,,,T,#',
  '#############G###########'],
  locs:{
    '1':{svc:'inn',name:'The Drowsy Lantern'},
    '2':{svc:'armory',name:'Ironhand Outfitters'},
    '3':{svc:'tavern',name:'The Gilded Tankard'},
    '4':{svc:'apothecary',name:'The Gilded Mortar'},
    '5':{svc:'temple',name:'Temple of the Dawn'},
    '6':{svc:'hall',name:'Town Hall'},
    '7':{svc:'training',name:'Training Hall'}},
  stairs:{'21,3':{to:'crypt1',x:2,y:2,dir:1,label:'Ruined Abbey of the Dawn'}},
  exit:{G:{to:'wild',x:23,y:30,dir:0,label:'South Gate to the Emberwild'}},
  ev:{
    a:{enc:{mons:[['brigand',2],['brigandchief',1]],text:'In the shadow of the tannery wall, blades step out of an alley \u2014 an ambush even here, in town.',quest:'alley',surprise:1},
      text:'A short fight with cutpurses.'}},
  desc:'Market-town of the Emberwild: timber and stone, a fountain square, the ruined abbey looms northeast.'
};
MAPS.crypt1={
  name:'Abbey Undercroft',locName:'the Abbey Undercroft',
  start:{x:2,y:2,dir:1},
  grid:[
  '#########################',
  '#.......#.......#.......#',
  '#.<.....D.......L......>#',
  '#...b...#...d...#...c...#',
  '#.......#.......#.......#',
  '####D########D#######D###',
  '#########.....###########',
  '#########.....###########',
  '#.......#.....S.........#',
  '#...e...D.....D....g....#',
  '#.......#.....#.........#',
  '#.......#.....#...f.....#',
  '####D####..L..###########',
  '#.......#.......#.......#',
  '#...h...D.....D.........#',
  '#.......#.....D....i....#',
  '#######D#######D#######S#',
  '#.......#...m...#..n....#',
  '#...j...#...k...#...l...#',
  '#.......#.......#....o..#',
  '################D########'],
  stairs:{
    '2,2':{to:'town',x:21,y:3,dir:3,label:'Stair to the Abbey'},
    '23,2':{to:'crypt2',x:23,y:18,dir:3,label:'Locked descent to the deep'}},
  traps:{'11,6':{kind:'darts',off:0},'14,13':{kind:'pit',off:0},'12,18':{kind:'gas',off:0}},
  ev:{
    b:{enc:{mons:[['ghoul',1],['rat',3]],text:'Bones picked clean glisten in a wall-niche; something crouches among them.',sight:5},
      text:'A defiled ossuary.'},
    d:{enc:{mons:[['skeleton',3]],text:'Sarcophagi line this chamber; the lids are sliding.'},
      text:'Broken sarcophagi.'},
    e:{enc:{mons:[['redfang',1],['ogre',2]],text:'A red-crowned ogre rises from a stolen throne, club like a ship\u2019s mast.',leader:1,quest:'redfang'},
      text:'Redfang\u2019s stolen hall.'},
    c:{chest:{text:'An iron-bound coffer under a fallen banner.',gold:'4d6x10',items:['potioncure','gemr'],trap:'darts'}},
    g:{chest:{text:'A hidden cache behind a cracked stone (secret door).',gold:'3d6x10',items:['silvermace','geme'],hidden:1}},
    f:{chest:{text:'On a marble reliquary-shrine, a silver casket gleams, untouched by the desecration.',items:['reliquary'],lock:'ironkey',lockText:'The shrine-door is locked with heavy iron work.'}},
    h:{enc:{mons:[['zombie',2],['cultist',2]],text:'Ash-robed figures look up from their work \u2014 mid-rite.'},
      text:'A working chamber of the circle.'},
    i:{text:'A weeping statue, face worn away by tears. Cold pools at its feet.',deed:'statueClue',
      hint:'The statue weeps black tears; Malvek\u2019s circle feeds the undercroft something older than ghouls.'},
    j:{chest:{text:'A burial chest of a forgotten abbot.',gold:'5d6x10',items:['scroll:csw']}},
    m:{enc:{mons:[['skeleton',2],['zombie',1]],text:'The sealed niches of the south gallery are not, in fact, sealed.'},
      text:'The broken niches.'},
    n:{chest:{text:'Votive censers hidden hastily under a disused passage floor.',gold:'3d6x10',items:['geme']}},
    o:{chest:{text:'The infirmary\u2019s buried store, jars sealed in pitch.',gold:'4d6x10',items:['antivenom','oilflat']}},
    k:{enc:{mons:[['shadow',2]],text:'The torchlight thins. A second shadow crosses the floor \u2014 without a body.',sight:7,hidden:1},
      text:'A cold spot in the floor plan.'},
    l:{chest:{text:'Offering boxes along the west wall.',gold:'2d6x10'}}},
  secret:{'14,8':{looksLike:'#'},'23,16':{looksLike:'#'}},
  wander:[
    {p:.03,mons:[['rat',2],['rat',3]]},
    {p:.03,mons:[['skeleton',1],['skeleton',2]]},
    {p:.02,mons:[['cultist',2],['cultist',3]]},
    {p:.02,mons:[['centipede',2],['beetle',1]]}],
  keyItem:'ironkey',lockText:'A heavy iron lock bites the shrine-door.',
  desc:'Cold flagstones, monks\u2019 graves, and the smell of candle-smoke that outlived the candles.'
};
MAPS.crypt2={
  name:'The Desecrated Deep',locName:'the desecrated deep',
  start:{x:22,y:18,dir:3},
  grid:[
  '###########D#############',
  '#.........#.............#',
  '#...m.....D......n......#',
  '#.........#.............#',
  '#####D###############D###',
  '#.........#.............#',
  '#...o.....D......p......#',
  '#.........#.............#',
  '########D#########D######',
  '#.................#.....#',
  '#........q........D..r..#',
  '#.................#.....#',
  '#####D#####D######D######',
  '#....w..#.......#.......#',
  '#...s...#...t...D...u...#',
  '#.......#.......#.......#',
  '#########D#######D#######',
  '#.......................#',
  '#...y..................<#',
  '#........v..............#',
  '#########################'],
  stairs:{'23,18':{to:'crypt1',x:23,y:2,dir:3,label:'Stair back to the undercroft'}},
  traps:{'12,9':{kind:'blade',off:0},'4,13':{kind:'stones',off:0}},
  ev:{
    m:{chest:{text:'Sacristy shelves, ransacked but not empty.',gold:'6d6x10',items:['oilflat']}},
    n:{enc:{mons:[['skeleton',2],['zombie',2]],text:'The grave-tides stir at the sound of boots.'},text:'A gallery of niches.'},
    o:{chest:{text:'A chained alms-box, its hinges burned.',gold:'5d6x10',items:['antivenom'],trap:'fire'}},
    p:{text:'Fresh whitewash over old frescoes: the circle\u2019s new chapel of the Ash.',deed:'ashFresco',
      hint:'The new frescoes show an iron crown burning a dawn. Malvek means to finish what the undercroft began.'},
    q:{enc:{mons:[['ghoul',2],['shadow',1]],text:'A charnel smell rolls up a shaft of black stairs.'},text:'The charnel stair landing.'},
    r:{chest:{text:'The chapel\u2019s silver plate, heaped before the ash altar.',gold:'9d6x10',items:['jewelneck','gemd'],guard:['zealot',1]}},
    s:{enc:{mons:[['specter',1]],text:'A specter of the last abbot drifts across the wall, pointing east \u2014 and wailing.',hidden:1,sight:4},
      text:'The abbot\u2019s grief, unquiet.'},
    t:{chest:{text:'A buried strongbox beneath the sacristan\u2019s ruined desk.',gold:'7d6x10',items:['gemr']}},
    u:{enc:{mons:[['spider',1],['cultist',1]],text:'Webs stitch the archway; a webbed cultist screams through the silk.'},text:'A silk-curtained alcove.'},
    w:{enc:{mons:[['ghoul',2]],text:'A feeding den: two ghouls look up from the communal meal entirely unashamed.',sight:5},
      text:'The feeding den.'},
    y:{chest:{text:'A sacrist buried in a hurry, and a grave-good casket buried with him.',gold:'5d6x10',items:['gemr']}},
    v:{enc:{mons:[['malvek',1],['zealot',2],['zombie',1]],text:'Malvek the Ashen turns from the ash altar, hands bright with stolen fire. This is the circle\u2019s heart.',leader:1,quest:'malvek',surprise:0},
      text:'The circle is broken.'}},
  wander:[
    {p:.03,mons:[['skeleton',2],['skeleton',3]]},
    {p:.03,mons:[['zombie',2]]},
    {p:.02,mons:[['cultist',2],['zealot',1]]},
    {p:.02,mons:[['shadow',1]]}],
  desc:'The abbey\u2019s deep places, where the Dawn\u2019s stones remember a different hymn.'
};
MAPS.tower={
  name:'Bloodmane Watchtower',locName:'the Bloodmane Watchtower',
  start:{x:9,y:13,dir:0},
  grid:[
  '###########D#######',
  '#.................#',
  '#...w.......x.....#',
  '#.................#',
  '#####D#########D###',
  '#...u.............#',
  '#....y.....z......#',
  '#.................#',
  '######D###D########',
  '#.............t...#',
  '#........r........#',
  '#.................#',
  '########D##########',
  '#.................#',
  '#########s#########'],
  ev:{
    w:{chest:{text:'A quartermaster\u2019s shelf of robbed goods.',gold:'4d6x10',items:['leather']}},
    x:{enc:{mons:[['gnoll',3]],text:'Hyena-laughter echoes; the pack\u2019s watchers drop rope-ladders of knotted sheets.',sight:6},text:'The pack\u2019s watch-floor.'},
    y:{enc:{mons:[['werehyena',1],['gnoll',2]],text:'A scarred hyena-man rises on two legs \u2014 the Packlord, in his human guise until now.',leader:1,quest:'gnolls'},
      text:'The Bloodmane Packlord lies dead; the watchtower\u2019s grip on the vale is broken.'},
    z:{chest:{text:'Chained chest with an iron lock (ogre\u2019s work).',gold:'6d6x10',items:['shortbow','potioncure'],trap:'pit'}},
    t:{chest:{text:'A trophy chest of the watchtower\u2019s Greywater takings.',gold:'5d6x10',items:['shortsword','gemr']}},
    u:{enc:{mons:[['gnoll',2]],text:'Two gnoll sentries on the ground floor, slack until they aren\u2019t.',sight:4},
      text:'The sentry pair.'},
    r:{text:'In a back-room cell, Tamsin Hask, hoarse but whole, clutches your sleeve. \u201cMy da will pay any price, any price at all.\u201d',deed:'tamsin',items:['tamsin']},
    s:{text:'The stair up to the beacon-rail: from here you can see every farm in the Emberwild.'}},
  desc:'A ruined beacon tower above greywater, re-roofed in hide and re-tooled for cruelty.'
};
/* Event letters w,x,y,z,r,s are walkable a-z sites; validator enforces coverage. */

/* ================= Commissions (E1) ================= */
QUESTS.redfang={name:'Redfang the Chieftain',lead:'Ogres have taken the abbey undercroft. Their chieftain wears a crown of red.',goal:'Slay Redfang the Chieftain in the Abbey Undercroft.',offer:'The Reeve will pay 250 gp for the crown.',done:'Redfang is dead; the road to the abbey is open.',gold:250,xp:750,final:0,reveal:'crypt1'};
QUESTS.reliquary={name:'The Dawn Reliquary',lead:'The abbot\u2019s relic was never recovered when the abbey fell.',goal:'Recover the Dawn Reliquary from the undercroft shrine.',offer:'The Temple will pay 300 gp for its safe return.',done:'The Dawn Reliquary is returned.',gold:300,xp:900,needItem:'reliquary',reveal:'crypt1'};
QUESTS.malvek={name:'Malvek the Ashen',lead:'The circle of the Ash works below the abbey. They desecrate the graves and worse.',goal:'Break Malvek the Ashen and his circle in the desecrated deep.',offer:'The Reeve pledges 600 gp for the circle\u2019s end.',done:'The circle is broken; the abbey\u2019s deep places are quiet.',gold:600,xp:2400,final:1,reveal:'crypt2'};
QUESTS.gnolls={name:'The Bloodmane Pack',lead:'Gnells out of the Greywater watchtower took the miller\u2019s daughter.',goal:'Defeat the Bloodmane Packlord and rescue Tamsin Hask.',offer:'Hask offers 150 gp; the miller\u2019s purse is thin but honest.',done:'Tamsin is home; the watchtower pack is scattered.',gold:150,xp:500,side:1,needItem:'tamsin',reveal:'tower'};

/* ================= Shops ================= */
SHOPS.armory={name:'Ironhand Outfitters',kind:'armory',
  stock:['club','dagger','staff','mace','warhammer','shortsword','longsword','broadsword','bastardsword','twohandsword','handaxe','battleaxe','spear','falchion','flail','sling','shortbow','longbow','dart','javellin','arrow','leather','studded','chain','banded','plate','shield','backpack','bedroll','rations','waterskin','rope','torch','lantern','oil','spikes','mirror','thtools']};
SHOPS.apothecary={name:'The Gilded Mortar',kind:'apothecary',
  stock:['oilflat','potioncure','antivenom','holy','silveredclub','silvermace']};
SHOPS.general={name:'The Drowsy Lantern larder',kind:'general',
  stock:['rations','waterskin','bedroll','rope','torch','oil','backpack']};

/* ================= Rumors ================= */
RUMORS.town=[
 'They say the abbey stairs groan at night, and the groaning answers itself.',
 'Ogre spoor from the abbey steps down to Greywater, and a tower beyond.',
 'A miller at Hask Farm pays well for news of his daughter \u2014 or for her.',
 'Ash-scented strangers were buying candlewax by the cartload before the troubles.',
 'Iron, says the Reeve. Whatever walks down there, try iron and silver first.'];
RUMORS.wild=[
 'Pilgrims say the Dawnstones still keep one candle of light, whatever the weather.',
 'The hermit beyond the Greywater will mend a wound once a week for nobody\u2019s coin.',
 'Brigands at the Bloodmane camp pay a tall man at the fireside \u2014 and fear him.',
 'Spider-silk sheets the Hollow oaks at the Greywater\u2019s bend.',
 'Drowned Chapel? At low water you can hear singing under the bridge.'];

/* ================= Item lookup ================= */
/* Resolves equipment, consumables, valuables, 'scroll:<spellId>' and
 * 'deviceId#charges'; the full instance ID must survive every transfer. */
var item=function(id){
  if(!id)return null;
  if(ITEMS[id])return ITEMS[id];
  var parts=String(id).split('#'),base=parts[0];
  if(base.indexOf('scroll:')===0){
    var sp=SPELLS[base.slice(7)];
    return sp?{id:id,n:'Scroll: '+sp.name,t:'x',spell:base.slice(7),price:100,desc:'Read to cast '+sp.name+'. '+(sp.desc||'')}:null;
  }
  var d=ITEMS[base];
  if(d&&d.charges){
    var left=parts.length>1?+parts[1]:d.charges;
    if(left<=0)return null;
    return Object.assign({},d,{id:id,chargesLeft:left});
  }
  return null;
};
var itemName=function(id){var it=item(id);return it?it.n:String(id);};

/* ================= Pre-generated heroes ================= */
/* Waiting roster; not auto-selected. Stats per §3/§4. */
function P(o){return o;}
PREGENS=[
 {id:'pg_aldric',name:'Aldric Thorne',race:'H',cls:'F',align:'LG',color:'#c2502c',spec:'longsword',
  scores:{str:17,dex:16,con:16,int:10,wis:12,cha:11},strx:0,lvl:1,xp:0,
  eq:{melee:'longsword',armor:'chain',shield:'shield'},
  inv:['backpack','rations','waterskin','rope','torch']},
 {id:'pg_seraphine',name:'Seraphine Vale',race:'H',cls:'P',align:'LG',color:'#e3b54a',
  scores:{str:16,dex:13,con:15,int:10,wis:13,cha:17},strx:0,lvl:1,xp:0,
  eq:{melee:'broadsword',armor:'chain',shield:'shield'},
  inv:['holy','backpack','rations','waterskin']},
 {id:'pg_borin',name:'Borin Stonehand',race:'D',cls:'C',align:'NG',color:'#b07b4a',
  scores:{str:16,dex:12,con:18,int:10,wis:16,cha:10},strx:0,lvl:1,xp:0,
  eq:{melee:'mace',missile:'sling',armor:'chain',shield:'shield'},
  inv:['holy','backpack','rations','waterskin']},
 {id:'pg_lyra',name:'Lyra Windwhisper',race:'HE',cls:'R',align:'NG',color:'#5f9e66',spec:'goblins',
  scores:{str:14,dex:15,con:14,int:11,wis:14,cha:12},strx:0,lvl:1,xp:0,
  eq:{melee:'longsword',missile:'longbow',armor:'studded'},
  inv:['arrow','backpack','rations','waterskin','rope']},
 {id:'pg_pip',name:'Pip Quickfinger',race:'HL',cls:'T',align:'CN',color:'#4fb3a9',
  scores:{str:8,dex:18,con:13,int:12,wis:10,cha:13},strx:0,lvl:1,xp:0,
  eq:{melee:'shortsword',missile:'sling',armor:'leather'},
  inv:['thtools','backpack','rations','waterskin']},
 {id:'pg_elowen',name:'Elowen Starfall',race:'E',cls:'M',align:'CG',color:'#b7a6e8',
  scores:{str:8,dex:14,con:12,int:16,wis:11,cha:13},strx:0,lvl:1,xp:0,
  eq:{melee:'staff',missile:'dart'},
  inv:['backpack','rations','waterskin','dagger'],
  book:['mmissile','sleep','armor','burnhands','shield'],prep:{mmissile:1},mem:{mmissile:1}}];
