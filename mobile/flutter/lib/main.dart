import 'dart:async';
import 'package:flutter/material.dart' hide Text;
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'i18n.dart';
import 'domain.dart';
import 'store.dart';
import 'rates.dart';
import 'wallet.dart';
import 'theme.dart';
import 'tempo_ui.dart';
import 'flow.dart';
import 'widgets.dart';
import 'dashboard.dart';
import 'finance_views.dart';
import 'profile_views.dart';
import 'wallet_views.dart';
import 'welcome.dart';
import 'setup.dart';

Future<void> main()async{
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('es');await initializeDateFormatting('en');
  runApp(PlatikApp(store:await PlatikStore.load()));
}
class PlatikApp extends StatelessWidget{
  const PlatikApp({super.key,required this.store});final PlatikStore store;
  @override Widget build(BuildContext context)=>ListenableBuilder(listenable:store,builder:(context,_){Catalog.lang=store.settings['lang']=='en'?'en':'es';return MaterialApp(title:'PLATIK',debugShowCheckedModeBanner:false,theme:buildTheme(),darkTheme:buildTheme(dark:true),themeMode:store.settings['theme']=='dark'?ThemeMode.dark:ThemeMode.light,locale:Locale(Catalog.lang),supportedLocales:const [Locale('es'),Locale('en')],localizationsDelegates:GlobalMaterialLocalizations.delegates,home:PlatikShell(store:store));});
}
class PlatikShell extends StatefulWidget{
  const PlatikShell({super.key,required this.store});final PlatikStore store;
  @override State<PlatikShell> createState()=>_PlatikShellState();
}
class _PlatikShellState extends State<PlatikShell>{
  late final rates=RateService(widget.store),wallet=WalletService(widget.store);
  final bucket=PageStorageBucket();int tab=0;String? extra;
  @override void initState(){super.initState();WidgetsBinding.instance.addPostFrameCallback((_){widget.store.trackPage(widget.store.started?'/panel':'/');unawaited(wallet.restore());unawaited(recover());});}
  Future<void> recover()async{
    for(final scope in widget.store.allTargets){
      final data=widget.store.dataAt(scope);
      for(final row in rows(data['aportesStellar']).where((r)=>r['txHash'] is String&&!['confirmada','fallida','cancelada'].contains(r['estado']))){
        try{final status=await wallet.engine.call('status',{'hash':row['txHash']}) as Map;if(status['successful']==null)continue;final current=widget.store.dataAt(scope);current['aportesStellar']=rows(current['aportesStellar']).map((r)=>r['id']==row['id']&&r['txHash']==row['txHash']?{...r,'estado':status['successful']==true?'confirmada':'fallida','ledger':status['ledger'],if(status['closedAt']!=null)'confirmedAt':status['closedAt']}:r).toList();widget.store.replaceAt(scope,current);await widget.store.save();}catch(_){}
      }
    }
  }

