import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart' hide Text;
import 'package:flutter/services.dart';
import 'i18n.dart';
import 'domain.dart';
import 'store.dart';
import 'rates.dart';
import 'theme.dart';
import 'tempo_ui.dart';
import 'flow.dart';
import 'widgets.dart';
import 'dashboard.dart';
import 'screen_profile.dart' show profileTypes;
import 'screen_spaces.dart' show PreferencesCard,SocialLinks,ventureTypes;

class ProfileHub extends StatelessWidget{
  const ProfileHub({super.key,required this.store,required this.rates,required this.openLanding,required this.chooseMode});final PlatikStore store;final RateService rates;final VoidCallback openLanding,chooseMode;
  Widget row(BuildContext context,IconData icon,String title,String sub,VoidCallback onTap,{Color color=C.petroleum})=>Padding(padding:const EdgeInsets.only(bottom:10),child:Paper(padding:const EdgeInsets.all(4),onTap:onTap,child:ListTile(leading:Container(width:39,height:39,decoration:BoxDecoration(color:color.withValues(alpha:.11),borderRadius:BorderRadius.circular(13)),child:Icon(icon,color:Theme.of(context).brightness==Brightness.dark?C.mint:color,size:22)),title:Text(title,style:body(14,w:FontWeight.w800)),subtitle:Text(sub,style:body(11,color:C.sub)),trailing:const Icon(Icons.chevron_right_rounded,size:20))));
  @override Widget build(BuildContext context){final name=store.profile['nombreUsuario'] as String? ?? '';return ListView(primary:false,padding:const EdgeInsets.fromLTRB(20,10,20,26),children:[
    Text('Tu espacio, a tu manera',style:h(27)),const SizedBox(height:22),
    Row(children:[CircleAvatar(radius:28,backgroundColor:C.mint.withValues(alpha:.16),child:Text(name.isEmpty?'P':name.characters.first.toUpperCase(),style:h(24))),const SizedBox(width:15),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(name.isEmpty?'Mi perfil':name,style:h(21)),const SizedBox(height:5),Text('${store.spaceName} · ${store.currency}',style:body(12,color:C.sub))])),ActionChip(label:Text(store.demo?'Demo':'Beta'),onPressed:chooseMode)]),const SizedBox(height:24),
    row(context,Icons.person_outline_rounded,'Datos del espacio','Nombre, país y monedas',()=>showPlatikFlow(context,ProfileDataFlow(store:store))),
    row(context,Icons.workspaces_outline,'Espacios financieros','Personal, negocio y freelance',()=>openPlatikPage(context,StorePage(store:store,title:'Espacios financieros',builder:(_)=>SpacesManagement(store:store))),color:C.lavender),
    row(context,Icons.account_balance_wallet_outlined,'Saldo y ajustes','Tu punto de partida y correcciones',()=>openBalance(context,store,rates)),
    row(context,Icons.donut_large_rounded,'Distribución del dinero','Decide cuánto destinar a cada cosa',()=>openPlatikPage(context,StorePage(store:store,title:'Distribución',builder:(_)=>DistributionManagement(store:store))),color:const Color(0xff2a9269)),
    row(context,Icons.palette_outlined,'Apariencia e idioma','Tema claro u oscuro · ES / EN',()=>openPlatikPage(context,StorePage(store:store,title:'Preferencias',builder:(_)=>PageBody(title:'',children:[PreferencesCard(store:store)]))),color:C.lavender),
    row(context,Icons.folder_copy_outlined,'Datos y respaldo','Modalidad, copia local y restauración',()=>openPlatikPage(context,StorePage(store:store,title:'Datos y respaldo',builder:(_)=>_DataManagement(store:store,chooseMode:chooseMode)))),
    const SizedBox(height:7),const Divider(),
    ListTile(contentPadding:EdgeInsets.zero,leading:const Icon(Icons.info_outline_rounded,size:22),title:const Text('Conoce Platik'),trailing:const Icon(Icons.chevron_right_rounded,size:20),onTap:openLanding),
    ListTile(contentPadding:EdgeInsets.zero,leading:const Icon(Icons.chat_bubble_outline_rounded,size:22),title:const Text('Cuéntanos tu experiencia'),trailing:const Icon(Icons.open_in_new_rounded,size:18),onTap:()=>openExternal('https://tally.so/r/NqXXGG')),
    const SizedBox(height:8),const SocialLinks(),const SizedBox(height:12),Text('PLATIK · Tus finanzas, con claridad.',textAlign:TextAlign.center,style:body(11,color:C.sub)),
  ]);}
}

