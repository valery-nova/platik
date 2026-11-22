import 'package:flutter/material.dart' hide Text;
import 'i18n.dart';
import 'domain.dart';
import 'store.dart';
import 'rates.dart';
import 'theme.dart';
import 'tempo_ui.dart';
import 'flow.dart';
import 'widgets.dart';
import 'dashboard.dart';
import 'screens_finance.dart';

class MovementsPage extends StatefulWidget{
  const MovementsPage({super.key,required this.store,required this.rates});final PlatikStore store;final RateService rates;
  @override State<MovementsPage> createState()=>_MovementsPageState();
}
class _MovementsPageState extends State<MovementsPage>{
  final search=TextEditingController();RowData filters={};
  @override void dispose(){search.dispose();super.dispose();}
  int get filterCount=>filters.values.where((v)=>v is String&&v.isNotEmpty).length;
  Future<void> filter()async{final next=await showPlatikFlow<RowData>(context,_FilterFlow(store:widget.store,current:filters));if(next!=null&&mounted)setState(()=>filters=next);}
  @override Widget build(BuildContext context){final s=widget.store;bool matches(RowData r){final date=r['fecha'] as String;for(final pair in [('type','tipo'),('currency','moneda'),('category','categoria')]){final v=filters[pair.$1] as String? ?? '';if(v.isNotEmpty&&r[pair.$2]!=v)return false;}final month=filters['month'] as String? ?? '',year=filters['year'] as String? ?? '',from=filters['from'] as String? ?? '',to=filters['to'] as String? ?? '';return (month.isEmpty||date.substring(5,7)==month)&&(year.isEmpty||date.substring(0,4)==year)&&(from.isEmpty||date.compareTo(from)>=0)&&(to.isEmpty||date.compareTo(to)<=0)&&'${r['descripcion']} ${r['categoria']}'.toLowerCase().contains(search.text.trim().toLowerCase());}
    final list=s.transactions.where(matches).toList()..sort((a,b)=>(b['fecha'] as String).compareTo(a['fecha'] as String));
    return Stack(children:[ListView(primary:false,padding:const EdgeInsets.fromLTRB(20,10,20,100),children:[
      Row(children:[Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Movimientos',style:h(27)),const SizedBox(height:6),Text('${s.transactions.length} registros · ${s.currency}',style:body(12,color:C.sub))])),RoundAction(icon:Icons.tune_rounded,label:'Filtrar movimientos',onTap:filter)]),
      const SizedBox(height:22),TextField(controller:search,onChanged:(_)=>setState((){}),decoration:InputDecoration(hintText:t('Buscar movimiento'),prefixIcon:const Icon(Icons.search_rounded),suffixIcon:search.text.isEmpty?null:IconButton(tooltip:t('Limpiar'),onPressed:()=>setState(()=>search.clear()),icon:const Icon(Icons.close_rounded,size:19)))),
      const SizedBox(height:14),Row(children:[Expanded(child:Text('${list.length} resultados',style:body(12,color:C.sub))),if(filterCount>0)ActionChip(avatar:const Icon(Icons.filter_alt_outlined,size:15),label:Text('$filterCount filtros'),onPressed:filter),if(filterCount>0)TextButton(onPressed:()=>setState(()=>filters={}),child:const Text('Limpiar'))]),
      const SizedBox(height:8),if(list.isEmpty)Paper(child:Column(children:[const SizedBox(height:16),const Icon(Icons.receipt_long_outlined,size:44,color:C.lavender),const SizedBox(height:14),Text('Sin movimientos aquí',style:h(20)),const SizedBox(height:8),const Text('Prueba otros filtros o registra tu primer movimiento.',textAlign:TextAlign.center),const SizedBox(height:16)]))else Paper(padding:const EdgeInsets.symmetric(horizontal:15,vertical:4),child:Column(children:[for(var i=0;i<list.length;i++)...[MovementTile(row:list[i],store:s,rates:widget.rates,showMenu:true),if(i<list.length-1)const Divider(height:1)]])),
    ]),Positioned(right:20,bottom:20,child:FloatingActionButton.extended(heroTag:'movement-add',onPressed:()=>addMovement(context,s,widget.rates),icon:const Icon(Icons.add_rounded),label:const Text('Nuevo movimiento')))]);
  }
}
class _FilterFlow extends StatefulWidget{
  const _FilterFlow({required this.store,required this.current});final PlatikStore store;final RowData current;
  @override State<_FilterFlow> createState()=>_FilterFlowState();
}
class _FilterFlowState extends State<_FilterFlow>{
  late RowData draft={...widget.current};int step=0;bool range=false;
  String value(String key)=>draft[key] as String? ?? '';
  void put(String key,String value)=>setState(()=>draft[key]=value);
  @override Widget build(BuildContext context){final pages=<({String title,String sub,Widget body})>[
    (title:'¿Qué quieres ver?',sub:'Puedes combinar filtros para encontrar un registro.',body:Column(children:[for(final entry in {'':'Todos los movimientos',...typeNames}.entries)FlowChoice(title:entry.value,icon:entry.key.isEmpty?Icons.swap_horiz_rounded:entry.key=='ingreso'?Icons.south_west_rounded:Icons.north_east_rounded,selected:value('type')==entry.key,onTap:()=>put('type',entry.key),color:typeColors[entry.key]??C.petroleum)])),
    (title:'Categoría y moneda',sub:'Deja estas opciones en “Todas” para ampliar la búsqueda.',body:Column(spacing:20,children:[SelectField(label:'Categoría',value:value('category'),items:{'':'Todas las categorías',for(final k in typeNames.keys)for(final c in Catalog.categories(k))c:c},onChanged:(v)=>put('category',v)),CurrencyField(label:'Moneda',value:value('currency'),optional:true,onChanged:(v)=>put('currency',v))])),
    (title:'Elige el período',sub:'Filtra por un mes o utiliza un intervalo de fechas.',body:Column(crossAxisAlignment:CrossAxisAlignment.stretch,spacing:18,children:[SegmentedButton<bool>(segments:const [ButtonSegment(value:false,label:Text('Mes y año')),ButtonSegment(value:true,label:Text('Intervalo'))],selected:{range},onSelectionChanged:(v)=>setState(()=>range=v.first)),if(!range)...[SelectField(label:'Mes',value:value('month'),items:{'':'Todos los meses',for(var m=1;m<=12;m++)m.toString().padLeft(2,'0'):m.toString().padLeft(2,'0')},onChanged:(v)=>put('month',v)),SelectField(label:'Año',value:value('year'),items:{'':'Todos los años',for(final year in widget.store.transactions.map((r)=>(r['fecha'] as String).substring(0,4)).toSet())year:year},onChanged:(v)=>put('year',v))]else ...[DateField(label:'Desde',value:value('from'),optional:true,onChanged:(v)=>put('from',v)),DateField(label:'Hasta',value:value('to'),optional:true,onChanged:(v)=>put('to',v))]])),
  ];return FlowPanel(title:'Filtrar movimientos',icon:Icons.tune_rounded,step:step,steps:3,heading:pages[step].title,subtitle:pages[step].sub,nextLabel:step==2?'Aplicar filtros':null,onClose:()=>Navigator.pop(context),onBack:()=>setState(()=>step--),onNext:(){if(step<2){setState(()=>step++);}else{if(range){draft.remove('month');draft.remove('year');}else{draft.remove('from');draft.remove('to');}Navigator.pop(context,draft);}},child:pages[step].body);}
}

class InsightsPage extends StatefulWidget{
  const InsightsPage({super.key,required this.store,required this.rates});final PlatikStore store;final RateService rates;
  @override State<InsightsPage> createState()=>_InsightsPageState();
}
class _InsightsPageState extends State<InsightsPage>{
  int segment=0;
  @override Widget build(BuildContext context){final s=widget.store,c=s.currency,a=PeriodSummary(s.transactions,s.currency,today(29),today()),p=PeriodSummary(s.transactions,s.currency,today(59),today(30));final range=s.transactions.where((r)=>(r['fecha'] as String).compareTo(today(29))>=0&&(r['fecha'] as String).compareTo(today())<=0).toList();final categories=categoryTotals(range,c);return ListView(primary:false,padding:const EdgeInsets.fromLTRB(20,10,20,24),children:[
    Text('Tus números, claros',style:h(27)),const SizedBox(height:6),Text('Últimos 30 días · $c',style:body(12,color:C.sub)),const SizedBox(height:22),
    SegmentedButton<int>(showSelectedIcon:false,segments:const [ButtonSegment(value:0,label:Text('Resumen')),ButtonSegment(value:1,label:Text('Comparar')),ButtonSegment(value:2,label:Text('Categorías'))],selected:{segment},onSelectionChanged:(v)=>setState(()=>segment=v.first)),const SizedBox(height:20),
    AnimatedSwitcher(duration:const Duration(milliseconds:250),child:Column(key:ValueKey(segment),crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      if(segment==0)...[
        StatGrid([Stat('Ganancia neta',money(a.profit,c)),Stat('Margen',a.margin==null?'—':pct(a.margin!))]),const SizedBox(height:18),
        Paper(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Así se mueve tu dinero',style:h(18)),const SizedBox(height:6),Text('Ingresos y egresos · 6 meses',style:body(11,color:C.sub)),const SizedBox(height:18),EvolutionChart(monthlySeries(s.transactions,c),currency:c)])),
        const SectionTitle('Lo que muestran tus números'),for(final note in findings(s.transactions,c))Padding(padding:const EdgeInsets.only(bottom:10),child:Paper(padding:const EdgeInsets.all(4),child:ExpansionTile(shape:const Border(),collapsedShape:const Border(),leading:Icon(note['tono']=='alerta'?Icons.insights_rounded:Icons.auto_awesome_outlined,color:note['tono']=='alerta'?C.coral:C.mint,size:22),title:Text(note['texto'] as String,style:body(13)),children:[Padding(padding:const EdgeInsets.fromLTRB(16,0,16,16),child:Text(note['calculo'] as String,style:body(12,color:C.sub)))]))),
      ],
      if(segment==1)...[
        Paper(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Últimos 30 días frente al período anterior',style:h(19)),const SizedBox(height:8),Text('${today(29)} — ${today()}\n${today(59)} — ${today(30)}',style:body(11,color:C.sub)),if(!a.sufficient||!p.sufficient)...[const SizedBox(height:16),const Notice('Se necesitan al menos 3 movimientos y un ingreso en cada período para comparar tendencias.')],const SizedBox(height:10),for(final metric in [('Ingresos',a.income,p.income),('Costos',a.costs,p.costs),('Gastos',a.expenses,p.expenses),('Ganancia neta',a.profit,p.profit)])Padding(padding:const EdgeInsets.symmetric(vertical:14),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(metric.$1,style:body(14,w:FontWeight.w800)),const SizedBox(height:9),Row(children:[Expanded(child:Text('Antes\n${money(metric.$3,c)}',style:body(12,color:C.sub))),Expanded(child:Text('Ahora\n${money(metric.$2,c)}',textAlign:TextAlign.right,style:body(14))),const SizedBox(width:10),if(a.sufficient&&p.sufficient)Text(metric.$3>0?pct((metric.$2-metric.$3)/metric.$3*100):'—',style:body(12,color:((metric.$1=='Costos'||metric.$1=='Gastos')?metric.$2<=metric.$3:metric.$2>=metric.$3)?const Color(0xff2a9269):C.coral))]),const Divider()])),ReviewLine('Margen anterior',p.margin==null?'—':pct(p.margin!)),ReviewLine('Margen actual',a.margin==null?'—':pct(a.margin!))])),
      ],
      if(segment==2)...[Paper(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('¿A dónde va tu dinero?',style:h(20)),const SizedBox(height:7),Text('Costos y gastos de los últimos 30 días',style:body(12,color:C.sub)),const SizedBox(height:22),CategoryChart(categories,currency:c)]))],
      if((s.profile['displayCurrency'] as String? ?? '').isNotEmpty)...[const SizedBox(height:16),Group('Equivalencias',children:[for(final item in [('Ingresos',a.income),('Egresos',a.out),('Ganancia',a.profit)])Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(item.$1),Equivalent(amount:item.$2,from:c,to:s.profile['displayCurrency'] as String,rates:widget.rates)])])],
      if(a.pending>0)...[const SizedBox(height:15),PendingRates(store:s,rates:widget.rates)],
    ])),
  ]);}
}

