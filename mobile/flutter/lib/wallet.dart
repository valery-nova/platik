import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:reown_sign/reown_sign.dart';
import 'package:reown_core/reown_core.dart';
import 'domain.dart';
import 'store.dart';

const testnetPassphrase='Test SDF Network ; September 2015';
const testnetChain='stellar:testnet';
const usdcIssuer='GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
class StellarEngine {
  Future<dynamic> call(String method,[RowData params=const {}]) async {
    final text=await native.invokeMethod<String>('stellar',{'method':method,'params':params});
    final result=jsonDecode(text!) as RowData;
    if(result['ok']!=true)throw StateError(result['error'] as String? ?? 'No se pudo completar la operación.');
    return result['value'];
  }
}

class WalletService extends ChangeNotifier {
  WalletService(this.store){native.setMethodCallHandler(_nativeRequest);}
  final PlatikStore store;
  final engine=StellarEngine();
  ReownSignClient? client;
  SessionData? session;
  RowData? info,balances;
  String? error,pairingUri;
  bool busy=false,loadingBalance=false;
  String activity='';
  int generation=0;
  Completer<void>? cancelled;
  Future<void>? initializing;
  Future<void> Function(String hash)? signedCallback;
  static const projectId=String.fromEnvironment('REOWN_PROJECT_ID',defaultValue:'f9100662f38ecfa55af4cc138e46bdf9');
  bool get connected=>info?['connected']==true&&session!=null;
  String? get address=>info?['address'] as String?;