class ProfileDataFlow extends StatefulWidget{
  const ProfileDataFlow({super.key,required this.store});final PlatikStore store;
  @override State<ProfileDataFlow> createState()=>_ProfileDataFlowState();
}
class _ProfileDataFlowState extends State<ProfileDataFlow>{
  late RowData draft={...widget.store.profile};late final scope=widget.store.target;
  late final name=TextEditingController(text:draft['nombreUsuario'] as String? ?? ''),business=TextEditingController(text:draft['nombreNegocio'] as String? ?? '');
  int step=0;bool busy=false;String? error;
  @override void dispose(){name.dispose();business.dispose();super.dispose();}
  @override Widget build(BuildContext context){final pages=<({String heading,String sub,Widget body})>[
    (heading:'¿Cómo te llamas?',sub:'Así te saludará Platik.',body:TextField(controller:name,maxLength:80,textCapitalization:TextCapitalization.words,decoration:InputDecoration(labelText:t('Tu nombre')))),
    (heading:'Tu actividad',sub:'Configura el nombre y el tipo de este espacio.',body:Column(spacing:22,children:[TextField(controller:business,maxLength:100,textCapitalization:TextCapitalization.words,decoration:InputDecoration(labelText:t('Nombre del negocio'))),SelectField(label:'Tipo de usuario',value:draft['tipoUsuario'] as String? ?? '',optional:true,items:profileTypes,onChanged:(v)=>setState(()=>draft['tipoUsuario']=v))])),
    (heading:'¿En qué país estás?',sub:'Puedes cambiarlo cuando lo necesites.',body:SelectField(label:'País',value:draft['countryCode'] as String? ?? '',optional:true,items:{for(final c in Catalog.countries)c['code'] as String:Catalog.countryName(c['code'] as String)},onChanged:(v)=>setState(()=>draft['countryCode']=v))),
    (heading:'Tu moneda principal',sub:'Esta es la moneda que se usa para analizar tu actividad.',body:CurrencyField(value:draft['moneda'] as String? ?? widget.store.currency,onChanged:(v)=>setState(()=>draft['moneda']=v))),
    (heading:'¿Quieres ver equivalencias?',sub:'Opcional. Conservamos siempre el importe original de cada movimiento.',body:CurrencyField(label:'Moneda de visualización',value:draft['displayCurrency'] as String? ?? '',optional:true,onChanged:(v)=>setState(()=>draft['displayCurrency']=v))),
    (heading:'Tu perfil está listo',sub:'Cambiar la moneda principal conserva los importes y cotizaciones históricos. Las equivalencias que falten quedan pendientes.',body:Paper(color:C.highlight,child:Column(children:[ReviewLine('Nombre',name.text.trim().isEmpty?'Sin especificar':name.text.trim()),ReviewLine('Negocio',business.text.trim().isEmpty?'Sin especificar':business.text.trim()),ReviewLine('País',Catalog.countryName(draft['countryCode'] as String? ?? '')),ReviewLine('Moneda principal',draft['moneda'] as String? ?? ''),ReviewLine('Equivalencias',draft['displayCurrency'] as String? ?? 'Sin especificar')]))),
  ];return FlowPanel(title:'Datos del espacio',icon:Icons.person_outline_rounded,step:step,steps:pages.length,heading:pages[step].heading,subtitle:pages[step].sub,busy:busy,error:error,onClose:()=>Navigator.pop(context),onBack:()=>setState(()=>step--),onNext:()async{if(step<pages.length-1){setState(()=>step++);return;}setState(()=>busy=true);try{if(widget.store.target!=scope)throw StateError('El espacio cambió. Abre de nuevo el perfil.');await widget.store.setProfile({...draft,'nombreUsuario':name.text.trim(),'nombreNegocio':business.text.trim()});if(context.mounted)Navigator.pop(context);}catch(e){if(mounted)setState((){busy=false;error=e.toString();});}},child:pages[step].body);}
}

