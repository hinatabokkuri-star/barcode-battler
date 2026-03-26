// ===== BARCODE BATTLER RPG - game.js =====
// バージョン: v0.2.4.1
// 担当: モンスター生成・バトル・コレクション・UI・エフェクト

const GAME_VERSION = "v0.2.4.1";

// ===== AUDIO =====
let audioCtx = null;
function getAudioCtx(){
  if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  return audioCtx;
}
function playTone(freq,type,dur,vol=0.3,delay=0){
  try{
    const ctx=getAudioCtx();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    osc.type=type;osc.frequency.setValueAtTime(freq,ctx.currentTime+delay);
    gain.gain.setValueAtTime(0,ctx.currentTime+delay);
    gain.gain.linearRampToValueAtTime(vol,ctx.currentTime+delay+0.01);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+delay+dur);
    osc.start(ctx.currentTime+delay);
    osc.stop(ctx.currentTime+delay+dur+0.05);
  }catch(e){}
}
function seCommon(){playTone(440,'sine',0.3);playTone(550,'sine',0.3,0.2,0.1);}
function seRare(){[440,550,660,880].forEach((f,i)=>playTone(f,'sine',0.25,0.25,i*0.08));}
function seEpic(){[440,550,660,880,1100].forEach((f,i)=>playTone(f,'sine',0.3,0.3,i*0.07));playTone(220,'sawtooth',0.5,0.15,0.2);}
function seLegendary(){
  [220,330,440,550,660,880,1100,1320].forEach((f,i)=>playTone(f,'sine',0.4,0.25,i*0.06));
  playTone(110,'sawtooth',1.0,0.2,0);
  setTimeout(()=>[880,1100,1320,1760].forEach((f,i)=>playTone(f,'triangle',0.3,0.3,i*0.05)),500);
}
function seAttack(){playTone(200,'sawtooth',0.15,0.3);playTone(150,'sawtooth',0.1,0.15,0.1);}
function seMagic(){[600,800,1000,1200].forEach((f,i)=>playTone(f,'sine',0.2,0.2,i*0.04));}
function seSkill(){playTone(440,'square',0.1,0.4);playTone(880,'square',0.15,0.3,0.1);playTone(1320,'sine',0.3,0.25,0.2);}
function seVictory(){[523,659,784,1047].forEach((f,i)=>playTone(f,'sine',0.4,0.3,i*0.15));}
function seDefeat(){[330,277,220,185].forEach((f,i)=>playTone(f,'sine',0.4,0.25,i*0.2));}
function seMiss(){playTone(300,'sine',0.1,0.15);playTone(250,'sine',0.1,0.12,0.05);}

// ===== PARTICLES =====
function spawnParticles(count,colors,x,y){
  const container=document.getElementById('particles');
  for(let i=0;i<count;i++){
    const p=document.createElement('div');
    p.className='particle';
    const size=Math.random()*6+3;
    const angle=Math.random()*360;
    const dist=Math.random()*120+40;
    const tx=Math.cos(angle*Math.PI/180)*dist;
    const ty=Math.sin(angle*Math.PI/180)*dist;
    const col=colors[Math.floor(Math.random()*colors.length)];
    p.style.cssText=`width:${size}px;height:${size}px;background:${col};left:${x||50}%;top:${y||50}%;margin-left:-${size/2}px;margin-top:-${size/2}px;box-shadow:0 0 ${size*2}px ${col};animation-duration:${Math.random()*0.6+0.4}s;animation-delay:${Math.random()*0.2}s;`;
    p.style.transform=`translate(${tx}px,${ty}px)`;
    container.appendChild(p);
    setTimeout(()=>p.remove(),1200);
  }
}
function flashScreen(color,opacity=0.6){
  const f=document.getElementById('flash-overlay');
  f.style.background=color;f.style.opacity=opacity;
  setTimeout(()=>{f.style.opacity=0;},80);
}

