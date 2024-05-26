import { Context, Router } from "oak";
import { logger } from "../utils/setup.ts";
import { FsScanner } from "../utils/fs_scanner.ts";
import {
  findSimpBook,
  retrieveChapter,
  simplifyBooks,
} from "../utils/utils.ts";

/**
 * * `/`: All books
 * * `/search?keyword={value}`: Search a book
 *
 * Response:
 * ```json
 * {
 *   isError: boolean,
 *   data: { .. }
 * }
 * ```
 */
export const libraryRouter = new Router();

export const scanner = new FsScanner();
await scanner.update();

interface GenericResponse {
  isError: boolean;
  data: unknown;
}

function success(data: unknown, ctx: Context) {
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  ctx.response.headers = headers;
  ctx.response.body = JSON.stringify({
    isError: false,
    data,
  } as GenericResponse);
}

function fail(err: unknown, ctx: Context) {
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  ctx.response.headers = headers;
  ctx.response.status = 500;
  ctx.response.body = JSON.stringify({
    isError: true,
    data: err instanceof Error ? err.message : JSON.stringify(err),
  } as GenericResponse);
}

libraryRouter.get("/", async (ctx) => {
  try {
    const books = simplifyBooks(await scanner.getBooks());
    success(books, ctx);
  } catch (err) {
    logger.error(err);
    fail(err, ctx);
  }
});

libraryRouter.get("/search", async (ctx) => {
  try {
    const books = simplifyBooks(await scanner.getBooks());
    const keyword = ctx.request.url.searchParams.get("keyword");
    if (keyword) {
      const results = books.filter((b) =>
        new RegExp(keyword, "i").test(b.title)
      );
      success(results, ctx);
    } else {
      success(books, ctx);
    }
  } catch (err) {
    logger.error(err);
    fail(err, ctx);
  }
});

libraryRouter.get("/book/:bookId", async (ctx) => {
  try {
    const origBooks = await scanner.getBooks();
    const simpBooks = simplifyBooks(origBooks);
    const { bookId } = ctx.params;
    if (bookId) {
      success(findSimpBook(bookId, simpBooks), ctx);
    } else {
      throw new Error("Missing bookId in the url");
    }
  } catch (err) {
    logger.error(err);
    fail(err, ctx);
  }
});

libraryRouter.get("/pages/:bookId/:chapterId", async (ctx) => {
  try {
    const origBooks = await scanner.getBooks();
    const { bookId, chapterId } = ctx.params;
    if (bookId && chapterId) {
      success(retrieveChapter(bookId, chapterId, origBooks), ctx);
    } else {
      throw new Error("Missing bookId and chapterId in the url");
    }
  } catch (err) {
    logger.error(err);
    fail(err, ctx);
  }
});
