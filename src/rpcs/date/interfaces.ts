export interface DateParseArguments {
  date: Date | string | number | undefined
}

interface DateTimeResponse {
  timestamp: string
  unix: number
  utc: string
  local: string
  timezone: string
}

export interface DateNowResponse extends DateTimeResponse {}

export interface DateParseResponse extends DateTimeResponse {}
