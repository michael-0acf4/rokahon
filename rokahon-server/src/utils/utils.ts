import * as path from "std/path/mod.ts";
import * as base64url from "encoding/base64url.ts";
import * as fs from "std/fs/mod.ts";
import { Book, Chapter, SimplifiedBook, SimplifiedChapter } from "./types.ts";
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

export function computeId(input: string) {
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
  return items.filter((_, i) => {
    return i >= window * (page - 1) && i < window * page;
  });
}

export function simplifyBooks(books: Array<Book>): Array<SimplifiedBook> {
  return books.map((book) => ({
    id: computeId(book.path),
    authors: book.authors,
    cover: book.cover,
    tags: book.tags,
    title: book.title,
    chapters: book.chapters.map((chapter) => ({
      title: chapter.title,
      id: computeId(chapter.path),
    } as SimplifiedChapter)),
  }));
}

export function findSimpBook(
  bookId: string,
  books: Array<SimplifiedBook>,
): SimplifiedBook {
  const results = books.filter((b) => b.id === bookId);
  if (results.length > 0) {
    return results[0];
  }
  throw new Error(`${bookId} does not correspond to any book`);
}

export function retrieveChapter(
  bookId: string,
  chapterId: string,
  books: Array<Book>,
): Chapter {
  const booksRes = books.filter((b) => computeId(b.path) === bookId);
  if (booksRes.length != 1) {
    throw new Error(
      `${bookId} corresponds to ${booksRes.length} (!= 1) book(s)`,
    );
  }

  const chapRes = booksRes[0].chapters.filter((c) =>
    computeId(c.path) === chapterId
  );
  if (chapRes.length != 1) {
    throw new Error(
      `${chapterId} corresponds to ${chapRes.length} (!= 1) chapters(s)`,
    );
  }

  return chapRes[0];
}

/** Order from recent to older if `mtime` is not available*/
export function comparePath(a: string, b: string): number {
  if (fs.existsSync(a) && fs.existsSync(b)) {
    const statA = Deno.statSync(a);
    const statB = Deno.statSync(b);
    if (statA.mtime && statB.mtime) {
      // recent > old
      return statB.mtime.getTime() - statA.mtime.getTime();
    }
  }
  // keep original ordering
  return 0;
}

/**
 * Attempt to sort numerically from low to high,
 * otherwise from recent to old
 */
export function comparePathByNumOrder(a: string, b: string): number {
  const locale = a.localeCompare(b);
  if (locale == 0) {
    return comparePath(a, b);
  }
  return locale;
}
