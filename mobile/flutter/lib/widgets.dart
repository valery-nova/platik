import 'dart:math' as math;
import 'package:flutter/material.dart' hide Text;
import 'i18n.dart';
import 'package:intl/intl.dart';
import 'domain.dart';
import 'rates.dart';
import 'theme.dart';
import 'flow.dart';

const typeNames={'ingreso':'Ingreso','costo':'Costo','gasto':'Gasto'};
const typeColors={'ingreso':C.mint,'costo':C.lavender,'gasto':C.coral};
class PageBody extends StatelessWidget {
  const PageBody({super.key,required this.title,required this.children,this.subtitle,this.actions=const []});
  final String title;final String? subtitle;final List<Widget> children,actions;
  @override Widget build(BuildContext context)=>Align(alignment:Alignment.topCenter,child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:960),child:ListView(primary:false,padding:const EdgeInsets.fromLTRB(16,12,16,28),children:[if(title.isNotEmpty)Text(title,style:h(25)),if(subtitle!=null)Padding(padding:const EdgeInsets.only(top:6),child:Text(subtitle!,style:body(14,color:C.sub))),if(actions.isNotEmpty)Padding(padding:const EdgeInsets.only(top:12),child:Wrap(spacing:8,runSpacing:6,children:actions)),for(final item in children)Padding(padding:const EdgeInsets.only(top:16),child:item)])));
}
class Group extends StatelessWidget {
  const Group(this.title,{super.key,required this.children,this.subtitle,this.actions=const []});
  final String title;final String? subtitle;final List<Widget> children,actions;
  @override Widget build(BuildContext context)=>Paper(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(title,style:h(18,w:FontWeight.w800)),if(subtitle!=null)Padding(padding:const EdgeInsets.only(top:5),child:Text(subtitle!,style:body(12,color:C.sub))),for(final child in children)Padding(padding:const EdgeInsets.only(top:12),child:child),if(actions.isNotEmpty)Padding(padding:const EdgeInsets.only(top:12),child:Wrap(spacing:8,runSpacing:6,children:actions))]));
}
class Notice extends StatelessWidget {
  const Notice(this.text,{super.key,this.color=C.highlight,this.icon=Icons.info_outline});
  final String text;final Color color;final IconData icon;
  @override Widget build(BuildContext context)=>Paper(color:color,child:Row(crossAxisAlignment:CrossAxisAlignment.start,children:[Icon(icon,size:20,color:Theme.of(context).colorScheme.onSurface),const SizedBox(width:10),Expanded(child:Text(text,style:body(13)))]));
}
class Stat extends StatelessWidget {
  const Stat(this.label,this.value,{super.key,this.hint,this.color=C.petroleum});
  final String label,value;final String? hint;final Color color;
  @override Widget build(BuildContext context)=>Paper(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(label,style:body(12,color:C.sub)),const SizedBox(height:8),Text(value,style:h(23,color:color)),if(hint!=null)Padding(padding:const EdgeInsets.only(top:6),child:Text(hint!,style:body(11,color:C.sub)))]));
}
class StatGrid extends StatelessWidget {
  const StatGrid(this.items,{super.key});final List<Widget> items;
  @override Widget build(BuildContext context)=>LayoutBuilder(builder:(context,box){final count=box.maxWidth>720?4:box.maxWidth>340?2:1;return Wrap(spacing:12,runSpacing:12,children:[for(final item in items)SizedBox(width:(box.maxWidth-(count-1)*12)/count,child:item)]);});
}
void toast(BuildContext context,String text)=>ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(text)));
Future<bool> confirm(BuildContext context,String title,String text)=>showDialog<bool>(context:context,builder:(context)=>AlertDialog(title:Text(title),content:Text(text),actions:[TextButton(onPressed:()=>Navigator.pop(context,false),child:const Text('Cancelar')),FilledButton(onPressed:()=>Navigator.pop(context,true),child:const Text('Confirmar'))])).then((v)=>v??false);

