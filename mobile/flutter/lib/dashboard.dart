import 'package:flutter/material.dart' hide Text;
import 'package:intl/intl.dart';
import 'i18n.dart';
import 'domain.dart';
import 'store.dart';
import 'rates.dart';
import 'theme.dart';
import 'tempo_ui.dart';
import 'flow.dart';
import 'widgets.dart';
import 'screens_finance.dart';
import 'welcome.dart';

class StorePage extends StatelessWidget{
  const StorePage({super.key,required this.store,required this.title,required this.builder});final PlatikStore store;final String title;final WidgetBuilder builder;
  @override Widget build(BuildContext context)=>DetailPage(title:title,child:ListenableBuilder(listenable:store,builder:(context,_)=>builder(context)));
}
void openBalance(BuildContext context,PlatikStore store,RateService rates)=>openPlatikPage(context,StorePage(store:store,title:'Saldo y ajustes',builder:(context)=>PageBody(title:'',children:[BalanceCard(store:store,rates:rates,editable:true),PendingRates(store:store,rates:rates)])));

Future<void> addMovement(BuildContext context,PlatikStore store,RateService rates,{String? kind,RowData? current})async{
  final scope=store.target;
  final row=await recordForm(context,rates,type:'transaction',current:current,currency:store.currency,initialKind:kind);
  if(row==null||scope!=store.target)return;
  await store.upsertAt(scope,'transactions',row);
  if(context.mounted)toast(context,'Movimiento guardado');
}

