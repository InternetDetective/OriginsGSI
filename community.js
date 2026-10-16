/* Shared community storage. The builder and drafts remain local until explicitly shared. */
let communityClient=null,communityUser=null,communityRows=[],editingShared=null;
try{$('creatorName').value=localStorage.getItem('origins-creator-name')||''}catch{}
$('creatorName').onchange=()=>{try{localStorage.setItem('origins-creator-name',$('creatorName').value.trim())}catch{}};
const communityStatus=s=>document.getElementById('communityStatus').textContent=s;
function communityError(e){communityStatus(e?.message||'The community service is unavailable.');}
async function loadCommunity(){
 if(!communityClient||!communityUser)return;
 const {data,error}=await communityClient.from('decklists_decks').select('id,owner_id,creator_name,name,notes,cards,created_at,decklists_votes(user_id,value)').order('created_at',{ascending:false}).limit(100);
 if(error)throw error;communityRows=data||[];
 renderCommunity();communityStatus('Connected · latest 100 shared decks');
}
function renderCommunity(){const term=$('communitySearch').value.toLowerCase(),sort=$('communitySort').value;const filtered=communityRows.filter(d=>(d.name+' '+d.notes+' '+d.creator_name).toLowerCase().includes(term)&&(sort!=='mine'||d.owner_id===communityUser?.id)).sort((a,b)=>sort==='top'?(b.decklists_votes||[]).reduce((n,v)=>n+v.value,0)-(a.decklists_votes||[]).reduce((n,v)=>n+v.value,0):0);document.getElementById('communityList').innerHTML=filtered.length?filtered.map(d=>{
 const votes=d.decklists_votes||[],up=votes.filter(v=>v.value===1).length,down=votes.filter(v=>v.value===-1).length,mine=votes.find(v=>v.user_id===communityUser.id)?.value;
 return `<article class="deck"><strong>${esc(d.name)}</strong><div class="small">Created by ${esc(d.creator_name||'Anonymous')} · ${esc(new Date(d.created_at).toLocaleDateString())}${d.owner_id===communityUser.id?' · Yours':''}</div><p>${esc(d.notes)}</p><div class="row"><button data-community-open="${d.id}">Open deck</button><button data-community-vote="${d.id}" data-value="1" aria-label="Upvote ${esc(d.name)}" aria-pressed="${mine===1}" style="${mine===1?'background:#3c3260;border-color:#b69bf6':''}">👍 ${up}</button><button data-community-vote="${d.id}" data-value="-1" aria-label="Downvote ${esc(d.name)}" aria-pressed="${mine===-1}" style="${mine===-1?'background:#603240;border-color:#efa5b5':''}">👎 ${down}</button><button data-community-link="${d.id}">Share link</button>${d.owner_id===communityUser.id?`<button data-community-delete="${d.id}">Delete</button><button data-community-edit="${d.id}">Edit your deck</button>`:''}</div></article>`}).join(''):'<p>No shared decks yet. Build a deck and share it with the group.</p>';
 communityStatus('Connected · latest 100 shared decks');
}
$('communitySearch').oninput=renderCommunity; $('communitySort').onchange=renderCommunity;
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;const x=b.dataset;
 if(b.id==='clear'||b.id==='importGame')editingShared=null;
 try{
 if(x.communityEdit||x.communityOpen){const id=x.communityEdit||x.communityOpen;editingShared=x.communityEdit||null;const d=communityRows.find(d=>d.id===id);const validated=decode(encode(d));chosen=validated.cards;editing=null;$('name').value=validated.name;$('notes').value=validated.notes;showView('builder');render();$('save').textContent=editingShared?'Save changes':'Save deck';message(editingShared?'Editing your shared deck.':'Opened as a copy.');}
 if(x.communityVote){if(!communityUser)throw Error('Community connection is not ready.');const row=communityRows.find(d=>d.id===x.communityVote);const old=row.decklists_votes?.find(v=>v.user_id===communityUser.id);let response;if(old?.value===+x.value)response=await communityClient.from('decklists_votes').delete().eq('deck_id',row.id).eq('user_id',communityUser.id);else response=await communityClient.from('decklists_votes').upsert({deck_id:row.id,user_id:communityUser.id,value:+x.value},{onConflict:'deck_id,user_id'});if(response.error)throw response.error;await loadCommunity();}
 if(x.communityLink){const url=new URL(location.href);url.hash='';url.searchParams.set('shared',x.communityLink);try{await navigator.clipboard.writeText(url.href);communityStatus('Deck link copied.')}catch{prompt('Copy deck link:',url.href)}}
 if(x.communityDelete&&confirm('Delete your shared deck?')){const {error}=await communityClient.from('decklists_decks').delete().eq('id',x.communityDelete).eq('owner_id',communityUser.id);if(error)throw error;await loadCommunity();}
 }catch(err){communityError(err)}
});
document.getElementById('refreshCommunity').onclick=()=>loadCommunity().catch(communityError);
(async()=>{try{
 const c=window.DECKLISTS_CONFIG;if(!c?.publishableKey){communityStatus('Setup pending: add the Supabase publishable key and apply schema.sql. Local deck building is ready.');return}
 if(!c.publishableKey.startsWith('sb_publishable_'))throw Error('Use a Supabase publishable key, never an admin key.');
 communityClient=window.supabase.createClient(c.supabaseUrl,c.publishableKey);
 const {data,error}=await communityClient.auth.getSession();if(error)throw error;let session=data.session;
 if(!session){const result=await communityClient.auth.signInAnonymously();if(result.error)throw result.error;session=result.data.session}
 const profile=await chooseUsername(communityClient);communityUser={id:profile.id,username:profile.username};saved=[];await loadCommunity();
 const id=new URL(location.href).searchParams.get('shared');if(id&&/^[0-9a-f-]{36}$/i.test(id)){
 const {data:d,error}=await communityClient.from('decklists_decks').select('name,notes,cards').eq('id',id).single();if(error)throw error;
 const validated=decode(encode(d));chosen=validated.cards;editing=null;$('name').value=validated.name;$('notes').value=validated.notes;render();message('Shared deck opened.');}
 }catch(e){communityError(e)}})();

