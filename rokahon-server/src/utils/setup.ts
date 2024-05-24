import { ConfigManager } from "./types.ts";
import Logger from "logger";

export const logger = new Logger();
export const config = new ConfigManager().get();
