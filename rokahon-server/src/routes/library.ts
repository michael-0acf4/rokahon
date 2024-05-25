import { Context, Router } from "oak";
import { logger } from "../utils/setup.ts";
import { FsScanner } from "../utils/fs_scanner.ts";

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
  ctx.response.body = JSON.stringify({
    isError: true,
    data: err,
  } as GenericResponse);
}

libraryRouter.get("/", async (ctx) => {
  try {
    const books = await scanner.getBooks();
    success(books, ctx);
  } catch (err) {
    logger.error(err);
    fail(err, ctx);
  }
});

libraryRouter.get("/search", async (ctx) => {
  try {
    const books = await scanner.getBooks();
    const keyword = ctx.request.url.searchParams.get("keyword");
    if (!keyword) {
      success(books, ctx);
    } else {
      const results = books.filter((b) =>
        new RegExp(keyword, "i").test(b.title)
      );
      success(results, ctx);
    }
  } catch (err) {
    logger.error(err);
    fail(err, ctx);
  }
});
