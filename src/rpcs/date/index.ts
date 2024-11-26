import { Extension, ExtensionConfig, ExtensionMetadata, ExtensionStatus, ExtensionMethod } from "../../interfaces"
import { DateParseArguments, DateNowResponse, DateParseResponse } from "./interfaces"

export default class DateExtension implements Extension {
  readonly name = "date"
  readonly status: ExtensionStatus = "active" as const
  readonly config: ExtensionConfig = { enabled: true }
  readonly metadata: ExtensionMetadata = {
    name: this.name,
    version: "1.0.0",
    description: "Date and time utilities",
  }

  private now: ExtensionMethod = async (): Promise<DateNowResponse> => {
    if (!this.config.enabled) {
      throw new Error("Extension is disabled")
    }

    const now = new Date()
    return {
      timestamp: now.toISOString(),
      unix: now.getTime(),
      utc: now.toUTCString(),
      local: now.toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
  }

  private parse: ExtensionMethod = async (params?: DateParseArguments | undefined): Promise<DateParseResponse> => {
    if (!this.config.enabled) {
      throw new Error("Extension is disabled")
    }

    const reqDate =
      params?.date instanceof Date
        ? params.date
        : typeof params?.date === "string" || typeof params?.date === "number"
          ? new Date(params.date)
          : undefined

    if (!reqDate || isNaN(reqDate.getTime())) {
      throw new Error(`Invalid date format: ${typeof params?.date}`)
    }

    return {
      timestamp: reqDate.toISOString(),
      unix: reqDate.getTime(),
      utc: reqDate.toUTCString(),
      local: reqDate.toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
  }

  methods: Record<string, ExtensionMethod> = {
    now: this.now,
    parse: this.parse,
  }
}
