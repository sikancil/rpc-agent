export const schema = {
  input: {
    status: {},
  },
  output: {
    status: {
      status: {
        type: "string",
        description: "Current server status",
      },
      uptime: {
        type: "number",
        description: "Server uptime in seconds",
      },
      tcpPort: {
        type: "number",
        description: "TCP port number",
      },
      udpPort: {
        type: "number",
        description: "UDP port number",
      },
      tcpConnections: {
        type: "number",
        description: "Number of active TCP connections",
      },
      totalRequests: {
        type: "object",
        description: "Total number of requests processed",
        properties: {
          tcp: {
            type: "number",
            description: "Total TCP requests",
          },
          udp: {
            type: "number",
            description: "Total UDP requests",
          },
        },
      },
      timestamp: {
        type: "string",
        description: "Current server timestamp in ISO 8601 format",
      },
    },
  },
  example: {
    status: {
      shell: `echo '{"jsonrpc":"2.0","method":"server.status","params":{},"id":1}' | nc --tcp localhost 9101`,
      node: `node -e "const net = require('net'); const client = new net.Socket(); client.connect(9101, 'localhost', () => { client.write(JSON.stringify({jsonrpc: '2.0', method: 'server.status', params: {}, id: Date.now()}) + '\\n'); }); client.on('data', (data) => { console.log(data.toString()); client.destroy(); });"`,
    },
  },
}
