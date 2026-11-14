// Record reference positions from Stellarium for the sky tests.
// Run: npx tsx scripts/stellarium-reference.ts
//
// Needs Stellarium installed (brew install --cask stellarium) and these settings in
// ~/Library/Application Support/Stellarium/config.ini, so it computes mean positions
// with UT = TT, the same conventions as lib/astro:
//   [astro] flag_nutation = false, flag_aberration = false
//   [navigation] time_correction_algorithm = WithoutCorrection
// The script writes lib/astro/__fixtures__/stellarium.json. Values come only from
// Stellarium's output; nothing here is typed in by hand.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { jdFromGregorian } from '../lib/astro/time';
import { fromBce } from '../lib/years';

const APP = '/Applications/Stellarium.app/Contents/MacOS/stellarium';
const USER_DIR = join(homedir(), 'Library/Application Support/Stellarium');
const SCRIPT = 'stone_and_star_reference.ssc';
const SITE = { name: 'Giza', lat: 29.9792, lon: 31.1342, altitudeM: 60 };

// Bright stars spread over the sky, including fast movers (Arcturus, Rigil Kentaurus)
// and stars that matter to alignment claims (Thuban, Sirius, the Orion belt).
const STARS = [32349, 11767, 91262, 69673, 68756, 26727, 30438, 65474, 71683, 21421, 102098];

const EPOCHS = [
  { label: '2026-11-11 20:00 UT', jd: jdFromGregorian(2026, 11, 11) + 20 / 24 },
  { label: 'J2000.0', jd: 2451545.0 },
  { label: '1000-06-21 21:00 UT', jd: jdFromGregorian(1000, 6, 21) + 21 / 24 },
  { label: '2560 BCE-06-21 21:00 UT', jd: jdFromGregorian(fromBce(2560), 6, 21) + 21 / 24 },
  { label: '10000 BCE-03-21 21:00 UT', jd: jdFromGregorian(fromBce(10000), 3, 21) + 21 / 24 },
];

function settingsCheck() {
  const config = readFileSync(join(USER_DIR, 'config.ini'), 'utf8');
  const want: [string, RegExp][] = [
    ['flag_nutation = false', /^flag_nutation\s*=\s*false/m],
    ['flag_aberration = false', /^flag_aberration\s*=\s*false/m],
    [
      'time_correction_algorithm = WithoutCorrection',
      /^time_correction_algorithm\s*=\s*WithoutCorrection/m,
    ],
  ];
  const missing = want.filter(([, re]) => !re.test(config)).map(([s]) => s);
  if (missing.length) throw new Error(`Stellarium config.ini needs: ${missing.join(', ')}`);
}

function buildScript() {
  const objects = [...STARS.map((h) => `HIP ${h}`), 'Sun'];
  const lines = [
    `core.setObserverLocation(${SITE.lon}, ${SITE.lat}, ${SITE.altitudeM}, 0, "${SITE.name}", "Earth");`,
    `var objects = ${JSON.stringify(objects)};`,
    `var epochs = ${JSON.stringify(EPOCHS)};`,
    'var keys = ["ra","dec","raJ2000","decJ2000","altitude","azimuth","altitude-geometric","azimuth-geometric","meanSidTm-dd","appSidTm-dd"];',
    'for (var e = 0; e < epochs.length; e++) {',
    '  core.setJDay(epochs[e].jd);',
    '  core.wait(0.3);',
    '  for (var o = 0; o < objects.length; o++) {',
    '    var info = core.getObjectInfo(objects[o]);',
    '    var row = { epoch: epochs[e].label, jd: epochs[e].jd, object: objects[o], found: info["found"] };',
    '    for (var k = 0; k < keys.length; k++) row[keys[k]] = info[keys[k]];',
    '    core.output("REF " + JSON.stringify(row));',
    '  }',
    '}',
    'core.quitStellarium();',
  ];
  mkdirSync(join(USER_DIR, 'scripts'), { recursive: true });
  writeFileSync(join(USER_DIR, 'scripts', SCRIPT), lines.join('\n') + '\n');
}

async function run() {
  if (!existsSync(APP)) throw new Error('Stellarium is not installed');
  try {
    execFileSync('pgrep', ['-f', 'MacOS/stellarium']);
    throw new Error('Quit Stellarium first; the script launches its own instance');
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Quit')) throw e;
  }
  settingsCheck();
  buildScript();
  const output = join(USER_DIR, 'output.txt');
  rmSync(output, { force: true });

  await new Promise<void>((resolve, reject) => {
    const child = spawn(APP, ['--startup-script', SCRIPT], { stdio: 'ignore' });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Stellarium did not finish within 120 s'));
    }, 120_000);
    child.on('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });

  const lines = readFileSync(output, 'utf8').split('\n');
  const version = execFileSync('defaults', [
    'read',
    '/Applications/Stellarium.app/Contents/Info.plist',
    'CFBundleShortVersionString',
  ])
    .toString()
    .trim();
  const rows = lines.filter((l) => l.startsWith('REF ')).map((l) => JSON.parse(l.slice(4)));
  if (!version || rows.length !== EPOCHS.length * (STARS.length + 1)) {
    throw new Error(`Unexpected Stellarium output (${rows.length} rows, version ${version})`);
  }
  const notFound = rows.filter((r) => !r.found).map((r) => r.object);
  if (notFound.length) throw new Error(`Stellarium could not find: ${notFound.join(', ')}`);

  const fixture = {
    generatedBy: 'scripts/stellarium-reference.ts',
    stellarium: version,
    settings: {
      nutation: false,
      aberration: false,
      deltaT: 'WithoutCorrection (UT = TT)',
      site: SITE,
      azimuth: 'from north through east, degrees',
    },
    rows,
  };
  const dir = join(import.meta.dirname, '../lib/astro/__fixtures__');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'stellarium.json'), JSON.stringify(fixture, null, 2) + '\n');
  console.log(`Wrote ${rows.length} reference rows from Stellarium ${version}`);
}

run().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