// ===== DATA =====
const ELEMENTS={
  food:{name:'土',emoji:'🌿',color:'#88cc44',bg:'rgba(136,204,68,0.15)'},
  drink:{name:'水',emoji:'💧',color:'#44aaff',bg:'rgba(68,170,255,0.15)'},
  sweets:{name:'炎',emoji:'🔥',color:'#ff8844',bg:'rgba(255,136,68,0.15)'},
  book:{name:'光',emoji:'✨',color:'#ffee44',bg:'rgba(255,238,68,0.15)'},
  daily:{name:'鉄',emoji:'⚙️',color:'#aaaaaa',bg:'rgba(170,170,170,0.15)'},
  unknown:{name:'闇',emoji:'🌑',color:'#cc88ff',bg:'rgba(204,136,255,0.15)'},
};
const UNIQUE_MONSTERS={
  '4901330':{name:'ポテトチップスマン',emoji:'🥔',element:'food',bonus:{patk:1.4,hp:0.8},rarity:'rare'},
  '4902102':{name:'コーラドラゴン',emoji:'🐉',element:'drink',bonus:{spd:1.5,pdef:0.7},rarity:'epic'},
  '4902777':{name:'チョコゴーレム',emoji:'🍫',element:'sweets',bonus:{pdef:1.6,spd:0.5},rarity:'rare'},
  '4910':{name:'マンガナイト',emoji:'📚',element:'book',bonus:{matk:1.6,patk:0.7},rarity:'epic'},
  '4901777':{name:'アクアサーペント',emoji:'🐍',element:'drink',bonus:{hp:1.3,matk:1.3},rarity:'rare'},
  '4902370':{name:'ポケモンカードゴースト',emoji:'👻',element:'unknown',bonus:{luck:2.0,evd:1.4},rarity:'legendary'},
};
const SKILL_POOL=[
  {name:'会心撃',emoji:'⚡',color:'#ffee44',type:'patk'},
  {name:'炎の息',emoji:'🔥',color:'#ff8844',type:'matk'},
  {name:'鉄壁',emoji:'🛡️',color:'#aaaaaa',type:'pdef'},
  {name:'魔法障壁',emoji:'💫',color:'#cc88ff',type:'mdef'},
  {name:'疾風',emoji:'💨',color:'#88ccff',type:'spd'},
  {name:'幸運の星',emoji:'⭐',color:'#ffcc00',type:'luck'},
  {name:'ドレイン',emoji:'🩸',color:'#ff4488',type:'hp'},
  {name:'毒牙',emoji:'☠️',color:'#88ff44',type:'patk'},
  {name:'雷撃',emoji:'⚡',color:'#44eeff',type:'matk'},
  {name:'聖光',emoji:'✨',color:'#ffffaa',type:'mdef'},
];
const PREFIXES=['暗黒','烈火','氷河','雷光','毒牙','鉄壁','神速','大地','深海','天空','業炎','霧幻'];
const SUFFIXES=['ウォーリア','ドラゴン','ゴーレム','ナイト','ウィザード','サーペント','フェニックス','スライム','ガーディアン','デーモン','タイタン','シャドウ'];

