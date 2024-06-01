import { FsScanner } from "../src/utils/fs_scanner.ts";
import { assertSnapshot } from "std/testing/snapshot.ts";
import { parseNumThenCompare } from "../src/utils/utils.ts";
import { assertEquals } from "std/assert/assert_equals.ts";

Deno.test("Sorting entries", () => {
  const entries = [
    "a",
    "chapter 1.1",
    "chApter 2",
    "chBpter 2",
    "chapter 1-2 ... 1",
    "vol 6",
    "chapter 1.44 - 4",
    "chapter 1-2 - 4",
    "004 - ch 1.2",
    "1- chapter 1-2 - 4",
    "vol 4",
    "001 - ch 1",
    "003 - ch 2",
  ];
  const out = entries.sort(parseNumThenCompare);
  assertEquals(out, [
    "001 - ch 1",
    "003 - ch 2",
    "004 - ch 1.2",
    "1- chapter 1-2 - 4",
    "a",
    "chapter 1.1",
    "chapter 1-2 ... 1",
    "chapter 1-2 - 4",
    "chapter 1.44 - 4",
    "chApter 2",
    "chBpter 2",
    "vol 4",
    "vol 6",
  ]);
});

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
});
