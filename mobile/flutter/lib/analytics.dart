import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'domain.dart';

/// Uses the website's event names and strict property allowlist.
/// No amounts, descriptions, email addresses or wallet addresses are captured.
class PlatikAnalytics{
  PlatikAnalytics(this.distinctId,{http.Client? client,bool? release}):client=client??http.Client(),release=release??kReleaseMode;
  final String distinctId;final http.Client client;final bool release;
  final String sessionId=uuid();
  static const allowed={'path','mode','option','tipo','moneda','reason','feature','stage','network','source','filter','has_conversion'};
  static String uuid(){final r=Random.secure(),b=List.generate(16,(_)=>r.nextInt(256));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;final h=b.map((n)=>n.toRadixString(16).padLeft(2,'0')).join();return '${h.substring(0,8)}-${h.substring(8,12)}-${h.substring(12,16)}-${h.substring(16,20)}-${h.substring(20)}';}
  static RowData properties(RowData input)=>{for(final e in input.entries)if(allowed.contains(e.key)&&(e.value is String||e.value is num||e.value is bool)&&e.value!='')e.key:e.value};
  Future<void> capture(String event,RowData input,{bool enabled=true})async{
    if(!enabled||!release)return;
    final config=Catalog.source['analytics'];if(config is! Map||config['token'] is! String)return;
    final host=Uri.tryParse(config['host'] as String? ?? '');if(host==null||host.scheme!='https'||!['us.i.posthog.com','eu.i.posthog.com'].contains(host.host))return;
    try{await client.post(host.resolve('/i/v0/e/'),headers:{'Content-Type':'application/json'},body:jsonEncode({'api_key':config['token'],'event':event,'distinct_id':distinctId,'timestamp':DateTime.now().toUtc().toIso8601String(),'properties':{...properties(input),r'$session_id':sessionId,r'$device_type':'Mobile',r'$os':'Android',r'$browser':'PLATIK Android',r'$lib':'flutter',r'$process_person_profile':false}})).timeout(const Duration(seconds:4));}catch(_){/* Analytics never interrupts financial work. */}
  }
}
