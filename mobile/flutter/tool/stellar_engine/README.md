# Motor Stellar local

Runtime sin interfaz visible para el canal Android/Flutter. Toda la interfaz de Platik es Flutter. Las operaciones conservan los constructores Stellar del commit cc005bc0aaa45ac50f11e7e0a3eeaa8a6c351f45, adaptados para WalletConnect y el puente nativo.

Requiere Node.js LTS. Desde esta carpeta:

```sh
npm ci
npm run build
```

Regenera assets/stellar_engine.js. El bundle ya está versionado, por lo que una compilación normal de Flutter no necesita Node.js. package-lock.json fija las versiones utilizadas. public-config.json contiene exclusivamente la clave publicable de Pollar de Platik; no contiene claves privadas de wallets. El Project ID de Reown está en lib/wallet.dart.

Los archivos platik/*.ts incluyen la comparación del contenido de la transacción firmada y la verificación de depósitos con fechas reales de Horizon. La red habilitada es Stellar Testnet.
