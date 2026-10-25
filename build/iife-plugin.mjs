// Vite plugin: `import code from './file.ts?iife'` gives the file bundled + minified as an
// IIFE string, ready to inline with <script is:inline set:html={code}>.
import { build } from 'esbuild';

const PREFIX = '\0iife:';

export default function iife() {
  return {
    name: 'tzh-iife',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!source.endsWith('?iife')) return null;
      const resolved = await this.resolve(source.slice(0, -'?iife'.length), importer, { skipSelf: true });
      return resolved ? PREFIX + resolved.id : null;
    },
    async load(id) {
      if (!id.startsWith(PREFIX)) return null;
      const file = id.slice(PREFIX.length);
      const result = await build({
        entryPoints: [file],
        bundle: true,
        format: 'iife',
        minify: true,
        write: false,
        metafile: true,
        target: 'es2020',
        platform: 'browser',
        legalComments: 'none',
      });
      for (const input of Object.keys(result.metafile.inputs)) this.addWatchFile?.(input);
      return `export default ${JSON.stringify(result.outputFiles[0].text.trim())};`;
    },
  };
}
