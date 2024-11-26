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

export default class {className} implements Extension {
  readonly name = "{extensionName}"
  readonly status: ExtensionStatus = "active" as const
  readonly config: ExtensionConfig = { enabled: true }
  readonly metadata: ExtensionMetadata = {
    name: this.name,
    version: "1.0.0",
    author: "RPC Agent",
    description: "{extensionDescription}",
  }

  methods: Record<string, ExtensionMethod> = {
    async sum(args: { a: number; b: number }): Promise<{ result: number }> {
      const { a, b } = args;
      return { result: a + b };
    }
  }
}`

/**
 * Generates a new extension with the specified name in the target directory
 * @param extensionsDir - Directory where the extension will be created
 * @param extensionName - Name of the extension (will be converted to PascalCase for class name)
 * @returns Promise<string> - Path to the generated extension
 *
 * @example
 * // Creates a new extension 'my-feature' in './src/rpcs'
 * await generateNewExtension('./src/rpcs', 'my-feature')
 * // Results in class MyFeatureExtension in ./src/rpcs/my-feature/index.ts
 *
 * @throws {Error} If directory creation or file writing fails
 */
async function generateNewExtension(extensionsDir: string, extensionName: string): Promise<string> {
  const extensionDirPath = path.join(process.cwd(), extensionsDir, extensionName)
  const indexFilePath = path.join(extensionDirPath, "index.ts")

  try {
    // Create extension directory
    await fs.ensureDir(extensionDirPath)

    // Create index.ts with template
    // convert to PascalCase (each word starts with a capital letter)
    const className = extensionName
      .split("-")
      .reduce((acc: string[], word: string) => {
        if (word.includes("-")) {
          acc.push(...word.split("-"))
        } else {
          acc.push(word)
        }
        return acc
      }, [])
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("")
      .concat("Extension")
    const extensionDescription = `Place the ${className} (${extensionName}) description here.`
    const extensionContent = DEFAULT_EXTENSION_TEMPLATE.replace("{className}", `${className}`)
      .replace("{extensionName}", extensionName)
      .replace("{extensionDescription}", extensionDescription)
    await fs.writeFile(indexFilePath, extensionContent)

    console.log(`✅ Successfully generated extension "${extensionName}" at ${extensionDirPath}`)
    return extensionDirPath
  } catch (error) {
    console.error("❌ Error generating extension:", error)
    process.exit(1)
  }
}

/**
 * Prompts user for extension entry point path
 * @returns Promise<string> - Resolved absolute path to the extension entry point
 *
 * @example
 * const entryPath = await promptForExtensionPath()
 * // User will be prompted with default "./src/rpcs/index.ts"
 *
 * @tips
 * - Default path is set to "./src/rpcs/index.ts"
 * - Only accepts TypeScript (.ts) files
 */
async function promptForExtensionPath(): Promise<string> {
  const { extensionPath } = await inquirer.prompt<{ extensionPath: string }>([
    {
      type: "input",
      name: "extensionPath",
      message: "Enter extension entry point path (index.ts):",
      default: "./src/rpcs/index.ts",
      validate: (input: string): string | boolean => {
        if (!input.endsWith(".ts")) {
          return "Extension entry point must be a TypeScript file"
        }
        return true
      },
    },
  ])
  return path.resolve(process.cwd(), extensionPath)
}

/**
 * Prompts for extension details if not provided
 * @param defaultDir - Optional default directory path
 * @param defaultName - Optional default extension name
 * @returns Promise<{dir: string, name: string}> - Directory and name for the extension
 *
 * @example
 * // With no defaults - will prompt for both
 * const details = await promptForExtensionDetails()
 *
 * // With directory provided - will only prompt for name
 * const details = await promptForExtensionDetails('./src/rpcs')
 *
 * // With both provided - no prompts
 * const details = await promptForExtensionDetails('./src/rpcs', 'my-feature')
 *
 * @tips
 * - Directory defaults to "./src/rpcs"
 * - Extension names must be kebab-case (e.g., 'my-feature')
 * - Will be converted to PascalCase for class name (e.g., MyFeatureExtension)
 */
async function promptForExtensionDetails(
  defaultDir?: string,
  defaultName?: string,
): Promise<{ dir: string; name: string }> {
  const questions = []

  if (!defaultDir) {
    questions.push({
      type: "input",
      name: "extensionsDir",
      message: "Enter extensions directory path:",
      default: "./src/rpcs",
    })
  }

  if (!defaultName) {
    questions.push({
      type: "input",
      name: "extensionName",
      message: "Enter extension name:",
      validate: (input: string): string | boolean => {
        if (!input.match(/^[a-zA-Z0-9-]+$/)) {
          return "Extension name can only contain letters, numbers, and hyphens"
        }
        return true
      },
    })
  }

  const answers = await inquirer.prompt(questions)

  return {
    dir: defaultDir || answers.extensionsDir,
    name: defaultName || answers.extensionName,
  }
}

/**
 * Generates schema for an extension
 * @param extensionPath - Path to the extension's index.ts file
 * @returns Promise<void>
 *
 * @example
 * await generateSchema('./src/rpcs/my-feature/index.ts')
 *
 * @integration
 * - Uses SchemaGenerator from utils/schema-generator
 * - Creates schema.ts in the same directory as index.ts
 * - Schema is used for RPC method validation and documentation
 *
 * @tips
 * - Run this after creating or modifying extension methods
 * - Schema includes method signatures and examples
 * - Helps with client-side type checking
 */
async function generateSchema(extensionPath: string): Promise<void> {
  try {
    const generator = new SchemaGenerator()
    await generator.generateSchema(extensionPath)
    console.log("✅ Schema generated successfully!")
  } catch (error) {
    console.error("❌ Failed to generate schema:", error)
    process.exit(1)
  }
}

/**
 * Handles the generate-schema command
 * @param args - Command line arguments
 * @returns Promise<void>
 *
 * @example
 * // With path
 * await handleGenerateSchema(['./src/rpcs/my-feature/index.ts'])
 *
 * // Without path - will prompt
 * await handleGenerateSchema([])
 *
 * @workflow
 * 1. Check for provided path argument
 * 2. If not provided, prompt user for path
 * 3. Generate schema using provided/prompted path
 * 4. Log success or error
 */
async function handleGenerateSchema(args: string[]): Promise<void> {
  let extensionPath: string

  if (args.length >= 1) {
    extensionPath = path.resolve(process.cwd(), args[0])
    console.log("Using provided extension path:", extensionPath)
  } else {
    extensionPath = await promptForExtensionPath()
  }

  await generateSchema(extensionPath)
}

/**
 * Handles the generate-extension command
 * @param args - Command line arguments [directory?, name?]
 * @returns Promise<void>
 *
 * @example
 * // With both directory and name
 * await handleGenerateExtension(['./src/rpcs', 'my-feature'])
 *
 * // With only directory
 * await handleGenerateExtension(['./src/rpcs'])
 *
 * // Without arguments - will prompt for both
 * await handleGenerateExtension([])
 *
 * @workflow
 * 1. Parse directory and name from args if provided
 * 2. Prompt for missing details
 * 3. Generate extension
 * 4. Optionally generate schema
 *
 * @integration
 * - Creates extension directory structure
 * - Generates index.ts with extension class
 * - Optionally generates schema
 * - Follows naming conventions (kebab-case to PascalCase)
 */
async function handleGenerateExtension(args: string[]): Promise<void> {
  let extensionsDir: string | undefined
  let extensionName: string | undefined

  if (args.length >= 2) {
    extensionsDir = args[0]
    extensionName = args[1]
    console.log("Using provided directory and name:", { extensionsDir, extensionName })
  } else if (args.length === 1) {
    extensionsDir = args[0]
    console.log("Using provided directory:", extensionsDir)
  }

  const details = await promptForExtensionDetails(extensionsDir, extensionName)
  const extensionPath = await generateNewExtension(details.dir, details.name)

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

/**
 * Main CLI entry point
 * @returns Promise<void>
 *
 * @commands
 * - generate-extension (ge): Creates new extension
 * - generate-schema (gs): Generates schema for existing extension
 *
 * @workflow
 * 1. Parse command and arguments
 * 2. If command provided, execute specific handler
 * 3. If no command, show interactive menu
 * 4. Handle any errors and exit appropriately
 *
 * @integration
 * - Integrates with all CLI commands
 * - Provides interactive and command-line interfaces
 * - Handles error reporting and exit codes
 */
async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2)
    const command = args[0]?.toLowerCase()

    // Handle command-line arguments if provided
    if (command) {
      switch (command) {
        case "generate-extension":
        case "ge":
          await handleGenerateExtension(args.slice(1))
          break
        case "generate-schema":
        case "gs":
          await handleGenerateSchema(args.slice(1))
          break
        default:
          console.error("❌ Unknown command. Available commands: generate-extension (ge), generate-schema (gs)")
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
          { name: "Generate Extension", value: "generate-extension" },
          { name: "Generate Schema", value: "generate-schema" },
          { name: "Exit", value: "exit" },
        ],
      },
    ])

    switch (answers.action) {
      case "generate-extension":
        await handleGenerateExtension([])
        break
      case "generate-schema":
        await handleGenerateSchema([])
        break
      case "exit":
        console.log("👋 Goodbye!")
        break
    }
  } catch (error) {
    console.error("❌ An error occurred:", error)
    process.exit(1)
  }
}

main()
