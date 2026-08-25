import { plugin } from 'bun';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile, compileModule } from 'svelte/compiler';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

const ROOT_DIR = import.meta.dir;
const LIB_DIR = join(ROOT_DIR, 'src/lib');
const SVELTE_ROOT = dirname(fileURLToPath(import.meta.resolve('svelte/package.json')));

const svelteBrowserExports: Record<string, string> = {
	svelte: 'src/index-client.js',
	'svelte/legacy': 'src/legacy/legacy-client.js',
	'svelte/reactivity': 'src/reactivity/index-client.js',
	'svelte/store': 'src/store/index-client.js',
};

let currentMockUrl = new URL('http://localhost/');
export const page = {
	get url() {
		if (typeof window !== 'undefined' && window.location?.href && window.location.href !== 'about:blank') {
			try {
				return new URL(window.location.href);
			} catch {}
		}
		return currentMockUrl;
	},
	set url(value: URL) {
		currentMockUrl = value;
	},
};

const isFile = (path: string) => {
	try {
		return existsSync(path) && statSync(path).isFile();
	} catch {
		return false;
	}
};

const stripQuery = (specifier: string) => {
	const index = specifier.indexOf('?');
	return index === -1 ? specifier : specifier.slice(0, index);
};

const getQuery = (specifier: string) => {
	const index = specifier.indexOf('?');
	return index === -1 ? '' : specifier.slice(index + 1);
};

const resolveSpecifier = (specifier: string, resolveDir: string) => {
	const clean = stripQuery(specifier);
	let absolute: string;

	if (clean === '$lib' || clean.startsWith('$lib/')) {
		absolute = join(LIB_DIR, clean.slice('$lib'.length).replace(/^\//, ''));
	} else if (clean.startsWith('/')) {
		absolute = clean;
	} else if (resolveDir) {
		absolute = resolve(resolveDir, clean);
	} else {
		return;
	}

	if (isFile(absolute)) {
		return absolute;
	}

	if (isFile(`${absolute}.ts`)) {
		return `${absolute}.ts`;
	}

	if (isFile(`${absolute}.js`)) {
		return `${absolute}.js`;
	}

	if (absolute.endsWith('.svelte') && isFile(`${absolute}.ts`)) {
		return `${absolute}.ts`;
	}

	if (absolute.endsWith('.svelte') && isFile(`${absolute}.js`)) {
		return `${absolute}.js`;
	}

	return absolute;
};

const isRawQuery = (query: string) => {
	return query === 'raw' || query.split('&').includes('raw');
};

plugin({
	name: 'sveltekit-test',
	setup(build) {
		build.onResolve({ filter: /^svelte(\/legacy|\/reactivity|\/store)?$/ }, (args) => {
			const target = svelteBrowserExports[args.path];
			if (!target) {
				return;
			}
			return { path: join(SVELTE_ROOT, target) };
		});
		build.onResolve({ filter: /^\$lib(\/|$)/ }, (args) => {
			const resolved = resolveSpecifier(args.path, args.resolveDir);
			if (!resolved) {
				return;
			}
			if (isRawQuery(getQuery(args.path))) {
				return { path: resolved, namespace: 'raw' };
			}
			return { path: resolved };
		});

		build.onResolve({ filter: /\?raw$/ }, (args) => {
			if (args.path.startsWith('$lib')) {
				return;
			}
			const resolved = resolveSpecifier(args.path, args.resolveDir);
			if (!resolved) {
				return;
			}
			return {
				path: resolved,
				namespace: 'raw',
			};
		});

		build.onResolve({ filter: /\.svelte$/ }, (args) => {
			if (!args.resolveDir || args.path.startsWith('$lib') || args.path.includes('?')) {
				return;
			}
			const resolved = resolveSpecifier(args.path, args.resolveDir);
			if (!resolved) {
				return;
			}
			return { path: resolved };
		});

		// Bun resolves `svelte` to the server build; tests need the client runtime.
		build.onLoad({ filter: /\/svelte\/src\/index-server\.js$/ }, () => ({
			contents: `export * from ${JSON.stringify(join(SVELTE_ROOT, 'src/index-client.js'))};`,
			loader: 'js',
		}));
		build.onLoad({ filter: /\/svelte\/src\/legacy\/legacy-server\.js$/ }, () => ({
			contents: `export * from ${JSON.stringify(join(SVELTE_ROOT, 'src/legacy/legacy-client.js'))};`,
			loader: 'js',
		}));
		build.onLoad({ filter: /\/svelte\/src\/reactivity\/index-server\.js$/ }, () => ({
			contents: `export * from ${JSON.stringify(join(SVELTE_ROOT, 'src/reactivity/index-client.js'))};`,
			loader: 'js',
		}));
		build.onLoad({ filter: /\/svelte\/src\/store\/index-server\.js$/ }, () => ({
			contents: `export * from ${JSON.stringify(join(SVELTE_ROOT, 'src/store/index-client.js'))};`,
			loader: 'js',
		}));

		build.onLoad({ filter: /.*/, namespace: 'raw' }, async (args) => {
			const contents = await Bun.file(args.path).text();
			return {
				contents: `export default ${JSON.stringify(contents)};`,
				loader: 'js',
			};
		});

		build.onLoad({ filter: /\.(webp|png|jpe?g|gif)$/ }, (args) => {
			const url = `/${relative(ROOT_DIR, args.path).replaceAll('\\', '/')}`;
			return {
				contents: `export default ${JSON.stringify(url)};`,
				loader: 'js',
			};
		});

		build.onLoad({ filter: /\.svelte\.(ts|js)$/ }, (args) => {
			const source = readFileSync(args.path, 'utf8');
			const transpiled = new Bun.Transpiler({
				loader: args.path.endsWith('.ts') ? 'ts' : 'js',
			}).transformSync(source);
			const result = compileModule(transpiled, {
				filename: args.path,
				generate: 'client',
				dev: true,
			});
			return { contents: result.js.code, loader: 'js' };
		});

		build.onLoad({ filter: /\.svelte$/ }, (args) => {
			// Tailwind at-rules are handled by Vite; the Svelte compiler does not need them in tests.
			const raw = readFileSync(args.path, 'utf8').replace(/<style[\s\S]*?<\/style>/gi, '');
			// Redirect $app/state imports to svelte-loader where mock page is exported.
			const svelteLoaderPath = resolve(ROOT_DIR, 'svelte-loader.ts');
			const source = raw.replace(/from ['"]\$app\/state['"]/g, `from '${svelteLoaderPath}'`);
			const result = compile(source, {
				filename: args.path,
				generate: 'client',
				dev: true,
				css: 'injected',
				runes: true,
			});
			return { contents: result.js.code, loader: 'js' };
		});
	},
});
