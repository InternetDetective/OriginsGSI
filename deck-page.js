/* Rich shared previews and database-first saving. */
function completeDeck(d){try{checkGameDeck(d.cards);return true}catch{return false}}
function curveImage(d){
 const bins=Array(11).fill(0);for(const[k,n]of Object.entries(d.cards)){const c=cards.find(c=>c.key===k);if(c)bins[Math.min(10,c.mana)]+=n}
 const max=Math.max(1,...bins);const svg='<svg xmlns="http://www.w3.org/2000/svg" width="352" height="128" viewBox="0 0 352 128"><rect width="352" height="128" rx="10" fill="#0d1421"/><text x="12" y="18" fill="#bcc9df" font-family="sans-serif" font-size="12">Mana curve · individual copies</text>'+bins.map((n,i)=>'<rect x="'+(13+i*30)+'" y="'+(94-n/max*54)+'" width="20" height="'+Math.max(1,n/max*54)+'" rx="3" fill="#a184f5"/><text x="'+(23+i*30)+'" y="'+(88-n/max*54)+'" text-anchor="middle" fill="#edf1fa" font-family="sans-serif" font-size="10">'+(n||'')+'</text><text x="'+(23+i*30)+'" y="113" text-anchor="middle" fill="#bcc9df" font-family="sans-serif" font-size="10">'+(i===10?'10+':i)+'</text>').join('')+'</svg>';
 return '<img class="deck-curve-image" alt="Mana curve: '+esc(bins.map((n,i)=>i+' mana '+n+' copies').join(', '))+'" src="data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)+'">';
}
const originalCommunityRender=renderCommunity;
renderCommunity=function(){originalCommunityRender();for(const element of document.querySelectorAll('#communityList .deck')){const open=element.querySelector('[data-community-open]');const d=communityRows.find(d=>d.id===open?.dataset.communityOpen);if(!d)continue;const valid=completeDeck(d);const panel=document.createElement('div');panel.innerHTML='<div class="small">'+(valid?'Complete · 25 cards':'Draft · incomplete deck')+'</div>'+curveImage(d)+'<details class="shared-preview"><summary>View cards · '+Object.values(d.cards).reduce((a,b)=>a+b,0)+' cards</summary>'+lineupPreview(d)+'</details><div class="row"><button data-community-code="'+d.id+'" '+(valid?'':'disabled')+'>Copy game deck code</button></div>';element.appendChild(panel)}};
document.addEventListener('click',async e=>{const b=e.target.closest('[data-community-code]');if(!b)return;try{const d=communityRows.find(d=>d.id===b.dataset.communityCode);const code=await makeGameCode(d.cards);try{await navigator.clipboard.writeText(code);communityStatus('Game deck code copied.')}catch{prompt('Copy game deck code:',code)}}catch(err){communityError(err)}});
let cloudSavePending=false;
async function saveToDatabase(){
 if(cloudSavePending)return;
 try{
 if(!communityUser)throw Error('Database connection is not ready. Your deck is still in the editor.');
 const username=$('creatorName').value.trim();if(!username){$('creatorName').focus();throw Error('Choose a username before saving.');}
 if(!Object.keys(chosen).length)throw Error('Add at least one card before saving.');
 const d=deck();const values={...d,creator_name:username,owner_id:communityUser.id};
 cloudSavePending=true;$('save').disabled=true;$('publishCommunity').disabled=true;
 const result=editingShared?await communityClient.from('decklists_decks').update(values).eq('id',editingShared).eq('owner_id',communityUser.id).select('id').single():await communityClient.from('decklists_decks').insert(values).select('id').single();
 if(result.error)throw result.error;editingShared=result.data.id;
 const id='cloud-'+editingShared;const local={...d,id,vote:0};saved=saved.filter(x=>x.id!==id);saved.unshift(local);editing=id;persist();try{localStorage.setItem('origins-creator-name',username)}catch{}
 await loadCommunity();renderDecks();message('Saved to the database as '+username+'. '+(completeDeck(d)?'Ready to copy into Origins.':'Saved as a draft.'));$('save').textContent='Save changes';
 }catch(e){message(e.message)}finally{cloudSavePending=false;$('save').disabled=false;$('publishCommunity').disabled=false}
}
$('save').onclick=saveToDatabase;$('publishCommunity').onclick=saveToDatabase;
const previousLoadCommunity=loadCommunity;
loadCommunity=async function(){await previousLoadCommunity();if(!communityUser)return;for(const d of communityRows.filter(d=>d.owner_id===communityUser.id)){const id='cloud-'+d.id;saved=saved.filter(x=>x.id!==id);saved.push({name:d.name,notes:d.notes,cards:normalize(d.cards),id,vote:0})}renderDecks();renderCommunity()};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.edit){editingShared=b.dataset.edit.startsWith('cloud-')?b.dataset.edit.slice(6):null}if(b.id==='clear'||b.id==='importGame')$('save').textContent='Save deck';});
