export function createAccountService({fetcher=globalThis.fetch,configured=false,apiBase='/api',notify=()=>{}}={}){
  let user=null,approval=null,role='user',recoveryCodes=0;
  async function request(path,{method='GET',data,headers={}}={}){
    if(!configured)throw new Error('Els comptes encara no estan activats.');
    const response=await fetcher(apiBase+'/'+path.replace(/^\//,''),{method,credentials:'same-origin',cache:'no-store',
      headers:{...(data===undefined?{}:{'Content-Type':'application/json'}),...headers},body:data===undefined?undefined:JSON.stringify(data)});
    const result=await response.json();
    if(!response.ok){const error=new Error(result.message||'No s’ha pogut completar l’acció.');error.code=result.code;throw error;}
    return result;
  }
  async function verifiedUser(){
    const result=await request('auth/get-session');user=result?.user||null;
    if(user){const state=await request('account/status');user=state.user;approval=state.status;role=state.role;recoveryCodes=state.recoveryCodes;}
    else{approval=null;role='user';recoveryCodes=0;}
    return user;
  }
  return Object.freeze({configured,request,verifiedUser,
    status:()=>({configured,user,approval,role,recoveryCodes}),
    async signUp(username,password){const result=await request('auth/sign-up/email',{method:'POST',data:{username,password}});await verifiedUser();notify();return result;},
    async signIn(username,password){const result=await request('auth/sign-in/email',{method:'POST',data:{username,password}});await verifiedUser();notify();return result;},
    async signOut(){await request('auth/sign-out',{method:'POST',data:{}});user=null;approval=null;role='user';recoveryCodes=0;notify();},
    async changePassword(newPassword,currentPassword){await request('auth/change-password',{method:'POST',data:{newPassword,currentPassword}});},
    async recoveryCodes(password){const result=await request('account/recovery-codes',{method:'POST',data:{password}});recoveryCodes=result.codes.length;return result.codes;},
    async recover(username,code,newPassword){await request('account/recover',{method:'POST',data:{username,code,newPassword}});user=null;approval=null;notify();},
    async issueRecovery(id,password,confirmedIdentity){return request('admin/users/'+encodeURIComponent(id)+'/recovery',{method:'POST',data:{password,confirmedIdentity}});},
    async users(){return request('admin/users');},
    async approve(id,status){return request('admin/users/'+encodeURIComponent(id),{method:'POST',data:{status}});},
    dispose(){}
  });
}
export async function configuredAccounts(config={apiBase:'/api'},options={}){
  const fetcher=options.fetcher||globalThis.fetch;
  try{
    const response=await fetcher(config.apiBase+'/capabilities',{cache:'no-store',credentials:'same-origin'}),capabilities=await response.json();
    if(!response.ok||!capabilities.accounts)return createAccountService();
    const service=createAccountService({...options,fetcher,apiBase:config.apiBase,configured:true});await service.verifiedUser();return service;
  }catch(_){return createAccountService();}
}
