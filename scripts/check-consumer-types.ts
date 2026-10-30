import { copy } from 'jsr:@std/fs@1/copy'
import { join } from 'jsr:@std/path@1/join'

const tsc = 'npm:typescript@5.9.3/tsc'
const moduleSettings = [
  ['esnext', 'bundler'],
  ['nodenext', 'nodenext'],
]

const consumer = await Deno.makeTempDir({ prefix: 'consumer-types-' })
const installed = join(consumer, 'node_modules', 'composable-functions')

await Deno.mkdir(installed, { recursive: true })
for (const entry of ['package.json', 'types', 'esm', 'script']) {
  await copy(join('npm', entry), join(installed, entry))
}
await Deno.copyFile(
  'scripts/consumer-types/index.ts',
  join(consumer, 'index.ts'),
)
await Deno.writeTextFile(
  join(consumer, 'package.json'),
  JSON.stringify({ type: 'module' }),
)

let failed = false
for (const [module, moduleResolution] of moduleSettings) {
  const { code, stdout, stderr } = await new Deno.Command(Deno.execPath(), {
    cwd: consumer,
    args: [
      'run',
      '-A',
      '--no-lock',
      tsc,
      'index.ts',
      '--declaration',
      '--emitDeclarationOnly',
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      module,
      '--moduleResolution',
      moduleResolution,
      '--outDir',
      `out-${moduleResolution}`,
    ],
  }).output()

  const decoder = new TextDecoder()
  console.log(
    `${code === 0 ? 'ok' : 'FAILED'}: declarations with ${moduleResolution}`,
  )
  if (code !== 0) {
    failed = true
    console.log(decoder.decode(stdout))
    console.error(decoder.decode(stderr))
  }
}

await Deno.remove(consumer, { recursive: true })
if (failed) Deno.exit(1)