class SelectField extends StatelessWidget {
  const SelectField({super.key,required this.label,required this.value,required this.items,required this.onChanged,this.optional=false});
  final String label,value;final Map<String,String> items;final ValueChanged<String> onChanged;final bool optional;
  @override Widget build(BuildContext context)=>InkWell(onTap:()async{final selected=await showModalBottomSheet<String>(context:context,isScrollControlled:true,useSafeArea:true,builder:(context)=>_SearchOptions(label:label,items:{if(optional)'':'Sin especificar',...items},selected:value));if(selected!=null)onChanged(selected);},borderRadius:BorderRadius.circular(12),child:InputDecorator(decoration:InputDecoration(labelText:t(label),suffixIcon:const Icon(Icons.expand_more)),child:Text(items[value]??(value.isEmpty?'Sin especificar':value),maxLines:2,overflow:TextOverflow.ellipsis,style:body(14))));
}
class _SearchOptions extends StatefulWidget {
  const _SearchOptions({required this.label,required this.items,required this.selected});final String label,selected;final Map<String,String> items;
  @override State<_SearchOptions> createState()=>_SearchOptionsState();
}
class _SearchOptionsState extends State<_SearchOptions>{
  String search='';
  @override Widget build(BuildContext context){final list=widget.items.entries.where((e)=>'${e.key} ${e.value}'.toLowerCase().contains(search.toLowerCase())).toList();return SizedBox(height:MediaQuery.sizeOf(context).height*.82,child:Column(children:[Padding(padding:const EdgeInsets.all(16),child:Row(children:[Expanded(child:Text(widget.label,style:h(20))),IconButton(onPressed:()=>Navigator.pop(context),icon:const Icon(Icons.close))])),Padding(padding:const EdgeInsets.symmetric(horizontal:16),child:TextField(autofocus:false,decoration:InputDecoration(labelText:t('Buscar'),prefixIcon:Icon(Icons.search)),onChanged:(v)=>setState(()=>search=v))),const SizedBox(height:10),Expanded(child:ListView.builder(itemCount:list.length,itemBuilder:(context,i)=>ListTile(title:Text(list[i].value),subtitle:list[i].key.isEmpty?null:Text(list[i].key),trailing:list[i].key==widget.selected?const Icon(Icons.check,color:C.petroleum):null,onTap:()=>Navigator.pop(context,list[i].key))))]));}
}
class CurrencyField extends StatelessWidget {
  const CurrencyField({super.key,required this.value,required this.onChanged,this.label='Moneda',this.optional=false});final String value,label;final ValueChanged<String> onChanged;final bool optional;
  @override Widget build(BuildContext context)=>SelectField(label:label,value:value,optional:optional,items:{for(final c in Catalog.currencies)c['code'] as String:'${c['code']} · ${Catalog.currencyName(c['code'] as String)}'},onChanged:onChanged);
}
class DateField extends StatelessWidget {
  const DateField({super.key,required this.label,required this.value,required this.onChanged,this.future=false,this.optional=false});final String label,value;final ValueChanged<String> onChanged;final bool future,optional;
  @override Widget build(BuildContext context)=>InputDecorator(decoration:InputDecoration(labelText:t(label)),child:Row(children:[Expanded(child:InkWell(onTap:()async{final date=await showDatePicker(context:context,initialDate:DateTime.tryParse(value)??DateTime.now(),firstDate:DateTime(1900),lastDate:future?DateTime(2200):DateTime.now());if(date!=null)onChanged(DateFormat('yyyy-MM-dd').format(date));},child:Padding(padding:const EdgeInsets.symmetric(vertical:5),child:Text(value.isEmpty?'Elegir fecha':DateFormat('dd/MM/yyyy').format(DateTime.parse(value)))))),if(optional&&value.isNotEmpty)IconButton(visualDensity:VisualDensity.compact,onPressed:()=>onChanged(''),icon:const Icon(Icons.clear,size:18)),const Icon(Icons.calendar_today_outlined,size:18)]));
}

