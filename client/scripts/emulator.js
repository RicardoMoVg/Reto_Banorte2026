const { execFileSync, spawn } = require('child_process');
const os = require('os');
const path = require('path');
const { resolveTools } = require('./lib/tools');

const tools = resolveTools();

if (!tools.emulator) {
  console.error('[mosaico] ERROR: no encontre emulator.exe.');
  console.error('[mosaico] Busque el SDK de Android en este orden:');
  console.error('  1. Variable de entorno ANDROID_HOME');
  if (tools.sdk) {
    console.error(`  2. Encontrado en: ${tools.sdk}`);
    console.error('     ...pero no tiene emulator\\emulator.exe');
    console.error('[mosaico] Instalalo desde Android Studio > SDK Manager > SDK Tools > Android Emulator.');
  } else {
    console.error('  2. android/local.properties (sdk.dir)');
    console.error(`  3. %LOCALAPPDATA%\\Android\\Sdk`);
    console.error('[mosaico] Instala Android Studio o define ANDROID_HOME apuntando a tu SDK.');
  }
  process.exit(1);
}

function listAvds() {
  try {
    return execFileSync(tools.emulator, ['-list-avds'], { encoding: 'utf8' })
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function printAvds(avds) {
  if (avds.length === 0) {
    console.error('[mosaico] No hay AVDs creados.');
    console.error(
      `[mosaico] Crea uno en Android Studio > Device Manager, o revisa ${path.join(os.homedir(), '.android', 'avd')}`,
    );
    return;
  }
  console.error('AVDs disponibles:');
  for (const a of avds) {
    console.error(`  - ${a}`);
  }
}

const avd = process.argv[2];
const avds = listAvds();

if (!avd) {
  console.error('Uso: npm run emulator -- <nombre-del-avd>');
  console.error('');
  printAvds(avds);
  process.exit(1);
}

const match = avds.find(a => a.toLowerCase() === avd.toLowerCase());
if (!match) {
  console.error(`El AVD "${avd}" no existe.`);
  console.error('');
  console.error('Uso: npm run emulator -- <nombre-del-avd>');
  console.error('');
  printAvds(avds);
  process.exit(1);
}

console.log(`[mosaico] Iniciando emulador "${match}"...`);
console.log('[mosaico] Cierra esta terminal para apagar el emulador.');
const child = spawn(tools.emulator, ['-avd', match], { stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 0));
