import {betterAuth} from 'better-auth';

export function configurationIssues(env){
  const issues=[];
  if(!env.DB)issues.push('DB');
  if(!env.SAVES)issues.push('SAVES');
  if(typeof env.AUTH_SECRET!=='string'||env.AUTH_SECRET.length<32)issues.push('AUTH_SECRET');
  let validOrigin=false;
  try{const origin=new URL(env.AUTH_ORIGIN);
    validOrigin=origin.origin===env.AUTH_ORIGIN&&(origin.protocol==='https:'||origin.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(origin.hostname));
  }catch(_){}
  if(!validOrigin)issues.push('AUTH_ORIGIN');
  return issues;
}
export function authReady(env){return configurationIssues(env).length===0;}
export function createAuth(env){
  return betterAuth({database:env.DB,secret:env.AUTH_SECRET,baseURL:env.AUTH_ORIGIN,basePath:'/api/auth',
    trustedOrigins:[env.AUTH_ORIGIN],
    // Usernames are mapped to internal, undeliverable aliases. No email service is used.
    emailAndPassword:{enabled:true,minPasswordLength:10,maxPasswordLength:128,requireEmailVerification:false,
      revokeSessionsOnPasswordReset:true},
    session:{expiresIn:60*60*24*7,updateAge:60*60*24,cookieCache:{enabled:false}},
    rateLimit:{enabled:true,window:60,max:20,storage:'database',customRules:{'/get-session':false}},
    advanced:{useSecureCookies:env.AUTH_ORIGIN.startsWith('https:'),ipAddress:{ipAddressHeaders:['cf-connecting-ip']}},
    logger:{level:'error'}
  });
}
