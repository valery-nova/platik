import 'package:flutter_test/flutter_test.dart';
import 'package:platik_flutter/domain.dart';
import 'package:platik_flutter/store.dart';
import 'package:platik_flutter/wallet.dart';
import 'package:platik_flutter/pollar.dart';
import 'package:platik_flutter/screens_finance.dart';

class StubEngine extends StellarEngine{
  RowData value={};
  @override Future<dynamic> call(String method,[RowData params=const {}])async=>method=='pollarAppConfig'?{'application':{'network':'testnet'}}:value;
}
void main(){
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(()async{await Catalog.load();TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(native,(call)async=>null);});
  test('Financial spaces separate movements, inherit only the profile and enforce two ventures',()async{
    final s=PlatikStore({});await s.setProfile({...s.profile,'moneda':'USD','countryCode':'US','nombreUsuario':'Ana'});
    await s.upsert('transactions',{'id':'personal','tipo':'ingreso','monto':50,'moneda':'USD','fecha':today()});
    expect(await s.createVenture('Estudio','freelance'),true);final a=s.spaceId;
    expect(s.transactions,isEmpty);expect(s.currency,'USD');expect(s.profile['nombreUsuario'],'Ana');expect(s.profile['tipoUsuario'],'freelancer');
    await s.upsert('transactions',{'id':'estudio','tipo':'ingreso','monto':20,'moneda':'USD','fecha':today()});
    expect(await s.createVenture('Tienda','negocio'),true);expect(await s.createVenture('Tercero','emprendimiento'),false);
    await s.selectSpace(a);expect(s.transactions.single['id'],'estudio');await s.renameVenture(a,'Mi estudio');expect(s.profile['nombreNegocio'],'Mi estudio');
    await s.selectSpace('personal');expect(s.transactions.single['id'],'personal');
    await s.switchMode('demo');expect(s.spaceId,'personal');expect(s.ventures,isEmpty);expect(s.transactions.length,32);
  });
  test('Network results are written to the original space after switching',()async{
    final s=PlatikStore({}),scope=('beta','personal');await s.createVenture('Tienda','negocio');
    await s.upsertAt(scope,'aportesStellar',{'id':'send','importe':1,'estado':'enviada'});
    expect(s.contributions,isEmpty);await s.selectSpace('personal');expect(s.contributions.single['id'],'send');
  });
  test('Removed spaces cannot be recreated by late network results',()async{
    final s=PlatikStore({});await s.createVenture('Tienda','negocio');final scope=s.target;await s.deleteVenture(s.spaceId);
    expect(()=>s.patchAt(scope,{'transactions':[]}),throwsStateError);
  });
  test('One incoming Horizon operation can belong to only one space per mode',()async{
    final s=PlatikStore({}),deposit={'id':'usdc-operation-1','txHash':'hash','importe':5,'estado':'confirmado'};
    await s.upsertDeposits(s.target,[deposit]);await s.createVenture('Tienda','negocio');final venture=s.target;
    await s.upsertDeposits(venture,[deposit]);expect(s.deposits,isEmpty);
    await s.selectSpace('personal');await s.reset();await s.upsertDeposits(venture,[deposit]);await s.selectSpace(venture.$2);expect(s.deposits.single['id'],deposit['id']);
  });
  test('Deleting a space releases deposit ownership and keeps personal money',()async{
    final s=PlatikStore({});await s.upsert('transactions',{'id':'personal','tipo':'ingreso','monto':50,'moneda':'BOB','fecha':today()});await s.createVenture('Tienda','negocio');
    final d={'id':'usdc-op','importe':2,'estado':'confirmado'};await s.upsertDeposits(s.target,[d]);await s.deleteVenture(s.spaceId);await s.upsertDeposits(s.target,[d]);expect(s.deposits.single['id'],'usdc-op');expect(s.transactions.single['id'],'personal');
  });
  test('The dashboard avoids counting a received transaction twice',()async{
    final s=PlatikStore({});await s.patch({'depositosUsdc':[{'id':'a','txHash':'same','importe':3,'estado':'confirmado'},{'id':'b','txHash':'other','importe':4,'estado':'pendiente'}],'aportesStellar':[{'id':'c','txHash':'same','importe':3,'estado':'confirmada'},{'id':'d','txHash':'different','importe':2,'estado':'confirmada'}]});
    expect(digitalSavings(s),'5');expect(digitalCount(s),2);expect(s.balance.amount,isNull);
  });
  test('Pollar sensitive actions require a server-verified session and recovery',()async{
    final s=PlatikStore({}),engine=StubEngine();final p=PollarService(s,engine:engine,autoPoll:false);
    engine.value={'step':'authenticated','verified':false,'wallets':[{'chain':'STELLAR','address':usdcIssuer}],'hasWallet':true,'recovery':{'required':true,'configured':true}};
    await p.refresh();expect(p.authenticated,false);expect(p.canOperate,false);
    engine.value={...engine.value,'verified':true,'recovery':{'required':true,'configured':false}};await p.refresh();expect(p.canOperate,false);
    engine.value={...engine.value,'recovery':{'required':true,'configured':true}};await p.refresh();expect(p.canOperate,true);p.dispose();
  });
  test('The bundled mobile Project ID is complete and valid',(){expect(RegExp(r'^[a-f0-9]{32}$').hasMatch(WalletService.projectId),true);});
}
