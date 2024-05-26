import { Application } from "oak";
import { config, logger } from "./utils/setup.ts";
import { libraryRouter } from "./routes/library.ts";
import { resourcesRouter } from "./routes/resources.ts";

const app = new Application();

app.use(async (ctx, next) => {
  logger.info("Req ::", ctx.request.url.href, ctx.request.userAgent.browser);
  await next();
});

app.use(libraryRouter.routes());

app.use(resourcesRouter.routes());

logger.info(`Server running at http://localhost:${config.PORT}`);
await app.listen({ port: config.PORT });
