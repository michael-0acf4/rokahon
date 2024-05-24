import { Book, Scanner } from "./types.ts";

export class FileScanner extends Scanner {
  search(_keyword: string): Promise<Book[]> {
    throw new Error("Method not implemented.");
  }

  run(): Promise<Book[]> {
    throw new Error("Method not implemented.");
  }

  loadCache(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
