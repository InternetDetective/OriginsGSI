/* Rich shared previews and database-first saving. */
function completeDeck(d){try{checkGameDeck(d.cards);return true}catch{return false}}
function curveImage(d){
 const bins=Array(11).fill(0);for(const[k,n]of Object.entries(d.cards)){const c=cards.find(c=>c.key===k);if(c)bins[Math.min(10,c.mana)]+=n}
 const max=Math.max(1,...bins);const svg='<svg xmlns="http://www.w3.org/2000/svg" width="352" height="128" viewBox="0 0 352 128"><rect width="352" height="128" rx="10" fill="#0d1421"/><text x="12" y="18" fill="#bcc9df" font-family="sans-serif" font-size="12">Mana curve · individual copies</text>'+bins.map((n,i)=>'<rect x="'+(13+i*30)+'" y="'+(94-n/max*54)+'" width="20" height="'+Math.max(1,n/max*54)+'" rx="3" fill="#a184f5"/><text x="'+(23+i*30)+'" y="'+(88-n/max*54)+'" text-anchor="middle" fill="#edf1fa" font-family="sans-serif" font-size="10">'+(n||'')+'</text><text x="'+(23+i*30)+'" y="113" text-anchor="middle" fill="#bcc9df" font-family="sans-serif" font-size="10">'+(i===10?'10+':i)+'</text>').join('')+'</svg>';
 return '<img class="deck-curve-image" alt="Mana curve: '+esc(bins.map((n,i)=>i+' mana '+n+' copies').join(', '))+'" src="data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)+'">';
}

