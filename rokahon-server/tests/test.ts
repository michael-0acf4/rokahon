import { FsScanner } from "../src/utils/fs_scanner.ts";
import { assertSnapshot } from "std/testing/snapshot.ts";

Deno.test("Scan directories", async (t) => {
  const scanner = new FsScanner(
    ["./tests/test-dir"],
    false,
  );
  const books = await scanner.getBooks();
  // Account for different env.
  books.sort((a, b) => a.title.localeCompare(b.title));

  await t.step("Titles", async (t) => {
    await assertSnapshot(t, books.map((b) => b.title));
  });

  await t.step("Chapters", async (t) => {
    await assertSnapshot(
      t,
      books.map((
        b,
      ) => [
        b.chapters.length,
        b.chapters.map((c) => c.pages.length) as number[],
      ]),
    );
  });

  await assertSnapshot(t, books);
});
