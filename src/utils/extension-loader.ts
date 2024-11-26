/**
 * Extension Loader - Dynamic RPC extension loading utility
 * @packageDocumentation
 */

import fs, { promises as fsPromises } from "node:fs"
import * as path from "node:path"
import { logger } from "./logger"
import { Extension } from "../interfaces"

/**
 * Load extensions from a directory
 * @param extensionPath - Path to extensions directory
 * @returns Promise<Map<string, Extension>> - Map of loaded extensions
 *
 * @workflow
 * 1. Scan extension directory
 * 2. Load each extension
 * 3. Validate extension format
 * 4. Initialize extension
 *
 * @validation
 * - Extension format
 * - Required methods
 * - Method signatures
 * - Extension metadata
 *
 * @error-handling
 * - Invalid extension format
 * - Missing required methods
 * - Initialization failures
 */
export async function loadExtensions(extensionPath: string | undefined = undefined): Promise<Map<string, Extension>> {
  const extensions: Map<string, Extension> = new Map()

  // Use src/rpcs in development mode with ts-node, dist/rpcs in production
  const isUserDevelopment = process.argv.some((arg) => arg.includes("ts-node"))
  const isDevelopment = __filename.endsWith(".ts")

  const extensionsDirBase = path.join(__dirname, "../../", isDevelopment ? "src" : "dist", "rpcs")
  const extensionsDirUser = extensionPath ? path.join(process.cwd(), extensionPath || "rpcs") : undefined
  logger.debug(`Loading extensions from ${extensionsDirBase}`, { isDevelopment })
  logger.debug(`Loading extensions from ${extensionsDirUser}`, { isDevelopment })

  try {
    const entriesBase = await fsPromises.readdir(extensionsDirBase, { withFileTypes: true })
    const entriesUser = extensionsDirUser ? await fsPromises.readdir(extensionsDirUser, { withFileTypes: true }) : []
    const entries = [...entriesBase, ...entriesUser]

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const extensionPath = entriesBase.find((e) => e.name === entry.name)?.name
        ? path.join(extensionsDirBase, entry.name)
        : extensionsDirUser
          ? path.join(extensionsDirUser, entry.name)
          : undefined

      // Use .ts extension during development mode, .js for built mode
      const baseFileExtension = isDevelopment ? ".ts" : ".js"
      const userFileExtension = isUserDevelopment ? ".ts" : ".js"
      const baseIndexFile = path.join(extensionPath || `${__dirname}/../../`, `index${baseFileExtension}`)
      const userIndexFile = extensionsDirUser
        ? path.join(
            extensionPath?.includes(extensionsDirUser)
              ? extensionPath
              : path.resolve(process.cwd(), extensionsDirUser || ""),
            `index${userFileExtension}`,
          )
        : undefined

      const indexFile = entriesBase.find((e) => e.name === entry.name)?.name ? baseIndexFile : userIndexFile
      logger.debug(`Checking extension file: ${indexFile}`)

      if (!indexFile || !fs.existsSync(indexFile)) {
        logger.warning(`No index file found in extension: ${entry.name}`)
        continue
      }

      try {
        // Check if the index file exists
        await fsPromises.access(indexFile)

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
      paths: { base: extensionsDirBase, user: extensionsDirUser },
    })
    return new Map()
  }
}
