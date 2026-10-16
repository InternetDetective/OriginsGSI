const conquestDrafts=Array.from({length:3},(_,i)=>({name:'Deck '+(i+1),notes:'',cards:{},source:null}));
let conquestTarget=0,conquestUndo=null,conquestLoadedUser=null;
function conquestStorageKey(){return 'origins-conquest-builder-'+communityUser?.id}
function rememberConquest(){if(!communityUser)return;try{localStorage.setItem(conquestStorageKey(),JSON.stringify(conquestDrafts))}catch{conquestMessage('Could not keep a local draft. Save decks to the database before closing.')}}
function conquestMessage(s){$('cqMessage').textContent=s}
function snapshotConquest(){conquestUndo=JSON.stringify(conquestDrafts);$('cqUndo').disabled=false}
function sharedMembership(key){return conquestDrafts.map((d,i)=>d.cards[key]?i+1:null).filter(Boolean)}
function conquestAdd(key){const d=conquestDrafts[conquestTarget];if(d.cards[key])return;if(!isLegend(key)&&Object.keys(d.cards).filter(k=>!isLegend(k)).length>=12){conquestMessage('Deck '+(conquestTarget+1)+' already has 12 pairs. Remove a pair first.');return}snapshotConquest();if(isLegend(key))for(const k of Object.keys(d.cards))if(isLegend(k))delete d.cards[k];d.cards[key]=isLegend(key)?1:2;rememberConquest();renderConquestBuilder()}
function renderConquestBuilder(){
 const report=validateLineup(conquestDrafts);
 $('cqValidation').innerHTML='<strong class="'+(report.errors.length?'':'cq-valid')+'">'+(report.errors.length?'Lineup needs attention':'✓ Conquest-ready')+'</strong><div>'+report.errors.map(esc).join('<br>')+'</div><div class="cq-pairs">'+report.pairs.map(p=>'<span class="'+(p.count>4?'cq-over':'')+'">Deck '+(p.a+1)+' ↔ '+(p.b+1)+': '+p.count+'/4 pairs</span>').join('')+'</div>';
 $('cqDownload').disabled=report.errors.length>0;
 for(let i=0;i<3;i++){
 const d=conquestDrafts[i],legend=Object.keys(d.cards).find(isLegend),regular=Object.keys(d.cards).filter(k=>!isLegend(k));
 $('cqTarget'+i).setAttribute('aria-pressed',String(i===conquestTarget));$('cqDeck'+i).classList.toggle('cq-active',i===conquestTarget);
 if(document.activeElement!==$('cqName'+i))$('cqName'+i).value=d.name;
 const renderSlot=key=>{if(!key)return '<div class="cq-empty">Empty pair</div>';const c=cards.find(c=>c.key===key);const membership=sharedMembership(key);const over=membership.length>1&&report.pairs.some(p=>p.count>4&&d.cards[key]&&conquestDrafts[p.a].cards[key]&&conquestDrafts[p.b].cards[key]&&(p.a===i||p.b===i));return '<div class="cq-card '+(membership.length>1?'cq-shared ':'')+(over?'cq-conflict':'')+'">'+(c?.image?'<img src="'+esc(c.image)+'" alt="'+esc(c.name)+'" loading="lazy" referrerpolicy="no-referrer">':'<span>'+esc(c?.name||key)+'</span>')+'<span class="cq-members">'+(membership.length>1?'Shared '+membership.join(' · '):isLegend(key)?'Legendary':'×2')+'</span><button data-cq-remove="'+key+'" data-cq-deck="'+i+'" aria-label="Remove '+esc(c?.name||key)+' from deck '+(i+1)+'">×</button></div>'};
 $('cqCards'+i).innerHTML='<div class="cq-legend">'+(legend?renderSlot(legend):'<div class="cq-empty">Choose a Legendary</div>')+'</div><div class="cq-grid">'+Array.from({length:12},(_,j)=>renderSlot(regular[j])).join('')+'</div>';
 $('cqCount'+i).textContent=regular.length+'/12 pairs · '+(legend?'1':'0')+'/1 Legendary';
 $('cqLoad'+i).innerHTML='<option value="">Load saved / favorite…</option>'+saved.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');
 $('cqSave'+i).textContent=d.source?'Save changes':'Save deck';
 $('cqCurve'+i).innerHTML=curveImage(d);
 }
 renderConquestCatalog();
}
function renderConquestCatalog(){const term=$('cqSearch').value.toLowerCase().trim(),kind=$('cqKind').value;const list=cards.filter(c=>(!kind||(kind==='Legendary'?c.rarity==='Legendary':c.rarity!=='Legendary'))&&term.split(/\s+/).filter(Boolean).every(t=>[c.name,c.text,c.alignment,c.rarity,c.type].join(' ').toLowerCase().includes(t)));
 $('cqCatalog').innerHTML=list.map(c=>{const membership=sharedMembership(c.key);return '<button class="cq-pick" data-cq-add="'+esc(c.key)+'" '+(conquestDrafts[conquestTarget].cards[c.key]?'disabled':'')+' title="Add '+esc(c.name)+' to Deck '+(conquestTarget+1)+'">'+(c.image?'<img src="'+esc(c.image)+'" alt="'+esc(c.name)+'" loading="lazy" referrerpolicy="no-referrer">':'')+'<span>'+esc(c.name)+'</span><small>'+c.mana+' mana · '+(c.rarity==='Legendary'?'Legendary':'Pair')+(membership.length?' · In '+membership.join(', '):'')+'</small></button>'}).join('');
 $('cqTargetLabel').textContent='Adding cards to Deck '+(conquestTarget+1);
}
async function saveConquestDeck(i){const d=conquestDrafts[i];try{if(!communityUser)throw Error('Choose your username first.');if(!Object.keys(d.cards).length)throw Error('Add cards before saving.');$('cqSave'+i).disabled=true;const values={name:d.name.trim()||'Deck '+(i+1),notes:d.notes,cards:d.cards,creator_name:communityUser.username,owner_id:communityUser.id};const q=d.source?communityClient.from('decklists_decks').update(values).eq('id',d.source).eq('owner_id',communityUser.id):communityClient.from('decklists_decks').insert(values);const {data,error}=await q.select('id').single();if(error)throw error;d.source=data.id;rememberConquest();const favorite=await communityClient.from('decklists_stars').upsert({profile_id:communityUser.id,deck_id:data.id},{onConflict:'profile_id,deck_id'});if(favorite.error)throw Error('Deck saved, but favoriting failed. Try Favorite on the Decks page.');await loadCommunity();conquestMessage('Deck '+(i+1)+' saved and favorited.');renderConquestBuilder()}catch(e){conquestMessage(e.message)}finally{$('cqSave'+i).disabled=false}}
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;const x=b.dataset;
 if(x.cqTarget!==undefined){conquestTarget=+x.cqTarget;renderConquestBuilder()}
 if(x.cqAdd)conquestAdd(x.cqAdd);
 if(x.cqRemove){snapshotConquest();delete conquestDrafts[+x.cqDeck].cards[x.cqRemove];rememberConquest();renderConquestBuilder()}
 if(x.cqSave!==undefined)await saveConquestDeck(+x.cqSave);
 if(x.cqImport!==undefined){const i=+x.cqImport;try{const list=await parseGameCode($('cqCode'+i).value);if(Object.keys(conquestDrafts[i].cards).length&&!confirm('Replace Deck '+(i+1)+' in this workspace? Database decks are unchanged.'))return;snapshotConquest();conquestDrafts[i].cards=list;conquestDrafts[i].source=null;rememberConquest();renderConquestBuilder();conquestMessage('Imported Deck '+(i+1)+'.')}catch(err){conquestMessage(err.message)}}
 if(x.cqExport!==undefined){const i=+x.cqExport;try{const code=await makeGameCode(conquestDrafts[i].cards);$('cqCode'+i).value=code;try{await navigator.clipboard.writeText(code);conquestMessage('Deck '+(i+1)+' code copied.')}catch{prompt('Copy deck code:',code)}}catch(err){conquestMessage(err.message)}}
 if(x.cqClear!==undefined&&confirm('Clear this workspace deck? Saved decks are unchanged.')){snapshotConquest();const i=+x.cqClear;conquestDrafts[i]={name:'Deck '+(i+1),notes:'',cards:{},source:null};rememberConquest();renderConquestBuilder()}
});
for(let i=0;i<3;i++){
 $('cqName'+i).oninput=()=>{conquestDrafts[i].name=$('cqName'+i).value;rememberConquest()};
 $('cqNotes'+i).oninput=()=>{conquestDrafts[i].notes=$('cqNotes'+i).value;rememberConquest()};
 $('cqLoad'+i).onchange=()=>{const id=$('cqLoad'+i).value;if(!id)return;const d=saved.find(x=>x.id===id);if(!d)return;if(Object.keys(conquestDrafts[i].cards).length&&!confirm('Replace this workspace deck?'))return;snapshotConquest();const remote=communityRows.find(x=>'cloud-'+x.id===id);conquestDrafts[i]={name:d.name,notes:d.notes||'',cards:normalize(d.cards),source:remote?.owner_id===communityUser?.id?remote.id:null};$('cqNotes'+i).value=d.notes||'';rememberConquest();renderConquestBuilder()};
}
$('cqSearch').oninput=renderConquestCatalog;$('cqKind').onchange=renderConquestCatalog;
$('cqUndo').onclick=()=>{if(!conquestUndo)return;const restore=JSON.parse(conquestUndo);restore.forEach((d,i)=>{conquestDrafts[i]=d;$('cqNotes'+i).value=d.notes});conquestUndo=null;$('cqUndo').disabled=true;rememberConquest();renderConquestBuilder()};
$('cqDownload').onclick=()=>{if(validateLineup(conquestDrafts).errors.length)return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({format:'Conquest',sharedPairsLimit:4,decks:conquestDrafts.map(({source,...d})=>d)},null,2)],{type:'application/json'}));a.download='conquest-lineup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('conquestTab').onclick=()=>{showView('conquest');if(communityUser&&conquestLoadedUser!==communityUser.id){conquestLoadedUser=communityUser.id;try{const old=JSON.parse(localStorage.getItem(conquestStorageKey())||'null');if(Array.isArray(old)&&old.length===3)old.forEach((d,i)=>{if(typeof d.name==='string'&&d.cards){conquestDrafts[i]={name:d.name.slice(0,80),notes:String(d.notes||'').slice(0,1000),cards:normalize(d.cards),source:communityRows.some(x=>x.id===d.source&&x.owner_id===communityUser.id)?d.source:null};$('cqNotes'+i).value=conquestDrafts[i].notes}})}catch{}}renderConquestBuilder()};
const beforeConquestLoad=loadCommunity;loadCommunity=async function(){await beforeConquestLoad();if(!$('conquest').hidden)renderConquestBuilder()};