class SpacesManagement extends StatelessWidget{
  const SpacesManagement({super.key,required this.store});final PlatikStore store;
  @override Widget build(BuildContext context)=>PageBody(title:'Separa tus finanzas',subtitle:'Cada espacio conserva sus propios movimientos, metas y distribución.',children:[
    Paper(onTap:()=>store.selectSpace('personal'),child:ListTile(contentPadding:EdgeInsets.zero,leading:const Icon(Icons.person_outline_rounded,size:25),title:Text('Personal',style:h(18)),subtitle:const Text('Tu dinero del día a día'),trailing:store.spaceId=='personal'?const Icon(Icons.check_circle_rounded,color:C.mint):const Icon(Icons.chevron_right_rounded))),
    for(final v in store.ventures)Paper(child:Column(children:[ListTile(contentPadding:EdgeInsets.zero,leading:const CoverTile(gradient:LinearGradient(colors:[C.lavender,Color(0xff7563b8)]),icon:Icons.work_outline_rounded,size:42),title:Text(v['nombre'] as String,style:h(18)),subtitle:Text(ventureTypes[v['tipo']]??''),trailing:store.spaceId==v['id']?const Icon(Icons.check_circle_rounded,color:C.mint):null,onTap:()=>store.selectSpace(v['id'] as String)),const Divider(),Row(children:[TextButton.icon(onPressed:()=>showPlatikFlow(context,_SpaceFlow(store:store,venture:v)),icon:const Icon(Icons.edit_outlined,size:17),label:const Text('Renombrar')),const Spacer(),TextButton.icon(onPressed:()async{if(await confirm(context,'Eliminar espacio','¿Eliminar “${v['nombre']}” y sus datos locales?'))await store.deleteVenture(v['id'] as String);},icon:const Icon(Icons.delete_outline_rounded,size:17,color:C.coral),label:const Text('Eliminar'))])])),
    if(store.ventures.length<2)PrimaryButton('Agregar emprendimiento',icon:Icons.add_rounded,onTap:()=>showPlatikFlow(context,_SpaceFlow(store:store)))else const Notice('Ya tienes 2 emprendimientos. Puedes eliminar uno para crear otro.'),
  ]);
}
class _SpaceFlow extends StatefulWidget{
  const _SpaceFlow({required this.store,this.venture});final PlatikStore store;final RowData? venture;
  @override State<_SpaceFlow> createState()=>_SpaceFlowState();
}
class _SpaceFlowState extends State<_SpaceFlow>{
  late final name=TextEditingController(text:widget.venture?['nombre'] as String? ?? '');late String type=widget.venture?['tipo'] as String? ?? 'emprendimiento';int step=0;String? error;bool busy=false;
  @override void dispose(){name.dispose();super.dispose();}
  @override Widget build(BuildContext context){final editing=widget.venture!=null,last=editing?1:2;return FlowPanel(title:editing?'Renombrar espacio':'Nuevo emprendimiento',icon:Icons.workspaces_outline,color:C.lavender,step:step,steps:last+1,heading:step==0?'¿Cómo se llama tu espacio?':step==last?'Listo para empezar':'¿A qué te dedicas?',subtitle:step==last?'Hereda tu país y moneda. Los movimientos empiezan en cero.':null,busy:busy,error:error,onClose:()=>Navigator.pop(context),onBack:()=>setState(()=>step--),onNext:()async{if(step==0&&(name.text.trim().length<2||name.text.trim().length>60)){setState(()=>error='Nombre de 2 a 60 caracteres.');return;}if(step<last){setState((){step++;error=null;});return;}setState(()=>busy=true);try{if(editing){await widget.store.renameVenture(widget.venture!['id'] as String,name.text);}else if(!await widget.store.createVenture(name.text,type)){throw const FormatException('No se pudo crear este espacio.');}if(context.mounted)Navigator.pop(context);}catch(e){if(mounted)setState((){busy=false;error=e.toString();});}},child:step==0?TextField(controller:name,maxLength:60,textCapitalization:TextCapitalization.words,decoration:InputDecoration(labelText:t('Nombre del espacio'))):step==last?Paper(color:C.highlight,child:Column(children:[ReviewLine('Espacio',name.text.trim()),ReviewLine('Tipo',ventureTypes[type]??''),ReviewLine('Moneda',widget.store.currency)])):Column(children:[for(final e in ventureTypes.entries)FlowChoice(title:e.value,icon:Icons.work_outline_rounded,selected:type==e.key,onTap:()=>setState(()=>type=e.key),color:C.lavender)]));}
}

