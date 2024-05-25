import { z } from "zod";
import * as path from "std/path/mod.ts";
import * as fs from "std/fs/mod.ts";

const schema = z.object({
  PORT: z.number().int(),
  CACHE: z.boolean().default(true),
  LIBRARY_ROOT: z.array(z.string()),
});

const defaultConfig = schema.parse({
  PORT: 1770,
  CACHE: true,
  LIBRARY_ROOT: [],
});

type Config = typeof defaultConfig;

export class ConfigManager {
  private readonly value: Config;
  static readonly LOOKUP_PATH = path.resolve("rokahon.json");

  constructor() {
    const filepath = ConfigManager.LOOKUP_PATH;
    console.log(`Loading configuration`);
    if (fs.existsSync(filepath)) {
      const content = Deno.readTextFileSync(filepath);
      this.value = JSON.parse(content);
    } else {
      const content = JSON.stringify(defaultConfig, null, 2);
      Deno.writeTextFileSync(filepath, content, { create: true });
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
        const filepath = ConfigManager.LOOKUP_PATH;
        throw Error(
          `Bad configuration ${filepath}:\n${issues.join("\n")}`,
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
}

export interface Page {
  number: number;
  image: Image;
}

export interface Chapter {
  title: string;
  cover?: Image;
  pages: Array<Page>;
  path: string;
}

export interface Book {
  title: string;
  chapters: Array<Chapter>;
  authors: Array<string>;
  tags: Array<string>;
  path: string;
}