function detectCategory(code){
  const s=String(code);
  if(s.startsWith('978')||s.startsWith('979'))return'book';
  if(['45','49'].includes(s.substring(0,2))){
    const item=parseInt(s.substring(7,11)||'0');
    if(item<2000)return'food';
    if(item<4000)return'drink';
    if(item<6000)return'sweets';
    if(item<8000)return'daily';
    return'book';
  }
  if(parseInt(s.substring(0,2))<20)return'drink';
  return'unknown';
}
function hash32(str){
  let h=2166136261;
  for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=(h*16777619)>>>0;}
  return h;
}
function seededRand(seed,min,max){
  const h=hash32(String(seed));
  return min+((h%(max-min+1))+max-min+1)%(max-min+1);
}
function generateParams(barcodeStr,element){
  const d=barcodeStr.replace(/\D/g,'');
  if(d.length<4)return null;
  const base=h=>seededRand(d+'_'+h,0,100);
  const bias={
    food:{hp:1.3,pdef:1.1},drink:{mp:1.4,matk:1.2},sweets:{patk:1.3,spd:1.1},
    book:{matk:1.5,mdef:1.2,patk:0.7},daily:{pdef:1.4,mdef:1.3,spd:0.8},unknown:{luck:1.5,evd:1.3},
  }[element]||{};
  const b=(k,def)=>{const v=base(k)+def;return Math.round(v*(bias[k]||1));};
  return{hp:b('hp',80)*3+100,mp:b('mp',30)+40,patk:b('patk',20)+20,pdef:b('pdef',15)+15,
    matk:b('matk',20)+20,mdef:b('mdef',15)+15,hit:b('hit',50)+50,evd:b('evd',3)+3,spd:b('spd',8)+8,luck:b('luck',1)+1};
}
function calcRarity(params){
  const score=params.patk+params.matk+params.spd*1.5+params.luck*2+params.hp*0.05;
  if(score>220)return'legendary';if(score>170)return'epic';if(score>120)return'rare';return'common';
}
function generateSkills(params,rarity,barcode){
  const n={legendary:3,epic:2,rare:1,common:0}[rarity];
  if(!n)return[];
  const seed=hash32(barcode);
  return Array.from({length:n},(_,i)=>SKILL_POOL[(seed+i*7)%SKILL_POOL.length]);
}
function generateName(barcode){
  const h=hash32(barcode);
  return PREFIXES[h%PREFIXES.length]+SUFFIXES[(h>>4)%SUFFIXES.length];
}
async function summonMonster(code){
  const digits=String(code).replace(/\D/g,'');
  if(digits.length<4){showToast('バーコードが短すぎます');return null;}
  let unique=null;
  for(const prefix of Object.keys(UNIQUE_MONSTERS)){if(digits.startsWith(prefix)){unique=UNIQUE_MONSTERS[prefix];break;}}
  const element=unique?unique.element:detectCategory(digits);
  const params=generateParams(digits,element);
  if(!params)return null;
  if(unique){for(const[k,v]of Object.entries(unique.bonus)){if(params[k])params[k]=Math.round(params[k]*v);}}
  const rarity=unique?unique.rarity:calcRarity(params);
  const skills=generateSkills(params,rarity,digits);
  const name=unique?unique.name:generateName(digits);
  const emoji=unique?unique.emoji:ELEMENTS[element].emoji;
  return{id:Date.now(),name,emoji,rarity,element,params,skills,barcode:digits,product:null,lv:1,exp:0,hp:params.hp,mp:params.mp};
}

// ===== STATE =====
let collection=JSON.parse(localStorage.getItem('bbc_v2')||'[]');
let currentMonster=null;
let battlePlayer=null;
let isBattling=false;
let pendingBattleSlot=null;
let summonPending=null;

function saveCol(){localStorage.setItem('bbc_v2',JSON.stringify(collection));updateCollUI();}

// ===== SUMMON OVERLAY =====
function showSummonOverlay(monster){
  const ov=document.getElementById('summon-overlay');
  const circle=document.getElementById('summon-circle');
  circle.className='summon-circle '+monster.rarity;
  document.getElementById('summon-emoji').textContent=monster.emoji;
  document.getElementById('summon-name').textContent=monster.name;
  const rLabels={common:'COMMON',rare:'★ RARE',epic:'★★ EPIC',legendary:'★★★ LEGENDARY'};
  const rColors={common:'#778899',rare:'#3399ff',epic:'#cc44ff',legendary:'#ffaa00'};
  const rEl=document.getElementById('summon-rarity');
  rEl.textContent=rLabels[monster.rarity];rEl.style.color=rColors[monster.rarity];
  ov.style.display='flex';summonPending=monster;
  ({common:seCommon,rare:seRare,epic:seEpic,legendary:seLegendary}[monster.rarity]||seCommon)();
  const pColors={common:['#778899','#aabbcc'],rare:['#3399ff','#66ccff','#ffffff'],
    epic:['#cc44ff','#ff44cc','#ffffff','#aa88ff'],legendary:['#ffaa00','#ffcc44','#ffffff','#ff8800','#ffee88']}[monster.rarity];
  setTimeout(()=>spawnParticles(monster.rarity==='legendary'?60:monster.rarity==='epic'?40:20,pColors,50,40),200);
  if(monster.rarity==='legendary')flashScreen('#ffaa00',0.5);
  else if(monster.rarity==='epic')flashScreen('#cc44ff',0.35);
  else if(monster.rarity==='rare')flashScreen('#3399ff',0.25);
}
function closeSummon(){
  document.getElementById('summon-overlay').style.display='none';
  if(summonPending){renderScanResult(summonPending);summonPending=null;}
}