function deckSearchText(d){return [d.name,d.notes,d.creator_name,...Object.keys(d.cards).map(k=>{const c=cards.find(c=>c.key===k);return c?[c.name,c.rarity,c.alignment,c.type,c.text.replace(/<[^>]*>/g,' ')].join(' '):k})].join(' ').toLowerCase()}
renderCommunity=function(){
 const term=$('communitySearch').value.toLowerCase().trim(),sort=$('communitySort').value,legend=$('communityLegend').value;
 if($('communityLegend').options.length===1){for(const c of cards.filter(c=>c.rarity==='Legendary').sort((a,b)=>a.name.localeCompare(b.name)))$('communityLegend').add(new Option(c.name,c.key))}
 const score=d=>(d.decklists_votes||[]).reduce((n,v)=>n+v.value,0);
 const rows=communityRows.filter(d=>term.split(/\s+/).filter(Boolean).every(t=>deckSearchText(d).includes(t))&&(!legend||d.cards[legend])&&(sort!=='mine'||d.owner_id===communityUser?.id)).sort((a,b)=>sort==='top'?score(b)-score(a):0);
 $('communityList').innerHTML=rows.map(d=>{
 const ordered=Object.keys(d.cards).sort((a,b)=>Number(isLegend(b))-Number(isLegend(a))+(isLegend(a)===isLegend(b)?(cards.find(c=>c.key===a)?.mana||0)-(cards.find(c=>c.key===b)?.mana||0):0));
 const thumb=k=>{const c=cards.find(c=>c.key===k);return c?.image?'<img src="'+esc(c.image)+'" alt="'+esc(c.name)+'" title="'+esc(c.name)+' × '+d.cards[k]+'" loading="lazy" referrerpolicy="no-referrer">':'<span class="missing-thumb">'+esc(c?.name||k)+'</span>'};
 const votes=d.decklists_votes||[],up=votes.filter(v=>v.value===1).length,down=votes.filter(v=>v.value===-1).length,mine=votes.find(v=>v.user_id===communityUser?.id)?.value,own=d.owner_id===communityUser?.id,valid=completeDeck(d),legendCard=cards.find(c=>c.key===ordered.find(isLegend));
 return '<article class="deck deck-list-row"><details class="deck-expand"><summary><div class="deck-row-heading"><strong>'+esc(d.name)+'</strong><span class="small">Created by '+esc(d.creator_name||'Anonymous')+' · '+esc(legendCard?.name||'No Legendary')+' · '+(valid?'25 cards':'Draft')+(own?' · Yours':'')+'</span></div><div class="deck-mini-strip">'+ordered.map(thumb).join('')+'</div><span class="expand-hint">Cards & details ▾</span></summary><div class="deck-expanded"><div class="deck-full-grid">'+ordered.map(k=>'<div>'+thumb(k)+'<small>× '+d.cards[k]+'</small></div>').join('')+'</div><aside><h3>Mana curve</h3>'+curveImage(d)+'<h3>Deck notes</h3><p>'+esc(d.notes||'No notes yet.')+'</p><p class="small">Saved '+esc(new Date(d.created_at).toLocaleDateString())+'</p></aside></div></details><div class="row deck-row-actions"><button data-community-open="'+d.id+'">Open in builder</button><button data-community-code="'+d.id+'" '+(valid?'':'disabled')+'>Copy game code</button><button data-community-vote="'+d.id+'" data-value="1" aria-label="Upvote '+esc(d.name)+'" aria-pressed="'+(mine===1)+'">👍 '+up+'</button><button data-community-vote="'+d.id+'" data-value="-1" aria-label="Downvote '+esc(d.name)+'" aria-pressed="'+(mine===-1)+'">👎 '+down+'</button><button data-community-link="'+d.id+'">Share link</button>'+(own?'<button data-community-edit="'+d.id+'">Edit</button><button data-community-delete="'+d.id+'">Delete</button>':'')+'</div></article>'
 }).join('')||'<p>No decks match your search.</p>';
};
$('communityLegend').onchange=renderCommunity;
document.addEventListener('click',async e=>{const b=e.target.closest('[data-community-code]');if(!b)return;try{const d=communityRows.find(d=>d.id===b.dataset.communityCode);const code=await makeGameCode(d.cards);try{await navigator.clipboard.writeText(code);communityStatus('Game deck code copied.')}catch{prompt('Copy game deck code:',code)}}catch(err){communityError(err)}});
let cloudSavePending=false;
async function saveToDatabase(){
 if(cloudSavePending)return;
 try{
 if(!communityUser)throw Error('Database connection is not ready. Your deck is still in the editor.');
 const username=communityUser.username;if(!username){$('creatorName').focus();throw Error('Choose a username before saving.');}
 if(!Object.keys(chosen).length)throw Error('Add at least one card before saving.');
 const d=deck();const values={...d,creator_name:username,owner_id:communityUser.id};
 cloudSavePending=true;$('save').disabled=true;
 const result=editingShared?await communityClient.from('decklists_decks').update(values).eq('id',editingShared).eq('owner_id',communityUser.id).select('id').single():await communityClient.from('decklists_decks').insert(values).select('id').single();
 if(result.error)throw result.error;editingShared=result.data.id;
 const favorite=await communityClient.from('decklists_stars').upsert({profile_id:communityUser.id,deck_id:editingShared},{onConflict:'profile_id,deck_id'});
 if(favorite.error)throw Error('Deck saved, but automatic favoriting failed: '+favorite.error.message+'. You can favorite it from the Decks page.');
 const id='cloud-'+editingShared;const local={...d,id,vote:0};saved=saved.filter(x=>x.id!==id);saved.unshift(local);editing=id;persist();try{localStorage.setItem('origins-creator-name',username)}catch{}
 await loadCommunity();message('Saved to the database as '+username+'. '+(completeDeck(d)?'Ready to copy into Origins.':'Saved as a draft.'));$('save').textContent='Save changes';
 }catch(e){message(e.message)}finally{cloudSavePending=false;$('save').disabled=false;}
}
$('save').onclick=saveToDatabase;
const previousLoadCommunity=loadCommunity;
loadCommunity=async function(){await previousLoadCommunity();if(!communityUser)return;for(const d of communityRows.filter(d=>d.owner_id===communityUser.id)){const id='cloud-'+d.id;saved=saved.filter(x=>x.id!==id);saved.push({name:d.name,notes:d.notes,cards:normalize(d.cards),id,vote:0})}renderCommunity()};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.edit){editingShared=b.dataset.edit.startsWith('cloud-')?b.dataset.edit.slice(6):null}if(b.id==='clear'||b.id==='importGame')$('save').textContent='Save deck';});
