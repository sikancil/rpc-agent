export const schema = {
  input: {
    get: {},
    toUnixTimestamp: {
      date: {
        type: "Date",
        description: "Date to convert to Unix timestamp",
      },
    },
  },
  output: {
    get: {
      date: {
        type: "Date",
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
    toUnixTimestamp: {
      timestamp: {
        type: "number",
        description: "Returns the Unix timestamp of the given date",
      },
    },
  },
  exanple: {
    get: {
      shell: `echo '{"jsonrpc":"2.0","method":"date.get","params":{},"id":1}' | nc --tcp localhost 9101`,
      node: `node -e "const net = require('net'); const client = new net.Socket(); client.connect(9101, 'localhost', () => { client.write(JSON.stringify({jsonrpc: '2.0', method: 'date.get', params: {}, id: Date.now()}) + '\\n'); }); client.on('data', (data) => { console.log(data.toString()); client.destroy(); });"`,
    },
    toUnixTimestamp: {
      shell: `echo '{"jsonrpc":"2.0","method":"date.toUnixTimestamp","params":[{"date":"2023-01-01"}],"id":1}' | nc --tcp localhost 9101`,
      node: `node -e "const net = require('net'); const client = new net.Socket(); client.connect(9101, 'localhost', () => { client.write(JSON.stringify({jsonrpc: '2.0', method: 'date.toUnixTimestamp', params: {date: new Date().toISOString()}, id: Date.now()}) + '\\n'); }); client.on('data', (data) => { console.log(data.toString()); client.destroy(); });"`,
    },
  },
}
