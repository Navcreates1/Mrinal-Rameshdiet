/* Minimal assertion helper. Every harness reports the same way and exits
   non-zero on any failure, because run-all.sh checks exit codes — grepping
   output for the word "passed" once matched "69 passed, 10 failed" and
   reported a suite green. */

let passed = 0;
const failures: string[] = [];

export function ok(cond: unknown, msg: string): void {
  if (cond) passed++;
  else failures.push(msg);
}

export function eq(actual: unknown, expected: unknown, msg: string): void {
  if (Object.is(actual, expected)) passed++;
  else failures.push(`${msg}\n      expected ${JSON.stringify(expected)}\n      actual   ${JSON.stringify(actual)}`);
}

export function near(actual: number, expected: number, tol: number, msg: string): void {
  if (Math.abs(actual - expected) <= tol) passed++;
  else failures.push(`${msg}\n      expected ${expected} +/- ${tol}, actual ${actual.toFixed(2)} (off by ${(actual - expected).toFixed(2)})`);
}

export function deep(actual: unknown, expected: unknown, msg: string): void {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else failures.push(`${msg}\n      expected ${e.slice(0, 300)}\n      actual   ${a.slice(0, 300)}`);
}

export function report(name: string): never {
  if (failures.length) {
    console.error(`\n${name}: ${failures.length} FAILED, ${passed} passed\n`);
    failures.slice(0, 40).forEach((f, i) => console.error(`  ${i + 1}. ${f}`));
    if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
    process.exit(1);
  }
  console.log(`${name}: ${passed} assertions passed`);
  process.exit(0);
}
