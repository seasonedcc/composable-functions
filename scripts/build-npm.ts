// ex. scripts/build_npm.ts
import { build, emptyDir } from '@deno/dnt'
import pkg from '../deno.json' with { type: 'json' }

await emptyDir('./npm')

await build({
  scriptModule: 'cjs',
  importMap: 'deno.json',
  typeCheck: false,
  declaration: 'separate',
  entryPoints: ['./src/index.ts'],
  outDir: './npm',
  shims: {
    deno: true,
    undici: true,
  },
  package: {
    name: 'composable-functions',
    version: pkg.version,
    description: 'Types and functions to make composition easy and safe',
    license: 'MIT',
    author: 'Seasoned',
    bugs: {
      url: 'https://github.com/seasonedcc/composable-functions/issues',
    },
    homepage: 'https://github.com/seasonedcc/composable-functions',
    repository: {
      type: 'git',
      url: 'https://github.com/seasonedcc/composable-functions.git',
    },
  },
})

// post build steps
Deno.copyFileSync('LICENSE', 'npm/LICENSE')
Deno.copyFileSync('README.md', 'npm/README.md')
Deno.copyFileSync('API.md', 'npm/API.md')
Deno.copyFileSync('context.md', 'npm/context.md')
Deno.copyFileSync('with-schema.md', 'npm/with-schema.md')
Deno.copyFileSync('migrating-df.md', 'npm/migrating-df.md')
Deno.copyFileSync('logo.png', 'npm/logo.png')
