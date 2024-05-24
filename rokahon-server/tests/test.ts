Deno.test("example", async (t) => {
  await t.step("hello", async () => {
    console.log(await Promise.resolve("Hello World"));
  });
});
