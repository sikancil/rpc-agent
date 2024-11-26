# 🚀 RPC Agent: Making Distributed Systems Fun Again!

Hey there! Welcome to RPC Agent - where we're turning the complexity of RPC into something you'll actually enjoy working with. We built this because, let's face it, distributed systems shouldn't feel like rocket science (even though we love rockets 🚀).

## 💡 Why RPC Agent?

Ever wished your microservices could talk to each other as easily as you chat with your team? That's exactly why we created RPC Agent! It's a TypeScript-powered RPC framework that makes distributed systems feel less like a puzzle and more like a fun building block game.

Whether you're building the next big thing or just trying to get your services to play nice together, we've got your back with both TCP and UDP support. Because sometimes you need reliability, and sometimes you just need speed!

## ✨ Cool Stuff We've Packed In

* **Double the Protocol, Double the Fun!** 
  - TCP (port 9101) for when you need that rock-solid connection
  - UDP (port 9102) for when speed is your best friend
* **TypeScript All The Way!** Because we love catching bugs before they catch us 🐛
* **Mix and Match Architecture:**
  - Add your own RPC methods (the more, the merrier!)
  - Plug in different protocols (we're flexible like that)
  - Logging that actually tells you what's going on
* **Runs Everywhere:**
  - Node.js? Check! ✅
  - Shell scripts? You bet! 🐚
  - Windows, Mac, Linux? Triple check! 🖥️
* **Developer Happiness Kit:**
  - CLI tools that don't make you cry
  - Schema generation that just works
  - Testing that's actually enjoyable

## 💪 What Makes Us Special

* **We've Got Your Back:**
  - Graceful shutdowns (no crashes here!)
  - Error handling that makes sense
  - Logs you can actually understand
* **Speed Demon:**
  - Lightweight and fast (like a caffeinated developer)
  - Smart message handling
  - Async everything!
* **Safety First:**
  - Environment configs done right
  - Clean error messages
  - No unexpected surprises
* **Developer Experience FTW:**
  - Hot reload that's actually hot
  - npm scripts that make sense
  - Debugging that doesn't make you pull your hair out

## 🎯 What Can You Build?

* **Microservices That Work:**
  - Services that talk like best friends
  - Load balancing that doesn't play favorites
  - Health checks that actually check health
* **Client-Server Magic:**
  - Two-way communication (like a good conversation)
  - Multi-client support (the more the merrier)
  - Sessions that just work
* **Cool Dev Tools:**
  - CLI apps that cli-ck (see what we did there?)
  - Build tools that build
  - Testing that tests
* **System Magic:**
  - Shell scripts on steroids
  - Cross-process communication made easy
  - Network services that network

## 🚀 Let's Get This Party Started!

1. Grab the package:
```bash
npm install @arifwidianto/rpc-agent  # Your journey begins here!
```

2. Start your server (it's this easy):
```typescript
import { AgentService } from '@arifwidianto/rpc-agent';

const agent = new AgentService();
await agent.start();  // Magic happens here ✨
```

3. Connect from your client:
```typescript
import { AgentClient } from '@arifwidianto/rpc-agent';

const client = new AgentClient({
  host: 'localhost',
  port: 9101  // TCP party line 🎉
});
await client.init();
const response = await client.send('methodName', { param1: 'value1' });  // Talk to your server!
```

## 🔧 Developer's Playground

Make development fun with these commands:
* `npm run dev` - Watch the magic happen in real-time
* `npm run build` - Build something awesome
* `npm test` - Make sure awesome stays awesome
* `npm run format` - Make your code look pretty
* `npm run lint` - Keep your code clean and tidy

## 🖥️ Build For Everyone

Create binaries that run anywhere:
* `npm run deno:compile:linux-x64` - For our Linux friends
* `npm run deno:compile:linux-arm64` - For the ARM enthusiasts
* `npm run deno:compile:macos-x64` - For the Mac lovers
* `npm run deno:compile:macos-arm64` - For M1/M2 adventurers
* `npm run deno:compile:windows-x64` - For the Windows world

## ⚙️ Easy Peasy Configuration

Just set these in your .env and you're golden:
* `PORT_TCP` - Pick your TCP port (default: 9101)
* `PORT_UDP` - Choose your UDP port (default: 9102)

## 🤝 Join the Fun!

We love making RPC Agent better, and you can too! Here's how:

1. Fork it (yes, like a proper chef 👨‍🍳)
2. Create your feature branch (make it yours!)
3. Commit your changes (tell us what you did)
4. Push to the branch (ship it!)
5. Create a Pull Request (share the love!)

## 📄 License

MIT Licensed - because sharing is caring! See [LICENSE](LICENSE) for the legal stuff.

## 🔗 Find Us Around the Web

* **NPM:** [https://www.npmjs.com/package/@arifwidianto/rpc-agent](https://www.npmjs.com/package/@arifwidianto/rpc-agent)
* **GitHub:** [https://github.com/sikancil/rpc-agent](https://github.com/sikancil/rpc-agent)

---

Made with ❤️ by developers who believe coding should be fun!
