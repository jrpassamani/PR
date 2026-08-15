// ESM resolver hook para rodar os testes do motor de cálculo no Node
// (`node --experimental-strip-types`) usando o mesmo código do Expo:
//  - imports SEM extensão  ("./x"  -> "./x.ts")
//  - alias do projeto      ("@/x"  -> "<root>/src/x.ts")
// O Metro/Expo já resolve ambos via tsconfig; aqui replicamos para os testes.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = resolvePath(ROOT, 'src');
const EXTS = ['', '.ts', '.tsx', '.js', '.json'];

export async function resolve(specifier, context, next) {
  // alias "@/..." -> <root>/src/...
  if (specifier.startsWith('@/')) {
    const base = resolvePath(SRC, specifier.slice(2));
    for (const ext of EXTS) {
      if (ext !== '' && existsSync(base + ext)) {
        return next(pathToFileURL(base + ext).href, context);
      }
      if (ext === '' && existsSync(base)) {
        return next(pathToFileURL(base).href, context);
      }
    }
    return next(pathToFileURL(base + '.ts').href, context);
  }

  // relativo sem extensão -> tenta .ts/.tsx
  if (specifier.startsWith('.') && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(specifier)) {
    for (const ext of ['.ts', '.tsx']) {
      try {
        const candidate = new URL(specifier + ext, context.parentURL);
        if (existsSync(fileURLToPath(candidate))) {
          return next(specifier + ext, context);
        }
      } catch {
        /* ignore */
      }
    }
  }

  return next(specifier, context);
}
