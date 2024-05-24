import { Application } from "oak";
import { config, logger } from "./utils/setup.ts";

const app = new Application();

app.use((ctx) => {
  logger.info("Hello");
  ctx.response.body = "Hello world!";
});

await app.listen({ port: config.PORT });
