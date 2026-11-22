import 'dart:convert';
import 'package:flutter/material.dart' hide Text;
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'i18n.dart';
import 'domain.dart';
import 'store.dart';
import 'pollar.dart';
import 'theme.dart';
import 'widgets.dart';
import 'flow.dart';
import 'wallet_approval.dart';

String usdc(num n)=>n.toStringAsFixed(7).replaceFirst(RegExp(r'0+$'),'').replaceFirst(RegExp(r'\.$'),'');
String shortAddress(String a)=>a.length>16?'${a.substring(0,7)}…${a.substring(a.length-7)}':a;
Future<void> walletAction(BuildContext context,Future<dynamic> Function() action)async{try{await action();}catch(e){if(context.mounted)toast(context,PollarService.message(e));}}

typedef SendUsdc=Future<void> Function(String destination,String amount,String? memo,String? goal);
class ReceiveUsdcDialog extends StatefulWidget{
  const ReceiveUsdcDialog({super.key,required this.store,required this.address,required this.sync});final PlatikStore store;final String address;final Future<void> Function(String?) sync;
  @override State<ReceiveUsdcDialog> createState()=>_ReceiveUsdcDialogState();
}
class _ReceiveUsdcDialogState extends State<ReceiveUsdcDialog>{
  int step=0;String goal='';bool busy=false;String? error;final amount=TextEditingController();
  @override void dispose(){amount.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>FlowPanel(title:'Recibir USDC',icon:Icons.south_west_rounded,step:step,steps:2,heading:step==0?'Esta es tu dirección':'Dale un destino a tu ahorro',subtitle:step==0?'Stellar Testnet · USDC de prueba de Circle':'La meta y el importe esperado son referencias opcionales.',busy:busy,error:error,nextLabel:step==0?'Elegir una meta':'Verificar depósitos',onClose:()=>Navigator.pop(context),onBack:()=>setState(()=>step--),onNext:()async{if(step==0){setState(()=>step=1);return;}setState((){busy=true;error=null;});try{await widget.sync(goal.isEmpty?null:goal);if(context.mounted){Navigator.pop(context);toast(context,'Consulta de depósitos completada.');}}catch(e){if(mounted)setState((){busy=false;error=PollarService.message(e);});}},child:step==0?Column(crossAxisAlignment:CrossAxisAlignment.stretch,spacing:16,children:[
    Center(child:Container(padding:const EdgeInsets.all(13),decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(20)),child:QrImageView(data:widget.address,size:190,backgroundColor:Colors.white))),
    SelectableText(widget.address,textAlign:TextAlign.center,style:body(11)),
    OutlinedButton.icon(onPressed:()async{await Clipboard.setData(ClipboardData(text:widget.address));if(context.mounted)toast(context,'Dirección copiada');},icon:const Icon(Icons.copy_outlined,size:18),label:const Text('Copiar dirección')),
    if(amount.text.trim().isNotEmpty)ReviewLine('Importe esperado',amount.text.trim()+' USDC'),
    Text('Puedes copiar la dirección o escanear el código desde otra wallet.',textAlign:TextAlign.center,style:body(12,color:C.sub)),
  ]):Column(crossAxisAlignment:CrossAxisAlignment.stretch,spacing:20,children:[
    SelectField(label:'Meta de ahorro (opcional)',value:goal,items:{'':'Sin clasificar todavía',for(final g in widget.store.goals)g['id'] as String:g['nombre'] as String},onChanged:(v)=>setState(()=>goal=v)),
    TextField(controller:amount,keyboardType:const TextInputType.numberWithOptions(decimal:true),decoration:InputDecoration(labelText:t('Importe esperado (opcional)'),suffixText:'USDC')),
    const Notice('Solo se registran importes reales verificados en Stellar. La meta clasifica el depósito y no vuelve a mover fondos.'),
  ]));
}

