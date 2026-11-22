import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:platik_flutter/analytics.dart';
import 'package:platik_flutter/domain.dart';
void main(){
 TestWidgetsFlutterBinding.ensureInitialized();setUpAll(Catalog.load);
 test('Analytics excludes private financial and authentication fields',(){expect(PlatikAnalytics.properties({'tipo':'ingreso','moneda':'BOB','amount':500,'email':'private@example.com','walletAddress':'private','description':'private','mode':'beta'}),{'tipo':'ingreso','moneda':'BOB','mode':'beta'});});
 test('Opt-out prevents requests and enabled capture retains only allowed fields',()async{var calls=0;final c=MockClient((r)async{calls++;final b=jsonDecode(r.body) as Map;expect(b['properties']['moneda'],'BOB');expect(b['properties'].containsKey('email'),false);return http.Response('{}',200);});final a=PlatikAnalytics('anonymous-test',client:c,release:true);await a.capture('transaction_created',{'moneda':'BOB','email':'private'},enabled:false);expect(calls,0);await a.capture('transaction_created',{'moneda':'BOB','email':'private'});expect(calls,1);c.close();});
}
