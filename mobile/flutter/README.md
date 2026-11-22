# Platik Android · 1.0.1+5

Código fuente Flutter del APK Android publicado. Paquete: **com.platik.mobile**. La sección de Administración se eliminó de la aplicación, sus accesos y su implementación. El sitio web del repositorio conserva su código independiente.

## Funciones

Presentación de tres diapositivas con componentes de Tempo y colores Platik; cinco secciones (Inicio, Movimientos, Análisis, Metas, Perfil); formularios por pasos con revisión; ingresos/costos/gastos, filtros, saldo inicial y ajustes; 179 monedas y 250 países; cotizaciones Frankfurter y equivalencias; análisis, distribución y recomendaciones; metas y aportes; espacios personales y de negocio; demo/beta independientes; respaldo local JSON; español/inglés y tema claro/oscuro.

Billetera integrada Pollar con Google/correo, protección y recuperación, trustline, saldos, depósitos y envíos. Varial/Freighter mediante WalletConnect/Reown. Toda la interfaz visible es Flutter; un motor local sin interfaz utiliza los SDK oficiales de Stellar y Pollar. **Stellar Testnet**: los activos de prueba no tienen valor monetario real. Los datos financieros se guardan en el dispositivo, como en la web de referencia; no hay sincronización financiera en la nube.

## Compilar

Entorno verificado: Flutter 3.47.4 / Dart 3.13.3, JDK17, Android SDK36 y NDK28.2.13676358. Instala Flutter y configura el SDK de Android; desde esta carpeta:

```sh
flutter pub get
flutter analyze --no-pub
flutter test --no-pub
flutter build apk --release --target-platform android-arm64 --no-pub
```

Salida: `build/app/outputs/flutter-apk/app-release.apk`. Android mínimo API24. El bundle Stellar y los catálogos ya están versionados: **Node.js no es necesario para compilar el APK**. pubspec.lock fija las dependencias Dart.

Para reconstruir el motor JavaScript, sigue [tool/stellar_engine/README.md](tool/stellar_engine/README.md). Se incluyen su fuente TypeScript, package-lock.json y configuración publicable. La regeneración se contrastó con el bundle incluido mediante SHA256 idéntico. No se incluyen claves privadas, credenciales, almacenes de firma ni cachés de compilación.

Si reutilizas una caché Gradle existente, `GRADLE_RO_DEP_CACHE` debe apuntar a su directorio `caches`, mientras `GRADLE_USER_HOME` apunta a una carpeta escribible distinta. No hace falta copiar toda la caché. Los SDK y rutas locales se resuelven en tu equipo, no se versionan.

## Firma y validación

El APK publicado es una compilación release con el certificado Android Debug que tenían las entregas anteriores, para actualizar sin desinstalar ni perder datos. No es una clave de distribución Play Store. Una compilación en otro equipo generará su certificado de desarrollo y no podrá actualizar esa instalación sin utilizar la identidad de firma original. Esa clave privada no se publica.

Huella SHA256 del certificado de la entrega: `500653fae1219bc659e48a834702be8d47d9c76d1ff13484e7317be476370687`.

Las pruebas verifican finanzas contra 20 casos del código web, aislamiento de espacios, depósitos, controles de autorización, navegación y formularios. También se comprueba que Administración no exista en Perfil ni en el menú. El comunicado de la release informa la validación del APK y las comprobaciones que requieren una cuenta personal o Varial instalada.

Referencia financiera/SDK: valery-nova/platik, commit cc005bc0aaa45ac50f11e7e0a3eeaa8a6c351f45. Los recursos oficiales y componentes Flutter reutilizados se conservan dentro de esta copia.
