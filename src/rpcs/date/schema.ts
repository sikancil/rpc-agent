import { ExtensionSchema } from "../../interfaces/extension.interface"

export const schema: ExtensionSchema = {
  get: {
    input: {},
    output: {
      date: {
        type: "string",
        description: "Returns the current date",
      },
      timestamp: {
        type: "number",
        description: "Returns the current timestamp in milliseconds",
      },
      iso8601: {
        type: "string",
        description: "Returns the current date in ISO 8601 format",
      },
    },
    example: {
      shell: `echo '{"jsonrpc":"2.0","method":"date.get","params":{},"id":1}' | nc --tcp localhost 9101`,
      node: `node -e "const net = require('net'); const client = new net.Socket(); client.connect(9101, 'localhost', () => { client.write(JSON.stringify({jsonrpc: '2.0', method: 'date.get', params: {}, id: Date.now()}) + '\\n'); }); client.on('data', (data) => { console.log(data.toString()); client.destroy(); });"`,
    },
  },
  toUnixTimestamp: {
    input: {
      date: {
        type: "string",
        description: "Date to convert to Unix timestamp",
        required: true,
      },
    },
    output: {
      timestamp: {
        type: "number",
        description: "Returns the Unix timestamp of the given date",
      },
    },
    example: {
      shell: `echo '{"jsonrpc":"2.0","method":"date.toUnixTimestamp","params":{"date":"2022-01-01"},"id":1}' | nc --tcp localhost 9101`,
      node: `node -e "const net = require('net'); const client = new net.Socket(); client.connect(9101, 'localhost', () => { client.write(JSON.stringify({jsonrpc: '2.0', method: 'date.toUnixTimestamp', params: {date: '2022-01-01'}, id: Date.now()}) + '\\n'); }); client.on('data', (data) => { console.log(data.toString()); client.destroy(); });"`,
    },
  },
}
