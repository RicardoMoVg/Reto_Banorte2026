/**
 * Levanta server/ + client/ juntos, y sincroniza client/.env con el puerto
 * real donde quedó corriendo server/ (evita el gotcha de EXPO_PUBLIC_API_URL
 * desincronizado documentado en client/AGENTS.md).
 *
 * Uso:
 *   node scripts/dev.js            -> client apunta a http://localhost:<puerto>, corre `npm run web`
 *   node scripts/dev.js --android  -> client apunta a http://10.0.2.2:<puerto>, corre `npm run android`
 *                                     (el emulador se levanta aparte: cd client && npm run emulator -- <avd>)
 *   node scripts/dev.js --phone    -> client apunta a http://<IP-LAN-de-esta-PC>:<puerto>, corre `npm run web`
 *                                     (celular real en la misma WiFi, usando Expo Go)
 *
 * No instala Postgres ni mcp-server/ -- sin DATABASE_URL en server/.env,
 * todo corre con los mocks de lib/mcp/mcp-client.ts, que es el modo normal
 * de desarrollo (ver README).
 */
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const RAIZ = path.join(__dirname, '..');
const SERVER_DIR = path.join(RAIZ, 'server');
const CLIENT_DIR = path.join(RAIZ, 'client');

function parseTarget(argv) {
  if (argv.includes('--android')) return 'android';
  if (argv.includes('--phone')) return 'phone';
  return 'web';
}

function ipLan() {
  const ifaces = os.networkInterfaces();
  for (const nombre of Object.keys(ifaces)) {
    for (const iface of ifaces[nombre] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

/** Si falta paquete/.env, lo crea desde .env.example y detiene el script -- hay que llenarlo a mano. */
function asegurarEnv(dir, nombrePaquete) {
  const envPath = path.join(dir, '.env');
  if (fs.existsSync(envPath)) return true;

  const examplePath = path.join(dir, '.env.example');
  if (!fs.existsSync(examplePath)) {
    console.error(`[dev] ${nombrePaquete}/.env.example no existe -- no puedo crear ${nombrePaquete}/.env.`);
    return false;
  }

  fs.copyFileSync(examplePath, envPath);
  console.error(`[dev] Creé ${nombrePaquete}/.env desde .env.example.`);
  console.error(`[dev] Edítalo con tus valores reales y vuelve a correr: node scripts/dev.js`);
  return false;
}

function npmInstall(dir, nombre) {
  console.log(`[dev] Instalando dependencias de ${nombre}/ (primera vez)...`);
  const r = spawnSync('npm install', { cwd: dir, stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error(`[dev] npm install falló en ${nombre}/.`);
    process.exit(1);
  }
}

/** Reemplaza (o agrega) solo la línea EXPO_PUBLIC_API_URL, sin tocar el resto de client/.env. */
function sincronizarClientEnv(url) {
  const envPath = path.join(CLIENT_DIR, '.env');
  const linea = `EXPO_PUBLIC_API_URL=${url}`;
  let contenido = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

  const yaEstaba = contenido.match(/^EXPO_PUBLIC_API_URL=(.*)$/m);
  if (yaEstaba && yaEstaba[1].trim() === url) return;

  contenido = yaEstaba
    ? contenido.replace(/^EXPO_PUBLIC_API_URL=.*$/m, linea)
    : contenido.replace(/\n?$/, '\n') + linea + '\n';

  fs.writeFileSync(envPath, contenido);
  console.log(`[dev] client/.env sincronizado -> ${linea}`);
}

function main() {
  const target = parseTarget(process.argv.slice(2));

  if (!asegurarEnv(SERVER_DIR, 'server')) process.exit(1);
  if (!asegurarEnv(CLIENT_DIR, 'client')) process.exit(1);

  if (!fs.existsSync(path.join(SERVER_DIR, 'node_modules'))) npmInstall(SERVER_DIR, 'server');
  if (!fs.existsSync(path.join(CLIENT_DIR, 'node_modules'))) npmInstall(CLIENT_DIR, 'client');

  if (target === 'android') {
    console.log('[dev] Recuerda tener el emulador/celular Android ya conectado');
    console.log('[dev] (cd client && npm run emulator -- <avd>, en otra terminal).');
  }

  console.log('[dev] Levantando server/ ...');
  const server = spawn('npm run dev', { cwd: SERVER_DIR, shell: true });

  let clienteLanzado = false;

  server.stdout.on('data', (chunk) => {
    process.stdout.write(`[server] ${chunk}`);
    if (clienteLanzado) return;

    const match = chunk.toString().match(/localhost:(\d+)/);
    if (!match) return;
    clienteLanzado = true;

    const puerto = match[1];
    const url =
      target === 'android'
        ? `http://10.0.2.2:${puerto}`
        : target === 'phone'
          ? `http://${ipLan() ?? 'TU-IP-LAN-AQUI'}:${puerto}`
          : `http://localhost:${puerto}`;

    sincronizarClientEnv(url);

    console.log(`[dev] Levantando client/ (${target}) ...`);
    const scriptCliente = target === 'android' ? 'android' : 'web';
    const client = spawn(`npm run ${scriptCliente}`, { cwd: CLIENT_DIR, shell: true, stdio: 'inherit' });
    client.on('exit', (code) => {
      server.kill();
      process.exit(code ?? 0);
    });
  });

  server.stderr.on('data', (chunk) => process.stderr.write(`[server] ${chunk}`));
  server.on('exit', (code) => {
    if (!clienteLanzado) process.exit(code ?? 1);
  });

  process.on('SIGINT', () => {
    server.kill();
    process.exit(0);
  });
}

main();
