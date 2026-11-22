import 'package:flutter/material.dart' hide Text;
import 'i18n.dart';

// Palette from Platik's web theme.
class C {
  static const paper = Color(0xfff8faf7);
  static const card = Colors.white;
  static const highlight = Color(0xffe3f7ef);
  static const ink = Color(0xff12312f);
  static const sub = Color(0xff4c6a67);
  static const line = Color(0xffeaf3f2);
  static const petroleum = Color(0xff0b3d3b);
  static const mint = Color(0xff4fd1a3);
  static const coral = Color(0xfffe7c8a);
  static const lavender = Color(0xffa88cf3);
}

/// Texto legible sobre un fondo de color.
Color onColor(Color bg) => bg.computeLuminance() > .19 ? C.ink : Colors.white;

/// Inter es variable: el peso se elige con el eje "wght". Los pesos se
/// suavizan un escalón para que todo se vea fino y elegante.
FontWeight _soft(FontWeight w, {required bool title}) {
  final v = w.value;
  if (title)
    return v >= 900 ? FontWeight.w700 : (v >= 800 ? FontWeight.w600 : w);
  if (v >= 900) return FontWeight.w700;
  if (v >= 800) return FontWeight.w600;
  if (v >= 600) return FontWeight.w500;
  return FontWeight.w400;
}

TextStyle _inter(
  double size,
  FontWeight w,
  Color color,
  double height,
  double spacing,
) => TextStyle(
  fontFamily: 'Inter',
  fontFamilyFallback: const ['NotoSans'],
  fontSize: size,
  fontWeight: w,
  fontVariations: [FontVariation('wght', w.value.toDouble())],
  color: color,
  height: height,
  letterSpacing: spacing,
);

TextStyle h(
  double size, {
  Color color = C.ink,
  FontWeight w = FontWeight.w900,
  double height = 1.15,
}) => _inter(
  size,
  _soft(w, title: true),
  color,
  height,
  size >= 20 ? -size * .025 : -.1,
);

TextStyle body(
  double size, {
  Color color = C.ink,
  FontWeight w = FontWeight.w600,
}) => _inter(size, _soft(w, title: false), color, 1.4, 0);

ThemeData buildTheme({bool dark=false}) {
  final base = dark?ThemeData.dark(useMaterial3:true):ThemeData.light(useMaterial3: true);
  final paper=dark?C.petroleum:C.paper,card=dark?const Color(0xff0e4a47):C.card;
  final ink=dark?const Color(0xffeaf3f2):C.ink;
  final highlight=dark?const Color(0xff156b66):C.highlight;
  return base.copyWith(
    scaffoldBackgroundColor: paper,
    colorScheme: base.colorScheme.copyWith(
      primary: dark?C.mint:C.petroleum,
      onPrimary: dark?C.ink:Colors.white,
      secondary: dark?C.mint:C.petroleum,
      secondaryContainer: highlight,
      onSecondaryContainer: ink,
      surface: card,
      onSurface: ink,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled:true, fillColor:dark?const Color(0xff124e4b):Colors.white,
      contentPadding:const EdgeInsets.symmetric(horizontal:18,vertical:18),
      labelStyle:body(13,color:dark?const Color(0xffc0d8d2):C.sub),
      hintStyle:body(15,color:dark?Colors.white54:const Color(0xff749188)),
      border:OutlineInputBorder(borderRadius:BorderRadius.circular(18)),
      enabledBorder:OutlineInputBorder(borderRadius:BorderRadius.circular(18),borderSide:BorderSide(color:dark?Colors.white24:const Color(0xffd7e6e0))),
      focusedBorder:OutlineInputBorder(borderRadius:BorderRadius.circular(18),borderSide:BorderSide(color:dark?C.mint:C.petroleum,width:1.6)),
    ),
    dialogTheme: DialogThemeData(backgroundColor: card),
    datePickerTheme: DatePickerThemeData(backgroundColor: card),
    textTheme: base.textTheme.apply(
      fontFamily: 'Inter',
      bodyColor: ink,
      displayColor: ink,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: paper,
      foregroundColor: ink,
      elevation: 0,
      scrolledUnderElevation: 0,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: paper,
      indicatorColor: highlight,
      surfaceTintColor: Colors.transparent,
      labelTextStyle: WidgetStatePropertyAll(body(11, w: FontWeight.w800,color:ink)),
      iconTheme: WidgetStatePropertyAll(
        IconThemeData(size: 22, color: ink),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        shape: const StadiumBorder(),
        textStyle: body(15, w: FontWeight.w800),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        shape: const StadiumBorder(),
        foregroundColor: ink,
        side: BorderSide(color: dark?Colors.white24:const Color(0xffc8dcd4)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: ink),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: card,
      surfaceTintColor: Colors.transparent,
    ),
    dividerColor: dark?Colors.white24:C.line,
    snackBarTheme: SnackBarThemeData(
      backgroundColor: highlight,
      contentTextStyle: body(14, color: ink),
    ),
  );
}

/// Tarjeta con borde fino (sin sombras pesadas).
class Paper extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final Color color;
  final Color border;
  final VoidCallback? onTap;
  const Paper({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.color = C.card,
    this.border = C.line,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final r = BorderRadius.circular(20);
    final dark=Theme.of(context).brightness==Brightness.dark;
    return Material(
      color: dark&&color==C.card?const Color(0xff0e4a47):dark&&color==C.highlight?const Color(0xff156b66):color,
      shape: RoundedRectangleBorder(
        borderRadius: r,
        side: BorderSide(color: dark&&border==C.line?Colors.white24:border, width: 1),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(padding: padding, child: child),
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  final String text;
  final String? hint;
  const SectionTitle(this.text, {super.key, this.hint});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(2, 22, 2, 10),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Flexible(child:Text(text, style: h(17, w: FontWeight.w800))),
        if (hint != null) ...[
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              hint!,
              style: body(12.5, color: C.sub, w: FontWeight.w500),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ],
    ),
  );
}

/// Botón principal en píldora.
class PrimaryButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onTap;
  final Color color;
  const PrimaryButton(
    this.label, {
    super.key,
    this.icon,
    this.onTap,
    this.color = C.petroleum,
  });
  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    child: FilledButton.icon(
      style: FilledButton.styleFrom(
        backgroundColor: color,
        foregroundColor: onColor(color),
        disabledBackgroundColor: C.highlight,
        padding: const EdgeInsets.symmetric(vertical: 16),
      ),
      onPressed: onTap == null
          ? null
          : () {
              Feedback.forTap(context);
              onTap!();
            },
      icon: Icon(icon ?? Icons.arrow_forward_rounded, size: 20),
      label: Text(
        label,
        style: body(
          15.5,
          w: FontWeight.w800,
          color: onTap == null ? C.sub : onColor(color),
        ),
      ),
    ),
  );
}
