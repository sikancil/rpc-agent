import { ExtensionSchema } from "../../interfaces/extension.interface"

export const schema: ExtensionSchema = {
  echo: {
    input: {
      message: {
        type: "string",
        description: "Message to echo back",
        required: true,
        minLength: 1,
        maxLength: 1000,
      },
    },
    output: {
      message: {
        type: "string",
        description: "Echoed message",
      },
      timestamp: {
        type: "string",
        description: "ISO 8601 timestamp of when the message was echoed",
      },
    },
    example: {
      shell: `echo '{"jsonrpc":"2.0","method":"echo.echo","params":{"message":"Hello, World!"},"id":1}' | nc --tcp localhost 9101`,
      node: `node -e "const net = require('net'); const client = new net.Socket(); client.connect(9101, 'localhost', () => { client.write(JSON.stringify({jsonrpc: '2.0', method: 'echo.echo', params: {message: 'Hello, World!'}, id: Date.now()}) + '\\n'); }); client.on('data', (data) => { console.log(data.toString()); client.destroy(); });"`,
    },
  },
}