class GoalsPage extends StatelessWidget{
  const GoalsPage({super.key,required this.store,required this.rates,required this.openWallet});final PlatikStore store;final RateService rates;final VoidCallback openWallet;
  Future<void> edit(BuildContext context,String type,[RowData? goal])async{final scope=store.target;final row=await recordForm(context,rates,type:type,current:goal,currency:goal?['moneda'] as String? ?? store.currency);if(row!=null&&scope==store.target){await store.upsertAt(scope,'goals',row);if(context.mounted)toast(context,type=='deposit'?'Aporte registrado':'Meta guardada');}}
  @override Widget build(BuildContext context)=>Stack(children:[ListView(primary:false,padding:const EdgeInsets.fromLTRB(20,10,20,105),children:[
    Row(children:[Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Tus próximos logros',style:h(27)),const SizedBox(height:7),Text('${store.goals.length} metas · un paso a la vez',style:body(12,color:C.sub))])),const CoverTile(gradient:LinearGradient(colors:[C.lavender,Color(0xff7563b8)]),icon:Icons.flag_rounded,size:44)]),
    const SizedBox(height:22),if(store.goals.isEmpty)Paper(child:Column(children:[const FloatingGoalIcon(),const SizedBox(height:14),Text('Dale una meta a tu ahorro',style:h(21)),const SizedBox(height:9),const Text('Tu equipo, un viaje o un fondo de emergencia. Empieza por lo que importa para ti.',textAlign:TextAlign.center),const SizedBox(height:20),PrimaryButton('Nueva meta',icon:Icons.add_rounded,onTap:()=>edit(context,'goal'))])),
    for(final g in store.goals)Padding(padding:const EdgeInsets.only(bottom:16),child:Paper(padding:const EdgeInsets.all(19),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      Row(children:[Container(width:37,height:37,decoration:BoxDecoration(color:C.lavender.withValues(alpha:.15),borderRadius:BorderRadius.circular(13)),child:const Icon(Icons.flag_rounded,color:C.lavender,size:21)),const SizedBox(width:12),Expanded(child:Text(g['nombre'] as String,style:h(19))),PopupMenuButton<String>(onSelected:(v)async{if(v=='edit'){edit(context,'goal',g);}else if(await confirm(context,'Eliminar meta','¿Eliminar “${g['nombre']}”? El historial de Stellar se conserva.')){await store.remove('goals',g['id'] as String);}},itemBuilder:(context)=>const [PopupMenuItem(value:'edit',child:Text('Editar meta')),PopupMenuItem(value:'delete',child:Text('Eliminar'))])]),
      const SizedBox(height:20),Text(money(number(g['ahorroAcumulado']),g['moneda'] as String),style:h(28)),const SizedBox(height:4),Text('de ${money(number(g['montoObjetivo']),g['moneda'] as String)}',style:body(12,color:C.sub)),const SizedBox(height:16),
      TweenAnimationBuilder<double>(tween:Tween(begin:0,end:(number(g['ahorroAcumulado'])/number(g['montoObjetivo'])).clamp(0,1)),duration:const Duration(milliseconds:650),curve:Curves.easeOutCubic,builder:(_,value,child)=>LinearProgressIndicator(value:value,minHeight:8,color:C.lavender,borderRadius:BorderRadius.circular(8))),const SizedBox(height:11),Row(children:[Text('${pct(number(g['ahorroAcumulado'])/number(g['montoObjetivo'])*100,0)} completado',style:body(11,color:C.sub)),const Spacer(),if(g['fechaObjetivo']!=null)Text(g['fechaObjetivo'] as String,style:body(11,color:C.sub))]),
      if((store.profile['displayCurrency'] as String? ?? '').isNotEmpty)Equivalent(amount:number(g['ahorroAcumulado']),from:g['moneda'] as String,to:store.profile['displayCurrency'] as String,rates:rates),
      const SizedBox(height:18),FilledButton.tonalIcon(onPressed:()=>edit(context,'deposit',g),icon:const Icon(Icons.add_rounded,size:19),label:const Text('Registrar aporte local')),
      if(store.deposits.any((d)=>d['goalId']==g['id']&&d['estado']=='confirmado'))Padding(padding:const EdgeInsets.only(top:10),child:Text('${store.deposits.where((d)=>d['goalId']==g['id']&&d['estado']=='confirmado').fold<double>(0,(sum,d)=>sum+number(d['importe']))} USDC recibidos y verificados',style:body(12,color:C.sub))),
    ]))),
    Paper(onTap:openWallet,color:C.highlight,child:Row(children:[const Icon(Icons.account_balance_wallet_outlined,size:26),const SizedBox(width:14),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Ahorro digital en Stellar',style:h(16)),const SizedBox(height:6),Text('Recibe USDC de prueba y asígnalos a una meta.',style:body(12,color:C.sub))])),const Icon(Icons.arrow_forward_rounded,size:19)])),
  ]),Positioned(right:20,bottom:20,child:FloatingActionButton.extended(heroTag:'goal-add',onPressed:()=>edit(context,'goal'),icon:const Icon(Icons.add_rounded),label:const Text('Nueva meta')))]);
}
class FloatingGoalIcon extends StatelessWidget{
  const FloatingGoalIcon({super.key});
  @override Widget build(BuildContext context)=>Padding(padding:const EdgeInsets.all(16),child:TweenAnimationBuilder<double>(tween:Tween(begin:.8,end:1),duration:const Duration(milliseconds:600),curve:Curves.easeOutBack,builder:(_,v,child)=>Transform.scale(scale:v,child:child),child:const Icon(Icons.flag_rounded,size:62,color:C.lavender)));
}
