import 'dart:math' as math;
import 'package:flutter/material.dart' hide Text;
import 'package:flutter/services.dart';
import 'i18n.dart';
import 'theme.dart';

Future<T?> showPlatikFlow<T>(BuildContext context,Widget child)=>showModalBottomSheet<T>(
  context:context,isScrollControlled:true,useSafeArea:true,isDismissible:false,
  enableDrag:false,backgroundColor:Colors.transparent,
  constraints:const BoxConstraints(maxWidth:620),builder:(_)=>child,
);

class FlowPanel extends StatelessWidget{
  const FlowPanel({super.key,required this.title,required this.icon,required this.step,
    required this.steps,required this.heading,required this.child,required this.onNext,
    required this.onBack,required this.onClose,this.subtitle,this.nextLabel,
    this.busy=false,this.color=C.petroleum,this.error,this.embedded=false});
  final String title,heading;final String? subtitle,nextLabel,error;
  final IconData icon;final Color color;final int step,steps;
  final Widget child;final VoidCallback? onNext,onBack,onClose;
  final bool busy,embedded;
  @override Widget build(BuildContext context){
    final media=MediaQuery.of(context),dark=Theme.of(context).brightness==Brightness.dark;
    final available=media.size.height-media.viewPadding.top-media.viewInsets.bottom;
    final surface=Theme.of(context).colorScheme.surface;
    final content=Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      Padding(padding:const EdgeInsets.fromLTRB(22,18,12,14),child:Row(children:[
        Container(width:38,height:38,decoration:BoxDecoration(color:(dark?C.mint:color).withValues(alpha:.12),borderRadius:BorderRadius.circular(13)),child:Icon(icon,size:20,color:dark?C.mint:color)),
        const SizedBox(width:11),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(title,style:body(13,w:FontWeight.w800)),const SizedBox(height:2),Text('Paso ${step+1} de $steps',style:body(11,color:C.sub))])),
        IconButton(tooltip:t('Cerrar'),onPressed:busy?null:onClose,icon:const Icon(Icons.close_rounded,size:21)),
      ])),
      Padding(padding:const EdgeInsets.symmetric(horizontal:22),child:Row(children:[for(var i=0;i<steps;i++)Expanded(child:AnimatedContainer(duration:const Duration(milliseconds:240),height:4,margin:EdgeInsets.only(right:i==steps-1?0:5),decoration:BoxDecoration(color:i<=step?(dark?C.mint:color):Theme.of(context).dividerColor,borderRadius:BorderRadius.circular(8))))])),
      Expanded(child:SingleChildScrollView(key:ValueKey('flow-scroll-$step'),padding:const EdgeInsets.fromLTRB(22,24,22,24),keyboardDismissBehavior:ScrollViewKeyboardDismissBehavior.onDrag,child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
        Text(heading,style:h(25)),if(subtitle!=null)...[const SizedBox(height:8),Text(subtitle!,style:body(13,color:C.sub))],const SizedBox(height:24),
        AnimatedSwitcher(duration:MediaQuery.disableAnimationsOf(context)?Duration.zero:const Duration(milliseconds:220),switchInCurve:Curves.easeOutCubic,switchOutCurve:Curves.easeInCubic,transitionBuilder:(child,a)=>FadeTransition(opacity:a,child:SlideTransition(position:Tween(begin:const Offset(.045,0),end:Offset.zero).animate(a),child:child)),child:KeyedSubtree(key:ValueKey(step),child:child)),
        if(error!=null)...[const SizedBox(height:16),Text(error!,style:body(13,color:dark?Colors.red.shade200:Colors.red.shade800))],
      ]))),
      if(busy)const LinearProgressIndicator(minHeight:2),
      Container(padding:EdgeInsets.fromLTRB(22,14,22,embedded?20:math.max(18,media.viewPadding.bottom)),decoration:BoxDecoration(border:Border(top:BorderSide(color:Theme.of(context).dividerColor))),child:Row(children:[
        if(step>0)...[OutlinedButton.icon(onPressed:busy?null:onBack,icon:const Icon(Icons.arrow_back_rounded,size:18),label:const Text('Atrás')),const SizedBox(width:12)],
        Expanded(child:FilledButton.icon(style:FilledButton.styleFrom(minimumSize:const Size(0,50)),onPressed:busy||onNext==null?null:(){FocusManager.instance.primaryFocus?.unfocus();HapticFeedback.selectionClick();onNext?.call();},icon:Icon(step==steps-1?Icons.check_rounded:Icons.arrow_forward_rounded,size:19),label:Text(busy?'Guardando…':nextLabel??(step==steps-1?'Guardar':'Siguiente')))),
      ])),
    ]);
    if(embedded)return content;
    return AnimatedPadding(duration:const Duration(milliseconds:200),curve:Curves.easeOutCubic,padding:EdgeInsets.only(bottom:media.viewInsets.bottom),child:SizedBox(height:math.min(720,available*.94),child:Material(color:surface,clipBehavior:Clip.antiAlias,borderRadius:const BorderRadius.vertical(top:Radius.circular(30)),child:content)));
  }
}

