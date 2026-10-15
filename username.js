let usernameChoiceResolve=null;
async function chooseUsername(client){
 $('creatorName').readOnly=true;
 let remembered;try{remembered=sessionStorage.getItem('origins-active-username')}catch{}
 if(remembered){const r=await client.rpc('decklists_username_login',{wanted_name:remembered,new_user:false});if(!r.error){setUsername(r.data);return r.data}}
 $('usernameDialog').showModal();
 return await new Promise(resolve=>{usernameChoiceResolve=resolve;for(const [id,isNew]of [['newUsername',true],['existingUsername',false]])$(id).onclick=async()=>{
 $('usernameError').textContent='';$('newUsername').disabled=true;$('existingUsername').disabled=true;
 try{const {data,error}=await client.rpc('decklists_username_login',{wanted_name:$('loginUsername').value.trim(),new_user:isNew});if(error)throw error;setUsername(data);$('usernameDialog').close();resolve(data)}catch(e){$('usernameError').textContent=e.message}finally{$('newUsername').disabled=false;$('existingUsername').disabled=false}
 }});
}
function setUsername(profile){$('creatorName').value=profile.username;$('activeUsername').textContent='Playing as '+profile.username;try{sessionStorage.setItem('origins-active-username',profile.username)}catch{}}
$('usernameDialog').addEventListener('cancel',e=>e.preventDefault());
$('switchUsername').onclick=()=>{try{sessionStorage.removeItem('origins-active-username')}catch{}location.reload()};
