import { RPCPlugins } from "../../interfaces/rpc.interface"
import {
  DateGetArguments,
  DateGetResponse,
  DateToUnixTimestampArguments,
  DateToUnixTimestampResponse,
} from "./interfaces"

export default class DatePlugin implements RPCPlugins {
  name = "date"
  version = "1.0"
  methods = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    get: function (_params: DateGetArguments): DateGetResponse {
      return {
        date: new Date(),
        timestamp: Date.now(),
        iso8601: new Date().toISOString(),
      }
    },
    toUnixTimestamp: function (params: DateToUnixTimestampArguments): DateToUnixTimestampResponse {
      const argIsString = typeof params.date === "string"
      const argIsNumber = typeof params.date === "number"
      const argIsDate = params.date instanceof Date
      return {
        timestamp: argIsDate
          ? (params?.date as Date)?.getTime?.()
          : argIsNumber
            ? (params.date as number)
            : argIsString
              ? new Date(params.date as string)?.getTime?.()
              : 0,
      }
    },
  }
}
