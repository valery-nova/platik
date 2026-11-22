import 'package:flutter/material.dart' hide Text;
import 'i18n.dart';
import 'domain.dart';
import 'pollar.dart';
import 'theme.dart';
import 'flow.dart';
import 'widgets.dart';
Future<void> _approvalAction(BuildContext context,Future<dynamic> Function() fn)async{try{await fn();}catch(e){if(context.mounted)toast(context,PollarService.message(e));}}

class ApprovalCards extends StatelessWidget{
  const ApprovalCards({super.key,required this.service});final PollarService service;
  @override Widget build(BuildContext context)=>ListenableBuilder(listenable:service,builder:(context,_)=>Column(crossAxisAlignment:CrossAxisAlignment.stretch,spacing:12,children:[for(final c in service.confirmations)Paper(color:C.highlight,child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[Text('Autoriza tu operación',style:h(21)),const SizedBox(height:12),const ReviewLine('Red','Stellar Testnet'),for(final op in rows(c['operations']))...[
    ReviewLine('Operación',op['type'] as String? ?? ''),if(op['amount']!=null)ReviewLine('Importe','${op['amount']} ${op['asset']?['code']??'XLM'}'),if(op['destination']!=null)ReviewLine('Destino',op['destination'] as String),
  ],if(c['details'] is Map)...[if(c['details']['destination']!=null)ReviewLine('Destino',c['details']['destination'].toString()),if(c['details']['amount']!=null)ReviewLine('Importe',c['details']['amount'].toString())],const SizedBox(height:16),Row(children:[Expanded(child:OutlinedButton(onPressed:()=>_approvalAction(context,()=>service.answer(c['id'] as String,false)),child:const Text('Rechazar'))),const SizedBox(width:12),Expanded(child:FilledButton(onPressed:c['invalid']==true?null:()=>_approvalAction(context,()=>service.answer(c['id'] as String,true)),child:const Text('Autorizar')))])])),for(final c in rows(service.state['pending']))Paper(child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[Text('Solicitud pendiente',style:h(18)),const SizedBox(height:8),Text('${c['operation']??'Operación de billetera'} · ${c['status']??''}',style:body(13)),const SizedBox(height:14),Row(children:[Expanded(child:OutlinedButton(onPressed:()=>_approvalAction(context,()=>service.action('pollarCosign',{'id':c['id'],'approve':false})),child:const Text('Rechazar'))),const SizedBox(width:12),Expanded(child:FilledButton(onPressed:()=>_approvalAction(context,()=>service.action('pollarCosign',{'id':c['id'],'approve':true})),child:const Text('Aprobar')))])]))]));
}