Future<RowData?> recordForm(BuildContext context,RateService rates,{required String type,RowData? current,required String currency,String? initialKind})=>showPlatikFlow<RowData>(context,RecordEditor(type:type,current:current,currency:currency,rates:rates,initialKind:initialKind));
class RecordEditor extends StatefulWidget {
  const RecordEditor({super.key,required this.type,required this.current,required this.currency,required this.rates,this.initialKind});
  final String type,currency;final String? initialKind;final RowData? current;final RateService rates;
  @override State<RecordEditor> createState()=>_RecordEditorState();
}
class _RecordEditorState extends State<RecordEditor>{
  final forms=List.generate(7,(_)=>GlobalKey<FormState>());
  late final description=TextEditingController(text:(widget.current?[widget.type=='goal'?'nombre':'descripcion']??'').toString());
  late final amount=TextEditingController(text:widget.type=='deposit'?'':widget.type=='adjustment'&&widget.current!=null?number(widget.current!['monto']).abs().toString():(widget.current?[widget.type=='goal'?'montoObjetivo':'monto']??'').toString());
  late final saved=TextEditingController(text:(widget.current?['ahorroAcumulado']??0).toString());
  late String currency=widget.current?['moneda'] as String? ?? widget.currency;
  late String kind=widget.current?['tipo'] as String? ?? widget.initialKind ?? 'ingreso';
  late String category=widget.current?['categoria'] as String? ?? Catalog.categories(kind).first;
  late String date=widget.current?[widget.type=='goal'?'fechaObjetivo':'fecha'] as String? ?? (widget.type=='goal'?'':today());
  late String direction=number(widget.current?['monto'])<0?'salida':'entrada';
  int step=0;bool busy=false,changing=false;String? error;
  bool get goal=>widget.type=='goal';bool get deposit=>widget.type=='deposit';
  bool get transaction=>widget.type=='transaction';bool get adjustment=>widget.type=='adjustment';
  bool get currencyLocked=>deposit||(goal&&number(widget.current?['ahorroAcumulado'])>0);
  @override void dispose(){description.dispose();amount.dispose();saved.dispose();super.dispose();}
  double? parse(String raw)=>double.tryParse(raw.trim().replaceAll(',','.'));
  bool validAmount(String raw){final n=parse(raw);return n!=null&&n.isFinite&&n>0&&n<1e12&&rounded(n,currency)>0;}
  void change(int next){if(changing||busy)return;FocusManager.instance.primaryFocus?.unfocus();setState((){step=next;error=null;changing=true;});Future<void>.delayed(const Duration(milliseconds:240),(){if(mounted)setState(()=>changing=false);});}
  Future<void> close()async{if(busy)return;if(description.text.isNotEmpty||amount.text.isNotEmpty){if(!await confirm(context,'¿Salir del formulario?','Los cambios de este formulario todavía no se guardaron.'))return;}if(mounted)Navigator.pop(context);}
  Future<void> submit()async{
    if(!validAmount(amount.text)||(!deposit&&description.text.trim().length<2)){setState(()=>error='Revisa los datos antes de guardar.');return;}
    setState((){busy=true;error=null;});
    try{
      final value=rounded(parse(amount.text)!.abs(),currency);
      RowData row;
      if(widget.type=='goal'){
        row={'id':widget.current?['id']??newId(),'nombre':description.text.trim(),'montoObjetivo':value,'ahorroAcumulado':rounded(parse(saved.text)??0,currency),'moneda':currency,if(date.isNotEmpty)'fechaObjetivo':date};
      }else if(widget.type=='deposit'){
        row={...widget.current!,'ahorroAcumulado':rounded(number(widget.current!['ahorroAcumulado'])+value,currency)};
      }else{
        final signed=widget.type=='adjustment'&&direction=='salida'?-value:value;
        final same=widget.current?['moneda']==currency&&number(widget.current?['monto'])==signed;
        final conversion=same?{for(final key in ['baseAmount','baseCurrency','exchangeRate','exchangeRateSource','exchangeRateDate','exchangeRateType','exchangeRatePublishedAt'])if(widget.current![key]!=null)key:widget.current![key]}:await widget.rates.conversion(currency,widget.currency,signed);
        row={'id':widget.current?['id']??newId(),'monto':signed,'moneda':currency,'descripcion':description.text.trim(),'fecha':date,...conversion,if(widget.type=='transaction')...{'tipo':kind,'categoria':category}};
      }
      if(mounted)Navigator.pop(context,row);
    }catch(e){if(mounted)setState((){busy=false;error='No se pudo guardar: $e';});}
  }

