import 'package:flutter/material.dart' hide Text;
import 'i18n.dart';
import 'store.dart';
import 'theme.dart';
import 'widgets.dart';

const ventureTypes={'emprendimiento':'Emprendimiento','negocio':'Negocio','freelance':'Freelance'};
class SpacesCard extends StatefulWidget{
  const SpacesCard({super.key,required this.store});final PlatikStore store;
  @override State<SpacesCard> createState()=>_SpacesCardState();
}
class _SpacesCardState extends State<SpacesCard>{
  final name=TextEditingController();String type='emprendimiento';
  @override void dispose(){name.dispose();super.dispose();}
  Future<void> rename(String id,String original)async{
    final c=TextEditingController(text:original);
    final next=await showDialog<String>(context:context,builder:(context)=>AlertDialog(title:const Text('Renombrar espacio'),content:TextField(controller:c,maxLength:60,decoration:InputDecoration(labelText:t('Nombre del espacio'))),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('Cancelar')),FilledButton(onPressed:()=>Navigator.pop(context,c.text),child:const Text('Guardar'))]));
    c.dispose();if(next==null)return;
    try{await widget.store.renameVenture(id,next);}catch(e){if(mounted)toast(context,e.toString());}
  }
  @override Widget build(BuildContext context){final s=widget.store;return Group('Tus espacios financieros',subtitle:'Cada espacio tiene sus propios ingresos, gastos, metas y distribución.',children:[
    ListTile(contentPadding:EdgeInsets.zero,leading:const Icon(Icons.person_outline),title:const Text('Personal'),subtitle:const Text('Tu dinero del día a día y tus metas personales.'),trailing:s.spaceId=='personal'?const Icon(Icons.check_circle):null,onTap:()=>s.selectSpace('personal')),
    for(final v in s.ventures)Row(children:[Expanded(child:ListTile(contentPadding:EdgeInsets.zero,leading:const Icon(Icons.business_center_outlined),title:Text(v['nombre'] as String),subtitle:Text(ventureTypes[v['tipo']]??''),trailing:s.spaceId==v['id']?const Icon(Icons.check_circle):null,onTap:()=>s.selectSpace(v['id'] as String))),IconButton(tooltip:t('Renombrar'),onPressed:()=>rename(v['id'] as String,v['nombre'] as String),icon:const Icon(Icons.edit_outlined)),IconButton(tooltip:t('Eliminar'),onPressed:()async{if(await confirm(context,'Eliminar espacio','¿Eliminar “${v['nombre']}” y todos sus movimientos, metas y registros de billetera en este dispositivo?'))await s.deleteVenture(v['id'] as String);},icon:const Icon(Icons.delete_outline,color:C.coral))]),
    if(s.ventures.length<2)...[
      const Divider(),Text('Agregar emprendimiento · ${s.ventures.length}/2',style:h(17)),
      const Text('Hereda tu moneda y país. El resto de los datos empiezan en cero.'),
      TextField(key:const ValueKey('venture-name'),controller:name,maxLength:60,decoration:InputDecoration(labelText:t('Nombre del espacio'))),
      SelectField(label:'Tipo de espacio',value:type,items:ventureTypes,onChanged:(v)=>setState(()=>type=v)),
      FilledButton.icon(onPressed:()async{if(await s.createVenture(name.text,type)){name.clear();}else if(context.mounted){toast(context,'Escribe un nombre de 2 a 60 caracteres. Máximo 2 emprendimientos.');}},icon:const Icon(Icons.add),label:const Text('Crear espacio')),
    ]else const Notice('Ya tienes 2 emprendimientos. Puedes eliminar uno para crear otro.'),
  ]);}
}

class PreferencesCard extends StatelessWidget{
  const PreferencesCard({super.key,required this.store});final PlatikStore store;
  @override Widget build(BuildContext context)=>Group('Apariencia e idioma',children:[
    SelectField(label:'Idioma',value:store.settings['lang'] as String? ?? 'es',items:const {'es':'Español','en':'English'},onChanged:(v)=>store.setSettings({'lang':v})),
    SwitchListTile(contentPadding:EdgeInsets.zero,title:const Text('Modo oscuro'),value:store.settings['theme']=='dark',onChanged:(v)=>store.setSettings({'theme':v?'dark':'light'})),
    SwitchListTile(contentPadding:EdgeInsets.zero,title:const Text('Estadísticas de uso'),subtitle:const Text('Eventos de navegación y uso, sin importes, descripciones ni direcciones de tu wallet.'),value:store.settings['analyticsEnabled']!=false,onChanged:(v)=>store.setSettings({'analyticsEnabled':v})),
  ]);
}

class SocialLinks extends StatelessWidget{
  const SocialLinks({super.key});
  static const links={'LinkedIn':'https://www.linkedin.com/company/somosplatik/','Facebook':'https://www.facebook.com/profile.php?id=61596549126851','Instagram':'https://www.instagram.com/somosplatik','X':'https://x.com/somosplatik','TikTok':'https://www.tiktok.com/@somosplatik'};
  @override Widget build(BuildContext context)=>Wrap(alignment:WrapAlignment.center,spacing:8,children:[for(final e in links.entries)TextButton(onPressed:()async{try{await openExternal(e.value);}catch(error){if(context.mounted)toast(context,error.toString());}},child:Text(e.key))]);
}
