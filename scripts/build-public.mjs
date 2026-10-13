import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, '_site');
const localOnlySections = [
	'inventory-nav',
	'inventory-view',
	'purpose-summary',
	'questions',
	'record-dialog'
];

function removeMarkedSection(html, name) {
	const pattern = new RegExp(`\\s*<!-- PUBLIC_BUILD_REMOVE_START: ${name} -->[\\s\\S]*?<!-- PUBLIC_BUILD_REMOVE_END: ${name} -->\\s*`, 'g');
	if (!pattern.test(html)) {
		throw new Error(`Could not find public-build markers for ${name}.`);
	}
	return html.replace(pattern, '\n');
}

let index = await readFile(join(root, 'index.html'), 'utf8');
for (const section of localOnlySections) {
	index = removeMarkedSection(index, section);
}

index = index
	.replace(/^\s*<script src="\.\/previewFrame\.js" defer><\/script>\s*$/m, '')
	.replace(/^\s*<p class="component-explorer-reference">.*<\/p>\s*$/gm, '')
	.replace(
		'<script src="./app.js?v=36" defer></script>',
		'<script>window.__MOTION_AUDIT_PUBLIC__ = true;</script>\n\t<script src="./app.js?v=36" defer></script>'
	);

if (index.includes('PUBLIC_BUILD_REMOVE_') || index.includes('/___explorer')) {
	throw new Error('The public index still contains local-only content.');
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all([
	writeFile(join(output, 'index.html'), index),
	cp(join(root, 'app.js'), join(output, 'app.js')),
	cp(join(root, 'styles.css'), join(output, 'styles.css')),
	cp(join(root, 'assets'), join(output, 'assets'), { recursive: true }),
	writeFile(join(output, '.nojekyll'), '')
]);
await rm(join(output, 'assets', 'generated-image-lifecycle-production.m4v'), { force: true });

console.log(`Public site built at ${output}`);
