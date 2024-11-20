import { RPCPlugin } from "../../interfaces/plugin.interface"
import { EchoArguments, EchoResponse } from "./interfaces"
import { schema } from "./schema"

export default class EchoPlugin implements RPCPlugin {
  name = "echo"
  version = "1.0"
  schema = schema

  private validateParams(params: any): params is EchoArguments {
    if (!params || typeof params !== "object") {
      throw new Error("Invalid params: must be an object")
    }

    if (!("message" in params)) {
      throw new Error('Invalid params: missing required parameter "message"')
    }

    if (typeof params.message !== "string") {
      throw new Error('Invalid params: "message" must be a string')
    }

    return true
  }

  methods = {
    echo: (params: any): EchoResponse => {
      // validateParams throws errors, no need to check return value
      this.validateParams(params)

      return { message: `📣 Echoing: ${params.message}` }
    },
  }
}