class HomeDashboard extends StatelessWidget{
  const HomeDashboard({super.key,required this.store,required this.rates,required this.navigate,required this.openWallet});
  final PlatikStore store;final RateService rates;final ValueChanged<int> navigate;final VoidCallback openWallet;
  @override Widget build(BuildContext context){
    final s=PeriodSummary(store.transactions,store.currency,today(29),today()),balance=store.balance;
    final recent=[...store.transactions]..sort((a,b)=>(b['fecha'] as String).compareTo(a['fecha'] as String));
    final name=(store.profile['nombreUsuario'] as String? ?? '').trim().split(' ').first;
    final notes=findings(store.transactions,store.currency);
    return Stack(children:[const Aurora(height:350,colors:[C.mint,C.lavender,C.coral]),ListView(primary:false,key:PageStorageKey('dashboard-${store.target}'),padding:const EdgeInsets.fromLTRB(20,8,20,24),children:[
      Row(children:[Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(DateFormat('EEE d MMM',Catalog.lang).format(DateTime.now()),style:body(12,color:C.sub)),const SizedBox(height:3),Text(name.isEmpty?'Tu dinero, hoy':'Hola, $name',style:h(27))])),RoundAction(icon:Icons.account_balance_wallet_outlined,label:'Billetera digital',onTap:openWallet)]),
      const SizedBox(height:18),
      Container(decoration:BoxDecoration(color:Theme.of(context).colorScheme.surface,borderRadius:BorderRadius.circular(26),border:Border.all(color:Theme.of(context).dividerColor)),clipBehavior:Clip.antiAlias,child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
        InkWell(onTap:()=>openBalance(context,store,rates),child:Container(constraints:const BoxConstraints(minHeight:160),decoration:const BoxDecoration(gradient:LinearGradient(begin:Alignment.topLeft,end:Alignment.bottomRight,colors:[C.petroleum,Color(0xff156b66)])),child:Stack(children:[
          const Positioned(right:4,bottom:-10,child:FloatingMascot(size:120)),
          Padding(padding:const EdgeInsets.fromLTRB(20,23,112,24),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('TU DINERO DISPONIBLE',style:body(10.5,color:Colors.white70,w:FontWeight.w800).copyWith(letterSpacing:1.2)),const SizedBox(height:13),FittedBox(fit:BoxFit.scaleDown,alignment:Alignment.centerLeft,child:Text(balance.amount==null?(balance.status=='sin_datos'?'Empieza hoy':'Saldo incompleto'):money(balance.amount!,store.currency),style:h(31,color:Colors.white))),const SizedBox(height:10),const Row(children:[Flexible(child:Text('Ver saldo y ajustes',style:TextStyle(color:Colors.white70,fontSize:11))),SizedBox(width:6),Icon(Icons.arrow_forward_rounded,color:Colors.white70,size:15)])])),
        ]))),
        Padding(padding:const EdgeInsets.all(14),child:Row(children:[Expanded(child:FilledButton.tonalIcon(style:FilledButton.styleFrom(minimumSize:const Size(0,46)),onPressed:()=>addMovement(context,store,rates,kind:'ingreso'),icon:const Icon(Icons.add_rounded,size:19),label:const Text('Ingreso'))),const SizedBox(width:10),Expanded(child:OutlinedButton.icon(style:OutlinedButton.styleFrom(minimumSize:const Size(0,46)),onPressed:()=>addMovement(context,store,rates,kind:'gasto'),icon:const Icon(Icons.remove_rounded,size:19),label:const Text('Gasto')))])),
      ])),
      const SizedBox(height:14),Row(children:[Expanded(child:TempoStat(icon:Icons.south_west_rounded,color:C.mint,value:money(s.income,store.currency),label:'Ingresos · 30 días')),const SizedBox(width:9),Expanded(child:TempoStat(icon:Icons.north_east_rounded,color:C.coral,value:money(s.out,store.currency),label:'Egresos · 30 días')),const SizedBox(width:9),Expanded(child:TempoStat(icon:Icons.trending_up_rounded,color:C.lavender,value:money(s.profit,store.currency),label:'Ganancia neta'))]),
      Row(children:[const Expanded(child:SectionTitle('Últimos movimientos')),TextButton(onPressed:()=>navigate(1),child:const Text('Ver todos'))]),
      if(recent.isEmpty)Paper(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Tu primer paso',style:h(18)),const SizedBox(height:6),const Text('Registra un movimiento para empezar a conocer tus números.'),const SizedBox(height:14),PrimaryButton('Registrar movimiento',icon:Icons.add_rounded,onTap:()=>addMovement(context,store,rates))]))else Paper(padding:const EdgeInsets.symmetric(horizontal:14,vertical:4),child:Column(children:[for(var i=0;i<recent.take(3).length;i++)...[MovementTile(row:recent[i],store:store,rates:rates),if(i<recent.take(3).length-1)const Divider(height:1)]])),
      const SizedBox(height:18),
      Paper(onTap:openWallet,padding:const EdgeInsets.all(17),child:Row(children:[const CoverTile(gradient:LinearGradient(colors:[C.mint,Color(0xff156b66)]),icon:Icons.account_balance_wallet_rounded,size:48),const SizedBox(width:14),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Tu billetera digital',style:h(16)),const SizedBox(height:5),Text('${digitalSavings(store)} USDC confirmados',style:body(12,color:C.sub)),const SizedBox(height:3),Text('Stellar Testnet',style:body(10,color:C.sub))])),const Icon(Icons.arrow_forward_rounded,size:20)])),
      if(store.goals.isNotEmpty)...[const SizedBox(height:14),Paper(onTap:()=>navigate(3),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Row(children:[const Icon(Icons.flag_rounded,color:C.lavender,size:23),const SizedBox(width:10),Expanded(child:Text(store.goals.first['nombre'] as String,style:h(16))),const Icon(Icons.chevron_right_rounded)]),const SizedBox(height:15),TweenAnimationBuilder<double>(tween:Tween(begin:0,end:(number(store.goals.first['ahorroAcumulado'])/number(store.goals.first['montoObjetivo'])).clamp(0,1)),duration:const Duration(milliseconds:650),curve:Curves.easeOutCubic,builder:(_,value,child)=>LinearProgressIndicator(value:value,minHeight:7,borderRadius:BorderRadius.circular(8),color:C.lavender)),const SizedBox(height:10),Text('${money(number(store.goals.first['ahorroAcumulado']),store.goals.first['moneda'] as String)} de ${money(number(store.goals.first['montoObjetivo']),store.goals.first['moneda'] as String)}',style:body(12,color:C.sub))]))],
      if(notes.isNotEmpty)...[const SizedBox(height:14),Paper(onTap:()=>navigate(2),color:C.highlight,child:Row(crossAxisAlignment:CrossAxisAlignment.start,children:[const Icon(Icons.auto_awesome_outlined,size:22),const SizedBox(width:12),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Una mirada a tus números',style:h(15)),const SizedBox(height:7),Text(notes.first['texto'] as String,maxLines:3,overflow:TextOverflow.ellipsis,style:body(12)),const SizedBox(height:8),Text('Ver mi análisis →',style:body(12,w:FontWeight.w800))]))]))],
    ])]);
  }
}

