import 'dart:math' as math;
import 'package:flutter/material.dart' hide Text;
import 'i18n.dart';
import 'theme.dart';

class PlatikWordmark extends StatelessWidget{
  const PlatikWordmark({super.key,this.width=108});final double width;
  @override Widget build(BuildContext context)=>Semantics(label:'PLATIK',image:true,child:Image.asset(Theme.of(context).brightness==Brightness.dark?'assets/logo-dark.png':'assets/logo.png',width:width,cacheWidth:(width*MediaQuery.devicePixelRatioOf(context)).ceil(),excludeFromSemantics:true));
}

/// Tempo's compact statistic card, using the active Platik surface.
class TempoStat extends StatelessWidget{
  const TempoStat({super.key,required this.icon,required this.color,required this.value,required this.label});final IconData icon;final Color color;final String value,label;
  @override Widget build(BuildContext context)=>Paper(padding:const EdgeInsets.fromLTRB(12,12,10,12),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Icon(icon,color:color,size:20),const SizedBox(height:8),FittedBox(fit:BoxFit.scaleDown,child:Text(value,style:h(19))),const SizedBox(height:2),SizedBox(height:32,child:Text(label,maxLines:2,overflow:TextOverflow.ellipsis,style:body(11.5,color:C.sub)))]));
}

class RoundAction extends StatelessWidget{
  const RoundAction({super.key,required this.icon,required this.onTap,required this.label});final IconData icon;final VoidCallback onTap;final String label;
  @override Widget build(BuildContext context)=>Material(color:Theme.of(context).colorScheme.surface,shape:CircleBorder(side:BorderSide(color:Theme.of(context).dividerColor)),child:IconButton(tooltip:t(label),onPressed:onTap,icon:Icon(icon,size:22)));
}

// Flutter components reused directly from Tempo, with the Platik palette.
/// Fondo con resplandores de color (aurora) para encabezados.
class Aurora extends StatelessWidget {
  final double height;
  final List<Color> colors;
  const Aurora({super.key, this.height = 360, this.colors = const [C.lavender, C.coral, C.mint]});
  @override
  Widget build(BuildContext context) => IgnorePointer(
        child: SizedBox(height: height, width: double.infinity, child: CustomPaint(painter: _AuroraPainter(colors, Theme.of(context).scaffoldBackgroundColor))),
      );
}

class _AuroraPainter extends CustomPainter {
  final List<Color> colors;
  final Color paper;
  _AuroraPainter(this.colors,this.paper);
  @override
  void paint(Canvas canvas, Size s) {
    final spots = [Offset(s.width * .1, s.height * .1), Offset(s.width * .9, s.height * .05), Offset(s.width * .55, s.height * .5)];
    for (var i = 0; i < colors.length && i < spots.length; i++) {
      final r = math.max(s.width, s.height) * .55;
      final p = Paint()
        ..shader = RadialGradient(colors: [colors[i].withValues(alpha: .30), colors[i].withValues(alpha: 0)])
            .createShader(Rect.fromCircle(center: spots[i], radius: r));
      canvas.drawCircle(spots[i], r, p);
    }
    canvas.drawRect(
      Offset.zero & s,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [const Color(0x000C0C0F), paper],
          stops: [.4, 1],
        ).createShader(Offset.zero & s),
    );
  }

  @override
  bool shouldRepaint(_AuroraPainter o) => false;
}

/// Portada cuadrada con degradado e icono (como la miniatura de un evento).
class CoverTile extends StatelessWidget {
  final Gradient gradient;
  final IconData icon;
  final double size;
  final String? label;
  const CoverTile({super.key, required this.gradient, required this.icon, this.size = 56, this.label});
  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(gradient: gradient, borderRadius: BorderRadius.circular(size * .28)),
        alignment: Alignment.center,
        child: label != null
            ? Padding(
                padding: const EdgeInsets.all(4),
                child: FittedBox(child: Text(label!, style: h(size * .34, color: Colors.white, w: FontWeight.w900))),
              )
            : Icon(icon, color: Colors.white, size: size * .46),
      );
}