  @override Widget build(BuildContext context){
    final editing=widget.current?['id']!=null;
    final title=deposit?'Aporte a tu meta':goal?(editing?'Editar meta':'Nueva meta'):widget.type=='opening'?'Saldo inicial':adjustment?'Ajuste de saldo':editing?'Editar movimiento':widget.initialKind==null?'Nuevo movimiento':'Nuevo '+(typeNames[kind]??'movimiento').toLowerCase();
    final color=goal||deposit?C.lavender:transaction?(typeColors[kind]??C.mint):C.petroleum;
    final icon=goal||deposit?Icons.flag_rounded:adjustment?Icons.tune_rounded:widget.type=='opening'?Icons.account_balance_wallet_rounded:kind=='ingreso'?Icons.south_west_rounded:Icons.north_east_rounded;
    final pages=<({String title,String hint,Widget content})>[
      if(transaction&&widget.initialKind==null)(title:'¿Qué vas a registrar?',hint:'Elige el tipo de movimiento.',content:Column(children:[for(final entry in typeNames.entries)FlowChoice(title:entry.value,subtitle:entry.key=='ingreso'?'Dinero que entra':entry.key=='costo'?'Lo que cuesta producir o vender':'Pagos para mantener tu actividad',icon:entry.key=='ingreso'?Icons.south_west_rounded:entry.key=='costo'?Icons.inventory_2_outlined:Icons.north_east_rounded,color:typeColors[entry.key]!,selected:kind==entry.key,onTap:()=>setState((){kind=entry.key;category=Catalog.categories(kind).first;}))])),
      if(adjustment)(title:'¿Cómo cambia tu saldo?',hint:'Los ajustes se registran por separado de los ingresos y gastos.',content:Column(children:[FlowChoice(title:'Sumar al saldo',icon:Icons.add_rounded,selected:direction=='entrada',onTap:()=>setState(()=>direction='entrada')),FlowChoice(title:'Restar del saldo',icon:Icons.remove_rounded,selected:direction=='salida',onTap:()=>setState(()=>direction='salida'),color:C.coral)])),
      if(goal)(title:'Ponle nombre a tu meta',hint:'Algo concreto que quieras lograr.',content:TextFormField(key:const ValueKey('record-description'),controller:description,maxLength:60,textCapitalization:TextCapitalization.sentences,decoration:InputDecoration(labelText:t('Nombre de la meta'),hintText:'Ej. Mi nuevo equipo'),validator:(v)=>(v?.trim().length??0)<2?'Escribe al menos 2 caracteres.':null)),
      (title:deposit?'¿Cuánto vas a aportar?':goal?'¿Cuánto quieres ahorrar?':'¿Cuál es el monto?',hint:deposit?'Aporte local a “'+(widget.current?['nombre'] as String? ?? '')+'”.':goal?'Tu objetivo, en la moneda que elijas.':'Escribe el importe en su moneda original.',content:Column(crossAxisAlignment:CrossAxisAlignment.stretch,spacing:20,children:[
        TextFormField(key:const ValueKey('record-amount'),controller:amount,keyboardType:const TextInputType.numberWithOptions(decimal:true),textInputAction:TextInputAction.done,style:h(36),decoration:InputDecoration(labelText:t(goal?'Monto objetivo':'Monto'),hintText:'0.00',suffixText:currency),validator:(v)=>validAmount(v??'')?null:'Ingresa un monto positivo válido.'),
        if(!currencyLocked)CurrencyField(value:currency,onChanged:(v)=>setState(()=>currency=v))else Text('Moneda: '+currency+'. La meta ya tiene ahorro y su moneda se conserva.',style:body(12,color:C.sub)),
        if(!goal&&!deposit&&currency!=widget.currency)Text('Se conserva el importe original. La equivalencia en '+widget.currency+' se añade si hay una cotización disponible.',style:body(12,color:C.sub)),
      ])),
      if(!goal&&!deposit)(title:'¿De qué se trata?',hint:'Un detalle breve te ayudará a reconocerlo después.',content:Column(spacing:20,children:[TextFormField(key:const ValueKey('record-description'),controller:description,maxLength:80,textCapitalization:TextCapitalization.sentences,decoration:InputDecoration(labelText:t('Descripción'),hintText:kind=='ingreso'?'Ej. Venta del día':'Ej. Compra de materiales'),validator:(v)=>(v?.trim().length??0)<2?'Escribe al menos 2 caracteres.':null),if(transaction)SelectField(label:'Categoría',value:category,items:{for(final c in {...Catalog.categories(kind),category})c:c},onChanged:(v)=>setState(()=>category=v))])),
      if(!deposit)(title:goal?'¿Tienes una fecha en mente?':'¿Cuándo ocurrió?',hint:goal?'Puedes dejarla sin fecha y definirla más adelante.':'La fecha ayuda a mantener tus análisis en orden.',content:DateField(label:goal?'Fecha objetivo (opcional)':'Fecha',value:date,future:goal,optional:goal,onChanged:(v)=>setState(()=>date=v))),
      (title:'Todo listo para guardar',hint:'Revisa los datos antes de confirmar.',content:Paper(color:C.highlight,child:Column(children:[
        ReviewLine(goal?'Meta':deposit?'Aporte a':'Concepto',deposit ? ((widget.current?['nombre'] as String?) ?? '') : description.text.trim()),
        ReviewLine(goal?'Objetivo':'Monto',money(parse(amount.text)??0,currency)),
        if(transaction)ReviewLine('Tipo',typeNames[kind]??kind),if(transaction)ReviewLine('Categoría',category),
        if(adjustment)ReviewLine('Ajuste',direction=='salida'?'Salida (−)':'Entrada (+)'),
        if(!deposit)ReviewLine(goal?'Fecha objetivo':'Fecha',date.isEmpty?'Sin fecha':date),
        if(deposit)const ReviewLine('Registro','Ahorro local'),
      ]))),
    ];
    return PopScope(canPop:false,onPopInvokedWithResult:(didPop,result){if(!didPop){if(step>0&&!busy){change(step-1);}else{close();}}},child:FlowPanel(title:title,icon:icon,color:color,step:step,steps:pages.length,heading:pages[step].title,subtitle:pages[step].hint,busy:busy,error:error,onClose:close,onBack:()=>change(step-1),onNext:(){if(changing)return;if(step==pages.length-1){submit();}else if(forms[step].currentState?.validate()??true){change(step+1);}},child:Form(key:forms[step],child:pages[step].content)));
  }
}

