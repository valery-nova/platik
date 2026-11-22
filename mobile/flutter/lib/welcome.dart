import 'package:flutter/material.dart' hide Text;
import 'i18n.dart';
import 'store.dart';
import 'theme.dart';
import 'tempo_ui.dart';

/// Tempo's three-page presentation pattern, adapted to Platik's brand/content.
class PlatikWelcome extends StatefulWidget{
  const PlatikWelcome({super.key,required this.store,required this.onStart,required this.onContinue});
  final PlatikStore store;final VoidCallback onStart,onContinue;
  @override State<PlatikWelcome> createState()=>_PlatikWelcomeState();
}
class _PlatikWelcomeState extends State<PlatikWelcome>{
  final controller=PageController();int page=0;
  @override void dispose(){controller.dispose();super.dispose();}
  @override Widget build(BuildContext context){final dark=Theme.of(context).brightness==Brightness.dark;return Stack(children:[
    const Aurora(height:470,colors:[C.mint,C.lavender,C.coral]),
    Column(children:[
      Padding(padding:const EdgeInsets.fromLTRB(24,14,14,0),child:Row(children:[const PlatikWordmark(width:104),const Spacer(),TextButton(style:TextButton.styleFrom(minimumSize:const Size(36,40),padding:const EdgeInsets.symmetric(horizontal:8)),onPressed:()=>widget.store.setSettings({'lang':CatalogLanguage.next(widget.store)}),child:Text(widget.store.settings['lang']=='en'?'EN':'ES')),IconButton(constraints:const BoxConstraints.tightFor(width:40,height:40),padding:const EdgeInsets.all(8),tooltip:t(dark?'Modo claro':'Modo oscuro'),onPressed:()=>widget.store.setSettings({'theme':dark?'light':'dark'}),icon:Icon(dark?Icons.light_mode_outlined:Icons.dark_mode_outlined,size:21)),TextButton(onPressed:widget.onStart,child:const Text('Saltar'))])),
      Expanded(child:PageView(controller:controller,onPageChanged:(i)=>setState(()=>page=i),children:[
        _WelcomePage(kicker:'BIENVENIDO A PLATIK',title:'Tu dinero,\ncon claridad.',text:'Todo lo que entra, lo que sale y lo que puedes ahorrar. Un lugar para entender tus finanzas y decidir con calma.',top:Center(child:Stack(alignment:Alignment.center,children:[Container(width:220,height:220,decoration:BoxDecoration(color:C.mint.withValues(alpha:.13),shape:BoxShape.circle)),const FloatingMascot(size:205)]))),
        _WelcomePage(kicker:'UN PASO A LA VEZ',title:'Cada movimiento\ncuenta.',text:'Registra un ingreso o un gasto en pocos pasos. Platik ordena tus números y te muestra cómo va tu actividad.',top:Center(child:Transform.rotate(angle:-.035,child:Paper(padding:const EdgeInsets.all(20),child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Tu resumen',style:h(18)),const SizedBox(height:16),for(final row in [(Icons.south_west_rounded,'Ingresos','Bs 950',C.mint),(Icons.north_east_rounded,'Gastos','Bs 320',C.coral),(Icons.savings_outlined,'Disponible','Bs 630',C.lavender)])Padding(padding:const EdgeInsets.symmetric(vertical:8),child:Row(children:[CoverTile(gradient:LinearGradient(colors:[row.$4,row.$4.withValues(alpha:.7)]),icon:row.$1,size:38),const SizedBox(width:12),Expanded(child:Text(row.$2,style:body(14))),Text(row.$3,style:body(15,w:FontWeight.w800))]))]))))),
        _WelcomePage(kicker:'DALE UN PROPÓSITO',title:'Pequeños ahorros.\nGrandes planes.',text:'Crea metas personales o para tu negocio. Conecta tu billetera y explora el ahorro digital en Stellar Testnet.',top:Center(child:Paper(padding:const EdgeInsets.all(24),child:Column(mainAxisSize:MainAxisSize.min,children:[Container(padding:const EdgeInsets.all(20),decoration:BoxDecoration(color:C.lavender.withValues(alpha:.16),shape:BoxShape.circle),child:const Icon(Icons.flag_rounded,size:52,color:C.lavender)),const SizedBox(height:18),Text('Mi próxima meta',style:h(20)),const SizedBox(height:15),TweenAnimationBuilder<double>(tween:Tween(begin:0,end:.68),duration:const Duration(milliseconds:900),curve:Curves.easeOutCubic,builder:(_,value,child)=>LinearProgressIndicator(value:value,minHeight:8,color:C.mint,borderRadius:BorderRadius.circular(8))),const SizedBox(height:10),Text('Cada paso te acerca.',style:body(13,color:C.sub))])))),
      ])),
      Row(mainAxisAlignment:MainAxisAlignment.center,children:[for(var i=0;i<3;i++)AnimatedContainer(duration:const Duration(milliseconds:250),margin:const EdgeInsets.symmetric(horizontal:4),width:i==page?26:8,height:7,decoration:BoxDecoration(color:i==page?C.mint:Theme.of(context).dividerColor,borderRadius:BorderRadius.circular(8)))]),
      Padding(padding:const EdgeInsets.fromLTRB(24,22,24,14),child:PrimaryButton(page==2?'Probar PLATIK':'Siguiente',icon:page==2?Icons.auto_awesome_rounded:Icons.arrow_forward_rounded,onTap:()=>page==2?widget.onStart():controller.nextPage(duration:const Duration(milliseconds:350),curve:Curves.easeOutCubic))),
      if(widget.store.started)TextButton(onPressed:widget.onContinue,child:const Text('Continuar en mi panel'))else Padding(padding:const EdgeInsets.only(bottom:10),child:Text('Finanzas personales · Negocios · Ahorro',style:body(11,color:C.sub))),
    ]),
  ]);}
}
class CatalogLanguage{static String next(PlatikStore store)=>store.settings['lang']=='en'?'es':'en';}

class _WelcomePage extends StatelessWidget{
  const _WelcomePage({required this.kicker,required this.title,required this.text,required this.top});
  final Widget top;final String kicker,title,text;
  @override Widget build(BuildContext context)=>LayoutBuilder(builder:(context,box)=>SingleChildScrollView(padding:const EdgeInsets.symmetric(horizontal:26),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
    SizedBox(height:(box.maxHeight*.44).clamp(165,285),child:top),
    const SizedBox(height:12),Text(kicker,style:body(11,color:C.sub,w:FontWeight.w800).copyWith(letterSpacing:1.5)),
    const SizedBox(height:10),Text(title,style:h(32)),const SizedBox(height:14),Text(text,style:body(15,w:FontWeight.w500)),const SizedBox(height:16),
  ])));
}

class FloatingMascot extends StatefulWidget{
  const FloatingMascot({super.key,this.size=105});final double size;
  @override State<FloatingMascot> createState()=>_FloatingMascotState();
}
class _FloatingMascotState extends State<FloatingMascot> with SingleTickerProviderStateMixin{
  late final controller=AnimationController(vsync:this,duration:const Duration(milliseconds:1500))..forward();
  @override void dispose(){controller.dispose();super.dispose();}
  @override Widget build(BuildContext context){final child=Image.asset('assets/mascota.png',width:widget.size,height:widget.size,fit:BoxFit.contain);if(MediaQuery.disableAnimationsOf(context))return child;return AnimatedBuilder(animation:controller,child:child,builder:(_,child)=>Transform.translate(offset:Offset(0,-5*Curves.easeInOut.transform(controller.value)),child:child));}
}
