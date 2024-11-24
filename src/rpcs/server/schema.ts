import { ExtensionSchema } from "../../interfaces/extension.interface"

export const schema: ExtensionSchema = {
  system: {
    input: {},
    output: {
      hostname: {
        type: "string",
        description: "Server hostname",
      },
      platform: {
        type: "string",
        description: "Server platform",
      },
      arch: {
        type: "string",
        description: "Server architecture",
      },
      cpus: {
        type: "array",
        description: "CPU information",
      },
      memory: {
        type: "object",
        description: "Memory information",
      },
      uptime: {
        type: "number",
        description: "Server uptime in seconds",
      },
      loadavg: {
        type: "array",
        description: "Load average information",
      },
    },
    example: {
      shell: `echo '{"jsonrpc":"2.0","method":"server.system","params":{},"id":1}' | nc --tcp localhost 9101`,
      node: `node -e "const net = require('net'); const client = new net.Socket(); client.connect(9101, 'localhost', () => { client.write(JSON.stringify({jsonrpc: '2.0', method: 'server.system', params: {}, id: Date.now()}) + '\\n'); }); client.on('data', (data) => { console.log(data.toString()); client.destroy(); });"`,
    },
  },
  process: {
    input: {},
    output: {
      pid: {
        type: "number",
        description: "Process ID",
      },
      uptime: {
        type: "number",
        description: "Process uptime in seconds",
      },
      memory: {
        type: "object",
        description: "Process memory usage",
      },
      cpu: {
        type: "object",
        description: "Process CPU usage",
      },
    },
    example: {
      shell: `echo '{"jsonrpc":"2.0","method":"server.process","params":{},"id":1}' | nc --tcp localhost 9101`,
      node: `node -e "const net = require('net'); const client = new net.Socket(); client.connect(9101, 'localhost', () => { client.write(JSON.stringify({jsonrpc: '2.0', method: 'server.process', params: {}, id: Date.now()}) + '\\n'); }); client.on('data', (data) => { console.log(data.toString()); client.destroy(); });"`,
    },
  },
}
