import { ExtensionSchema } from "../../interfaces"

export const schema: ExtensionSchema = {
  validatePort: {
    input: {
      port: {
        type: "number",
        description: "Port number to validate",
      },
      type: {
        type: "string",
        enum: ["TCP", "UDP"],
        description: "Type of port (TCP or UDP)",
      },
    },
    output: {
      valid: {
        type: "boolean",
        description: "Whether the port is valid",
      },
      port: {
        type: "number",
        description: "The validated port number",
      },
      type: {
        type: "string",
        enum: ["TCP", "UDP"],
        description: "Type of port (TCP or UDP)",
      },
    },
    example: {
      shell: `echo '{"jsonrpc":"2.0","method":"network.validatePort","params":{"port":8080,"type":"TCP"},"id":1}' | nc --tcp localhost 9101`,
      node: `node -e "const net = require('net'); const client = new net.Socket(); client.connect(9101, 'localhost', () => { client.write(JSON.stringify({jsonrpc: '2.0', method: 'network.validatePort', params: {port: 8080, type: 'TCP'}, id: Date.now()}) + '\\n'); }); client.on('data', (data) => { console.log(data.toString()); client.destroy(); });"`,
    },
  },
}
