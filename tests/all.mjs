/**
 * Все проверки одной командой: node tests/all.mjs
 *
 * Каждый набор запускается отдельным процессом (у наборов своя
 * «база» в памяти). Проверки хуков пропускаются, если не установлен
 * react-test-renderer (npm install --no-save react-test-renderer).
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const hasRenderer = (() => {
  try {
    require.resolve('react-test-renderer');
    return true;
  } catch {
    return false;
  }
})();

const suites = [
  'tests/run.mjs',
  'tests/rules.mjs',
  'tests/e2e/run.mjs',
  'tests/e2e/teacher.mjs',
  ...(hasRenderer ? ['tests/hooks/run.mjs', 'tests/hooks/rls.mjs'] : []),
];

let failed = 0;

for (const suite of suites) {
  const { status } = spawnSync(process.execPath, ['--import', './tests/setup.mjs', suite], {
    stdio: 'inherit',
  });

  if (status !== 0) {
    failed += 1;
    console.error(`✗ ${suite}`);
  }
}

if (!hasRenderer) {
  console.log('\nПроверки хуков пропущены: нет react-test-renderer.');
}

process.exitCode = failed > 0 ? 1 : 0;
