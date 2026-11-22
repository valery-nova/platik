import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:platik_flutter/main.dart';
import 'package:platik_flutter/domain.dart';
import 'package:platik_flutter/store.dart';
import 'package:platik_flutter/wallet_views.dart';

void main(){
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(()async{await Catalog.load();await initializeDateFormatting('es');await initializeDateFormatting('en');});
  setUp((){TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(native,(call)async{if(call.method=='stellar')return jsonEncode({'ok':true,'value':null});return null;});});
  PlatikStore prepared(){final store=PlatikStore({});store.root['started']=true;store.root['modes']['beta']['profile']={'nombreNegocio':'Mi negocio','nombreUsuario':'Ana','moneda':'BOB','onboardingDone':true,'betaSetupDone':true};return store;}
  Future<void> viewport(WidgetTester tester)async{tester.view.physicalSize=const Size(1080,2340);tester.view.devicePixelRatio=3;addTearDown(tester.view.resetPhysicalSize);addTearDown(tester.view.resetDevicePixelRatio);}
  Future<void> button(WidgetTester t,String text)async{final f=find.widgetWithText(FilledButton,text).last;await t.ensureVisible(f);await t.tap(f);await t.pumpAndSettle();}
  Future<void> next(WidgetTester t)=>button(t,'Siguiente');
  Future<void> income(WidgetTester t,PlatikStore s)async{await t.pumpWidget(PlatikApp(store:s));await t.pumpAndSettle();await t.tap(find.widgetWithText(FilledButton,'Ingreso'));await t.pumpAndSettle();}

  testWidgets('Movement wizard asks one stage at a time and saves the reviewed amount',(t)async{
    await viewport(t);final s=prepared();await income(t,s);
    expect(find.byKey(const ValueKey('record-amount')),findsOneWidget);expect(find.byKey(const ValueKey('record-description')),findsNothing);
    await t.enterText(find.byKey(const ValueKey('record-amount')),'12,34');await next(t);
    expect(find.byKey(const ValueKey('record-amount')),findsNothing);await t.enterText(find.byKey(const ValueKey('record-description')),'Venta de prueba');await next(t);await next(t);
    expect(s.transactions,isEmpty);expect(find.text('Todo listo para guardar'),findsOneWidget);await button(t,'Guardar');
    expect(s.transactions.single['descripcion'],'Venta de prueba');expect(s.transactions.single['monto'],12.34);expect(s.balance.amount,12.34);
    for(final icon in [Icons.swap_horiz_rounded,Icons.pie_chart_outline_rounded,Icons.flag_outlined,Icons.person_outline_rounded,Icons.home_outlined]){await t.tap(find.byIcon(icon).last);await t.pumpAndSettle();expect(t.takeException(),isNull);}
    expect(find.text('Hola, Ana'),findsOneWidget);
  });
  testWidgets('Invalid amounts block the next step; previous preserves the draft',(t)async{
    await viewport(t);final s=prepared();await income(t,s);await t.enterText(find.byKey(const ValueKey('record-amount')),'0');await next(t);
    expect(find.text('Ingresa un monto positivo válido.'),findsOneWidget);expect(s.transactions,isEmpty);
    await t.enterText(find.byKey(const ValueKey('record-amount')),'5.50');await next(t);await t.enterText(find.byKey(const ValueKey('record-description')),'Borrador');await t.tap(find.widgetWithText(OutlinedButton,'Atrás'));await t.pumpAndSettle();
    expect(t.widget<TextFormField>(find.byKey(const ValueKey('record-amount'))).controller!.text,'5.50');await next(t);expect(t.widget<TextFormField>(find.byKey(const ValueKey('record-description'))).controller!.text,'Borrador');expect(s.transactions,isEmpty);
  });
  testWidgets('Goal wizard and local contribution preserve original currency',(t)async{
    await viewport(t);final s=prepared();await t.pumpWidget(PlatikApp(store:s));await t.pumpAndSettle();await t.tap(find.byIcon(Icons.flag_outlined));await t.pumpAndSettle();await t.tap(find.widgetWithText(FloatingActionButton,'Nueva meta'));await t.pumpAndSettle();
    await t.enterText(find.byKey(const ValueKey('record-description')),'Equipo');await next(t);await t.enterText(find.byKey(const ValueKey('record-amount')),'100');await next(t);await next(t);await button(t,'Guardar');
    expect(s.goals.single['montoObjetivo'],100);await t.ensureVisible(find.text('Registrar aporte local'));await t.tap(find.text('Registrar aporte local'));await t.pumpAndSettle();await t.enterText(find.byKey(const ValueKey('record-amount')),'5,25');await next(t);await button(t,'Guardar');expect(s.goals.single['ahorroAcumulado'],5.25);expect(s.goals.single['moneda'],'BOB');expect(t.takeException(),isNull);
  });
  testWidgets('Setup progresses through currency, activity and opening review',(t)async{
    await viewport(t);final s=PlatikStore({});s.root['started']=true;await t.pumpWidget(PlatikApp(store:s));await t.pumpAndSettle();await t.tap(find.text('Manejo bolivianos'));await next(t);await next(t);await t.tap(find.text('Freelancer'));await next(t);await next(t);await next(t);expect(s.profile['betaSetupDone'],isNot(true));await button(t,'Entrar a mi panel');expect(s.profile['tipoUsuario'],'freelancer');expect(s.profile['betaSetupDone'],true);expect(s.profile['onboardingDone'],true);expect(s.transactions,isEmpty);expect(s.distribution.fold<double>(0,(a,r)=>a+number(r['porcentaje'])),100);expect(t.takeException(),isNull);
  });
  testWidgets('Welcome has three separate slides and branded Google button has its asset',(t)async{
    await viewport(t);final s=PlatikStore({});await t.pumpWidget(PlatikApp(store:s));await t.pumpAndSettle();expect(find.text('Tu dinero,\ncon claridad.'),findsOneWidget);await button(t,'Siguiente');expect(find.text('Cada movimiento\ncuenta.'),findsOneWidget);await button(t,'Siguiente');expect(find.text('Pequeños ahorros.\nGrandes planes.'),findsOneWidget);expect(t.takeException(),isNull);
    await t.pumpWidget(MaterialApp(home:Scaffold(body:GoogleLoginButton(onTap:(){}))));await t.pumpAndSettle();expect(find.text('Continue with Google'),findsOneWidget);expect((t.widget<Image>(find.byType(Image)).image as AssetImage).assetName,'assets/google_g.png');
  });
  testWidgets('English and dark mode render all five destinations without exceptions',(t)async{
    await viewport(t);final s=prepared();s.root['settings']={'lang':'en','theme':'dark'};await t.pumpWidget(PlatikApp(store:s));await t.pumpAndSettle();for(final icon in [Icons.swap_horiz_rounded,Icons.pie_chart_outline_rounded,Icons.flag_outlined,Icons.person_outline_rounded]){await t.tap(find.byIcon(icon).last);await t.pumpAndSettle();expect(t.takeException(),isNull);}expect(find.byType(NavigationDestination),findsNWidgets(5));
  });
  testWidgets('Administration is absent from profile and the application menu',(t)async{
    await viewport(t);final s=prepared();await t.pumpWidget(PlatikApp(store:s));await t.pumpAndSettle();
    await t.tap(find.byIcon(Icons.person_outline_rounded).last);await t.pumpAndSettle();
    expect(find.byIcon(Icons.admin_panel_settings_outlined),findsNothing);expect(find.text('Administración'),findsNothing);
    await t.tap(find.byTooltip('Menú de PLATIK'));await t.pumpAndSettle();
    expect(find.text('Administración'),findsNothing);expect(find.text('Presentación de Platik'),findsOneWidget);expect(find.text('Enviar feedback'),findsOneWidget);expect(t.takeException(),isNull);
  });
}