class MovementTile extends StatelessWidget{
  const MovementTile({super.key,required this.row,required this.store,required this.rates,this.showMenu=false});final RowData row;final PlatikStore store;final RateService rates;final bool showMenu;
  Future<void> detail(BuildContext context)async{
    final origin=context;
    await showModalBottomSheet<void>(context:context,isScrollControlled:true,useSafeArea:true,backgroundColor:Theme.of(context).colorScheme.surface,builder:(context)=>Padding(padding:const EdgeInsets.fromLTRB(22,12,22,24),child:SingleChildScrollView(child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.stretch,children:[Center(child:Container(width:34,height:4,margin:const EdgeInsets.only(bottom:22),decoration:BoxDecoration(color:Theme.of(context).dividerColor,borderRadius:BorderRadius.circular(8)))),Text(row['descripcion'] as String,style:h(23)),const SizedBox(height:12),Text(money(number(row['monto']),row['moneda'] as String),style:h(31)),const SizedBox(height:15),ReviewLine('Tipo',typeNames[row['tipo']]??''),ReviewLine('Categoría',row['categoria'] as String),ReviewLine('Fecha',row['fecha'] as String),if(row['moneda']!=store.currency)...[const Divider(),TransactionLine(row:row,base:store.currency,rates:rates,display:store.profile['displayCurrency'] as String? ?? '')],const SizedBox(height:20),Row(children:[Expanded(child:OutlinedButton.icon(onPressed:(){Navigator.pop(context);addMovement(origin,store,rates,current:row);},icon:const Icon(Icons.edit_outlined,size:18),label:const Text('Editar'))),const SizedBox(width:12),Expanded(child:TextButton.icon(onPressed:()async{final scope=store.target;if(await confirm(context,'Eliminar movimiento','¿Eliminar “${row['descripcion']}”?')){await store.patchAt(scope,{'transactions':rows(store.dataAt(scope)['transactions']).where((t)=>t['id']!=row['id']).toList()});if(context.mounted)Navigator.pop(context);}},icon:const Icon(Icons.delete_outline_rounded,size:18,color:C.coral),label:const Text('Eliminar')))])]))));
  }
  @override Widget build(BuildContext context){final incoming=row['tipo']=='ingreso',color=typeColors[row['tipo']]??C.mint;return InkWell(onTap:()=>detail(context),borderRadius:BorderRadius.circular(16),child:Padding(padding:const EdgeInsets.symmetric(vertical:13),child:Row(children:[Container(width:37,height:37,decoration:BoxDecoration(color:color.withValues(alpha:.14),borderRadius:BorderRadius.circular(13)),child:Icon(incoming?Icons.south_west_rounded:row['tipo']=='costo'?Icons.inventory_2_outlined:Icons.north_east_rounded,size:20,color:incoming?const Color(0xff2a9269):row['tipo']=='costo'?C.lavender:const Color(0xffd95666))),const SizedBox(width:12),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(row['descripcion'] as String,maxLines:1,overflow:TextOverflow.ellipsis,style:body(13,w:FontWeight.w800)),const SizedBox(height:4),Text('${row['categoria']} · ${row['fecha']}',maxLines:1,overflow:TextOverflow.ellipsis,style:body(10.5,color:C.sub))])),const SizedBox(width:10),Text('${incoming?'+':'−'} ${money(number(row['monto']),row['moneda'] as String)}',style:body(12,w:FontWeight.w800)),if(showMenu)...[const SizedBox(width:5),const Icon(Icons.more_horiz_rounded,size:19)]])));}
}
