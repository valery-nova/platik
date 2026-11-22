import 'dart:async';
import 'package:flutter/foundation.dart';
import 'domain.dart';
import 'store.dart';
import 'wallet.dart';

class PollarService extends ChangeNotifier{
  PollarService(this.store,{StellarEngine? engine,bool autoPoll=true}):engine=engine??StellarEngine(){if(autoPoll){timer=Timer.periodic(const Duration(seconds:2),(_)=>unawaited(refresh()));unawaited(refresh());}}
  final PlatikStore store;final StellarEngine engine;Timer? timer;
  RowData state={};RowData? balances,appConfig;String? error;bool busy=false,polling=false,disposed=false,loadingBalance=false;String activity='';
  bool get available=>appConfig?['application']?['network']=='testnet';
  String get step=>state['step'] as String? ?? 'loading';
  bool get authenticated=>step=='authenticated'&&state['verified']==true;
  String? get address{
    final wallets=[...rows(state['wallets']),if(state['wallet'] is Map)Map<String,dynamic>.from(state['wallet'] as Map)];
    return wallets.where((w)=>(w['chain']==null||w['chain']=='STELLAR')&&RegExp(r'^G[A-Z2-7]{55}$').hasMatch(w['address'] as String? ?? '')).firstOrNull?['address'] as String?;
  }
  bool get hasWallet=>state['hasWallet']==true;
  RowData? get recovery=>state['recovery'] is Map?Map<String,dynamic>.from(state['recovery'] as Map):null;
  bool get protected=>recovery!=null&&(recovery!['required']!=true||recovery!['configured']==true);
  bool get canOperate=>authenticated&&address!=null&&protected;
  List<RowData> get confirmations=>rows(state['confirmations']);
  void changed(){if(!disposed)notifyListeners();}
  Future<void> refresh()async{
    if(polling||disposed)return;polling=true;
    try{final previous=address;state=Map<String,dynamic>.from(await engine.call('pollarState') as Map);if(appConfig==null){appConfig=Map<String,dynamic>.from(await engine.call('pollarAppConfig') as Map);if(!available)throw StateError('El servicio de billetera no está configurado para Stellar Testnet.');}if(address!=previous){balances=null;if(address!=null)unawaited(refreshBalances());}error=null;}
    catch(e){error=message(e);}finally{polling=false;changed();}
  }
  Future<dynamic> action(String method,[RowData params=const {},String label='Conectando con Pollar'])async{
    if(busy)throw StateError('Hay una operación en curso.');busy=true;activity=label;error=null;changed();
    try{final result=await engine.call(method,params);if(result is Map&&result['step']!=null)state=Map<String,dynamic>.from(result);return result;}
    catch(e){error=message(e);rethrow;}finally{busy=false;activity='';changed();unawaited(refresh());}
  }
  Future<void> refreshBalances()async{
    final a=address;if(a==null||loadingBalance)return;loadingBalance=true;changed();
    try{final value=Map<String,dynamic>.from(await engine.call('balances',{'address':a}) as Map);if(address==a)balances=value;}
    catch(e){error=message(e);}finally{loadingBalance=false;changed();}
  }
  Future<void> answer(String id,bool approve)async{await engine.call('pollarConfirmation',{'id':id,'approve':approve});await refresh();}
  Future<void> syncDeposits({String? goalId})async{
    final scope=store.target,a=address;if(a==null||!canOperate)throw StateError('Inicia sesión y protege tu wallet antes de recibir.');
    final current=rows(store.dataAt(scope)['depositosUsdc']).where((d)=>d['walletAddress']==a).toList();
    final result=await action('deposits',{'address':a,'existing':current,'goalId':goalId},'Consultando depósitos en Horizon');
    await store.upsertDeposits(scope,rows(result));
  }
  Future<void> trustline()async{
    if(!canOperate)throw StateError('Protege tu wallet antes de operar.');
    final result=await action('pollarTrustline',{},'Preparando trustline USDC') as Map;
    if(result['status']=='error')throw StateError((result['message']??result['details']??'No se pudo crear la trustline.').toString());
    await refreshBalances();
  }
  Future<void> send(String recipient,String amount,{String? memo,String? goalId})async{
    if(!canOperate)throw StateError('Inicia sesión y protege tu wallet antes de enviar.');
    final a=address!,scope=store.target;
    final valid=await engine.call('validate',{'address':recipient}) as Map;
    final n=double.tryParse(amount.replaceAll(',','.'));
    if(valid['valid']!=true)throw const FormatException('Cuenta destino no válida.');
    if(n==null||!n.isFinite||n<=0||!RegExp(r'^\d+(\.\d{1,7})?$').hasMatch(amount.replaceAll(',','.')))throw const FormatException('Importe positivo con hasta 7 decimales.');
    final row=<String,dynamic>{'id':newId(),'goalId':goalId??'','walletOrigen':a,'direccionReceptora':recipient,'assetCode':'USDC','assetIssuer':usdcIssuer,'red':'testnet','importe':n,'estado':'preparado','provider':'pollar','createdAt':DateTime.now().toUtc().toIso8601String(),if(memo?.isNotEmpty==true)'memo':memo};
    Future<void> persist()async{final d=store.dataAt(scope),list=rows(d['aportesStellar']);final i=list.indexWhere((r)=>r['id']==row['id']);if(i<0){list.insert(0,{...row});}else{list[i]={...row};}await store.patchAt(scope,{'aportesStellar':list});await store.commitCritical();}
    await persist();
    try{
      row['estado']='firma_solicitada';await persist();
      final result=await action('pollarSend',{'destination':recipient,'amount':amount.replaceAll(',','.'),'memo':memo},'Revisa y autoriza el envío') as Map;
      if(result['hash'] is String)row['txHash']=result['hash'];
      if(result['request'] is Map)row['requestId']=result['request']['id'];
      if(result['status']=='error'){row['estado']=row['txHash']==null?'fallida':'enviada';row['error']=(result['message']??result['details']??'Pollar rechazó la operación.').toString();await persist();throw StateError(row['error'] as String);}
      row['estado']='enviada';await persist();
      if(row['txHash']!=null){final status=await engine.call('status',{'hash':row['txHash']}) as Map;if(status['successful']!=null){row['estado']=status['successful']==true?'confirmada':'fallida';row['ledger']=status['ledger'];if(status['successful']==true&&status['closedAt']!=null)row['confirmedAt']=status['closedAt'];await persist();}}
      await refreshBalances();
    }catch(e){row['error']=message(e);await persist();rethrow;}
  }
  static String message(Object e)=>e.toString().replaceFirst('Bad state: ','');
  @override void dispose(){disposed=true;timer?.cancel();super.dispose();}
}
