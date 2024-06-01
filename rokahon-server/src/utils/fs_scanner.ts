import { Book, Chapter, Image, Page } from "./types.ts";
import { config, logger } from "./setup.ts";
import * as path from "std/path/mod.ts";
import * as fs from "std/fs/mod.ts";
import {
  comparePath,
  comparePathByNumOrder,
  computeKey,
  encodePath,
} from "./utils.ts";

export class FsScanner {
  private readonly directories: Array<string>;
  private readonly useCache: boolean;
  private books: Array<Book> = [];

  constructor(directories?: Array<string>, useCache?: boolean) {
    this.useCache = useCache === undefined ? true : useCache;
    this.directories = directories ? directories : config.LIBRARY_ROOT;
  }

  async update() {
    this.books = [];
    for (const dir of this.directories) {
      if (!await fs.exists(dir)) {
        logger.warn("Cannot resolve root:", dir);
        continue;
      }
      await this.discoverBooks(dir, dir, this.books);
    }
    this.books.sort((a, b) => comparePath(a.path, b.path));
    return this;
  }

  async getBooks(): Promise<Array<Book>> {
    return (await this.update()).books;
  }

  /**
   * Discover books starting from a root directory
   * ```
   * path/../root
   *    bookTitle
   *      chapter1
   *        1.ext
   *        2.ext
   *      chapter2
   *        1.ext
   *        ..
   * ```
   */
  private async discoverBooks(
    startLookup: string,
    parentDir: string,
    books: Array<Book>,
  ) {
    const hit = await this.getCache(parentDir);
    if (hit) {
      books.push(hit);
      return;
    }

    // For simplicity's sake, simply look 3 levels ahead (title => chap => page)
    const chapters = [] as Array<Chapter>;
    for await (const chap of Deno.readDir(parentDir)) {
      if (chap.isFile) {
        continue;
      }

      const nextDir = path.join(parentDir, chap.name);
      const chapter = {
        title: chap.name,
        pages: [],
        path: nextDir,
      } as Chapter;

      let n = 0;
      for await (const page of Deno.readDir(nextDir)) {
        if (page.isFile) {
          const currPath = path.join(nextDir, page.name);
          const pageData = this.checkPage(++n, currPath);
          pageData && chapter.pages.push(pageData);
        }
      }

      if (chapter.pages.length > 0) {
        chapters.push(chapter);
      } else {
        await this.discoverBooks(startLookup, nextDir, books);
      }
    }

    if (startLookup != parentDir && chapters.length > 0) {
      const bookPath = path.dirname(chapters[0].path);
      const bookTitle = path.basename(bookPath);
      const tmpBook = {
        title: bookTitle,
        cover: {
          path: "",
          ext: "",
          id: "",
        },
        chapters,
        path: bookPath,
        authors: [],
        tags: [],
      };
      const book = this.normalize(tmpBook);
      await this.saveCache(book);
      books.push(book);
    }
  }

  checkPage(index: number, filePath: string): Page | null {
    const ext = path.extname(filePath).substring(1);
    return /jpg|jpeg|png|webp|gif|tiff/i.test(ext)
      ? {
        number: index,
        image: {
          path: filePath,
          ext,
          id: encodePath(filePath),
        },
      }
      : null;
  }

  inferCover(book: Book): Image {
    const defaultPath = ["jpg", "jpeg", "png", "webp", "gif", "tiff"]
      .map((ext) => path.join(book.path, `cover.${ext}`))
      .filter((p) => fs.existsSync(p))
      .pop();

    if (defaultPath) {
      const ext = path.extname(defaultPath).substring(1);
      return {
        path: defaultPath,
        ext,
        id: encodePath(defaultPath),
      };
    }

    return book.chapters[0].pages[0].image;
  }

  normalize(book: Book): Book {
    // fix cover
    book.cover = this.inferCover(book);

    // fix chapter order
    book.chapters.sort((ca, cb) =>
      -1 * comparePathByNumOrder(ca.path, cb.path)
    );

    // fix page order
    for (const chapter of book.chapters) {
      chapter.pages.sort((pa, pb) =>
        comparePathByNumOrder(pa.image.path, pb.image.path)
      );
      // fix numbering
      for (let i = 1; i <= chapter.pages.length; i++) {
        chapter.pages[i - 1].number = i;
      }
    }

    // TODO: infer tags,
    return book;
  }

  /** Save cache file for a book if the cache is enabled */
  async saveCache(book: Book) {
    if (this.useCache) {
      const key = await computeKey(book.path);
      const base = "cache";
      const cacheFilePath = path.join(base, `${key}.json`);
      if (!fs.existsSync(path.dirname(cacheFilePath))) {
        await Deno.mkdir(base);
      }
      await Deno.writeTextFile(
        cacheFilePath,
        JSON.stringify(book, null, 2),
      );
      logger.warn("Save ::", book.title, "::", book.path);
    }
  }

  /** Return book from the cache if the cache is enabled and it hits */
  async getCache(bookPath: string): Promise<Book | null> {
    try {
      if (this.useCache && fs.existsSync(bookPath)) {
        const key = await computeKey(bookPath);
        const cacheFilePath = path.join("cache", `${key}.json`);
        const content = JSON.parse(await Deno.readTextFile(cacheFilePath));
        // TODO: validate
        return content as Book;
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
