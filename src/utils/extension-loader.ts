import * as fs from "node:fs/promises"
import * as path from "node:path"
import { Extension } from "../interfaces/extension.interface"
import { logger } from "./logger"

export async function loadExtensions(): Promise<Map<string, Extension>> {
  const extensions: Map<string, Extension> = new Map()
  // Use src/rpcs in development mode with ts-node, dist/rpcs in production
  const isDevelopment = process.argv.some((arg) => arg.includes("ts-node"))
  const extensionsDir = path.join(process.cwd(), isDevelopment ? "src" : "dist", "rpcs")
  logger.debug(`Loading extensions from ${extensionsDir}`, { isDevelopment })

  try {
    const entries = await fs.readdir(extensionsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const extensionPath = path.join(extensionsDir, entry.name)
      // Use .ts extension in development mode, .js in production
      const indexFile = path.join(extensionPath, `index${isDevelopment ? ".ts" : ".js"}`)
      logger.debug(`Checking extension file: ${indexFile}`)

      try {
        // Check if the index file exists
        await fs.access(indexFile)

        // Import the extension class
        let ExtensionModule
        try {
          ExtensionModule = await import(indexFile)
        } catch (importError) {
          logger.error(`Failed to import extension ${entry.name}:`, {
            error: importError instanceof Error ? importError.message : String(importError),
            stack: importError instanceof Error ? importError.stack : undefined,
            path: indexFile,
          })
          continue
        }

        const ExtensionClass = ExtensionModule.default

        if (!ExtensionClass) {
          logger.warning(`No default export found in extension: ${entry.name}`)
          continue
        }

        let extension: Extension
        try {
          extension = new ExtensionClass()
        } catch (constructError) {
          logger.error(`Failed to instantiate extension ${entry.name}:`, {
            error: constructError instanceof Error ? constructError.message : String(constructError),
            stack: constructError instanceof Error ? constructError.stack : undefined,
          })
          continue
        }

        // Validate extension
        if (!extension.name || !extension.methods) {
          logger.warning(`Invalid extension format: ${entry.name}`)
          continue
        }

        // Validate methods
        if (typeof extension.methods !== "object") {
          logger.warning(`Invalid methods format in extension: ${entry.name}`)
          continue
        }

        logger.info(`Successfully loaded extension: ${entry.name}`)
        extensions.set(entry.name, extension)
      } catch (error) {
        logger.error(`Failed to load extension ${entry.name}:`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          path: indexFile,
        })
      }
    }

    return extensions
  } catch (error) {
    logger.error("Failed to read extensions directory:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      path: extensionsDir,
    })
    return new Map()
  }
}