class CategoryChart extends StatelessWidget {
  const CategoryChart(this.data,{super.key,required this.currency});final List<RowData> data;final String currency;
  @override Widget build(BuildContext context){final total=data.fold<double>(0,(a,b)=>a+number(b['total']));final colors=[C.mint,C.lavender,C.coral,C.petroleum,const Color(0xffe3b766),const Color(0xff70b0c3)];return Column(children:[if(total>0)SizedBox(height:170,width:170,child:CustomPaint(painter:_Donut(data.map((r)=>number(r['total'])).toList(),colors))),if(data.isEmpty)const Text('Sin importes convertidos para este período.'),for(var i=0;i<data.length;i++)Padding(padding:const EdgeInsets.only(top:10),child:Column(children:[Row(children:[Container(width:9,height:9,decoration:BoxDecoration(color:colors[i%colors.length],shape:BoxShape.circle)),const SizedBox(width:8),Expanded(child:Text(data[i]['categoria'] as String,style:body(12))),Text(money(number(data[i]['total']),currency),style:body(12))]),const SizedBox(height:5),LinearProgressIndicator(value:total>0?number(data[i]['total'])/total:0,minHeight:5,color:colors[i%colors.length],borderRadius:BorderRadius.circular(8))]))]);}
}
class _Donut extends CustomPainter {
  _Donut(this.values,this.colors);final List<double> values;final List<Color> colors;
  @override void paint(Canvas canvas,Size size){final total=values.fold<double>(0,(a,b)=>a+b);if(total<=0)return;var start=-math.pi/2;final rect=Rect.fromLTWH(18,18,size.width-36,size.height-36);for(var i=0;i<values.length;i++){final sweep=values[i]/total*2*math.pi;canvas.drawArc(rect,start,sweep,false,Paint()..color=colors[i%colors.length]..style=PaintingStyle.stroke..strokeWidth=24);start+=sweep;}}
  @override bool shouldRepaint(covariant _Donut old)=>true;
}
class EvolutionChart extends StatelessWidget {
  const EvolutionChart(this.data,{super.key,required this.currency});final List<RowData> data;final String currency;
  @override Widget build(BuildContext context){final maxValue=data.fold<double>(1,(a,b)=>math.max(a,math.max(number(b['ingresos']),number(b['egresos']))));return Column(children:[SizedBox(height:175,child:Row(crossAxisAlignment:CrossAxisAlignment.end,children:[for(final row in data)Expanded(child:Padding(padding:const EdgeInsets.symmetric(horizontal:4),child:Column(mainAxisAlignment:MainAxisAlignment.end,children:[Expanded(child:Row(crossAxisAlignment:CrossAxisAlignment.end,children:[Expanded(child:Tooltip(message:'Ingresos: ${money(number(row['ingresos']),currency)}',child:Container(height:135*number(row['ingresos'])/maxValue,decoration:BoxDecoration(color:C.mint,borderRadius:BorderRadius.circular(5))))),const SizedBox(width:3),Expanded(child:Tooltip(message:'Egresos: ${money(number(row['egresos']),currency)}',child:Container(height:135*number(row['egresos'])/maxValue,decoration:BoxDecoration(color:C.coral,borderRadius:BorderRadius.circular(5)))))])),const SizedBox(height:8),Text(row['mes'] as String,style:body(10))])))])),const SizedBox(height:10),const Text('Ingresos (menta) · Egresos (coral)'),const SizedBox(height:10),for(final row in data)Padding(padding:const EdgeInsets.only(top:6),child:Row(children:[Expanded(child:Text(row['mes'] as String,style:body(12))),Text('Ganancia: ${money(number(row['ganancia']),currency)}',style:body(12))]))]);}
}
