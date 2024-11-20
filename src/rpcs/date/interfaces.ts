export interface DateGetArguments {
  // Empty arguments
}

export interface DateGetResponse {
  date: Date
  timestamp: number
  iso8601: string
}

export interface DateToUnixTimestampArguments {
  date: Date | string | number | undefined
}

export interface DateToUnixTimestampResponse {
  timestamp: number
}
