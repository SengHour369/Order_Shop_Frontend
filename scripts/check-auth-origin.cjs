// No credentials or cookies are sent; an allowed unauthenticated refresh is 401.
async function main(){
 const base=new URL(process.argv[2]||'http://localhost:4200').origin;
 const origin=new URL(process.argv[3]||base).origin;
 try{
  const response=await fetch(base+'/api/v1/public/session/refresh',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000),redirect:'error'});
  console.log(`Frontend: ${base}\nBrowser origin: ${origin}\nSession endpoint: HTTP ${response.status}`);
  if(response.status===401){console.log('Origin accepted; no session cookie was sent. This does not validate account credentials.');return;}
  if(response.status===403)console.error('Origin/security rejection. Include the exact browser origin in GATEWAY_CORS_ORIGINS for BOTH api-gateway and auth-service, then recreate both services with the same environment files.');
  else if(response.status===502||response.status===503)console.error('The frontend proxy cannot reach the backend gateway. Check gateway health and Docker DNS.');
  else console.error('Unexpected response; inspect backend logs. No login credentials were tested.');
  process.exitCode=1;
 }catch(error){console.error('Cannot reach the session endpoint: '+error.message);process.exitCode=1;}
}
void main();