class DistributionManagement extends StatelessWidget{
  const DistributionManagement({super.key,required this.store});final PlatikStore store;
  Future<void> edit(BuildContext context,RowData item)async{
    final current=store.distribution,available=math.max(store.balance.amount??0.0,0.0),currency=store.currency;
    final next=await showPlatikFlow<double>(context,SplitFlow(item:item,items:current,available:available,currency:currency));
    if(next!=null)await store.patch({'distribution':current.map((r)=>r['key']==item['key']?{...r,'porcentaje':next}:r).toList()});
  }
  Future<void> add(BuildContext context)async{final missing=Catalog.distribution.where((c)=>!store.distribution.any((d)=>d['key']==c['key'])).toList();if(missing.isEmpty)return;final key=await showModalBottomSheet<String>(context:context,useSafeArea:true,builder:(context)=>ListView(shrinkWrap:true,padding:const EdgeInsets.all(20),children:[Text('Agregar categoría',style:h(22)),const SizedBox(height:14),for(final c in missing)ListTile(title:Text(c['nombre'] as String),subtitle:Text(c['descripcion'] as String? ?? ''),onTap:()=>Navigator.pop(context,c['key'] as String))]));if(key!=null)await store.patch({'distribution':[...store.distribution,{...missing.firstWhere((c)=>c['key']==key),'porcentaje':0}]});}
  @override Widget build(BuildContext context){final available=math.max(store.balance.amount??0.0,0.0),c=store.currency,total=store.distribution.fold<double>(0,(sum,r)=>sum+number(r['porcentaje']));final amounts=distributionAmounts(store.distribution,available,c);return PageBody(title:'Dale un destino a tu dinero',subtitle:available>0?'Disponible: ${money(available,c)}':'Los porcentajes son una referencia hasta que tengas dinero disponible.',actions:[FilledButton.tonalIcon(onPressed:()=>showPlatikFlow(context,_RecommendationFlow(store:store)),icon:const Icon(Icons.auto_awesome_outlined,size:18),label:const Text('Recomendar')),TextButton(onPressed:()async{if(await confirm(context,'Restablecer distribución','Se aplican los porcentajes de referencia de tu perfil.'))await store.patch({'distribution':Catalog.defaults(store.profile['tipoUsuario'] as String?)});},child:const Text('Restablecer'))],children:[
    Paper(color:C.highlight,child:Row(children:[Expanded(child:Text('Asignado: ${pct(total,1)}',style:body(14,w:FontWeight.w800))),Text('Libre: ${pct(math.max(0,100-total),1)}',style:body(12))])),
    for(final item in store.distribution)Paper(onTap:()=>edit(context,item),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Row(children:[Expanded(child:Text(item['nombre'] as String,style:h(18))),Text(pct(number(item['porcentaje']),1),style:h(20)),PopupMenuButton<String>(onSelected:(v)async{if(v=='edit'){await edit(context,item);}else if(await confirm(context,'Quitar categoría','¿Quitar “${item['nombre']}” de la distribución?')){await store.patch({'distribution':store.distribution.where((r)=>r['key']!=item['key']).toList()});}},itemBuilder:(context)=>const [PopupMenuItem(value:'edit',child:Text('Editar')),PopupMenuItem(value:'remove',child:Text('Quitar categoría'))])]),const SizedBox(height:6),Text(item['descripcion'] as String? ?? '',style:body(12,color:C.sub)),const SizedBox(height:15),LinearProgressIndicator(value:(number(item['porcentaje'])/100).clamp(0,1),minHeight:5,color:C.mint,borderRadius:BorderRadius.circular(5)),const SizedBox(height:11),Text(available>0?money(number(amounts['porCategoria'][item['key']]),c):'Sin saldo para asignar',style:body(13,w:FontWeight.w800))])),
    OutlinedButton.icon(onPressed:()=>add(context),icon:const Icon(Icons.add_rounded),label:const Text('Agregar categoría')),
  ]);}
}

