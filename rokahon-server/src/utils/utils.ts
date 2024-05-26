import * as path from "std/path/mod.ts";
import * as base64url from "encoding/base64url.ts";

import { createHash } from "hash";

/** Returns a new key everytime `bookPath` has been modified */
export async function computeKey(bookPath: string): Promise<string> {
  const canonPath = path.resolve(bookPath);
  const stats = await Deno.stat(canonPath);
  const input = [
    canonPath,
    stats.mtime?.toJSON(),
  ].join("");
  const hash = createHash("md5");
  hash.update(input);
  return hash.toString();
}

export function encodePath(genericPath: string): string {
  const canonPath = path.resolve(genericPath);
  return base64url.encodeBase64Url(canonPath);
}

export function decodePath(b64: string): string {
  const buffer = base64url.decodeBase64Url(b64);
  return new TextDecoder().decode(buffer);
}

export function paginate<T>(items: Array<T>, targetPage: number, window = 10) {
  const total = Math.round(items.length / window);
  const page = Math.max(1, Math.min(targetPage, total));
  return items.filter((v, i) => {
    return i >= window * (page - 1) && i < window * page;
  });
}
