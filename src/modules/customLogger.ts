import { config } from "../../package.json";

export class CustomLogger {
  static log(
    message: any,
    type?: "error" | "warning" | "exception" | "strict",
    sourceName?: string
  ) {
    let customMessage = `[${(new Date()).toLocaleString("en-GB")}] ${message}`;
    let customSourceName = config.addonInstance;
    if (sourceName !== undefined)
      customSourceName += `: ${sourceName}`;
    Zotero.log(customMessage, type, customSourceName);
  }
}