class SplitFlow extends StatefulWidget{
  const SplitFlow({super.key,required this.item,required this.items,required this.available,required this.currency});final RowData item;final List<RowData> items;final double available;final String currency;
  @override State<SplitFlow> createState()=>_SplitFlowState();
}
class _SplitFlowState extends State<SplitFlow>{
  int step=0;bool byAmount=false;late final input=TextEditingController(text:number(widget.item['porcentaje']).toString());String? error;
  @override void dispose(){input.dispose();super.dispose();}
  double? get value=>double.tryParse(input.text.replaceAll(',','.'));
  double get percent=>byAmount&&widget.available>0?((rounded(value??0,widget.currency)/widget.available*100000-1e-9).ceil()/1000):value??0;
  @override Widget build(BuildContext context){final others=widget.items.where((r)=>r['key']!=widget.item['key']).fold<double>(0,(sum,r)=>sum+number(r['porcentaje']));return FlowPanel(title:widget.item['nombre'] as String,icon:Icons.donut_large_rounded,step:step,steps:3,heading:step==0?'¿Cómo quieres asignarlo?':step==1?(byAmount?'Elige un monto':'Elige un porcentaje'):'Revisa tu distribución',subtitle:step==1?'Disponible: ${money(widget.available,widget.currency)}':null,error:error,onClose:()=>Navigator.pop(context),onBack:()=>setState(()=>step--),onNext:(){if(step==1&&(value==null||!value!.isFinite||value!<0||value!>1e12||percent>100||percent+others>100+1e-6)){setState(()=>error='El total no puede superar 100%. Ajusta el valor o reduce otra categoría.');return;}if(step==2){Navigator.pop(context,percent);}else{setState((){step++;error=null;});}},child:step==0?Column(children:[FlowChoice(title:'Por porcentaje',subtitle:'Una parte del dinero disponible',icon:Icons.percent_rounded,selected:!byAmount,onTap:()=>setState((){byAmount=false;input.text=number(widget.item['porcentaje']).toString();})),if(widget.available>0)FlowChoice(title:'Por monto',subtitle:'Un importe en ${widget.currency}',icon:Icons.payments_outlined,selected:byAmount,onTap:()=>setState((){byAmount=true;input.text=rounded(widget.available*number(widget.item['porcentaje'])/100,widget.currency).toString();}))]):step==1?TextField(controller:input,keyboardType:const TextInputType.numberWithOptions(decimal:true),style:h(36),decoration:InputDecoration(labelText:t(byAmount?'Monto':'Porcentaje'),suffixText:byAmount?widget.currency:'%')):Paper(color:C.highlight,child:Column(children:[ReviewLine('Categoría',widget.item['nombre'] as String),ReviewLine('Porcentaje',pct(percent,3)),ReviewLine('Monto',money(rounded(widget.available*percent/100,widget.currency),widget.currency)),ReviewLine('Total asignado',pct(percent+others,3))])));}
}

class _RecommendationFlow extends StatefulWidget{
  const _RecommendationFlow({required this.store});final PlatikStore store;
  @override State<_RecommendationFlow> createState()=>_RecommendationFlowState();
}
class _RecommendationFlowState extends State<_RecommendationFlow>{
  late List<RowData> proposal=Catalog.defaults(widget.store.profile['tipoUsuario'] as String?);bool busy=false;String? error;
  @override Widget build(BuildContext context){final available=math.max(widget.store.balance.amount??0.0,0.0),c=widget.store.currency;final values=distributionAmounts(proposal,available,c);return FlowPanel(title:'Distribución recomendada',icon:Icons.auto_awesome_outlined,color:C.lavender,step:0,steps:1,heading:'Una propuesta para tu actividad',subtitle:'Porcentajes de referencia, siempre editables. Revisa y decide antes de aplicarlos.',nextLabel:'Aplicar propuesta',busy:busy,error:error,onBack:null,onClose:()=>Navigator.pop(context),onNext:()async{setState(()=>busy=true);try{await widget.store.patch({'distribution':proposal});if(context.mounted)Navigator.pop(context);}catch(e){if(mounted)setState((){busy=false;error=e.toString();});}},child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[for(final item in proposal)ListTile(contentPadding:EdgeInsets.zero,title:Text(item['nombre'] as String,style:body(14,w:FontWeight.w800)),subtitle:Text(available>0?money(number(values['porCategoria'][item['key']]),c):'Porcentaje de referencia',style:body(11,color:C.sub)),trailing:Row(mainAxisSize:MainAxisSize.min,children:[Text(pct(number(item['porcentaje']),0)),const SizedBox(width:10),const Icon(Icons.edit_outlined,size:18)]),onTap:()async{final p=await showPlatikFlow<double>(context,SplitFlow(item:item,items:proposal,available:available,currency:c));if(p!=null&&mounted)setState(()=>proposal=proposal.map((r)=>r['key']==item['key']?{...r,'porcentaje':p}:r).toList());}),const SizedBox(height:15),OutlinedButton(onPressed:()=>setState(()=>proposal=Catalog.defaults(widget.store.profile['tipoUsuario'] as String?)),child:const Text('Recalcular')),TextButton(onPressed:()=>Navigator.pop(context),child:const Text('Rechazar propuesta'))]));}
}

