import {StrKey, TransactionBuilder, Networks} from '@stellar/stellar-sdk';
import * as Varial from '@stellar/varial-sdk';
import * as wallet from './platik/wallet';
import {getBalances,loadAccount} from './platik/account';
import {ensureUsdcTrustline,buildChangeTrustXdr} from './platik/trustline';
import {signAndSubmitUsdcPayment,buildPaymentXdr,parseUsdcAmount} from './platik/payment';
import {getTransactionStatus,waitForConfirmation} from './platik/verify';
import {syncDepositsUsdc} from './platik/deposits';
import {USDC_TESTNET} from './platik/config';
import {PollarClient, type PendingConfirmation} from '@pollar/core';
declare const POLLAR_KEY:string;

declare global {var __platikConfig:any;var PlatikNative:any;var PlatikEngine:any;}
globalThis.__platikConfig={};
// The official Varial SDK keeps its existing request/response protocol.
// Only the transport is adapted: Android forwards these requests to an
// authorized WalletConnect session. No address or signature is fabricated.
if(typeof window!=='undefined') window.addEventListener('message',(event)=>{
 if(event.source!==window||event.data?.source!=='FREIGHTER_EXTERNAL_MSG_REQUEST')return;
 if(globalThis.PlatikNative)globalThis.PlatikNative.walletRequest(JSON.stringify(event.data));
});
function respond(messageId:number,payload:any){
 window.dispatchEvent(new MessageEvent('message',{source:window,origin:window.location.origin,data:{...payload,source:'FREIGHTER_EXTERNAL_MSG_RESPONSE',messagedId:messageId}}));
}
let pollar:PollarClient|undefined,recovery:any=null,recoveryError:string|undefined;
let confirmations:PendingConfirmation[]=[];
let recoveryAddress='',recoveryPromise:Promise<any>|undefined;
function preview(p:PendingConfirmation){
 const input:any={id:p.id,kind:p.kind,network:p.network,operation:p.operation,details:p.details};
 const xdr=(p as any).unsignedXdr;
 if(xdr&&p.network==='STELLAR'){
   try{const tx:any=TransactionBuilder.fromXDR(xdr,Networks.TESTNET);const inner=tx.innerTransaction??tx;input.source=inner.source;input.fee=tx.fee;input.memo=inner.memo?.value;input.operations=inner.operations.map((op:any)=>({type:op.type,source:op.source,destination:op.destination,amount:op.amount,limit:op.limit,asset:(op.asset??op.line)?{code:(op.asset??op.line).code,issuer:(op.asset??op.line).issuer}:undefined}));}catch{input.invalid=true;}
 }
 return input;
}
async function initPollar(){
 if(!pollar){
   pollar=new PollarClient({apiKey:POLLAR_KEY,stellarNetwork:'testnet',deviceLabel:'PLATIK Android',confirmation:'prompt',logLevel:'error',logger:{debug(){},info(){},warn(){},error(){}},
     oauthRedirectUri:'https://platik-financial.vercel.app',
     openAuthUrl:async(ctx)=>{const url=await ctx.getUrl();if(url)globalThis.PlatikNative.openAuthUrl(url);},
     onStorageDegrade:()=>{recoveryError='El dispositivo no puede conservar la sesión de forma segura. No deposites fondos y revisa el almacenamiento de la app.';},
   });
   pollar.onConfirmationRequest(p=>{confirmations=p;});
 }
 await pollar.ready();return pollar;
}
async function readRecovery(force=false){
 const p=await initPollar();const state=p.getAuthState();
 if(state.step!=='authenticated'||!state.verified||!p.hasWallet())return null;
 const address=p.getWallet()?.address??'';
 if(!force&&address===recoveryAddress&&recovery)return recovery;
 if(recoveryPromise)return recoveryPromise;
 recoveryPromise=p.cosign.recovery.status().then(value=>{recovery=value;recoveryAddress=address;recoveryError=undefined;return value;}).catch(e=>{recovery=null;recoveryError=e.message;throw e;}).finally(()=>{recoveryPromise=undefined;});
 return recoveryPromise;
}
async function pollarState(){
 const p=await initPollar(),a=p.getAuthState();
 if(a.step==='authenticated'&&a.verified&&p.hasWallet()&&!recoveryPromise&&recoveryAddress!==p.getWallet()?.address)void readRecovery().catch(()=>{});
 if(a.step!=='authenticated'){recovery=null;recoveryAddress='';}
 const tx:any=p.getTransactionState()??{step:'idle'};
 return {step:a.step,verified:a.step==='authenticated'&&a.verified,message:a.step==='error'?a.message:null,
   wallets:p.getWallets(),wallet:p.getWallet(),hasWallet:p.hasWallet(),profile:p.getUserProfile(),
   recovery,recoveryError,confirmations:confirmations.map(preview),
   transaction:{step:tx.step,hash:tx.hash,code:tx.code,details:tx.details},
   pending:p.getCosignState().pending.map((r:any)=>({id:r.id,status:r.status,summary:r.summary,chain:r.chain,operation:r.operation})),
 };
}
async function authStep(expected:string[]){
 const p=await initPollar(),until=Date.now()+30000;
 for(;;){const a=p.getAuthState();if(a.step==='error')throw Error(a.message);if(expected.includes(a.step))return;if(Date.now()>until)throw Error('La conexión está tardando. Revisa el estado y vuelve a intentarlo.');await new Promise(r=>setTimeout(r,150));}
}
async function requirePollarWallet(){
 const p=await initPollar(),a=p.getAuthState();if(a.step!=='authenticated'||!a.verified)throw Error('Inicia sesión y espera la validación de tu cuenta.');
 const r=await readRecovery(true);if(r?.required&&!r.configured)throw Error('Protege tu wallet con un método de recuperación antes de operar.');return p;
}
const methods:any={
 configure:(p:any)=>{globalThis.__platikConfig={...globalThis.__platikConfig,...p};return {network:'testnet',packages:{varial:'7.0.0',stellar:'17.4.0'}};},
 validate:(p:any)=>({valid:StrKey.isValidEd25519PublicKey(p.address)}),
 connect:()=>wallet.connectWallet(),restore:()=>wallet.restoreWallet(),disconnect:()=>wallet.disconnectWallet(),
 balances:(p:any)=>getBalances(p.address),
 trustline:(p:any)=>ensureUsdcTrustline(p.address),
 pay:(p:any)=>signAndSubmitUsdcPayment({sourceAddress:p.address,amountInput:p.amount,memoText:p.memo,destination:p.destination}),
 deposits:(p:any)=>syncDepositsUsdc(p.address,p.existing??[],p.goalId||undefined),
 pollarState,
 pollarAppConfig:async()=>{const p=await initPollar();const app=await p.getAppConfig();if(!app)throw Error('No se pudo consultar la configuración de PLATIK.');return app;},
 pollarEmailStart:async(p:any)=>{const c=await initPollar();c.beginEmailLogin();await authStep(['entering_email']);c.sendEmailCode(p.email);return pollarState();},
 pollarResend:async(p:any)=>{(await initPollar()).sendEmailCode(p.email);return pollarState();},
 pollarVerify:async(p:any)=>{(await initPollar()).verifyEmailCode(p.code);return pollarState();},
 pollarGoogle:async()=>{(await initPollar()).login({provider:'google'});return pollarState();},
 pollarCancel:async()=>{(await initPollar()).cancelLogin();return pollarState();},
 pollarLogout:async()=>{await(await initPollar()).logout();recovery=null;recoveryAddress='';return pollarState();},
 pollarCreate:async()=>{await(await initPollar()).createWallet();return pollarState();},
 pollarRecovery:async()=>{await readRecovery(true);return pollarState();},
 pollarRecoveryStart:async(p:any)=>{await(await initPollar()).cosign.recovery.startEmail(p.email);return {sent:true};},
 pollarRecoveryConfirm:async(p:any)=>{await(await initPollar()).cosign.recovery.confirmEmail(p.code);await readRecovery(true);return pollarState();},
 pollarDeviceRecoverStart:async()=>{await(await initPollar()).cosign.recovery.startEmailRecovery();return {sent:true};},
 pollarDeviceRecoverConfirm:async(p:any)=>{await(await initPollar()).cosign.recovery.recoverWithEmailCode(p.code);await readRecovery(true);return pollarState();},
 pollarEnroll:async(p:any)=>(await initPollar()).cosign.recovery.requestDeviceEnrollment(p.label||'PLATIK Android'),
 pollarApproveDevice:async(p:any)=>(await initPollar()).cosign.recovery.approveDevice(p.id),
 pollarDevices:async()=>(await initPollar()).cosign.devices(),
 pollarTrustline:async()=>{const p=await requirePollarWallet();return p.setTrustline({code:USDC_TESTNET.code,issuer:USDC_TESTNET.issuer});},
 pollarSend:async(p:any)=>{const c=await requirePollarWallet();return c.sendPayment({chain:'STELLAR',destination:p.destination,amount:p.amount,asset:{type:'credit_alphanum4',code:USDC_TESTNET.code,issuer:USDC_TESTNET.issuer},...(p.memo?{options:{memo:{type:'text',value:p.memo}}}:{})});},
 pollarConfirmation:async(p:any)=>{const pending=confirmations.find(c=>c.id===p.id);if(!pending)throw Error('La confirmación ya no está vigente.');p.approve?pending.confirm():pending.reject();return {answered:true};},
 pollarCosign:async(p:any)=>{const c=await initPollar();return p.approve?c.cosign.approve(p.id):c.cosign.reject(p.id);},
 status:(p:any)=>getTransactionStatus(p.hash),confirm:(p:any)=>waitForConfirmation(p.hash),
 buildTrustline:async(p:any)=>({xdr:buildChangeTrustXdr(await loadAccount(p.address))}),
 buildPayment:async(p:any)=>({xdr:buildPaymentXdr(await loadAccount(p.address),p.destination,parseUsdcAmount(p.amount),p.memo)}),
 sdkStatus:()=>Varial.isConnected(),
 verifyEnvelope:(p:any)=>{
   const tx=TransactionBuilder.fromXDR(p.signedXdr,Networks.TESTNET),original=TransactionBuilder.fromXDR(p.unsignedXdr,Networks.TESTNET);
   const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
   if(hex(tx.hash())!==hex(original.hash()))throw Error('La wallet modificó la operación solicitada.');
   return {hash:hex(tx.hash())};
 },
};
async function call(method:string,params:any={}){if(!(method in methods))throw Error('Método no permitido');return await methods[method](params);}
async function dispatch(id:string,method:string,params:any){
 try {const result=await call(method,params);globalThis.PlatikNative.complete(id,JSON.stringify({ok:true,value:result??null}));}
 catch(error:any){globalThis.PlatikNative.complete(id,JSON.stringify({ok:false,error:error?.message??String(error),code:error?.code??'unknown'}));}
}
globalThis.PlatikEngine={call,dispatch,respond};
