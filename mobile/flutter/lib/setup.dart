import 'package:flutter/material.dart' hide Text;
import 'i18n.dart';
import 'domain.dart';
import 'store.dart';
import 'rates.dart';
import 'theme.dart';
import 'flow.dart';
import 'widgets.dart';
import 'screen_profile.dart' show profileTypes;

class SetupExperience extends StatefulWidget{
  const SetupExperience({super.key,required this.store,required this.rates,required this.onClose});final PlatikStore store;final RateService rates;final VoidCallback onClose;
  @override State<SetupExperience> createState()=>_SetupExperienceState();
}
class _SetupExperienceState extends State<SetupExperience>{
  late final scope=widget.store.target;
  late String option=widget.store.profile['onboardingOption'] as String? ?? 'bolivia';
  late String country=widget.store.profile['countryCode'] as String? ?? 'BO',currency=widget.store.currency,display=widget.store.profile['displayCurrency'] as String? ?? '',type=widget.store.profile['tipoUsuario'] as String? ?? 'independiente';
  late final name=TextEditingController(text:widget.store.profile['nombreUsuario'] as String? ?? ''),business=TextEditingController(text:widget.store.profile['nombreNegocio'] as String? ?? ''),opening=TextEditingController();
  bool hasOpening=false,busy=false;int step=0;String? error;
  @override void dispose(){name.dispose();business.dispose();opening.dispose();super.dispose();}
  Future<void> save()async{
    setState((){busy=true;error=null;});
    try{if(scope!=widget.store.target)throw StateError('El espacio cambió. Reintenta la configuración.');final n=double.tryParse(opening.text.replaceAll(',','.'));if(!widget.store.demo&&hasOpening&&(n==null||!n.isFinite||n<0||n>1e12))throw const FormatException('Revisa el saldo inicial.');
      final profile={...widget.store.profile,'nombreUsuario':name.text.trim(),'nombreNegocio':business.text.trim(),'moneda':currency,'countryCode':country,'displayCurrency':display,'onboardingOption':option,'currencyPreference':option=='bolivia'?'local':option=='usd'?'usd':'custom','onboardingDone':true,'betaSetupDone':true,'tipoUsuario':type};
      await widget.store.patchAt(scope,{'profile':profile,if(!widget.store.demo)'distribution':Catalog.defaults(type),if(!widget.store.demo)'openingBalance':hasOpening?{'id':newId(),'monto':rounded(n!,currency),'moneda':currency,'fecha':today(),'descripcion':'Saldo de apertura'}:null});
      widget.store.track('onboarding_completed',{'option':option,'moneda':currency});
    }catch(e){if(mounted)setState((){busy=false;error=e.toString().replaceFirst('Bad state: ','');});}
  }
  @override Widget build(BuildContext context){final pages=<({String title,String sub,Widget body})>[
    (title:'¿Cómo manejas tu dinero?',sub:'Empezamos con la moneda que mejor se adapte a ti.',body:Column(children:[FlowChoice(title:'Manejo bolivianos',subtitle:'Bolivia · BOB',icon:Icons.home_outlined,selected:option=='bolivia',onTap:()=>setState((){option='bolivia';country='BO';currency='BOB';})),FlowChoice(title:'Trabajo en dólares',subtitle:'USD como moneda principal',icon:Icons.attach_money_rounded,selected:option=='usd',onTap:()=>setState((){option='usd';currency='USD';})),FlowChoice(title:'Mi dinero en el mundo',subtitle:'Elige tu país y moneda',icon:Icons.public_rounded,selected:option=='world',onTap:()=>setState(()=>option='world'))])),
    (title:'Tu país y tus monedas',sub:'La moneda de visualización es opcional. No cambia el importe original de tus movimientos.',body:Column(spacing:20,children:[SelectField(label:'País',value:country,optional:true,items:{for(final c in Catalog.countries)c['code'] as String:Catalog.countryName(c['code'] as String)},onChanged:(v)=>setState(()=>country=v)),CurrencyField(label:'Moneda principal',value:currency,onChanged:(v)=>setState(()=>currency=v)),CurrencyField(label:'Moneda de visualización',value:display,optional:true,onChanged:(v)=>setState(()=>display=v))])),
    if(!widget.store.demo)(title:'Cuéntanos sobre tu actividad',sub:'Usaremos este perfil para proponerte una distribución de referencia.',body:Column(children:[for(final e in profileTypes.entries)FlowChoice(title:e.value,icon:e.key=='independiente'?Icons.person_outline_rounded:Icons.work_outline_rounded,selected:type==e.key,onTap:()=>setState(()=>type=e.key))])),
    if(!widget.store.demo)(title:'¿Cómo te llamas?',sub:'Puedes completar estos datos más adelante.',body:Column(spacing:22,children:[TextField(controller:name,maxLength:80,textCapitalization:TextCapitalization.words,decoration:InputDecoration(labelText:t('Tu nombre'))),TextField(controller:business,maxLength:100,textCapitalization:TextCapitalization.words,decoration:InputDecoration(labelText:t('Nombre del negocio')))])),
    if(!widget.store.demo)(title:'¿Con cuánto comienzas?',sub:'Tu saldo inicial se registra por separado de los ingresos.',body:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[FlowChoice(title:'Empiezo sin saldo inicial',icon:Icons.play_circle_outline_rounded,selected:!hasOpening,onTap:()=>setState(()=>hasOpening=false)),FlowChoice(title:'Quiero registrar mi saldo',icon:Icons.account_balance_wallet_outlined,selected:hasOpening,onTap:()=>setState(()=>hasOpening=true)),if(hasOpening)...[const SizedBox(height:15),TextField(controller:opening,keyboardType:const TextInputType.numberWithOptions(decimal:true),style:h(32),decoration:InputDecoration(labelText:t('Saldo inicial'),suffixText:currency,hintText:'0.00'))]])),
    (title:'Tu espacio está listo',sub:widget.store.demo?'Vas a explorar una copia de los datos de ejemplo.':'Podrás cambiar tus preferencias cuando quieras.',body:Paper(color:C.highlight,child:Column(children:[ReviewLine('Modalidad',widget.store.demo?'Demo':'Beta'),ReviewLine('País',Catalog.countryName(country)),ReviewLine('Moneda principal',currency),if(display.isNotEmpty)ReviewLine('Equivalencias',display),if(!widget.store.demo)ReviewLine('Actividad',profileTypes[type]??''),if(!widget.store.demo)ReviewLine('Saldo inicial',hasOpening?money(double.tryParse(opening.text.replaceAll(',','.'))??0,currency):'Sin registrar')]))),
  ];return FlowPanel(embedded:true,title:'Prepara tu espacio',icon:Icons.auto_awesome_outlined,step:step,steps:pages.length,heading:pages[step].title,subtitle:pages[step].sub,busy:busy,error:error,nextLabel:step==pages.length-1?'Entrar a mi panel':null,onClose:widget.onClose,onBack:()=>setState(()=>step--),onNext:(){if(step==pages.length-1){save();}else{if(!widget.store.demo&&hasOpening&&pages[step].title=='¿Con cuánto comienzas?'){final n=double.tryParse(opening.text.replaceAll(',','.'));if(n==null||!n.isFinite||n<0||n>1e12){setState(()=>error='Ingresa un saldo válido, igual o mayor que cero.');return;}}setState((){step++;error=null;});}},child:pages[step].body);}
}