class FlowChoice extends StatelessWidget{
  const FlowChoice({super.key,required this.title,required this.icon,required this.selected,required this.onTap,this.subtitle,this.color=C.petroleum});
  final String title;final String? subtitle;final IconData icon;final bool selected;final VoidCallback onTap;final Color color;
  @override Widget build(BuildContext context){final dark=Theme.of(context).brightness==Brightness.dark;return AnimatedContainer(duration:const Duration(milliseconds:200),margin:const EdgeInsets.only(bottom:12),decoration:BoxDecoration(color:selected?(dark?C.mint:color).withValues(alpha:.10):Theme.of(context).colorScheme.surface,borderRadius:BorderRadius.circular(20),border:Border.all(color:selected?(dark?C.mint:color):Theme.of(context).dividerColor,width:selected?1.5:1)),child:InkWell(borderRadius:BorderRadius.circular(20),onTap:(){HapticFeedback.selectionClick();onTap();},child:Padding(padding:const EdgeInsets.all(16),child:Row(children:[Icon(icon,color:dark?C.mint:color,size:25),const SizedBox(width:14),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(title,style:body(15,w:FontWeight.w800)),if(subtitle!=null)...[const SizedBox(height:4),Text(subtitle!,style:body(12,color:C.sub))]])),const SizedBox(width:10),Icon(selected?Icons.check_circle_rounded:Icons.radio_button_unchecked,color:selected?(dark?C.mint:color):Theme.of(context).dividerColor,size:21)]))));}
}

class ReviewLine extends StatelessWidget{
  const ReviewLine(this.label,this.value,{super.key});final String label,value;
  @override Widget build(BuildContext context)=>Padding(padding:const EdgeInsets.symmetric(vertical:11),child:Row(crossAxisAlignment:CrossAxisAlignment.start,children:[Expanded(flex:2,child:Text(label,style:body(12,color:C.sub))),const SizedBox(width:16),Expanded(flex:3,child:Text(value,textAlign:TextAlign.right,style:body(14,w:FontWeight.w800)))]));
}

class TabReveal extends StatefulWidget{
  const TabReveal({super.key,required this.active,required this.child});final bool active;final Widget child;
  @override State<TabReveal> createState()=>_TabRevealState();
}
class _TabRevealState extends State<TabReveal> with SingleTickerProviderStateMixin{
  late final controller=AnimationController(vsync:this,duration:const Duration(milliseconds:300),value:1);
  late final curve=CurvedAnimation(parent:controller,curve:Curves.easeOutCubic);
  @override void didUpdateWidget(covariant TabReveal old){super.didUpdateWidget(old);if(widget.active&&!old.active){if(MediaQuery.disableAnimationsOf(context)){controller.value=1;}else{controller.forward(from:0);}}}
  @override void dispose(){controller.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>TickerMode(enabled:widget.active,child:FadeTransition(opacity:curve,child:SlideTransition(position:Tween(begin:const Offset(0,.018),end:Offset.zero).animate(curve),child:widget.child)));
}

Future<T?> openPlatikPage<T>(BuildContext context,Widget page)=>Navigator.of(context).push<T>(PageRouteBuilder(pageBuilder:(_,animation,secondary)=>page,transitionDuration:const Duration(milliseconds:280),reverseTransitionDuration:const Duration(milliseconds:220),transitionsBuilder:(_,animation,secondary,child)=>FadeTransition(opacity:CurvedAnimation(parent:animation,curve:Curves.easeOut),child:SlideTransition(position:Tween(begin:const Offset(.06,0),end:Offset.zero).animate(CurvedAnimation(parent:animation,curve:Curves.easeOutCubic)),child:child))));

class DetailPage extends StatelessWidget{
  const DetailPage({super.key,required this.title,required this.child,this.actions=const []});final String title;final Widget child;final List<Widget> actions;
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:Text(title,style:h(20)),actions:actions),body:SafeArea(child:child));
}
