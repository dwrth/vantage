import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MARKER, buildReport, relativePath, summarizeResults } from './ci-report.mjs';

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));

const results = fixture('results');
const coverage = fixture('coverage');
const baseline = fixture('baseline');
const changedFiles = ['src/lib/weak.ts', 'src/lib/grid.ts', 'README.md'];

const build = (overrides = {}) =>
  buildReport({ results, coverage, baseline, changedFiles, root: '/repo', ...overrides });

describe('summarizeResults', () => {
  it('counts skipped tests, failed files and duration', () => {
    const summary = summarizeResults(results);
    expect(summary).toMatchObject({
      totalTests: 5,
      passedTests: 2,
      failedTests: 2,
      skippedTests: 1,
      totalFiles: 3,
      failedFiles: 2,
      duration: 1400,
    });
  });

  it('takes the first non-empty error line and reports suites that failed to run', () => {
    const { failures } = summarizeResults(results);
    expect(failures.map((f) => [f.name, f.error])).toEqual([
      ['grid places | items', 'AssertionError: expected 1 to be 2'],
      ['grid resizes', ''],
      ['(suite failed to run)', "Error: Cannot find module './missing'"],
    ]);
  });
});

describe('relativePath', () => {
  it('relativizes absolute paths and keeps relative ones', () => {
    expect(relativePath('/repo/src/a.ts', '/repo')).toBe('src/a.ts');
    expect(relativePath('./src/a.ts', '/repo')).toBe('src/a.ts');
  });
});

describe('buildReport', () => {
  it('starts with the sticky marker', () => {
    expect(build().startsWith(MARKER)).toBe(true);
  });

  it('renders test counts, duration and escaped failing test names', () => {
    const report = build();
    expect(report).toContain('| ❌ Tests | 5 | 2 | 2 | 1 |');
    expect(report).toContain('| Files | 3 | 1 | 2 | – |');
    expect(report).toContain('Duration: 1.4 s');
    expect(report).toContain(
      '- grid places \\| items (src/lib/grid.test.ts) — `AssertionError: expected 1 to be 2`',
    );
  });

  it('truncates long errors and caps the failure list', () => {
    const long = {
      ...results,
      testResults: [
        {
          name: '/repo/a.test.ts',
          status: 'failed',
          assertionResults: Array.from({ length: 12 }, (_, i) => ({
            fullName: `t${i}`,
            status: 'failed',
            failureMessages: ['x'.repeat(300)],
          })),
        },
      ],
    };
    const report = build({ results: long });
    expect(report).toContain(`${'x'.repeat(159)}…`);
    expect(report).toContain('… and 2 more');
  });

  it('shows deltas against the baseline and flags metrics below 80%', () => {
    const report = build();
    expect(report).toContain('| statements | 85% | 84% | +1 |');
    expect(report).toContain('| branches | 75% ⚠️ | 77.5% | −2.5 |');
    expect(report).toContain('| lines | 88.89% | 88.89% | ±0 |');
  });

  it('falls back to covered counts without a baseline', () => {
    const report = build({ baseline: undefined });
    expect(report).toContain('| statements | 85% | 85/100 |');
    expect(report).toContain('_No baseline available from main._');
  });

  it('lists only changed covered files and flags those below 80%', () => {
    const report = build();
    expect(report).toContain('| ⚠️ `src/lib/weak.ts` | 50% | 66.67% |');
    expect(report).toContain('| `src/lib/grid.ts` | 98% | 100% |');
    expect(report).not.toContain('untouched.ts');
    expect(report).not.toContain('README.md');
  });

  it('handles a PR without covered source changes', () => {
    expect(build({ changedFiles: ['README.md'] })).toContain('_No covered source files changed._');
  });

  it('degrades when results or coverage are missing', () => {
    const report = build({ results: undefined, coverage: undefined });
    expect(report).toContain('_No test results found._');
    expect(report).toContain('_No coverage data found._');
  });
});

describe('browser test line', () => {
  const passing = {
    numTotalTests: 18,
    numPassedTests: 18,
    numFailedTests: 0,
    startTime: 1000,
    testResults: [
      {
        name: '/repo/src/components/Builder.browser.test.tsx',
        status: 'passed',
        endTime: 4200,
        assertionResults: [],
      },
    ],
  };

  it('is left out when no browser results were requested', () => {
    expect(build()).not.toContain('Browser tests');
  });

  it('summarizes a passing run in one line under the tests', () => {
    const report = build({ browserResults: passing });
    expect(report).toContain('✅ Browser tests (Chromium): 18 passed, 0 failed in 3.2 s');
    expect(report.indexOf('Browser tests')).toBeLessThan(report.indexOf('### Coverage'));
  });

  it('marks failures and lists failing browser tests', () => {
    const report = build({ browserResults: results });
    expect(report).toContain('❌ Browser tests (Chromium): 2 passed, 2 failed, 1 skipped in 1.4 s');
    expect(report).toContain('**Failing browser tests**');
  });

  it('flags a requested run that left no results', () => {
    expect(build({ browserResults: null })).toContain(
      '❌ Browser tests (Chromium): _no results found._',
    );
  });

  it('reads the --browser file on the command line', () => {
    const script = fileURLToPath(new URL('./ci-report.mjs', import.meta.url));
    const missing = execFileSync('node', [script, '--browser=does-not-exist.json'], {
      encoding: 'utf8',
    });
    expect(missing).toContain('_no results found._');
    const omitted = execFileSync('node', [script], { encoding: 'utf8' });
    expect(omitted).not.toContain('Browser tests');
  });
});
