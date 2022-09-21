// ex. scripts/build_npm.ts
import { build, emptyDir } from 'https://deno.land/x/dnt@0.25.2/mod.ts'
import pkg from '../package.json' assert { type: 'json' }

await emptyDir('./npm')

await build({
  scriptModule: 'cjs',
  typeCheck: false,
  declaration: true,
  entryPoints: ['./src/index.ts'],
  outDir: './npm',
  shims: {
    deno: true,
    undici: true,
  },
  mappings: {
    'https://deno.land/x/zod@v3.19.1/mod.ts': {
      name: 'zod',
      version: '^3.19.1',
    },
    'https://deno.land/x/deno_qs@0.0.1/mod.ts': {
      name: 'qs',
      version: '^6.10.3',
    },
  },
  package: {
    name: 'domain-functions',
    version: pkg.version,
    description:
      'Decouple your business logic from your controllers. With first-class type inference from end to end.',
    license: 'MIT',
    author: 'Seasoned Software',
    bugs: {
      url: 'https://github.com/SeasonedSoftware/domain-functions/issues',
    },
    homepage: 'https://github.com/SeasonedSoftware/domain-functions',
  },
})

// post build steps
Deno.copyFileSync('LICENSE', 'npm/LICENSE')
Deno.copyFileSync('README.md', 'npm/README.md')