  void navigate(int i){FocusManager.instance.primaryFocus?.unfocus();setState((){tab=i;extra=null;});widget.store.trackPage(const ['/panel','/panel/transacciones','/panel/analisis','/panel/metas','/panel/perfil'][i]);}
  void openWallet()=>openPlatikPage(context,WalletHub(store:widget.store,wallet:wallet));
  Future<void> chooseMode()async{
    Navigator.of(context).popUntil((route)=>route.isFirst);
    final value=await showModalBottomSheet<String>(context:context,useSafeArea:true,backgroundColor:Theme.of(context).colorScheme.surface,showDragHandle:true,builder:(context)=>Padding(padding:const EdgeInsets.fromLTRB(22,2,22,24),child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.start,children:[Text('¿Cómo quieres empezar?',style:h(25)),const SizedBox(height:9),Text('Cada modalidad conserva sus propios datos.',style:body(13,color:C.sub)),const SizedBox(height:24),FlowChoice(title:'Comenzar desde cero',subtitle:'Tu perfil y tus propios movimientos',icon:Icons.play_circle_outline_rounded,selected:false,onTap:()=>Navigator.pop(context,'beta')),FlowChoice(title:'Explorar una demostración',subtitle:'Un recorrido con datos de ejemplo',icon:Icons.auto_awesome_outlined,color:C.lavender,selected:false,onTap:()=>Navigator.pop(context,'demo')),Text('Beta · prueba personalizada de 72 horas. La demo siempre está disponible.',style:body(11,color:C.sub))])));
    if(value!=null){await widget.store.switchMode(value);if(mounted)setState((){tab=0;extra=null;});}
  }
  Future<void> chooseSpace()async{
    final s=widget.store;final value=await showModalBottomSheet<String>(context:context,useSafeArea:true,showDragHandle:true,builder:(context)=>Padding(padding:const EdgeInsets.fromLTRB(22,4,22,24),child:Column(mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Tu espacio activo',style:h(23)),const SizedBox(height:18),FlowChoice(title:'Personal',icon:Icons.person_outline_rounded,selected:s.spaceId=='personal',onTap:()=>Navigator.pop(context,'personal')),for(final v in s.ventures)FlowChoice(title:v['nombre'] as String,icon:Icons.work_outline_rounded,selected:s.spaceId==v['id'],onTap:()=>Navigator.pop(context,v['id'] as String)),TextButton.icon(onPressed:()=>Navigator.pop(context,'manage'),icon:const Icon(Icons.add_rounded,size:18),label:const Text('Gestionar espacios'))])));
    if(value=='manage'&&mounted){openPlatikPage(context,StorePage(store:s,title:'Espacios financieros',builder:(_)=>SpacesManagement(store:s)));}else if(value!=null){await s.selectSpace(value);}
  }
  @override Widget build(BuildContext context)=>ListenableBuilder(listenable:widget.store,builder:(context,_){
    final s=widget.store,landing=!widget.store.started||extra=='landing';
    final setup=!landing&&(s.profile['onboardingDone']!=true||(!s.demo&&s.profile['betaSetupDone']!=true));
    final screens=<Widget>[
      HomeDashboard(store:s,rates:rates,navigate:navigate,openWallet:openWallet),
      MovementsPage(store:s,rates:rates),InsightsPage(store:s,rates:rates),
      GoalsPage(store:s,rates:rates,openWallet:openWallet),
      ProfileHub(store:s,rates:rates,openLanding:()=>setState(()=>extra='landing'),chooseMode:chooseMode),
    ];
    final content=landing?PlatikWelcome(store:s,onStart:chooseMode,onContinue:()=>setState(()=>extra=null)):setup?SetupExperience(key:ValueKey('setup-'+s.mode+'-'+s.spaceId),store:s,rates:rates,onClose:()=>setState(()=>extra='landing')):PageStorage(bucket:bucket,child:PrimaryScrollController.none(child:IndexedStack(key:ValueKey('tabs-'+s.mode+'-'+s.spaceId),index:tab,children:[for(var i=0;i<screens.length;i++)TabReveal(active:i==tab,child:screens[i])])));
    return PopScope(canPop:landing||(!setup&&tab==0),onPopInvokedWithResult:(didPop,result){if(!didPop){if(setup){setState(()=>extra='landing');}else{navigate(0);}}},child:Scaffold(
      appBar:landing||setup?null:AppBar(automaticallyImplyLeading:false,titleSpacing:20,title:Row(children:[const PlatikWordmark(width:104),const SizedBox(width:15),Expanded(child:InkWell(onTap:chooseSpace,borderRadius:BorderRadius.circular(20),child:Padding(padding:const EdgeInsets.symmetric(vertical:8),child:Row(mainAxisSize:MainAxisSize.min,children:[Flexible(child:Text(s.spaceName,maxLines:1,overflow:TextOverflow.ellipsis,style:body(12,w:FontWeight.w800))),const SizedBox(width:3),const Icon(Icons.expand_more_rounded,size:16)]))))]),actions:[IconButton(tooltip:t('Billetera digital'),onPressed:openWallet,icon:const Icon(Icons.account_balance_wallet_outlined,size:22)),PopupMenuButton<String>(tooltip:t('Menú de PLATIK'),onSelected:(v){if(v=='mode'){chooseMode();}else if(v=='landing'){setState(()=>extra='landing');}else{openExternal('https://tally.so/r/NqXXGG');}},itemBuilder:(context)=>[PopupMenuItem(value:'mode',child:Text(s.demo?'Demo · Cambiar modalidad':'Beta · Cambiar modalidad')),const PopupMenuItem(value:'landing',child:Text('Presentación de Platik')),const PopupMenuItem(value:'feedback',child:Text('Enviar feedback'))])]),
      body:SafeArea(child:Column(children:[if(s.storageError!=null)Padding(padding:const EdgeInsets.all(12),child:Notice(s.storageError!,color:C.coral.withValues(alpha:.15))),Expanded(child:content)])),
      bottomNavigationBar:landing||setup?null:NavigationBar(selectedIndex:tab,height:64,labelBehavior:NavigationDestinationLabelBehavior.onlyShowSelected,onDestinationSelected:navigate,destinations:[
        NavigationDestination(icon:const Icon(Icons.home_outlined),selectedIcon:const Icon(Icons.home_rounded),label:t('Inicio')),
        NavigationDestination(icon:const Icon(Icons.swap_horiz_rounded),label:t('Movimientos')),
        NavigationDestination(icon:const Icon(Icons.pie_chart_outline_rounded),selectedIcon:const Icon(Icons.pie_chart_rounded),label:t('Análisis')),
        NavigationDestination(icon:const Icon(Icons.flag_outlined),selectedIcon:const Icon(Icons.flag_rounded),label:t('Metas')),
        NavigationDestination(icon:const Icon(Icons.person_outline_rounded),selectedIcon:const Icon(Icons.person_rounded),label:t('Perfil')),
      ]),
    ));
  });
}
