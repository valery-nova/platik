import 'package:flutter/material.dart' hide Text;
import 'i18n.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'domain.dart';
import 'store.dart';
import 'wallet.dart';
import 'theme.dart';
import 'widgets.dart';

class StellarPanel extends StatelessWidget{
  const StellarPanel({super.key,required this.store,required this.wallet});final PlatikStore store;final WalletService wallet;
  Future<void> action(BuildContext context,Future<void> Function() work)async{try{await work();}catch(e){if(context.mounted)toast(context,e.toString().replaceFirst('Bad state: ',''));}}
  Future<void> copy(BuildContext context,String value)async{await Clipboard.setData(ClipboardData(text:value));if(context.mounted)toast(context,'Copiado');}
  Future<void> contribute(BuildContext context)async{
    if(store.goals.isEmpty){toast(context,'Crea una meta antes de registrar un aporte.');return;}
    await showDialog<void>(context:context,builder:(context)=>_ContributionDialog(store:store,wallet:wallet));
  }
  @override Widget build(BuildContext context)=>ListenableBuilder(listenable:wallet,builder:(context,_) {
    final a=wallet.address;final balances=wallet.balances;final confirmed=store.contributions.where((r)=>r['estado']=='confirmada').fold<double>(0,(s,r)=>s+number(r['importe']));
    return Group('Ahorro on-chain',subtitle:'USDC de prueba · Stellar Testnet · Sin valor monetario real',children:[
      const Notice('PLATIK prepara las operaciones y tu wallet las autoriza. Las claves privadas y la frase de recuperación permanecen en Varial.'),
      if(wallet.busy)Row(children:[const SizedBox(width:18,height:18,child:CircularProgressIndicator(strokeWidth:2)),const SizedBox(width:10),Expanded(child:Text(wallet.activity,style:body(13)))]),
      if(wallet.error!=null)Notice(wallet.error!,color:C.coral.withValues(alpha:.16),icon:Icons.error_outline),
      if(!wallet.connected)Wrap(spacing:8,runSpacing:8,children:[FilledButton.icon(onPressed:wallet.busy?null:()=>action(context,wallet.connect),icon:const Icon(Icons.account_balance_wallet_outlined),label:const Text('Vincular Varial / Freighter')),TextButton(onPressed:()=>action(context,()=>openExternal('https://varialwallet.com/')),child:const Text('Obtener Varial'))]),
      if(wallet.pairingUri!=null)Paper(color:C.highlight,child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Autoriza la vinculación en Varial',style:h(18)),const SizedBox(height:8),const Text('Copia el enlace de conexión. En Varial abre el escáner de QR, pega el enlace y elige la cuenta de Stellar Testnet. También puedes escanear este QR desde otro dispositivo.'),Center(child:Padding(padding:const EdgeInsets.all(12),child:QrImageView(data:wallet.pairingUri!,version:QrVersions.auto,size:230,backgroundColor:Colors.white))),Wrap(spacing:8,runSpacing:6,children:[FilledButton.tonal(onPressed:()=>copy(context,wallet.pairingUri!),child:const Text('Copiar conexión')),OutlinedButton(onPressed:()=>action(context,()async{await Clipboard.setData(ClipboardData(text:wallet.pairingUri!));await native.invokeMethod<void>('openWallet');}),child:const Text('Abrir Varial')),TextButton(onPressed:wallet.cancelConnection,child:const Text('Cancelar'))])])),
      if(wallet.connected)...[
        Text('Wallet vinculada · Stellar Testnet',style:h(18)),SelectableText(a!,style:body(12)),Wrap(spacing:8,children:[TextButton.icon(onPressed:()=>copy(context,a),icon:const Icon(Icons.copy,size:17),label:const Text('Copiar dirección')),TextButton(onPressed:wallet.busy?null:()=>action(context,wallet.disconnect),child:const Text('Desvincular')),TextButton(onPressed:wallet.loadingBalance||wallet.busy?null:()=>action(context,wallet.refreshBalances),child:Text(wallet.loadingBalance?'Consultando…':'Actualizar saldos'))]),
        StatGrid([Stat('XLM de prueba',balances?['xlm']?.toString()??'—'),Stat('USDC de prueba',balances?['usdc']?.toString()??'Sin trustline')]),
        if(balances?['tieneTrustlineUsdc']!=true)FilledButton.tonal(onPressed:wallet.busy?null:()=>action(context,wallet.trustline),child:const Text('Crear trustline USDC')),
        Wrap(spacing:8,runSpacing:5,children:[OutlinedButton(onPressed:()=>action(context,()=>openExternal('https://friendbot.stellar.org?addr=${Uri.encodeComponent(a)}')),child:const Text('Obtener XLM de prueba')),OutlinedButton(onPressed:()=>action(context,()=>openExternal('https://faucet.circle.com/')),child:const Text('Obtener USDC de prueba')),TextButton(onPressed:()=>action(context,()=>openExternal('https://stellar.expert/explorer/testnet/account/$a')),child:const Text('Ver cuenta en explorer'))]),
        FilledButton.icon(onPressed:wallet.busy?null:()=>contribute(context),icon:const Icon(Icons.savings_outlined),label:const Text('Aportar USDC a una meta')),
      ],
      const Divider(),Text('Historial de aportes',style:h(18)),Text('Confirmado en Horizon: ${confirmed.toStringAsFixed(7).replaceFirst(RegExp(r'0+$'),'').replaceFirst(RegExp(r'\.$'),'')} USDC de prueba',style:body(13)),
      if(store.contributions.isEmpty)Text('Todavía no hay aportes on-chain.',style:body(13,color:C.sub)),
      for(final row in store.contributions)Paper(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('${number(row['importe'])} USDC · ${row['estado']}',style:body(14,w:FontWeight.w800)),Text('Meta: ${store.goals.where((g)=>g['id']==row['goalId']).firstOrNull?['nombre']??'Meta eliminada'}',style:body(12)),SelectableText('Origen: ${row['walletOrigen']}\nDestino: ${row['direccionReceptora']}',style:body(10,color:C.sub)),Text('Creado: ${row['createdAt']}',style:body(11,color:C.sub)),if(row['confirmedAt']!=null)Text('Confirmado: ${row['confirmedAt']} · ledger ${row['ledger']}',style:body(11,color:C.sub)),if(row['error']!=null)Text(row['error'] as String,style:body(12,color:Colors.red.shade800)),if(row['txHash']!=null)...[SelectableText(row['txHash'] as String,style:body(10,color:C.sub)),Wrap(spacing:8,children:[TextButton(onPressed:()=>action(context,()=>openExternal('https://stellar.expert/explorer/testnet/tx/${row['txHash']}')),child:const Text('Ver transacción')),TextButton(onPressed:wallet.busy?null:()=>action(context,()=>wallet.verifyContribution(row)),child:const Text('Reverificar en Horizon'))])],if(['fallida','cancelada'].contains(row['estado'])&&row['txHash']==null)TextButton(onPressed:()async{if(await confirm(context,'Eliminar registro','Este registro no tiene una transacción enviada a Horizon.'))await store.remove('aportesStellar',row['id'] as String);},child:const Text('Eliminar registro'))])),
    ]);
  });
}

