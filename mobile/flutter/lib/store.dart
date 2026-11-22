import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'domain.dart';
import 'analytics.dart';

const native = MethodChannel('platik/storage');
class PlatikStore extends ChangeNotifier {
  PlatikStore(RowData saved) { root = migrate(saved);root['settings']={...settings,'analyticsId':settings['analyticsId']??PlatikAnalytics.uuid()};analytics=PlatikAnalytics(settings['analyticsId'] as String); }
  late RowData root;
  late final PlatikAnalytics analytics;
  void track(String event,[RowData properties=const {}])=>unawaited(analytics.capture(event,{'mode':mode,...properties},enabled:settings['analyticsEnabled']!=false));
  void trackPage(String path){if(path.startsWith('/admin'))return;track('page_view',{'path':path});if(path=='/panel')track('dashboard_viewed',{'path':path});if(path=='/panel/analisis')track('analysis_viewed',{'path':path});}
  String? storageError;
  bool loadFailed=false;
  Future<void> pendingWrite = Future.value();
  static Future<PlatikStore> load() async {
    await Catalog.load();
    try {
      final raw=await native.invokeMethod<String>('read');
      return PlatikStore(raw == null ? {} : Map<String,dynamic>.from(jsonDecode(raw) as Map));
    } catch (_) { final store=PlatikStore({});store.loadFailed=true;store.storageError='No se pudieron cargar los datos. El archivo original se conserva; reinicia la app antes de registrar cambios.';return store; }
  }
  static RowData migrate(RowData saved) {
    if(saved['schema']==2&&saved['modes'] is Map) return saved;
    final root=<String,dynamic>{'schema':2,'mode':'beta','started':false,'modes':{'demo':Catalog.fresh(true),'beta':Catalog.fresh(false)},'rates':<String,dynamic>{},'settings':<String,dynamic>{}};
    if(saved['movements'] is List||saved['goals'] is List||saved['name']!=null) {
      final data=Map<String,dynamic>.from(root['modes']['beta'] as Map);
      final currency=saved['currency'] as String? ?? 'BOB';
      data['profile']={...Map<String,dynamic>.from(data['profile'] as Map),'nombreUsuario':saved['name']??'','moneda':currency,'onboardingDone':true,'betaSetupDone':true};
      data['transactions']=rows(saved['movements']).map((r)=>{'id':newId(),'tipo':['ingreso','costo','gasto'][(r['kind'] as int? ?? 0).clamp(0,2)],'monto':number(r['amount'])/100,'moneda':currency,'categoria':'Otros ${r['kind']==0?'ingresos':r['kind']==1?'costos':'gastos'}','descripcion':r['title']??'Movimiento anterior','fecha':today()}).toList();
      data['goals']=rows(saved['goals']).map((r)=>{'id':newId(),'nombre':r['title']??'Meta anterior','montoObjetivo':number(r['amount'])/100,'ahorroAcumulado':number(r['saved'])/100,'moneda':currency}).toList();
      root['modes']['beta']=data;root['started']=true;root['legacyBackup']=saved;
    }
    return root;
  }
  String get mode=>root['mode'] as String? ?? 'beta';
  bool get demo=>mode=='demo';
  bool get started=>root['started']==true;
  RowData spacesFor(String mode) {
    root['spaces']??=<String,dynamic>{};
    root['spaces'][mode]??={'active':'personal','ventures':<RowData>[],'data':<String,dynamic>{}};
    return Map<String,dynamic>.from(root['spaces'][mode] as Map);
  }
  String get spaceId=>spacesFor(mode)['active'] as String? ?? 'personal';
  (String,String) get target=>(mode,spaceId);
  List<RowData> get ventures=>rows(spacesFor(mode)['ventures']);
  String get spaceName=>spaceId=='personal'?'Personal':ventures.where((v)=>v['id']==spaceId).firstOrNull?['nombre'] as String? ?? 'Personal';
  RowData dataAt((String,String) scope) {
    final raw=scope.$2=='personal'?root['modes'][scope.$1]:spacesFor(scope.$1)['data'][scope.$2];
    if(raw is! Map)throw StateError('El espacio financiero ya no existe.');
    return Map<String,dynamic>.from(raw);
  }
  void replaceAt((String,String) scope,RowData value) {
    dataAt(scope); // Never recreate a space removed during a network request.
    if(scope.$2=='personal'){root['modes'][scope.$1]=value;}
    else{root['spaces'][scope.$1]['data'][scope.$2]=value;}
  }
  List<(String,String)> get allTargets=>[for(final m in ['demo','beta'])...( <(String,String)>[(m,'personal'),for(final v in rows(spacesFor(m)['ventures']))(m,v['id'] as String)])];
  RowData get data=>dataAt(target);
  RowData get profile=>Map<String,dynamic>.from(data['profile'] as Map);
  RowData get settings=>Map<String,dynamic>.from(root['settings'] as Map? ?? {});
  String get currency=>profile['moneda'] as String? ?? 'BOB';
  List<RowData> get transactions=>rows(data['transactions']);
  List<RowData> get goals=>rows(data['goals']);
  List<RowData> get distribution=>rows(data['distribution']);
  List<RowData> get adjustments=>rows(data['balanceAdjustments']);
  List<RowData> get contributions=>rows(data['aportesStellar']);
  List<RowData> get deposits=>rows(data['depositosUsdc']);
  AvailableBalance get balance=>AvailableBalance(data,currency);
  Future<void> save() {
    if(loadFailed)throw StateError(storageError!);
    final snapshot=jsonEncode(root);
    notifyListeners();
    pendingWrite=pendingWrite.then((_) async {
      try {await native.invokeMethod<void>('write',snapshot);if(storageError!=null){storageError=null;notifyListeners();}}
      catch(_){storageError='No se pudieron guardar los cambios. Conserva la app abierta y reintenta.';notifyListeners();}
    });
    return pendingWrite;
  }
  Future<void> patchAt((String,String) scope,RowData changes){replaceAt(scope,{...dataAt(scope),...changes});return save();}
  Future<void> patch(RowData changes)=>patchAt(target,changes);
  Future<void> commitCritical() async {if(loadFailed)throw StateError(storageError!);await pendingWrite;await native.invokeMethod<void>('write',jsonEncode(root));}
  Future<void> setProfile(RowData value){if(value['onboardingDone']==true&&profile['onboardingDone']!=true)track('onboarding_completed',{'option':value['onboardingOption'],'moneda':value['moneda']});return patch({'profile':value});}
  Future<void> setSettings(RowData changes){root['settings']={...settings,...changes};return save();}
  Future<void> switchMode(String value){root['mode']=value;root['started']=true;if(value=='demo')track('demo_started');trackPage('/panel');return save();}
  Future<void> selectSpace(String id){if(id!='personal'&&!ventures.any((v)=>v['id']==id))throw StateError('Espacio no válido.');root['spaces'][mode]['active']=id;return save();}
  Future<bool> createVenture(String name,String type) async {
    final clean=name.trim();if(clean.length<2||clean.length>60||ventures.length>=2||!['emprendimiento','negocio','freelance'].contains(type))return false;
    final id=newId(),userType=type=='freelance'?'freelancer':type=='negocio'?'empresa':'emprendedor';
    final personal=dataAt((mode,'personal'))['profile'] as Map;
    final next=Catalog.fresh(false);
    next['profile']={...personal,'nombreNegocio':clean,'tipoUsuario':userType,'onboardingDone':true,'betaSetupDone':true};
    next['distribution']=Catalog.defaults(userType);
    final s=spacesFor(mode);s['ventures']=[...ventures,{'id':id,'nombre':clean,'tipo':type}];s['data'][id]=next;s['active']=id;root['spaces'][mode]=s;await save();return true;
  }
  Future<void> renameVenture(String id,String name){final clean=name.trim();if(clean.length<2||clean.length>60)throw const FormatException('Nombre de 2 a 60 caracteres.');final s=spacesFor(mode);s['ventures']=ventures.map((v)=>v['id']==id?{...v,'nombre':clean}:v).toList();root['spaces'][mode]=s;final scope=(mode,id);final d=dataAt(scope);replaceAt(scope,{...d,'profile':{...d['profile'] as Map,'nombreNegocio':clean}});return save();}
  Future<void> deleteVenture(String id){final s=spacesFor(mode);s['ventures']=ventures.where((v)=>v['id']!=id).toList();(s['data'] as Map).remove(id);if(s['active']==id)s['active']='personal';root['spaces'][mode]=s;return save();}
  Future<void> reset(){
    final next=Catalog.fresh(demo&&spaceId=='personal');
    if(spaceId!='personal'){next['profile']={...profile,'onboardingDone':true,'betaSetupDone':true};next['distribution']=Catalog.defaults(profile['tipoUsuario'] as String?);}
    replaceAt(target,next);return save();
  }
  Future<void> upsert(String collection,RowData row)=>upsertAt(target,collection,row);
  Future<void> upsertAt((String,String) scope,String collection,RowData row)async{
    final list=rows(dataAt(scope)[collection]);final index=list.indexWhere((r)=>r['id']==row['id']);
    final prior=index<0?null:list[index];
    if(index<0){list.insert(0,{'id':newId(),...row});}else{list[index]=row;}
    await patchAt(scope,{collection:list});
    final props={'mode':scope.$1,'moneda':row['moneda'],'tipo':row['tipo'],'has_conversion':validConversion(row,currency)};
    if(collection=='transactions'&&prior==null){track('transaction_created',props);track(row['tipo']=='ingreso'?'income_created':'expense_created',props);}
    if(collection=='goals'&&prior==null)track('goal_created',props);
    if(collection=='goals'&&prior!=null&&number(row['ahorroAcumulado'])>number(prior['ahorroAcumulado']))track('goal_contribution_completed',{'mode':scope.$1,'moneda':row['moneda'],'source':'local'});
  }
  Future<void> remove(String collection,String id)=>patch({collection:rows(data[collection]).where((r)=>r['id']!=id).toList()});
  Future<void> upsertDeposits((String,String) scope,List<RowData> values) async {
    final owners=<String,String>{};
    for(final other in allTargets.where((s)=>s.$1==scope.$1&&s!=scope)){for(final d in rows(dataAt(other)['depositosUsdc'])){owners[d['id'] as String]=other.$2;}}
    final list=rows(dataAt(scope)['depositosUsdc']).where((d)=>!owners.containsKey(d['id'])).toList();
    for(final d in values){if(owners.containsKey(d['id']))continue;final i=list.indexWhere((v)=>v['id']==d['id']);if(d['estado']=='confirmado'&&(i<0||list[i]['estado']!='confirmado'))track('usdc_deposit_completed',{'mode':scope.$1,'network':'testnet','source':'horizon'});if(i<0){list.add(d);}else{list[i]=d;}}
    await patchAt(scope,{'depositosUsdc':list});
  }
  Future<void> setRate(String key,RowData value){root['rates']={...Map<String,dynamic>.from(root['rates'] as Map? ?? {}),key:value};return save();}
  RowData? cachedRate(String key){final raw=root['rates']?[key];return raw is Map?Map<String,dynamic>.from(raw):null;}
  String exportData()=>const JsonEncoder.withIndent('  ').convert({'version':1,'mode':mode,'data':data,'customized':true});
  Future<void> importData(String text) async {
    final decoded=jsonDecode(text);final candidate=decoded is Map&&decoded['data'] is Map?decoded['data']:decoded;
    if(candidate is! Map||candidate['profile'] is! Map||candidate['transactions'] is! List||candidate['goals'] is! List||candidate['distribution'] is! List) throw const FormatException('El respaldo no tiene el formato de PLATIK.');
    final next=Map<String,dynamic>.from(candidate);final code=next['profile']['moneda'];
    if(!Catalog.currencies.any((r)=>r['code']==code))throw const FormatException('Moneda principal no válida.');
    for(final row in rows(next['transactions'])){if(row['id'] is! String||!['ingreso','gasto','costo'].contains(row['tipo'])||row['monto'] is! num||number(row['monto'])<=0||row['fecha'] is! String)throw const FormatException('El respaldo contiene movimientos no válidos.');}
    next['openingBalance']??=null;next['balanceAdjustments']??=[];next['aportesStellar']??=[];next['depositosUsdc']??=[];
    final owned={for(final s in allTargets.where((s)=>s.$1==mode&&s!=target))for(final d in rows(dataAt(s)['depositosUsdc']))d['id']};
    next['depositosUsdc']=rows(next['depositosUsdc']).where((d)=>!owned.contains(d['id'])).toList();
    replaceAt(target,next);await save();
  }
}

Future<void> openExternal(String url) async {
  final uri=Uri.tryParse(url);
  if(uri==null||!['https','wc','freighter','varial','web+stellar','market'].contains(uri.scheme))throw const FormatException('Enlace no permitido.');
  await native.invokeMethod<void>('openUrl',url);
}