  Future<void> init() async {
    if(client!=null)return;
    if(initializing!=null)return initializing;
    initializing=_init();
    try{await initializing;}finally{initializing=null;}
  }
  Future<void> _init() async {
    if(!RegExp(r'^[a-fA-F0-9]{32}$').hasMatch(projectId))throw StateError('La vinculación móvil de PLATIK requiere completar la configuración del servicio.');
    client=await ReownSignClient.createInstance(projectId:projectId,metadata:const PairingMetadata(name:'PLATIK',description:'Gestión financiera y ahorro en Stellar Testnet',url:'https://platik-financial.vercel.app',icons:['https://platik-financial.vercel.app/brand/app/app-icon.svg'],redirect:Redirect(native:'platik://wallet')),logLevel:LogLevel.nothing);
    for(final candidate in client!.getActiveSessions().values){if(_testnetAddress(candidate)!=null){session=candidate;break;}}
    client!.onSessionDelete.subscribe((_){session=null;info=null;balances=null;notifyListeners();});
    client!.onSessionExpire.subscribe((_){session=null;info=null;balances=null;notifyListeners();});
    client!.onSessionUpdate.subscribe((_){_reloadSession();});
    client!.onSessionEvent.subscribe((_){_reloadSession();});
  }
  String? _testnetAddress(SessionData value){
    final namespaces=value.namespaces['stellar'];
    if(namespaces==null||!namespaces.methods.contains('stellar_signXDR'))return null;
    for(final account in namespaces.accounts){if(account.startsWith('$testnetChain:')){final a=account.substring(testnetChain.length+1);if(RegExp(r'^G[A-Z2-7]{55}$').hasMatch(a))return a;}}
    return null;
  }
  void _reloadSession(){
    if(client==null||session==null)return;
    session=client!.getActiveSessions()[session!.topic];
    final a=session==null?null:_testnetAddress(session!);
    if(a==null){session=null;info=null;balances=null;error='La wallet dejó de autorizar Stellar Testnet.';notifyListeners();}
    else{info={'address':a,'network':'TESTNET','networkPassphrase':testnetPassphrase,'connected':true};unawaited(refreshBalances());}
  }
  Future<dynamic> _nativeRequest(MethodCall call) async {
    if(call.method!='walletRequest')throw MissingPluginException();
    final request=jsonDecode(call.arguments as String) as RowData;
    RowData response;
    try{response=await _transport(request);}catch(e){response={'apiError':{'code':-1,'message':_message(e)}};}
    return jsonEncode(response);
  }
  Future<RowData> _transport(RowData request) async {
    switch(request['type']){
      case 'REQUEST_CONNECTION_STATUS':return {'isConnected':projectId.isNotEmpty};
      case 'REQUEST_ALLOWED_STATUS':return {'isAllowed':session!=null&&_testnetAddress(session!)!=null};
      case 'REQUEST_PUBLIC_KEY':return {'publicKey':session==null?'':_testnetAddress(session!)??''};
      case 'REQUEST_ACCESS':
      case 'SET_ALLOWED_STATUS':
        await _connectSession();return {'publicKey':_testnetAddress(session!)!,'isAllowed':true};
      case 'REQUEST_NETWORK':
      case 'REQUEST_NETWORK_DETAILS':
        final data={'network':session==null?'':'TESTNET','networkName':'Stellar Testnet','networkPassphrase':session==null?'':testnetPassphrase,'networkUrl':'https://horizon-testnet.stellar.org','sorobanRpcUrl':'https://soroban-testnet.stellar.org'};
        return {...data,'networkDetails':data};
      case 'DISCONNECT':await _disconnectSession();return {};
      case 'SUBMIT_TRANSACTION':
        if(session==null)throw StateError('Vincula tu wallet antes de firmar.');
        if(request['networkPassphrase']!=testnetPassphrase)throw StateError('PLATIK solo opera en Stellar Testnet.');
        final signer=_testnetAddress(session!)!;
        if(request['accountToSign']!=null&&request['accountToSign']!=''&&request['accountToSign']!=signer)throw StateError('La cuenta autorizada cambió. Vuelve a vincular la wallet.');
        final future=client!.request(topic:session!.topic,chainId:testnetChain,request:SessionRequestParams(method:'stellar_signXDR',params:{'xdr':request['transactionXdr']}));
        try{await native.invokeMethod<void>('openWallet');}catch(_){}
        final response=await future.timeout(const Duration(minutes:2));
        final signed=response is Map?response['signedXDR']:null;
        if(signed is! String||signed.isEmpty)throw StateError('La wallet no devolvió una firma válida.');
        final verified=await engine.call('verifyEnvelope',{'signedXdr':signed,'unsignedXdr':request['transactionXdr']}) as Map;
        if(signedCallback!=null)await signedCallback!(verified['hash'] as String);
        return {'signedTransaction':signed,'signerAddress':signer};
      default:throw StateError('La wallet solicitó un método que PLATIK no utiliza.');
    }
  }
  Future<void> _connectSession() async {
    await init();
    if(session!=null&&_testnetAddress(session!)!=null)return;
    final attempt=++generation;cancelled=Completer<void>();
    final response=await client!.connect(optionalNamespaces:{'stellar':const RequiredNamespace(chains:[testnetChain],methods:['stellar_signXDR'],events:['accountsChanged'])});
    pairingUri=response.uri?.toString();notifyListeners();
    try{
      final approved=await Future.any<SessionData>([response.session.future,cancelled!.future.then<SessionData>((_)=>throw StateError('Conexión cancelada por el usuario.'))]).timeout(const Duration(minutes:3));
      if(attempt!=generation)throw StateError('Conexión cancelada por el usuario.');
      if(_testnetAddress(approved)==null){await client!.disconnect(topic:approved.topic,reason:const ReownSignError(code:6000,message:'Selecciona Stellar Testnet y autoriza stellar_signXDR'));throw StateError('Selecciona Stellar Testnet en Varial y vuelve a vincular.');}
      session=approved;
    }finally{pairingUri=null;cancelled=null;notifyListeners();}
  }
  void cancelConnection(){generation++;if(cancelled!=null&&!cancelled!.isCompleted)cancelled!.complete();pairingUri=null;notifyListeners();}
  Future<void> _disconnectSession() async {if(session!=null&&client!=null){await client!.disconnect(topic:session!.topic,reason:const ReownSignError(code:6000,message:'El usuario desconectó PLATIK'));}session=null;info=null;balances=null;notifyListeners();}
  Future<void> restore() async {
    if(projectId.isEmpty)return;
    try{await init();info=await engine.call('restore') as RowData?;if(info!=null)await refreshBalances();}catch(e){error=_message(e);notifyListeners();}
  }
  Future<void> connect() async {store.track('wallet_connect_clicked',{'network':'testnet','source':'varial'});await run('Vinculando wallet',()async{await init();info=Map<String,dynamic>.from(await engine.call('connect') as Map);store.track('wallet_connected',{'network':'testnet','source':'varial'});await refreshBalances();});}
  Future<void> disconnect() async {await run('Desconectando',()async{await engine.call('disconnect');info=null;balances=null;});}
  Future<void> refreshBalances() async {
    if(address==null)return;loadingBalance=true;notifyListeners();
    try{balances=Map<String,dynamic>.from(await engine.call('balances',{'address':address}) as Map);error=null;}catch(e){balances=null;error=_message(e);}finally{loadingBalance=false;notifyListeners();}
  }
  Future<void> trustline() async {await run('Autorizando trustline USDC',()async{await engine.call('trustline',{'address':address});await refreshBalances();});}
  Future<void> contribute(RowData goal,String amount,String recipient,{String? memo}) async {
    if(!connected)throw StateError('Vincula tu wallet.');
    final scope=store.target,sourceAddress=address!;
    await run('Revisa el envío y firma en Varial',()async{
      final n=double.tryParse(amount.replaceAll(',','.'));
      if(n==null||!n.isFinite||n<=0||!RegExp(r'^\d+(\.\d{1,7})?$').hasMatch(amount.replaceAll(',','.')))throw const FormatException('Importe positivo con hasta 7 decimales.');
      final validated=await engine.call('validate',{'address':recipient}) as Map;
      if(validated['valid']!=true)throw StateError('La cuenta receptora no es una dirección pública Stellar válida.');
      final destination=await engine.call('balances',{'address':recipient}) as Map;
      if(destination['tieneTrustlineUsdc']!=true)throw StateError('La cuenta receptora no tiene trustline al USDC de Circle Testnet.');
      final contribution=<String,dynamic>{'id':newId(),'goalId':goal['id']??'','walletOrigen':sourceAddress,'direccionReceptora':recipient,'assetCode':'USDC','assetIssuer':usdcIssuer,'red':'testnet','importe':n,'estado':'preparado','createdAt':DateTime.now().toUtc().toIso8601String(),if(memo!=null)'memo':memo};
      Future<void> persist()async{await store.upsertAt(scope,'aportesStellar',{...contribution});}
      await persist();
      try{
        contribution['estado']='firma_solicitada';await persist();
        signedCallback=(hash)async{contribution['txHash']=hash;await persist();await store.commitCritical();};
        final result=await engine.call('pay',{'address':sourceAddress,'amount':amount,'destination':recipient,if(memo!=null&&memo.trim().isNotEmpty)'memo':memo.trim()}) as Map;
        contribution['txHash']=result['txHash'];contribution['estado']='enviada';await persist();
        final status=await engine.call('confirm',{'hash':result['txHash']}) as Map;
        if(status['successful']==true){contribution['estado']='confirmada';contribution['ledger']=status['ledger'];if(status['closedAt']!=null)contribution['confirmedAt']=status['closedAt'];}
        else if(status['successful']==false){contribution['estado']='fallida';contribution['error']='Horizon registró una transacción fallida.';}
        await persist();await refreshBalances();
      }catch(e){if(contribution['estado']!='enviada'&&contribution['txHash']==null){contribution['estado']=RegExp('reject|cancel|denied',caseSensitive:false).hasMatch(e.toString())?'cancelada':'fallida';}contribution['error']=_message(e);await persist();rethrow;}finally{signedCallback=null;}
    });
  }
  Future<void> verifyContribution(RowData contribution) async {
    if(contribution['txHash']==null)return;final scope=store.target;
    await run('Verificando en Horizon',()async{final status=await engine.call('status',{'hash':contribution['txHash']}) as Map;if(status['successful']!=null){await store.upsertAt(scope,'aportesStellar',{...contribution,'estado':status['successful']==true?'confirmada':'fallida','ledger':status['ledger'],if(status['successful']==true&&status['closedAt']!=null)'confirmedAt':status['closedAt']});}});
  }
  Future<void> run(String label,Future<void> Function() work) async {
    if(busy)throw StateError('Hay una operación de wallet en curso.');busy=true;activity=label;error=null;notifyListeners();
    try{await work();}catch(e){error=_message(e);rethrow;}finally{busy=false;activity='';notifyListeners();}
  }
  String _message(Object e)=>e is PlatformException?e.message??'No se pudo completar la operación.':e.toString().replaceFirst('Bad state: ','');
}
