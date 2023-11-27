// ex. scripts/build_npm.ts
import { build, emptyDir } from 'https://deno.land/x/dnt@0.38.0/mod.ts'
import pkg from '../deno.json' assert { type: 'json' }

await emptyDir('./npm')

await build({
  scriptModule: 'cjs',
  typeCheck: false,
  declaration: 'separate',
  entryPoints: ['./src/index.ts'],
  outDir: './npm',
  shims: {
    deno: true,
    undici: true,
  },
  package: {
    name: 'domain-functions',
    version: pkg.version,
    description:
      'Decouple your business logic from your controllers. With first-class type inference from end to end.',
    license: 'MIT',
    author: 'Seasoned',
    bugs: {
      url: 'https://github.com/seasonedcc/domain-functions/issues',
    },
    homepage: 'https://github.com/seasonedcc/domain-functions',
    repository: {
      type: "git",
      url: "https://github.com/seasonedcc/domain-functions.git"
    },
  },
})

// post build steps
Deno.copyFileSync('LICENSE', 'npm/LICENSE')
Deno.copyFileSync('README.md', 'npm/README.md')
