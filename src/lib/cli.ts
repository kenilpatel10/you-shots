/**
 * Runs a CLI entry point and guarantees a non-zero exit if it never finishes.
 *
 * Node exits with code 0 as soon as the event loop drains, even when `main()` is still awaiting a
 * promise nobody will resolve (a stalled stream, a forgotten close). In CI that looks like success
 * while nothing was produced. `beforeExit` fires in exactly that situation, so we turn it into a
 * loud failure with the same alerting the catch path uses.
 */
import { createLogger } from "./logger";

export function runCli(
  name: string,
  main: () => Promise<void>,
  onError: (err: unknown) => Promise<void> | void,
): void {
  const log = createLogger(name);
  let finished = false;
  let failing = false;

  const fail = async (err: unknown) => {
    if (failing) return;
    failing = true;
    log.error(String((err as Error)?.stack ?? err));
    try {
      await onError(err);
    } finally {
      process.exit(1);
    }
  };

  process.on("beforeExit", () => {
    if (finished || failing) return;
    void fail(new Error(`${name} exited before finishing: a promise never resolved (stalled stream or worker)`));
  });

  main().then(
    () => {
      finished = true;
    },
    (err) => void fail(err),
  );
}
