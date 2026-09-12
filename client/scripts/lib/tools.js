const fs = require('fs');
const path = require('path');

function readLocalPropertiesSdkDir() {
  try {
    const props = fs.readFileSync(
      path.join(__dirname, '..', '..', 'android', 'local.properties'),
      'utf8',
    );
    const match = props.match(/^sdk\.dir=(.*)$/m);
    if (!match) {
      return null;
    }
    // Formato Java properties: C\:\\Users\\... -> C:\Users\...
    const dir = match[1].replace(/\\(.)/g, '$1').trim();
    return dir || null;
  } catch {
    return null;
  }
}

function resolveSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    readLocalPropertiesSdkDir(),
    process.env.LOCALAPPDATA &&
      path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }
  return null;
}

function resolveJavaHome() {
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
    return process.env.JAVA_HOME;
  }
  const programFiles =
    process.env.ProgramFiles || 'C:\\Program Files';
  const jbr = path.join(
    programFiles,
    'Android',
    'Android Studio',
    'jbr',
  );
  if (fs.existsSync(jbr)) {
    return jbr;
  }
  return null;
}

function toolInSdk(sdk, relative) {
  if (!sdk) {
    return null;
  }
  const full = path.join(sdk, relative);
  return fs.existsSync(full) ? full : null;
}

function resolveTools() {
  const sdk = resolveSdk();
  const java = resolveJavaHome();
  return {
    sdk,
    java,
    emulator: toolInSdk(sdk, path.join('emulator', 'emulator.exe')),
    adb: toolInSdk(sdk, path.join('platform-tools', 'adb.exe')),
  };
}

module.exports = { resolveTools };
