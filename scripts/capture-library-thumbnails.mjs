import { execFile } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appSource = await readFile(join(root, 'app.js'), 'utf8');
const fixtureBlock = appSource.match(/const animatedComponentExplorerFixtures = \[([\s\S]*?)\n\];/);
if (!fixtureBlock) {
	throw new Error('Could not find animatedComponentExplorerFixtures in app.js.');
}

const videoFixtures = new Set([
	'chat/logoMotion/chatWorkingLogo/Draw',
	'chat/chatProgressContentPart/WithSpinner',
	'chat/logoMotion/chatWorkingLogo/Performance/PixelSpinner',
	'sessions/sessionsListNotification/BulkDoneNotificationAnimated',
	'chat/generatedImages/chatGeneratedImages/GlyphRevealFinal'
]);
const fixtures = [...fixtureBlock[1].matchAll(/'([^']+)'/g)]
	.map(match => match[1])
	.filter(fixture => !videoFixtures.has(fixture));
const uniqueFixtures = [...new Set(fixtures)];
const outputDirectory = join(root, 'assets', 'library-thumbnails');
const temporaryDirectory = join(root, '.library-thumbnail-capture');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

await mkdir(outputDirectory, { recursive: true });
await rm(temporaryDirectory, { recursive: true, force: true });
await mkdir(temporaryDirectory, { recursive: true });

function fileNameForFixture(fixture) {
	return fixture
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

async function captureFixture(fixture, index) {
	const fileName = fileNameForFixture(fixture);
	const pngPath = join(temporaryDirectory, `${fileName}.png`);
	const jpegPath = join(outputDirectory, `${fileName}.jpg`);
	const profilePath = join(temporaryDirectory, `chrome-${index}`);
	const url = new URL('http://localhost:4180/reference.html');
	url.searchParams.set('fixture', `${fixture}/Dark`);
	url.searchParams.set('name', fixture.split('/').at(-1));
	url.searchParams.set('capture', 'thumbnail');

	await execFileAsync(chrome, [
		'--headless=new',
		'--disable-background-networking',
		'--disable-extensions',
		'--disable-gpu',
		'--hide-scrollbars',
		'--no-first-run',
		`--user-data-dir=${profilePath}`,
		'--virtual-time-budget=5000',
		'--window-size=480,300',
		`--screenshot=${pngPath}`,
		url.href
	]);
	await execFileAsync('sips', [
		'-s', 'format', 'jpeg',
		'-s', 'formatOptions', '72',
		pngPath,
		'--out', jpegPath
	]);
	await rm(pngPath, { force: true });
	await rm(profilePath, { recursive: true, force: true });
	console.log(`${index + 1}/${uniqueFixtures.length} ${fixture}`);
}

for (let index = 0; index < uniqueFixtures.length; index += 1) {
	await captureFixture(uniqueFixtures[index], index);
}

await rm(temporaryDirectory, { recursive: true, force: true });
console.log(`Captured ${uniqueFixtures.length} Library thumbnails in ${outputDirectory}`);
