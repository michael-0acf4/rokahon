import { Router } from "oak";
import { decodePath } from "../utils/utils.ts";
import * as path from "std/path/mod.ts";

/**
 * * `/image?id={value}`: Download image resource by Id
 */
export const resourcesRouter = new Router();

resourcesRouter.get("/image", async (ctx) => {
  const b64Id = ctx.request.url.searchParams.get("id");
  if (b64Id) {
    const canonPath = decodePath(b64Id);
    // TODO: handle case when the image has no extension
    const type = path.extname(canonPath).substring(1);
    const imageBuf = await Deno.readFile(canonPath);
    ctx.response.body = imageBuf;
    ctx.response.headers.set("Content-Type", `image/${type}`);
  } else {
    throw Error("Image 'id' not found in the parameter request");
  }
});