class SendUsdcDialog extends StatefulWidget{
  const SendUsdcDialog({super.key,required this.store,required this.source,required this.send,this.pollar});final PlatikStore store;final String source;final SendUsdc send;final PollarService? pollar;
  @override State<SendUsdcDialog> createState()=>_SendUsdcDialogState();
}
class _SendUsdcDialogState extends State<SendUsdcDialog>{
  final amount=TextEditingController(),recipient=TextEditingController(),memo=TextEditingController();String goal='';int step=0;String? error;bool busy=false;
  @override void dispose(){amount.dispose();recipient.dispose();memo.dispose();super.dispose();}
  Future<void> next()async{
    setState(()=>error=null);
    if(step==0){final address=recipient.text.trim();if(!RegExp(r'^G[A-Z2-7]{55}$').hasMatch(address)||address==widget.source){setState(()=>error='Escribe una dirección Stellar distinta de tu cuenta origen.');return;}}
    if(step==1){final raw=amount.text.trim().replaceAll(',','.'),n=double.tryParse(amount.text.trim().replaceAll(',','.'));if(!RegExp(r'^\d+(\.\d{1,7})?$').hasMatch(raw)||n==null||!n.isFinite||n<=0||n>922337203685.4775){setState(()=>error='Importe positivo con hasta 7 decimales.');return;}final balance=double.tryParse(widget.pollar?.balances?['usdc'] as String? ?? '');if(balance!=null&&n>balance){setState(()=>error='Tu saldo USDC es insuficiente para este envío.');return;}}
    if(step==2&&utf8.encode(memo.text.trim()).length>28){setState(()=>error='El memo debe tener como máximo 28 bytes.');return;}
    if(step<3){FocusManager.instance.primaryFocus?.unfocus();setState(()=>step++);return;}
    setState(()=>busy=true);
    try{await widget.send(recipient.text.trim(),amount.text.trim(),memo.text.trim().isEmpty?null:memo.text.trim(),goal.isEmpty?null:goal);if(context.mounted){Navigator.pop(context);toast(context,'Envío procesado. Consulta la confirmación en el historial.');}}
    catch(e){if(mounted)setState((){busy=false;error=PollarService.message(e);});}
  }
  @override Widget build(BuildContext context){final pages=<({String title,String sub,Widget body})>[
    (title:'¿A qué cuenta vas a enviar?',sub:'Utiliza una dirección pública Stellar en Testnet.',body:TextField(controller:recipient,autocorrect:false,minLines:2,maxLines:3,decoration:InputDecoration(labelText:t('Cuenta destino (G…)'),prefixIcon:const Icon(Icons.person_outline_rounded)))),
    (title:'¿Cuánto vas a enviar?',sub:'USDC de prueba · Sin valor monetario real',body:Column(crossAxisAlignment:CrossAxisAlignment.stretch,spacing:17,children:[TextField(controller:amount,keyboardType:const TextInputType.numberWithOptions(decimal:true),style:h(36),decoration:InputDecoration(labelText:t('Importe USDC'),hintText:'0.00',suffixText:'USDC')),if(widget.pollar?.balances?['usdc']!=null)Text('Disponible: '+widget.pollar!.balances!['usdc'].toString()+' USDC',style:body(12,color:C.sub))])),
    (title:'Los detalles del envío',sub:'Opcional. Algunos destinatarios necesitan un memo para identificar el pago.',body:Column(spacing:20,children:[TextField(controller:memo,autocorrect:false,decoration:InputDecoration(labelText:t('Memo (opcional)'))),SelectField(label:'Meta de ahorro (opcional)',value:goal,items:{'':'Sin meta',for(final g in widget.store.goals)g['id'] as String:g['nombre'] as String},onChanged:(v)=>setState(()=>goal=v))])),
    (title:busy?'Autoriza tu envío':'Revisa antes de enviar',sub:busy?'La firma se autoriza antes de enviar la operación a Stellar.':'Asegúrate de que la cuenta, la red y el importe sean correctos.',body:Column(crossAxisAlignment:CrossAxisAlignment.stretch,spacing:15,children:[Paper(color:C.highlight,child:Column(children:[ReviewLine('Red','Stellar Testnet'),ReviewLine('Importe',amount.text.trim()+' USDC'),ReviewLine('Destino',recipient.text.trim()),ReviewLine('Memo',memo.text.trim().isEmpty?'Sin memo':memo.text.trim()),if(goal.isNotEmpty)ReviewLine('Meta',widget.store.goals.where((g)=>g['id']==goal).firstOrNull?['nombre'] as String? ?? '')])),if(widget.pollar!=null)ApprovalCards(service:widget.pollar!),if(busy)const Text('Consulta el historial antes de repetir un envío que esté pendiente.')]),),
  ];return PopScope(canPop:!busy&&step==0,onPopInvokedWithResult:(didPop,result){if(!didPop&&!busy&&step>0)setState(()=>step--);},child:FlowPanel(title:'Enviar USDC',icon:Icons.north_east_rounded,color:C.petroleum,step:step,steps:4,heading:pages[step].title,subtitle:pages[step].sub,nextLabel:step==3?'Continuar con la firma':null,busy:busy,error:error,onClose:()=>Navigator.pop(context),onBack:()=>setState(()=>step--),onNext:next,child:pages[step].body));}
}

