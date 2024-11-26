#!/usr/bin/env node

import inquirer from "inquirer"
import * as path from "path"
import * as fs from "fs-extra"
import { SchemaGenerator } from "./utils/schema-generator"

interface ExtensionPromptAnswers {
  action: "generate-extension" | "generate-schema" | "exit"
  extensionsDir?: string
  extensionName: string
  extensionPath?: string
}

const DEFAULT_EXTENSION_TEMPLATE = `import { Extension, ExtensionStatus, ExtensionConfig, ExtensionMetadata, ExtensionMethod } from "@arifwidianto/rpc-agent"

export default class MathService implements Extension {
  readonly name = "{extensionName}"
  readonly status: ExtensionStatus = "active" as const
  readonly config: ExtensionConfig = { enabled: true }
  readonly metadata: ExtensionMetadata = {
    name: this.name,
    version: "1.0.0",
    description: "Math utilities extension",
  }

  methods: Record<string, ExtensionMethod> = {
    async sum(args: { a: number; b: number }): Promise<{ result: number }> {
      const { a, b } = args;
      return { result: a + b };
    }
  }
}
`

async function generateNewExtension(extensionsDir: string, extensionName: string): Promise<string> {
  const extensionDirPath = path.join(process.cwd(), extensionsDir, extensionName)
  const indexFilePath = path.join(extensionDirPath, "index.ts")

  try {
    // Create extension directory
    await fs.ensureDir(extensionDirPath)

    // Create index.ts with template
    const extensionContent = DEFAULT_EXTENSION_TEMPLATE.replace("{extensionName}", extensionName)
    await fs.writeFile(indexFilePath, extensionContent)

    console.log(`✅ Successfully generated extension "${extensionName}" at ${extensionDirPath}`)
    return extensionDirPath
  } catch (error) {
    console.error("❌ Error generating extension:", error)
    process.exit(1)
  }
}

async function generateSchema(extensionPath: string): Promise<void> {
  try {
    const generator = new SchemaGenerator()
    generator.generateSchema(extensionPath)
    console.log("✅ Successfully generated schema at", extensionPath.replace("index.ts", "schema.ts"))
  } catch (error) {
    console.error("❌ Error generating schema:", error)
  }
}

async function promptForExtensionPath(): Promise<string> {
  const { extensionPath } = await inquirer.prompt<{ extensionPath: string }>([
    {
      type: "input",
      name: "extensionPath",
      message: "Enter path to extension index.ts file:",
      default: "./src/rpcs/console/index.ts",
      validate: (input: string): string | boolean => {
        if (!input.endsWith("index.ts")) {
          return "Path must point to an index.ts file"
        }
        return true
      },
    },
  ])
  return path.resolve(process.cwd(), extensionPath)
}

async function promptForExtensionDetails(defaultDir?: string): Promise<{ dir: string; name: string }> {
  const answers = await inquirer.prompt<{ extensionsDir: string; extensionName: string }>([
    {
      type: "input",
      name: "extensionsDir",
      message: "Enter extensions directory path:",
      default: defaultDir || "./extensions",
      when: !defaultDir,
    },
    {
      type: "input",
      name: "extensionName",
      message: "Enter extension name:",
      default: "new-extension",
      validate: (input: string): string | boolean => {
        if (!input.match(/^[a-zA-Z0-9-]+$/)) {
          return "Extension name can only contain letters, numbers, and hyphens"
        }
        return true
      },
    },
  ])
  return {
    dir: defaultDir || answers.extensionsDir,
    name: answers.extensionName,
  }
}

async function handleGenerateSchema(args: string[]): Promise<void> {
  const extensionPath = args[0] ? path.resolve(process.cwd(), args[0]) : await promptForExtensionPath()

  await generateSchema(extensionPath)
}

async function handleGenerateExtension(args: string[]): Promise<void> {
  let extensionsDir: string | undefined
  let extensionName: string | undefined

  if (args.length >= 2) {
    extensionsDir = args[0]
    extensionName = args[1]
  } else if (args.length === 1) {
    extensionsDir = args[0]
  }

  const details = await promptForExtensionDetails(extensionsDir)
  const extensionPath = await generateNewExtension(details.dir, extensionName || details.name)

  // Ask if user wants to generate schema for the new extension
  const { generateSchema: shouldGenerateSchema } = await inquirer.prompt<{ generateSchema: boolean }>([
    {
      type: "confirm",
      name: "generateSchema",
      message: "Would you like to generate a schema for this extension?",
      default: true,
    },
  ])

  if (shouldGenerateSchema) {
    await generateSchema(path.join(extensionPath, "index.ts"))
  }
}

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2)
    const command = args[0]?.toLowerCase()

    // Handle command-line arguments if provided
    if (command) {
      switch (command) {
        case "generate-schema":
        case "gs":
          await handleGenerateSchema(args.slice(1))
          break
        case "generate-extension":
        case "ge":
          await handleGenerateExtension(args.slice(1))
          break
        default:
          console.error("❌ Unknown command. Available commands: generate-schema (gs), generate-extension (ge)")
          process.exit(1)
      }
      return
    }

    // Interactive mode if no arguments provided
    const answers = await inquirer.prompt<ExtensionPromptAnswers>([
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { name: "Generate New Extension", value: "generate-extension" },
          { name: "Generate Extension Schema", value: "generate-schema" },
          { name: "Exit", value: "exit" },
        ],
      },
    ])

    if (answers.action === "exit") {
      console.log("👋 Goodbye!")
      process.exit(0)
    }

    if (answers.action === "generate-extension") {
      await handleGenerateExtension([])
    } else {
      await handleGenerateSchema([])
    }
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

main()