// ===== RENDER =====
function rarityLabel(r){return{common:'COMMON',rare:'RARE',epic:'EPIC',legendary:'LEGENDARY'}[r]||r;}
function renderMonsterCard(m,showAdd=true){
  const el=ELEMENTS[m.element]||ELEMENTS.unknown;
  const maxP=[['HP',m.hp||m.params.hp,m.params.hp],['MP',m.mp||m.params.mp,m.params.mp],
    ['物攻',m.params.patk,200],['物防',m.params.pdef,200],['魔攻',m.params.matk,200],['魔防',m.params.mdef,200],
    ['命中',m.params.hit,100],['回避',m.params.evd,50],['速度',m.params.spd,50],['運',m.params.luck,30]];
  const skillsHtml=m.skills.length?`<div class="skills-row">${m.skills.map(s=>`<span class="skill-badge">${s.emoji} ${s.name}</span>`).join('')}</div>`:'';
  const addBtn=showAdd?`<button class="btn btn-primary btn-full" style="margin-top:12px;font-size:0.78rem" onclick="addToCol(${m.id})">＋ 図鑑に追加</button>`:'';
  return`<div class="monster-card ${m.rarity} animIn">
    <div class="monster-header">
      <div class="monster-avatar ${m.rarity}">${m.emoji}</div>
      <div class="monster-info">
        <div class="monster-name">${m.name}<span class="lv-badge">Lv.${m.lv}</span></div>
        <div class="monster-sub">📦 ${m.product||m.barcode}</div>
        <div class="badge-row">
          <span class="badge ${m.rarity}">${rarityLabel(m.rarity)}</span>
          <span class="badge element" style="background:${el.bg};color:${el.color};border:1px solid ${el.color}">${el.emoji} ${el.name}</span>
        </div>
        <div class="barcode-digits">${m.barcode}</div>
      </div>
    </div>
    <div class="params-grid">
      ${maxP.map(([l,v,mx])=>`<div class="param-item"><div class="param-top"><div class="param-label">${l}</div><div class="param-value">${v}</div></div><div class="param-bar-bg"><div class="param-bar-fill" style="width:${Math.min(100,Math.round(v/mx*100))}%"></div></div></div>`).join('')}
    </div>
    ${skillsHtml}${addBtn}
  </div>`;
}
function renderScanResult(m){
  const already=collection.some(x=>x.barcode===m.barcode);
  document.getElementById('result-area').innerHTML=renderMonsterCard(m,!already);
}
function updateCollUI(){
  const grid=document.getElementById('coll-grid');
  document.getElementById('coll-count').textContent=collection.length;
  if(!collection.length){
    grid.innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="icon">📭</div><p>まだモンスターがいません<br>スキャンして召喚しよう！</p></div>';
    return;
  }
  grid.innerHTML=collection.map(m=>`<div class="coll-item ${m.rarity}" onclick="viewMonster(${m.id})"><div class="av">${m.emoji}</div><div class="nm">${m.name}</div><div class="lv">Lv.${m.lv}</div></div>`).join('');
}
function viewMonster(id){
  const m=collection.find(x=>x.id===id);if(!m)return;
  document.getElementById('result-area').innerHTML=renderMonsterCard(m,false)+
    `<button class="btn btn-danger btn-full" style="margin-top:8px;font-size:0.78rem" onclick="delMonster(${id})">🗑 削除</button>`;
  switchTab('scan');window.scrollTo(0,0);
}
function delMonster(id){
  collection=collection.filter(x=>x.id!==id);saveCol();
  document.getElementById('result-area').innerHTML='';showToast('削除しました');
}
function addToCol(id){
  if(collection.some(x=>x.id===id)){showToast('すでに図鑑にあります！');return;}
  if(!currentMonster||currentMonster.id!==id)return;
  collection.push(currentMonster);saveCol();
  showToast(`✨ ${currentMonster.name} を図鑑に追加！`);
  document.querySelectorAll('.btn-primary').forEach(b=>{if(b.textContent.includes('図鑑に追加'))b.remove();});
}