class DepositList extends StatelessWidget{
  const DepositList({super.key,required this.store,required this.address,this.selectedId});final PlatikStore store;final String address;final String? selectedId;
  @override Widget build(BuildContext context){final list=store.deposits.where((d)=>d['walletAddress']==address&&(selectedId==null||d['id']==selectedId)).toList();return Column(crossAxisAlignment:CrossAxisAlignment.stretch,spacing:12,children:[
    Text('Depósitos USDC verificados',style:h(18)),
    if(list.isEmpty)const Text('Aún no hay depósitos USDC verificados para esta wallet.'),
    for(final d in list)Paper(child:Column(crossAxisAlignment:CrossAxisAlignment.start,spacing:8,children:[
      Text('${usdc(number(d['importe']))} USDC · ${d['estado']}',style:h(17)),
      Text('Fecha: ${d['createdAt']}\n${d['confirmedAt']==null?'':'Confirmado: ${d['confirmedAt']} · ledger ${d['ledger']}'}',style:body(11,color:C.sub)),
      Text('Origen: ${shortAddress(d['originAddress'] as String? ?? '')}\nDestino: ${shortAddress(d['destinationAddress'] as String? ?? '')}',style:body(11)),
      SelectField(label:'Asignar a meta',value:store.goals.any((g)=>g['id']==d['goalId'])?d['goalId'] as String:'',items:{'':'Sin meta',for(final g in store.goals)g['id'] as String:g['nombre'] as String},onChanged:(v){final next={...d};if(v.isEmpty){next.remove('goalId');}else{next['goalId']=v;}store.upsertDeposits(store.target,[next]);}),
      Wrap(spacing:8,children:[TextButton(onPressed:()=>walletAction(context,()=>openExternal('https://stellar.expert/explorer/testnet/tx/${d['txHash']}')),child:const Text('Ver transacción')),if(d['originAddress']!=null)TextButton(onPressed:()=>walletAction(context,()=>openExternal('https://stellar.expert/explorer/testnet/account/${d['originAddress']}')),child:const Text('Ver origen'))]),
    ])),
    if(list.isNotEmpty)const Text('Asignar una meta clasifica el depósito. No vuelve a mover fondos ni suma USDC a importes en moneda fiduciaria.'),
  ]);}
}

class SavingsRecommendation extends StatefulWidget{
  const SavingsRecommendation({super.key,required this.store});final PlatikStore store;
  @override State<SavingsRecommendation> createState()=>_SavingsRecommendationState();
}
class _SavingsRecommendationState extends State<SavingsRecommendation>{
  bool hidden=false,accepted=false,editing=false;final amount=TextEditingController();
  @override void dispose(){amount.dispose();super.dispose();}
  @override Widget build(BuildContext context){final s=widget.store,summary=PeriodSummary(widget.store.transactions,widget.store.currency,today(30),today());final proposed=rounded(summary.profit*.2,s.currency);
    if(hidden||summary.profit<=0||summary.pending>0||proposed<=0)return const SizedBox.shrink();
    return Group('Recomendación de ahorro',subtitle:'Basada en los últimos 30 días de movimientos. No ejecuta transferencias ni convierte moneda.',children:[
      Text('Podrías destinar ${money(proposed,s.currency)} a tus ahorros digitales: 20% de un excedente registrado de ${money(summary.profit,s.currency)}.'),
      if(editing)TextField(controller:amount,keyboardType:const TextInputType.numberWithOptions(decimal:true),decoration:InputDecoration(labelText:t('Modificar importe sugerido'))),
      if(accepted)Text('Referencia guardada: ${money(double.tryParse(amount.text.replaceAll(',','.'))??proposed,s.currency)}. PLATIK no mueve fondos ni convierte moneda.'),
    ],actions:[if(!accepted&&!editing)...[FilledButton(onPressed:()=>setState(()=>accepted=true),child:const Text('Aceptar sugerencia')),OutlinedButton(onPressed:()=>setState((){editing=true;amount.text=proposed.toString();}),child:const Text('Modificar')),TextButton(onPressed:()=>setState(()=>hidden=true),child:const Text('Rechazar'))],if(editing)...[FilledButton(onPressed:(){final n=double.tryParse(amount.text.replaceAll(',','.'));if(n==null||!n.isFinite||n<=0){toast(context,'Escribe un importe positivo.');return;}setState((){amount.text=rounded(n,s.currency).toString();accepted=true;editing=false;});},child:const Text('Guardar referencia')),TextButton(onPressed:()=>setState(()=>editing=false),child:const Text('Cancelar'))]]);
  }
}
