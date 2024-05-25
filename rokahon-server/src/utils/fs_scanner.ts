import { Book, Chapter } from "./types.ts";
import { config } from "./setup.ts";
import * as path from "std/path/mod.ts";

export class FileScanner {
  private readonly directories: Array<string>;
  private readonly useCache: boolean;

  constructor(directories?: Array<string>, useCache?: boolean) {
    this.useCache = useCache === undefined ? true : useCache;
    this.directories = directories ? directories : config.LIBRARY_ROOT;
  }

  search(_keyword: string): Promise<Book[]> {
    throw new Error("Method not implemented.");
  }

  async run(): Promise<Book[]> {
    const books = [] as Array<Book>;
    for (const dir of this.directories) {
      await this.discoverBooks(dir, dir, books);
    }
    return books.sort((a, b) => a.title.localeCompare(b.title));
  }

  loadCache(): Promise<void> {
    throw new Error("Method not implemented.");
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
   *      metadata.(txt|json)
   * ```
   */
  private async discoverBooks(
    startLookup: string,
    parentDir: string,
    books: Array<Book>,
  ) {
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
        cover: undefined,
        path: nextDir,
      } as Chapter;

      let n = 0;
      for await (const page of Deno.readDir(nextDir)) {
        if (page.isFile) {
          const currPath = path.join(nextDir, page.name);
          const pageData = this.getPageHelper(++n, currPath);
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
      const bookTitle = path.dirname(chapters[0].path);
      const bookPath = path.dirname(chapters[0].path);
      books.push(this.normalize({
        title: bookTitle,
        chapters,
        path: bookPath,
        authors: [],
        tags: [],
      }));
    }
  }

  getPageHelper(index: number, filepath: string) {
    return {
      number: index,
      image: {
        path: filepath,
        ext: path.extname(filepath).substring(1),
      },
    };
  }

  /**
   * @TODO determine metadata (author, tags)
   */
  normalize(book: Book): Book {
    return book;
  }
}
