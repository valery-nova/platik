import 'dart:convert';
import 'package:http/http.dart' as http;
import 'domain.dart';
import 'store.dart';

class RateService {
  RateService(this.store,{http.Client? client}):client=client??http.Client();
  final PlatikStore store;
  final http.Client client;
  final Map<String,Future<RowData?>> active={};
  static String freshness(RowData? q,{DateTime? now}) {
    if(q==null||q['status']=='unavailable')return 'no_disponible';
    if(q['status']!='valid')return 'desactualizada';
    final date=DateTime.tryParse((q['publishedAt']??q['fetchedAt']??'').toString());
    if(date==null)return 'desactualizada';
    final n=(now??DateTime.now()).toUtc();final d=date.toUtc();
    final days=DateTime.utc(n.year,n.month,n.day).difference(DateTime.utc(d.year,d.month,d.day)).inDays;
    return days<0?'desactualizada':days<=1?'vigente':days<=4?'anterior_vigente':'desactualizada';
  }
  static bool usable(RowData? q)=>['vigente','anterior_vigente'].contains(freshness(q));
  Future<RowData?> _direct(String from,String to,{bool force=false}) async {
    if(from==to)return null;
    final key='$from|$to';final cached=store.cachedRate(key);
    final fetched=DateTime.tryParse(cached?['fetchedAt'] as String? ?? '');
    if(!force&&cached!=null&&fetched!=null&&DateTime.now().difference(fetched).inMinutes<60&&usable(cached))return cached;
    for(var attempt=0;attempt<2;attempt++) {
      try {
        final response=await client.get(Uri.https('api.frankfurter.dev','/v2/rate/$from/$to',{'expand':'providers'})).timeout(const Duration(seconds:8));
        if([400,404,422].contains(response.statusCode))return null;
        if(response.statusCode!=200)throw Exception('HTTP ${response.statusCode}');
        final value=jsonDecode(response.body) as RowData;
        if(value['base']!=from||value['quote']!=to||number(value['rate'])<=0||DateTime.tryParse(value['date'] as String? ?? '')==null)return null;
        final q=<String,dynamic>{'from':from,'to':to,'rate':value['rate'],'provider':'frankfurter','providerName':'Frankfurter (tasas de referencia)','fetchedAt':DateTime.now().toUtc().toIso8601String(),'publishedAt':'${value['date']}T00:00:00Z','rateType':'reference','status':'valid','underlyingProviders':rows(value['providers']).map((r)=>r['key']).whereType<String>().take(8).toList()};
        await store.setRate(key,q);return q;
      } catch(_){if(attempt==0)await Future<void>.delayed(const Duration(milliseconds:400));}
    }
    return cached;
  }
  Future<RowData?> quote(String from,String to,{bool force=false}) async {
    if(from==to)return null;
    final key='$from|$to|$force';
    if(active.containsKey(key))return active[key];
    final future=_quote(from.toUpperCase(),to.toUpperCase(),force:force);active[key]=future;
    try{return await future;}finally{active.remove(key);}
  }
  Future<RowData?> _quote(String from,String to,{bool force=false}) async {
    if(!Catalog.currencies.any((r)=>r['code']==from)||!Catalog.currencies.any((r)=>r['code']==to))return null;
    final direct=await _direct(from,to,force:force);if(usable(direct))return direct;
    for(final pivot in ['USD','EUR']) {
      if(pivot==from||pivot==to)continue;
      final legs=await Future.wait([_direct(from,pivot,force:force),_direct(pivot,to,force:force)]);
      final a=legs[0],b=legs[1];
      if(!usable(a)||!usable(b)||a!['publishedAt']!=b!['publishedAt']||a['provider']!=b['provider']||a['rateType']!=b['rateType'])continue;
      return {'from':from,'to':to,'rate':number(a['rate'])*number(b['rate']),'provider':a['provider'],'providerName':'${a['providerName']} · tasa cruzada vía $pivot','fetchedAt':DateTime.now().toUtc().toIso8601String(),'publishedAt':a['publishedAt'],'rateType':a['rateType'],'viaCurrency':pivot,'legs':legs,'underlyingProviders':{...List<String>.from(a['underlyingProviders'] as List? ?? []),...List<String>.from(b['underlyingProviders'] as List? ?? [])}.toList(),'status':'valid'};
    }
    return direct==null?null:{...direct,'status':'expired'};
  }
  Future<RowData> conversion(String from,String base,double amount) async {
    if(from==base)return {};
    final q=await quote(from,base);if(!usable(q))return {};
    return {'baseAmount':rounded(amount*number(q!['rate']),base),'baseCurrency':base,'exchangeRate':q['rate'],'exchangeRateSource':q['provider'],'exchangeRateDate':q['fetchedAt'],'exchangeRateType':q['rateType'],'exchangeRatePublishedAt':q['publishedAt']};
  }
  Future<(int,int)> refreshPending() async {
    final selectedTarget=store.target;final base=store.currency;var converted=0,pending=0;
    final data=store.data;
    Future<RowData> update(RowData row) async {
      if(row['moneda']==base||validConversion(row,base))return row;
      if(hasSnapshot(row)){pending++;return row;}
      final fields=await conversion(row['moneda'] as String,base,number(row['monto']));
      if(fields.isEmpty){pending++;return row;}converted++;return {...row,...fields};
    }
    final tx=<RowData>[],adjustments=<RowData>[];
    for(final row in rows(data['transactions'])){tx.add(await update(row));}
    for(final row in rows(data['balanceAdjustments'])){adjustments.add(await update(row));}
    final opening=data['openingBalance'] is Map?await update(Map<String,dynamic>.from(data['openingBalance'] as Map)):null;
    if(store.target!=selectedTarget||store.currency!=base)throw StateError('El espacio cambió durante la actualización. Reintenta.');
    // Merge only snapshots into the current records; edits made during network waits are preserved.
    List<RowData> merge(String key,List<RowData> updated) => rows(store.data[key]).map((current){final old=rows(data[key]).where((r)=>r['id']==current['id']).firstOrNull;final next=updated.where((r)=>r['id']==current['id']).firstOrNull;return old!=null&&next!=null&&jsonEncode(old)==jsonEncode(current)?next:current;}).toList();
    final currentOpening=store.data['openingBalance'];
    await store.patch({'transactions':merge('transactions',tx),'balanceAdjustments':merge('balanceAdjustments',adjustments),'openingBalance':jsonEncode(currentOpening)==jsonEncode(data['openingBalance'])?opening:currentOpening});
    return (converted,pending);
  }
}
