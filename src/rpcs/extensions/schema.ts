import { ExtensionSchema } from "../../interfaces"

export const schema: ExtensionSchema = {
  list: {
    input: {},
    output: {
      extensions: {
        type: "array",
        description: "List of available extensions",
        items: {
          type: "object",
          description: "Extension details",
          properties: {
            name: { type: "string", description: "Extension name" },
            status: { type: "string", description: "Extension status" },
            metadata: { type: "object", description: "Extension metadata" },
          },
        },
      },
      total: {
        type: "number",
        description: "Total number of extensions",
      },
    },
    example: {
      shell: `echo '{"jsonrpc":"2.0","method":"extensions.list","params":{},"id":1}' | nc --tcp localhost 9101`,
      node: `node -e "const net = require('net'); const client = new net.Socket(); client.connect(9101, 'localhost', () => { client.write(JSON.stringify({jsonrpc: '2.0', method: 'extensions.list', params: {}, id: Date.now()}) + '\\n'); }); client.on('data', (data) => { console.log(data.toString()); client.destroy(); });"`,
    },
  },
  status: {
    input: {
      name: {
        type: "string",
        description: "Name of the extension",
      },
    },
    output: {
      extension: {
        type: "object",
        properties: {
          name: { type: "string", description: "Extension name" },
          status: { type: "string", description: "Extension status" },
          metadata: { type: "object", description: "Extension metadata" },
        },
        description: "Extension details",
      },
      uptime: {
        type: "number",
        description: "Extension uptime in milliseconds",
      },
      methods: {
        type: "array",
        items: {
          type: "string",
          description: "Method name",
        },
        description: "Available methods of the extension",
      },
    },
    example: {
      shell: `echo '{"jsonrpc":"2.0","method":"extensions.status","params":{"name":"echo"},"id":1}' | nc --tcp localhost 9101`,
      node: `node -e "const net = require('net'); const client = new net.Socket(); client.connect(9101, 'localhost', () => { client.write(JSON.stringify({jsonrpc: '2.0', method: 'extensions.status', params: {name: 'echo'}, id: Date.now()}) + '\\n'); }); client.on('data', (data) => { console.log(data.toString()); client.destroy(); });"`,
    },
  },
  register: {
    input: {
      extension: {
        type: "object",
        description: "Extension configuration",
      },
    },
    output: {},
    example: {
      shell: `echo '{"jsonrpc":"2.0","method":"extensions.register","params":{"extension":{}},"id":1}' | nc --tcp localhost 9101`,
      node: `node -e "const net = require('net'); const client = new net.Socket(); client.connect(9101, 'localhost', () => { client.write(JSON.stringify({jsonrpc: '2.0', method: 'extensions.register', params: {extension: {}}, id: Date.now()}) + '\\n'); }); client.on('data', (data) => { console.log(data.toString()); client.destroy(); });"`,
    },
  },
}
