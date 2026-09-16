(() => {
'use strict';
const VERSION = '0.4.0';
const $ = id => document.getElementById(id);
const FLATS = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const SHARPS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const IDX = {C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11};
const FLAT_ROOTS = new Set(['F','Bb','Eb','Ab','Db','Gb','Cb']);
const FEATURED_COMPOSERS = [
  ['Pixinguinha','PIX','O mestre do choro'],
  ['Jacob do Bandolim','JAC','A melodia em estado puro'],
  ['Waldir Azevedo','WAL','O cavaquinho em primeiro plano'],
  ['Ernesto Nazareth','NAZ','Piano que virou roda'],
  ['Zequinha de Abreu','ZEA','Alegria que atravessou gerações'],
  ['Luiz Bonfá','BON','Canção e violão brasileiro']
];
let selected = null, targetRoot = 'C', currentFilter = 'all', editingId = null, wakeLock = null;
let homeView = 'start', rodaSectionIndex = 0, swipeStartX = null;

function esc(v){return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function root(k){const m=String(k||'').trim().match(/^([A-G])([#b]?)/);return m?m[1]+(m[2]||''):'C'}
function isMinor(k){return /^([A-G][#b]?)m(?!aj)/.test(String(k||''))}
function displayKey(r,base){return r+(isMinor(base)?'m':'')}
function prefersFlats(k){return FLAT_ROOTS.has(root(k))}
function distance(a,b){return ((IDX[root(b)]??0)-(IDX[root(a)]??0)+12)%12}
function transposeNote(n,semitones,useFlats){const i=IDX[n];if(i==null)return n;return (useFlats?FLATS:SHARPS)[(i+semitones+120)%12]}
function transposeChord(raw,from,to){if(!raw||raw==='%'||raw==='—'||raw==='N.C.'||raw==='NC')return raw;const par=raw.match(/^\((.+)\)$/);if(par)return '('+transposeChord(par[1],from,to)+')';const m=raw.match(/^([A-G])([#b]?)(.*?)(?:\/([A-G])([#b]?))?$/);if(!m)return raw;const semis=distance(from,to),flats=prefersFlats(to),rr=transposeNote(m[1]+(m[2]||''),semis,flats),bb=m[4]?transposeNote(m[4]+(m[5]||''),semis,flats):'';return rr+(m[3]||'')+(bb?'/'+bb:'')}
function parseChart(text){const sections=[];let cur=null;String(text||'').split(/\n/).forEach(raw=>{const line=raw.trim();if(!line)return;const h=line.match(/^\[(.+?)\]$/);if(h){cur={name:h[1].trim(),measures:[]};sections.push(cur);return}if(!cur){cur={name:'A',measures:[]};sections.push(cur)}line.split('|').map(x=>x.trim()).filter(Boolean).forEach(cell=>{const bits=cell.split('::'),music=bits.shift().trim(),annotation=bits.join('::').trim();cur.measures.push({chords:music.split(/\s+/).filter(Boolean),annotation})})});return sections}
function hydrate(s){return {...s,sections:s.sections||parseChart(s.chart)}}
const OFFICIAL=(window.RODA_LIBRARY||[]).map(hydrate);
function getUserSongs(){try{return (JSON.parse(localStorage.getItem('roda.userSongs')||'[]')||[]).map(hydrate)}catch{return []}}
function saveUserSongs(v){localStorage.setItem('roda.userSongs',JSON.stringify(v))}
function allSongs(){return [...OFFICIAL,...getUserSongs()]}
function getIds(key){try{return JSON.parse(localStorage.getItem(key)||'[]')||[]}catch{return []}}
function setIds(key,v){localStorage.setItem(key,JSON.stringify(v))}
function favorites(){return getIds('roda.favorites')}
function setlist(){return getIds('roda.setlist')}
function contains(arr,id){return arr.includes(id)}
function toggleId(key,id){const a=getIds(key),i=a.indexOf(id);i>=0?a.splice(i,1):a.push(id);setIds(key,a);renderLibrary();if(selected?.id===id)updateDetailButtons()}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),1400)}
function show(id){['home','detail','editor','roda'].forEach(x=>$(x).classList.toggle('hidden',x!==id));window.scrollTo({top:0,behavior:'auto'})}

function composerCount(name){return allSongs().filter(s=>s.composer.toLowerCase().includes(name.toLowerCase())).length}
function renderComposers(){
  const cards=$('composerCards'),list=$('composerList');cards.innerHTML='';list.innerHTML='';
  const items=FEATURED_COMPOSERS.map(([name,mono,desc],i)=>({name,mono,desc,count:composerCount(name),tone:i%4})).filter(x=>x.count>0);
  $('composerCount').textContent=`${items.length} nomes`;
  items.slice(0,4).forEach(x=>{
    const b=document.createElement('button');b.className=`composer-card tone-${x.tone}`;
    b.innerHTML=`<span class="composer-portrait"><b>${esc(x.mono)}</b><i></i></span><strong>${esc(x.name)}</strong><small>${x.count} ${x.count===1?'música':'músicas'}</small>`;
    b.addEventListener('click',()=>openComposer(x.name));cards.appendChild(b);
  });
  items.forEach(x=>{
    const b=document.createElement('button');b.className=`composer-row tone-${x.tone}`;
    b.innerHTML=`<span class="composer-monogram">${esc(x.mono)}</span><span><strong>${esc(x.name)}</strong><small>${esc(x.desc)}</small></span><em>${x.count}</em><i>›</i>`;
    b.addEventListener('click',()=>openComposer(x.name));list.appendChild(b);
  });
}
function openComposer(name){$('searchInput').value=name;currentFilter='all';setHomeView('repertoire');renderLibrary();setTimeout(()=>$('libraryArea').scrollIntoView({behavior:'smooth',block:'start'}),50)}
function setHomeView(view){homeView=view;document.querySelectorAll('.home-tab').forEach(b=>b.classList.toggle('active',b.dataset.homeView===view));
  $('heroArea').classList.toggle('hidden',view!=='start');$('composerSection').classList.toggle('hidden',view==='repertoire'||view==='lists');$('featureSection').classList.toggle('hidden',view==='repertoire'||view==='composers');$('composerDirectory').classList.toggle('hidden',view!=='composers');$('libraryArea').classList.toggle('hidden',view==='composers');
  if(view==='lists'){currentFilter='favorites';document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.filter==='favorites'))}else if(view==='repertoire'){currentFilter='all';document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'))}
  renderLibrary();
}
function filterSong(s,q,favs,set){const text=(s.title+' '+s.composer).toLowerCase();if(q&&!text.includes(q))return false;if(currentFilter==='favorites')return contains(favs,s.id);if(currentFilter==='setlist')return contains(set,s.id);if(currentFilter==='mine')return !s.official||s.personalBase;return true}
function renderLibrary(){const q=$('searchInput').value.toLowerCase().trim(),favs=favorites(),set=setlist(),songs=allSongs().filter(s=>filterSong(s,q,favs,set));$('songCount').textContent=`${songs.length} ${songs.length===1?'música':'músicas'}`;const list=$('songList');list.innerHTML='';if(!songs.length){list.innerHTML='<div class="empty"><h3>Nada por aqui.</h3><p>Mude o filtro, procure outro nome ou use o botão + para criar sua cifra.</p></div>';return}songs.forEach((s,index)=>{const card=document.createElement('div');card.className='song-card';card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`Abrir ${s.title}`);card.innerHTML=`<div class="song-cover cover-${index%4}"><span>${esc(sectionBadge({name:(s.sections?.[0]?.name||'A')},0).slice(0,2))}</span><i></i></div><div class="song-copy"><div class="song-name">${esc(s.title)}${s.official?'<span class="badge">BASE</span>':s.personalBase?'<span class="badge">SEU</span>':''}</div><div class="song-composer">${esc(s.composer)}</div><div class="song-meta">${esc(s.baseKey)} · ${esc(s.meter)} · ${esc(s.status||'Minha versão')}</div></div><div class="song-actions"><button class="icon-mini fav" aria-label="Favorito">${contains(favs,s.id)?'★':'☆'}</button><button class="icon-mini set" aria-label="Roda de hoje">${contains(set,s.id)?'✓':'＋'}</button><button class="icon-mini open" aria-label="Abrir">›</button></div>`;const open=()=>openSong(s);card.addEventListener('click',open);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});card.querySelector('.fav').addEventListener('click',e=>{e.stopPropagation();toggleId('roda.favorites',s.id)});card.querySelector('.set').addEventListener('click',e=>{e.stopPropagation();toggleId('roda.setlist',s.id)});card.querySelector('.open').addEventListener('click',e=>{e.stopPropagation();open()});list.appendChild(card)})}

function openSong(s){selected=hydrate(s);targetRoot=root(selected.baseKey);renderDetail();show('detail')}
function renderKeyStrip(){const names=prefersFlats(targetRoot)?FLATS:SHARPS,wrap=$('keyStrip');wrap.innerHTML='';names.forEach(k=>{const b=document.createElement('button');b.textContent=displayKey(k,selected.baseKey);if(k===targetRoot)b.classList.add('active');b.addEventListener('click',()=>{targetRoot=k;renderDetail()});wrap.appendChild(b)})}
function sectionBadge(sec,index){const n=String(sec?.name||'').toUpperCase();if(n==='A'||n.startsWith('A ')||n.startsWith('A·')||n.startsWith('A ·'))return 'A';if(n==='B'||n.startsWith('B ')||n.startsWith('B·')||n.startsWith('B ·'))return 'B';if(n==='C'||n.startsWith('C ')||n.startsWith('C·')||n.startsWith('C ·'))return 'C';if(n.includes('PARTE MAIOR'))return 'A';if(n.includes('PARTE MENOR'))return 'B';if(n.includes('INTRO'))return 'Intro';if(n.includes('CODA'))return 'Coda';return sec?.name||String(index+1)}
function sectionTone(index,badge){if(badge==='A')return 'tone-a';if(badge==='B')return 'tone-b';if(badge==='C')return 'tone-c';if(String(badge).toLowerCase().includes('coda'))return 'tone-coda';return ['tone-a','tone-b','tone-c','tone-d'][index%4]}
function sectionRepeat(song,sec,badge){const anns=sec.measures.map(m=>m.annotation||'').join(' ').toLowerCase();if(anns.includes('1ª casa')&&anns.includes('2ª casa'))return 2;const f=String(song.form||'').toUpperCase().replace(/\s+/g,' '),b=String(badge).toUpperCase();if(['A','B','C'].includes(b)){if(new RegExp(`\\b${b}\\s*\\(2X\\)`).test(f)||new RegExp(`\\b${b}\\s+${b}\\b`).test(f))return 2}return null}
function sameMeasure(a,b){if(!a||!b||a.annotation||b.annotation)return false;return a.chords.join('§')===b.chords.join('§')&&a.chords.join('§')!=='%'}
function displayChords(m,prev,song){const chords=sameMeasure(m,prev)?['%']:m.chords;return chords.map(c=>esc(transposeChord(c,song.baseKey,targetRoot))).join('<span class="chord-gap"></span>')||'—'}
function renderChart(container,song){container.innerHTML='';song.sections.forEach((sec,si)=>{const badge=sectionBadge(sec,si),tone=sectionTone(si,badge),repeat=sectionRepeat(song,sec,badge),block=document.createElement('section');block.className=`chart-part ${tone}`;const measures=sec.measures;block.innerHTML=`<header class="chart-part-head"><span class="part-badge">${esc(badge)}</span><div><strong>${esc(sec.name)}</strong><small>${measures.length} ${measures.length===1?'compasso':'compassos'}</small></div>${repeat?`<em>${repeat}x</em>`:''}</header><div class="part-measures"></div>`;const grid=block.querySelector('.part-measures');measures.forEach((m,mi)=>{const cell=document.createElement('div');cell.className='measure-line';cell.innerHTML=`<span class="measure-no">${mi+1}</span><div class="chords">${displayChords(m,measures[mi-1],song)}</div>${m.annotation?`<div class="annotation">${esc(m.annotation)}</div>`:''}`;grid.appendChild(cell)});container.appendChild(block)})}
function updateDetailButtons(){const fav=contains(favorites(),selected.id);$('favoriteBtn').textContent=(fav?'★':'☆')+' Favorito';$('favoriteTop').textContent=fav?'♥':'♡';$('setlistBtn').textContent=(contains(setlist(),selected.id)?'✓':'＋')+' Roda de hoje';$('editBtn').textContent=selected.official?'Duplicar para editar':'Editar'}
function renderSources(){$('sourceText').textContent=selected.source||'Cifra criada neste aparelho.';$('songNotes').textContent=selected.notes||'';const links=$('sourceLinks');links.innerHTML='';(selected.sources||[]).forEach(([label,url])=>{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent=label;links.appendChild(a)})}
function renderDetail(){$('detailTitle').textContent=selected.title;$('detailComposer').textContent=selected.composer;const tags=$('detailTags');tags.innerHTML='';['Choro',selected.meter,selected.form||'Instrumental'].forEach(v=>{const s=document.createElement('span');s.textContent=v;tags.appendChild(s)});const k=displayKey(targetRoot,selected.baseKey);$('currentKey').textContent=k;$('baseKeyLabel').textContent='Tom-base: '+selected.baseKey;$('statusLabel').textContent=selected.status||'Minha versão';renderKeyStrip();renderChart($('chart'),selected);renderSources();updateDetailButtons()}
function changeKey(step){const i=IDX[targetRoot]??0,next=(i+step+12)%12;targetRoot=(prefersFlats(targetRoot)?FLATS:SHARPS)[next];renderDetail()}
function changeFont(step){let v=parseInt(localStorage.getItem('roda.font')||'18',10)+step;v=Math.max(14,Math.min(28,v));localStorage.setItem('roda.font',v);document.documentElement.style.setProperty('--chord-size',v+'px');toast(`Cifra ${v}px`)}
function cycleColumns(){let v=parseInt(localStorage.getItem('roda.cols')||'4',10);v=v===4?3:v===3?2:4;localStorage.setItem('roda.cols',v);document.documentElement.style.setProperty('--cols',v);toast(`${v} compassos por linha`)}

function renderRodaPart(){if(!selected)return;const sections=selected.sections,sec=sections[rodaSectionIndex],badge=sectionBadge(sec,rodaSectionIndex),repeat=sectionRepeat(selected,sec,badge);$('rodaPartBadge').textContent=badge;$('rodaProgress').textContent=`${rodaSectionIndex+1} / ${sections.length}`;$('rodaComposer').textContent=selected.composer;$('rodaKey').textContent=displayKey(targetRoot,selected.baseKey);const grid=$('rodaPartGrid');grid.innerHTML='';grid.className=`roda-part-grid ${sectionTone(rodaSectionIndex,badge)} ${sec.measures.length>32?'dense':''}`;sec.measures.forEach((m,mi)=>{const cell=document.createElement('div');cell.className='roda-measure';const chords=displayChords(m,sec.measures[mi-1],selected);cell.innerHTML=`<span class="roda-no">${mi+1}</span><div class="roda-chords">${chords}</div>${m.annotation?`<div class="roda-annotation">${esc(m.annotation)}</div>`:''}`;grid.appendChild(cell)});const r=$('rodaRepeat');r.classList.toggle('hidden',!repeat);r.textContent=repeat?`⟲ repetir ${repeat}x`:'';const dots=$('rodaDots');dots.innerHTML='';sections.forEach((_,i)=>{const d=document.createElement('button');d.setAttribute('aria-label',`Parte ${i+1}`);if(i===rodaSectionIndex)d.classList.add('active');d.addEventListener('click',()=>{rodaSectionIndex=i;renderRodaPart()});dots.appendChild(d)});$('rodaPrev').disabled=sections.length<2;$('rodaNext').disabled=sections.length<2}
function moveRoda(delta){const n=selected.sections.length;rodaSectionIndex=(rodaSectionIndex+delta+n)%n;renderRodaPart()}
async function enterRoda(){rodaSectionIndex=0;$('rodaTitle').textContent=selected.title;renderRodaPart();show('roda');try{if('wakeLock'in navigator)wakeLock=await navigator.wakeLock.request('screen')}catch{}}
async function leaveRoda(){try{if(wakeLock)await wakeLock.release()}catch{}wakeLock=null;renderDetail();show('detail')}

function serialize(sections){return sections.map(s=>'['+s.name+']\n'+s.measures.map(m=>m.chords.join(' ')+(m.annotation?' :: '+m.annotation:'')).join(' | ')).join('\n\n')}
function openEditor(song=null){const editable=song&&!song.official?song:null;editingId=editable?.id||null;$('editorTitle').textContent=editable?'Editar cifra':song?.official?'Duplicar cifra':'Nova cifra';$('editTitle').value=song?.title||'';$('editComposer').value=song?.composer||'';$('editKey').value=song?.baseKey||'C';$('editMeter').value=song?.meter||'2/4';$('editForm').value=song?.form||'';$('editChart').value=song?serialize(song.sections):'[A]\nC | A7 | Dm7 G7 | C\n\n[B]\nF | Fm6 | C A7 | Dm7 G7';previewEditor();show('editor')}
function previewEditor(){const sections=parseChart($('editChart').value),temp={baseKey:$('editKey').value||'C',sections,form:$('editForm').value||''},old=targetRoot;targetRoot=root(temp.baseKey);renderChart($('preview'),temp);targetRoot=old;$('previewCount').textContent=sections.reduce((n,s)=>n+s.measures.length,0)+' compassos'}
function saveEditedSong(){const title=$('editTitle').value.trim(),sections=parseChart($('editChart').value);if(!title)return alert('Dê um título para a música.');if(!sections.some(s=>s.measures.length))return alert('Adicione pelo menos um compasso.');const users=getUserSongs(),obj={id:editingId||'user-'+Date.now(),official:false,title,composer:$('editComposer').value.trim()||'Não informado',baseKey:$('editKey').value.trim()||'C',meter:$('editMeter').value.trim()||'2/4',form:$('editForm').value.trim(),status:'Minha versão',source:'Cifra criada/alterada por você neste aparelho.',notes:'',sources:[],sections};const i=users.findIndex(x=>x.id===obj.id);if(i>=0)users[i]=obj;else users.push(obj);saveUserSongs(users);selected=obj;targetRoot=root(obj.baseKey);renderComposers();renderLibrary();renderDetail();show('detail');toast('Música salva')}
function setFilter(f){currentFilter=f;document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.filter===f));renderLibrary()}

$('searchInput').addEventListener('input',()=>{if(homeView==='composers')setHomeView('repertoire');renderLibrary()});
$('addSong').addEventListener('click',()=>openEditor());
$('backHome').addEventListener('click',()=>{renderComposers();renderLibrary();show('home')});
$('rodaMode').addEventListener('click',enterRoda);$('closeRoda').addEventListener('click',leaveRoda);
$('keyDown').addEventListener('click',()=>changeKey(-1));$('keyUp').addEventListener('click',()=>changeKey(1));$('fontDown').addEventListener('click',()=>changeFont(-2));$('fontUp').addEventListener('click',()=>changeFont(2));$('layoutBtn').addEventListener('click',cycleColumns);
$('favoriteBtn').addEventListener('click',()=>toggleId('roda.favorites',selected.id));$('favoriteTop').addEventListener('click',()=>toggleId('roda.favorites',selected.id));$('setlistBtn').addEventListener('click',()=>toggleId('roda.setlist',selected.id));$('editBtn').addEventListener('click',()=>openEditor(selected));
$('cancelEdit').addEventListener('click',()=>selected?show('detail'):show('home'));$('saveSong').addEventListener('click',saveEditedSong);$('editChart').addEventListener('input',previewEditor);$('editKey').addEventListener('input',previewEditor);$('editForm').addEventListener('input',previewEditor);
document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.filter)));
document.querySelectorAll('.home-tab').forEach(b=>b.addEventListener('click',()=>setHomeView(b.dataset.homeView)));
$('heroExplore').addEventListener('click',()=>{setHomeView('repertoire');setTimeout(()=>$('libraryArea').scrollIntoView({behavior:'smooth',block:'start'}),50)});
$('seeAllComposers').addEventListener('click',()=>setHomeView('composers'));$('seeAllRepertoire').addEventListener('click',()=>setHomeView('repertoire'));
document.querySelectorAll('.feature-card').forEach(b=>b.addEventListener('click',()=>{const f=b.dataset.feature;if(f==='all'){setHomeView('repertoire');setFilter('all')}else{setHomeView('lists');setFilter(f)}}));
$('rodaPrev').addEventListener('click',()=>moveRoda(-1));$('rodaNext').addEventListener('click',()=>moveRoda(1));
$('rodaViewport').addEventListener('touchstart',e=>{swipeStartX=e.changedTouches[0].clientX},{passive:true});$('rodaViewport').addEventListener('touchend',e=>{if(swipeStartX==null)return;const dx=e.changedTouches[0].clientX-swipeStartX;swipeStartX=null;if(Math.abs(dx)>55)moveRoda(dx<0?1:-1)},{passive:true});

document.documentElement.style.setProperty('--chord-size',(localStorage.getItem('roda.font')||18)+'px');document.documentElement.style.setProperty('--cols',localStorage.getItem('roda.cols')||4);
renderComposers();renderLibrary();previewEditor();
if('serviceWorker'in navigator){window.addEventListener('load',async()=>{try{const reg=await navigator.serviceWorker.register('./sw.js?v=4');reg.update()}catch{}})}
console.info('RODA',VERSION);
})();
