import { FileScanner } from "../src/utils/fs_scanner.ts";
import { assertSnapshot } from "std/testing/snapshot.ts";
import { assertEquals } from "std/assert/mod.ts";

Deno.test("Scan directories", async (t) => {
  const scanner = new FileScanner(
    ["./tests/test-dir"],
  );
  const books = await scanner.run();

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