class _ContributionDialog extends StatefulWidget{
  const _ContributionDialog({required this.store,required this.wallet});final PlatikStore store;final WalletService wallet;
  @override State<_ContributionDialog> createState()=>_ContributionDialogState();
}
class _ContributionDialogState extends State<_ContributionDialog>{
  final form=GlobalKey<FormState>();final amount=TextEditingController();late final recipient=TextEditingController(text:widget.store.settings['stellarRecipient'] as String? ?? const String.fromEnvironment('STELLAR_TESTNET_RECIPIENT'));
  late String goalId=widget.store.goals.first['id'] as String;String? error;bool busy=false;
  @override void dispose(){amount.dispose();recipient.dispose();super.dispose();}
  Future<void> submit()async{
    if(!form.currentState!.validate())return;
    final goal=widget.store.goals.where((g)=>g['id']==goalId).firstOrNull;if(goal==null){setState(()=>error='La meta ya no existe.');return;}
    if(!await confirm(context,'Confirmar aporte Testnet','Aportar ${amount.text} USDC de prueba a “${goal['nombre']}”.\n\nCuenta receptora:\n${recipient.text.trim()}\n\nVarial mostrará la operación antes de firmarla.'))return;
    setState((){busy=true;error=null;});
    try{await widget.store.setSettings({'stellarRecipient':recipient.text.trim()});await widget.wallet.contribute(goal,amount.text.trim(),recipient.text.trim());if(mounted)Navigator.pop(context);}
    catch(e){if(mounted)setState((){busy=false;error=e.toString().replaceFirst('Bad state: ','');});}
  }
  @override Widget build(BuildContext context)=>PopScope(canPop:!busy,child:AlertDialog(title:const Text('Aportar USDC de prueba'),content:ConstrainedBox(constraints:const BoxConstraints(maxWidth:480),child:SingleChildScrollView(child:Form(key:form,child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.stretch,spacing:14,children:[const Notice('Stellar Testnet · Sin valor monetario real. El aporte no modifica el ahorro local en moneda fiduciaria.'),SelectField(label:'Meta de ahorro',value:goalId,items:{for(final g in widget.store.goals)g['id'] as String:g['nombre'] as String},onChanged:busy?(_){}:(v)=>setState(()=>goalId=v)),TextFormField(controller:amount,enabled:!busy,keyboardType:const TextInputType.numberWithOptions(decimal:true),decoration:InputDecoration(labelText:t('Importe USDC'),hintText:t('Ej. 5,5')),validator:(v){final text=(v??'').trim().replaceAll(',','.');final number=double.tryParse(text);return !RegExp(r'^\d+(\.\d{1,7})?$').hasMatch(text)||number==null||!number.isFinite||number<=0?'Importe positivo con hasta 7 decimales.':null;}),TextFormField(controller:recipient,enabled:!busy,minLines:2,maxLines:3,autocorrect:false,decoration:InputDecoration(labelText:t('Cuenta receptora de ahorro (G…)')),validator:(v)=>RegExp(r'^G[A-Z2-7]{55}$').hasMatch((v??'').trim())?null:'Escribe la dirección pública de la cuenta receptora.'),Text('La cuenta debe existir en Testnet y tener la trustline USDC de Circle. PLATIK valida ambas condiciones antes de solicitar la firma.',style:body(12,color:C.sub)),if(busy)const LinearProgressIndicator(),if(busy)Text(widget.wallet.activity,style:body(12)),if(error!=null)Text(error!,style:TextStyle(color:Colors.red.shade800))])))),actions:[TextButton(onPressed:busy?null:()=>Navigator.pop(context),child:const Text('Cancelar')),FilledButton(onPressed:busy?null:submit,child:Text(busy?'Esperando wallet…':'Continuar y firmar'))]));
}
