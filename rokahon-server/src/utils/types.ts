import { z } from "zod";
import * as path from "std/path/mod.ts";
import * as fs from "std/fs/mod.ts";
import { logger } from "./setup.ts";

const schema = z.object({
  VERSION: z.string(),
  PORT: z.number().int(),
  CACHE: z.boolean().default(true),
  LIBRARY_ROOT: z.array(z.string()),
});

/** `x.y` + `.extensionVerion` */
export const VERSION = "0.1.1";

const defaultConfig = schema.parse({
  VERSION,
  PORT: 1770,
  CACHE: true,
  LIBRARY_ROOT: [],
});

type Config = typeof defaultConfig;

export class ConfigManager {
  private readonly value: Config;
  static readonly LOOKUP_PATH = path.resolve("rokahon.json");

  constructor() {
    const filePath = ConfigManager.LOOKUP_PATH;
    logger.info(`Loading configuration at ${filePath}`);
    if (fs.existsSync(filePath)) {
      const content = Deno.readTextFileSync(filePath);
      this.value = JSON.parse(content);
    } else {
      const content = JSON.stringify(defaultConfig, null, 2);
      Deno.writeTextFileSync(filePath, content, { create: true });
      this.value = defaultConfig;
    }
    this.validate();
  }

  get(): Config {
    return this.value;
  }

  private validate() {
    try {
      schema.parse(this.value);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const issues = err.issues.map(({ message, path }) =>
          ` - ${message} at path ${path.join(".")}`
        );
        const filePath = ConfigManager.LOOKUP_PATH;
        throw Error(
          `Bad configuration ${filePath}:\n${issues.join("\n")}`,
        );
      } else {
        throw err;
      }
    }
  }
}

export interface Image {
  /** Absolute path to the image */
  path: string;
  /** Image size in bytes */
  ext: string;
  /** Identitfier */
  id: string;
}

export interface Page {
  number: number;
  image: Image;
}

export interface Chapter {
  title: string;
  pages: Array<Page>;
  path: string;
}

export interface Book {
  title: string;
  cover: Image;
  chapters: Array<Chapter>;
  authors: Array<string>;
  tags: Array<string>;
  path: string;
}

export interface SimplifiedChapter {
  title: string;
  id: string;
}

export type SimplifiedBook =
  & Pick<Book, Exclude<keyof Book, "chapters" | "path">>
  & {
    id: string;
    chapters: Array<SimplifiedChapter>;
  };