class _DataManagement extends StatelessWidget{
  const _DataManagement({required this.store,required this.chooseMode});final PlatikStore store;final VoidCallback chooseMode;
  @override Widget build(BuildContext context)=>PageBody(title:'Tus datos, contigo',children:[
    Group('Modalidad',subtitle:store.demo?'Estás explorando datos de ejemplo':'Estás usando tu espacio beta',children:const [],actions:[FilledButton.tonal(onPressed:chooseMode,child:const Text('Cambiar modalidad')),TextButton(onPressed:()async{if(await confirm(context,'Restablecer espacio','Se restablecen los datos locales de “${store.spaceName}” en el modo ${store.mode}.'))await store.reset();},child:const Text('Restablecer este espacio'))]),
    Group('Respaldo local',subtitle:'Guarda una copia de tu espacio o restaura un respaldo de Platik.',children:const [Text('Los movimientos se guardan en este dispositivo. Las operaciones Stellar se verifican en la red.')],actions:[OutlinedButton.icon(onPressed:()async{await Clipboard.setData(ClipboardData(text:store.exportData()));if(context.mounted)toast(context,'Respaldo copiado. Guárdalo en un lugar privado.');},icon:const Icon(Icons.copy_outlined,size:18),label:const Text('Copiar respaldo')),TextButton(onPressed:()=>showPlatikFlow(context,_ImportFlow(store:store)),child:const Text('Importar respaldo'))]),
  ]);
}
class _ImportFlow extends StatefulWidget{
  const _ImportFlow({required this.store});final PlatikStore store;
  @override State<_ImportFlow> createState()=>_ImportFlowState();
}
class _ImportFlowState extends State<_ImportFlow>{
  final input=TextEditingController();int step=0;bool busy=false;String? error;RowData? candidate;
  @override void dispose(){input.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>FlowPanel(title:'Importar respaldo',icon:Icons.folder_copy_outlined,step:step,steps:2,heading:step==0?'Pega tu respaldo de Platik':'Revisa lo que vas a restaurar',subtitle:step==0?'Usa el JSON de una copia que hayas guardado.':'Se reemplazan los datos del espacio actual. Conserva una copia antes de continuar.',nextLabel:step==1?'Restaurar espacio':null,busy:busy,error:error,onClose:()=>Navigator.pop(context),onBack:()=>setState(()=>step--),onNext:()async{try{if(step==0){final decoded=jsonDecode(input.text);final d=decoded is Map&&decoded['data'] is Map?decoded['data']:decoded;if(d is! Map||d['transactions'] is! List||d['profile'] is! Map)throw const FormatException('Respaldo no válido.');setState((){candidate=Map<String,dynamic>.from(d);error=null;step=1;});}else{setState(()=>busy=true);await widget.store.importData(input.text);if(context.mounted)Navigator.pop(context);}}catch(e){if(mounted)setState((){busy=false;error=e.toString();});}},child:step==0?TextField(controller:input,minLines:6,maxLines:9,decoration:InputDecoration(labelText:t('Respaldo JSON')),autocorrect:false):Paper(color:C.highlight,child:Column(children:[ReviewLine('Espacio',widget.store.spaceName),ReviewLine('Movimientos','${rows(candidate?['transactions']).length}'),ReviewLine('Metas','${rows(candidate?['goals']).length}'),ReviewLine('Moneda',candidate?['profile']?['moneda'] as String? ?? '')])));
}
