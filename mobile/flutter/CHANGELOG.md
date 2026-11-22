# Platik Android 1.0.1

Ya está disponible una nueva versión de Platik para Android, con una experiencia nativa en Flutter: Inicio, Movimientos, Análisis, Metas y Perfil, presentación animada, formularios por pasos y acceso a la billetera en su propia pantalla.

**Administración se ha retirado de la app**, incluidos sus accesos en el menú y en Perfil y su implementación nativa.

## Descargar e instalar

[Descargar Platik 1.0.1 para Android ARM64](https://github.com/valery-nova/platik/releases/download/android-v1.0.1/Platik-1.0.1-android-arm64.apk) · 23.85 MiB.

Requiere Android 7.0 o posterior y un dispositivo ARM64. Instala el APK sobre la versión anterior para conservar tus datos; esta entrega mantiene el mismo paquete y certificado.

## Código fuente

[Proyecto Flutter y guía de compilación](https://github.com/valery-nova/platik/tree/android/platik-native-1.0.1/mobile/flutter), con código Dart/Android, recursos, pruebas y fuente TypeScript del motor Stellar. El motor JavaScript puede regenerarse y se comprobó que coincide por SHA256 con el bundle del APK.

## Verificación de esta entrega

- Compilación release ARM64 completada; paquete `com.platik.mobile`, versión `1.0.1+5`.
- Análisis de Dart sin incidencias y **47 pruebas aprobadas**, incluida la ausencia de Administración en Perfil y en el menú.
- Firma APK v2 válida y arquitectura ARM64 verificadas. Se conserva el certificado de desarrollo Android Debug anterior; no es una firma de distribución de Play Store.
- No se repitió la prueba física en esta versión porque el Samsung no estaba disponible por ADB. La versión anterior ya había sido probada en ese dispositivo con registro y persistencia de movimientos.

La billetera utiliza **Stellar Testnet**: los activos son de prueba y no tienen valor monetario real. El acceso con una cuenta personal de Google/correo y la autorización desde Varial siguen requiriendo validación del titular. Los datos financieros se guardan localmente en el dispositivo.

SHA256 del APK: `F44BFE80E67FF68F5CB232828A1B8ED93E0AB9127D653967E3016B7567DFC2BB`
