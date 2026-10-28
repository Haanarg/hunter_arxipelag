import {betterAuth} from 'better-auth';

export function authReady(env){
  if(!env.DB||!env.SAVES||typeof env.AUTH_SECRET!=='string'||env.AUTH_SECRET.length<32)return false;
  try{const origin=new URL(env.AUTH_ORIGIN);
    return origin.origin===env.AUTH_ORIGIN&&(origin.protocol==='https:'||origin.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(origin.hostname));
  }catch(_){return false;}
}
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