// ===== SCAN =====
async function processScan(code){
  const ra=document.getElementById('result-area');
  ra.innerHTML='<div style="text-align:center;padding:30px;color:var(--text-dim)"><div style="width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px"></div><p>召喚中...</p></div>';
  await new Promise(r=>setTimeout(r,600));
  const m=await summonMonster(code);
  if(!m){ra.innerHTML='<div class="empty-state"><div class="icon">❌</div><p>召喚失敗...<br>別のバーコードを試して！</p></div>';return;}
  currentMonster=m;showSummonOverlay(m);
}
function manualScan(){
  const v=document.getElementById('barcode-input').value.trim();
  if(!v){showToast('バーコードを入力してください');return;}
  processScan(v);
}

// ===== BATTLE =====
const CPU_POOL=[
  {name:'スライムキング',emoji:'👑',rarity:'rare',element:'unknown',params:{hp:280,mp:60,patk:55,pdef:35,matk:45,mdef:40,hit:78,evd:12,spd:18,luck:8},skills:[{name:'毒液',emoji:'☠️',color:'#88ff44',type:'patk'}],lv:3,barcode:'0000000'},
  {name:'ゴブリン',emoji:'👺',rarity:'common',element:'unknown',params:{hp:140,mp:25,patk:42,pdef:22,matk:18,mdef:18,hit:72,evd:18,spd:28,luck:4},skills:[],lv:1,barcode:'0000001'},
  {name:'ドラゴンパップ',emoji:'🐲',rarity:'epic',element:'drink',params:{hp:480,mp:140,patk:88,pdef:68,matk:82,mdef:62,hit:84,evd:22,spd:32,luck:18},skills:[{name:'炎の息',emoji:'🔥',color:'#ff8844',type:'matk'},{name:'鉄壁',emoji:'🛡️',color:'#aaaaaa',type:'pdef'}],lv:5,barcode:'0000002'},
  {name:'ダークウィザード',emoji:'🧙',rarity:'epic',element:'unknown',params:{hp:320,mp:200,patk:40,pdef:30,matk:110,mdef:90,hit:90,evd:20,spd:25,luck:25},skills:[{name:'雷撃',emoji:'⚡',color:'#44eeff',type:'matk'},{name:'魔法障壁',emoji:'💫',color:'#cc88ff',type:'mdef'}],lv:4,barcode:'0000003'},
];
let pState=null,cState=null;

