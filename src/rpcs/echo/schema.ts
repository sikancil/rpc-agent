export const schema = {
  input: {
    echo: {
      message: {
        type: "string",
        description: "Message to echo",
      },
    },
  },
  output: {
    echo: {
      message: {
        type: "string",
        description: "Echoed message",
      },
    },
  },
  example: {
    echo: {
      shell: `echo '{"jsonrpc":"2.0","method":"echo.echo","params":{"message":"Hello, World!"},"id":1}' | nc --tcp localhost 9101`,
      node: `node -e "const net = require('net'); const client = new net.Socket(); client.connect(9101, 'localhost', () => { client.write(JSON.stringify({jsonrpc: '2.0', method: 'echo.echo', params: {message: 'Hello, World!'}, id: Date.now()}) + '\\n'); }); client.on('data', (data) => { console.log(data.toString()); client.destroy(); });"`,
    },
  },
}
