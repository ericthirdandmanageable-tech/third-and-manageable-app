import { access } from "node:fs/promises";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !specifier.match(/\.[a-z]+$/i)) {
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    try {
      await access(candidate);
      return nextResolve(candidate.href, context);
    } catch {
      // Let Node report the canonical resolution error below.
    }
  }
  return nextResolve(specifier, context);
}