function selectBattleMon(slot){
  if(!collection.length){showToast('まずモンスターを召喚しよう！');return;}
  pendingBattleSlot=slot;openModal();
}
function openModal(){
  const modal=document.getElementById('select-modal');
  document.getElementById('modal-grid').innerHTML=collection.map(m=>
    `<div class="coll-item ${m.rarity}" onclick="pickMon(${m.id})"><div class="av">${m.emoji}</div><div class="nm">${m.name}</div><div class="lv">Lv.${m.lv}</div></div>`
  ).join('');
  modal.style.display='block';
}
function closeModal(){document.getElementById('select-modal').style.display='none';}
function pickMon(id){
  const m=JSON.parse(JSON.stringify(collection.find(x=>x.id===id)));
  m.hp=m.params.hp;m.mp=m.params.mp;battlePlayer=m;
  const sl=document.getElementById('slot-player');
  sl.classList.add('filled');
  sl.innerHTML=`<div class="fl">あなた</div><div class="fav">${m.emoji}</div><div class="fnm">${m.name}</div>
    <div class="battle-hp-wrap"><div class="battle-hp-label"><span>HP</span><span id="php">${m.hp}</span></div>
    <div class="battle-hp-bg"><div class="battle-hp-fill" id="php-bar" style="width:100%"></div></div></div>`;
  closeModal();
}
function updateHP(el,barEl,cur,max){
  if(el)el.textContent=Math.max(0,cur);
  if(barEl){const pct=Math.max(0,Math.min(100,cur/max*100));barEl.style.width=pct+'%';barEl.style.backgroundPosition=pct>66?'0%':pct>33?'50%':'100%';}
}
async function startBattle(){
  if(!battlePlayer){showToast('モンスターを選択してください！');return;}
  if(isBattling)return;
  const cpu=JSON.parse(JSON.stringify(CPU_POOL[Math.floor(Math.random()*CPU_POOL.length)]));
  cpu.hp=cpu.params.hp;cpu.mp=cpu.params.mp;cpu.id=-1;
  const csl=document.getElementById('slot-cpu');
  csl.className='fighter-slot cpu-filled';
  csl.innerHTML=`<div class="fl">CPU</div><div class="fav">${cpu.emoji}</div><div class="fnm">${cpu.name}</div>
    <div class="battle-hp-wrap"><div class="battle-hp-label"><span>HP</span><span id="chp">${cpu.hp}</span></div>
    <div class="battle-hp-bg"><div class="battle-hp-fill" id="chp-bar" style="width:100%"></div></div></div>`;
  pState=JSON.parse(JSON.stringify(battlePlayer));
  cState=JSON.parse(JSON.stringify(cpu));
  isBattling=true;
  document.getElementById('battle-btn').textContent='⚔️ バトル中...';
  document.getElementById('battle-btn').disabled=true;
  const log=document.getElementById('battle-log');
  log.innerHTML='';
  const addLog=(text,cls='log-sys')=>{const d=document.createElement('div');d.className='log-line '+cls;d.textContent=text;log.appendChild(d);log.scrollTop=log.scrollHeight;};
  const delay=ms=>new Promise(r=>setTimeout(r,ms));
  addLog(`⚔️ ${pState.name} VS ${cState.name}！バトル開始！`,'log-sys');
  await delay(500);
  let turn=0;
  while(pState.hp>0&&cState.hp>0&&turn<40){
    turn++;addLog(`── ターン ${turn} ──`,'log-sys');await delay(300);
    const pSlot=document.getElementById('slot-player');
    pSlot.classList.add('attack-flash');setTimeout(()=>pSlot.classList.remove('attack-flash'),300);
    const pSkill=pState.skills.length&&Math.random()<0.25?pState.skills[Math.floor(Math.random()*pState.skills.length)]:null;
    if(pSkill){seSkill();showSkillEffect(pSkill);await delay(700);}
    const pHit=Math.random()*100<pState.params.hit;
    if(pHit){
      const useMag=pState.params.matk>pState.params.patk&&pState.mp>=10;
      let dmg;
      if(useMag){
        dmg=Math.max(1,Math.floor(pState.params.matk*(pSkill&&pSkill.type==='matk'?1.6:1)-cState.params.mdef*0.4+Math.random()*15));
        pState.mp=Math.max(0,pState.mp-10);seMagic();
        addLog(`✨ ${pState.name}の魔法！ ${cState.name}に${dmg}ダメージ！`,'log-mag');
      }else{
        dmg=Math.max(1,Math.floor(pState.params.patk*(pSkill&&pSkill.type==='patk'?1.6:1)-cState.params.pdef*0.4+Math.random()*12));
        seAttack();addLog(`⚔️ ${pState.name}の攻撃！ ${cState.name}に${dmg}ダメージ！`,'log-atk');
      }
      cState.hp=Math.max(0,cState.hp-dmg);
      const cslot=document.getElementById('slot-cpu');
      cslot.classList.add('shake','hit-flash');setTimeout(()=>cslot.classList.remove('shake','hit-flash'),400);
      spawnParticles(8,['#ff4466','#ff8844'],75,50);
      updateHP(document.getElementById('chp'),document.getElementById('chp-bar'),cState.hp,cState.params.hp);
    }else{seMiss();addLog(`💨 ${pState.name}の攻撃がはずれた！`,'log-miss');}
    await delay(500);if(cState.hp<=0)break;
    const cSlot2=document.getElementById('slot-cpu');
    cSlot2.classList.add('attack-flash');setTimeout(()=>cSlot2.classList.remove('attack-flash'),300);
    const cSkill=cState.skills.length&&Math.random()<0.25?cState.skills[Math.floor(Math.random()*cState.skills.length)]:null;
    const cHit=Math.random()*100<cState.params.hit;
    if(cHit){
      const dmg=Math.max(1,Math.floor(cState.params.patk*(cSkill?1.5:1)-pState.params.pdef*0.4+Math.random()*12));
      seAttack();addLog(`💢 ${cState.name}の攻撃！ ${pState.name}に${dmg}ダメージ！`,'log-atk');
      pState.hp=Math.max(0,pState.hp-dmg);
      const pslot=document.getElementById('slot-player');
      pslot.classList.add('shake','hit-flash');setTimeout(()=>pslot.classList.remove('shake','hit-flash'),400);
      spawnParticles(8,['#ff2244','#ff6644'],25,50);
      updateHP(document.getElementById('php'),document.getElementById('php-bar'),pState.hp,pState.params.hp);
    }else{seMiss();addLog(`💨 ${cState.name}の攻撃がはずれた！`,'log-miss');}
    await delay(400);
  }
  await delay(300);
  const won=pState.hp>0&&cState.hp<=0;
  const lost=pState.hp<=0&&cState.hp>0;
  if(won){
    seVictory();spawnParticles(50,['#ffcc00','#ffee88','#ffffff','#ff8800'],50,40);flashScreen('#ffaa00',0.4);
    const expGain=Math.floor(cState.params.hp/5+15);
    const orig=collection.find(x=>x.id===battlePlayer.id);
    if(orig){
      orig.exp=(orig.exp||0)+expGain;let lvUp=false;
      while(orig.exp>=orig.lv*100){orig.exp-=orig.lv*100;orig.lv++;lvUp=true;}
      saveCol();if(lvUp)setTimeout(()=>showToast(`⬆️ ${orig.name} Lv.${orig.lv}に！`),1500);
    }
    showResultOverlay(true,`${pState.name}の勝利！`,`経験値 +${expGain}`);
  }else if(lost){
    seDefeat();flashScreen('#ff0044',0.3);
    showResultOverlay(false,`${pState.name}は敗北した...`,'また挑戦しよう！');
  }else{addLog('🤝 引き分け！','log-win');}
  isBattling=false;
  document.getElementById('battle-btn').textContent='⚔️ もう一度！';
  document.getElementById('battle-btn').disabled=false;
}
function showSkillEffect(skill){
  const div=document.createElement('div');div.className='skill-effect';
  div.innerHTML=`<div class="skill-effect-text" style="color:${skill.color}">${skill.emoji} ${skill.name}！</div>`;
  document.body.appendChild(div);setTimeout(()=>div.remove(),900);
}
function showResultOverlay(win,title,sub){
  const ov=document.getElementById('result-overlay');
  const t=document.getElementById('result-title');
  t.textContent=win?'VICTORY!':'DEFEAT...';t.className='result-title '+(win?'win':'lose');
  document.getElementById('result-sub').textContent=title;
  document.getElementById('result-exp').textContent=sub;
  ov.style.display='flex';
}
function closeResult(){document.getElementById('result-overlay').style.display='none';}

// ===== UI UTILS =====
function switchTab(tab){
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',['scan','collection','battle'][i]===tab));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+tab).classList.add('active');
  if(tab==='collection')updateCollUI();
}
function showToast(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

// ===== INIT =====
const style=document.createElement('style');
style.textContent='@keyframes spin{to{transform:rotate(360deg)}}';
document.head.appendChild(style);
updateCollUI();
