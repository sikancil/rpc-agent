/* eslint-disable @typescript-eslint/no-explicit-any */
import * as path from "node:path"
import * as fs from "node:fs"
import * as ts from "typescript"
import { ExtensionSchema, SchemaMethod } from "../interfaces"

/**
 * Schema Generator for RPC Extensions
 * Generates TypeScript schema files for RPC methods to enable type safety and documentation
 *
 * @class SchemaGenerator
 * @description
 * This class analyzes TypeScript source files to generate schema definitions for RPC methods.
 * It extracts method signatures, parameters, and return types to create comprehensive schema files.
 *
 * @example
 * const generator = new SchemaGenerator()
 * await generator.generateSchema('./src/rpcs/my-extension/index.ts')
 */
export class SchemaGenerator {
  private sourceFile: ts.SourceFile | undefined
  private program: ts.Program | undefined

  /**
   * Initialize the TypeScript program and source file
   * @param entryPointPath Path to the extension's entry point file
   */
  private initialize(entryPointPath: string): void {
    const configPath = ts.findConfigFile(path.dirname(entryPointPath), ts.sys.fileExists, "tsconfig.json")

    if (!configPath) {
      throw new Error("Could not find a valid tsconfig.json.")
    }

    const { config } = ts.readConfigFile(configPath, ts.sys.readFile)
    const { options } = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(configPath))

    this.program = ts.createProgram([entryPointPath], options)
    this.sourceFile = this.program.getSourceFile(entryPointPath)

    if (!this.sourceFile) {
      throw new Error(`Could not load source file: ${entryPointPath}`)
    }
  }

  /**
   * Generates schema for an extension
   * @param entryPointPath - Path to the extension's index.ts file
   * @returns Promise<void>
   *
   * @workflow
   * 1. Read and parse TypeScript source
   * 2. Extract method information
   * 3. Generate schema content
   * 4. Write schema file
   *
   * @integration
   * - Works with Extension interface implementations
   * - Creates schema.ts in same directory as source
   * - Supports method parameter and return type extraction
   *
   * @tips
   * - Ensure source file has proper TypeScript annotations
   * - Method parameters should be properly typed
   * - Return types should be explicitly defined
   */
  public generateSchema(entryPointPath: string): void {
    this.initialize(entryPointPath)
    if (!this.sourceFile || !this.program) {
      throw new Error("Source file or program not initialized")
    }

    const schema: ExtensionSchema = {}
    const checker = this.program.getTypeChecker()

    // Visit each node in the source file
    ts.forEachChild(this.sourceFile, (node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        const symbol = checker.getSymbolAtLocation(node.name)
        if (symbol) {
          this.processClassMethods(node, schema)
        }
      }
    })

    // Generate schema file content
    const schemaPath = path.join(path.dirname(entryPointPath), "schema.ts")
    const schemaContent = this.generateSchemaFileContent(schema)
    console.log(`Writing schema to ${schemaPath}`)
    fs.writeFileSync(schemaPath, schemaContent)
  }

  /**
   * Process class methods to extract schema information
   * @param classNode Class declaration node
   * @param schema Schema object to populate
   *
   * @complexity
   * This method uses TypeScript's AST (Abstract Syntax Tree) to:
   * 1. Find class declarations
   * 2. Extract method signatures
   * 3. Parse parameter types
   * 4. Generate example usage
   *
   * @tips
   * - Methods must be properly typed
   * - Parameter destructuring is supported
   * - Async methods are handled automatically
   */
  private processClassMethods(classNode: ts.ClassDeclaration, schema: ExtensionSchema): void {
    console.log("Processing class:", classNode.name?.text)

    classNode.members.forEach((member) => {
      if (ts.isPropertyDeclaration(member) && member.name.getText() === "methods") {
        console.log("Found methods property")

        if (member.initializer && ts.isObjectLiteralExpression(member.initializer)) {
          console.log("Methods is an object literal with", member.initializer.properties.length, "properties")

          member.initializer.properties.forEach((prop) => {
            console.log("Property kind:", ts.SyntaxKind[prop.kind])

            if (ts.isPropertyAssignment(prop)) {
              console.log("Property name:", prop.name.getText())
              console.log("Property initializer kind:", ts.SyntaxKind[prop.initializer.kind])

              const methodName = prop.name.getText()
              console.log("Found method:", methodName)

              const typeChecker = this.program!.getTypeChecker()
              const type = typeChecker.getTypeAtLocation(prop.initializer)
              console.log("Method type:", typeChecker.typeToString(type))

              if (
                ts.isArrowFunction(prop.initializer) ||
                ts.isFunctionExpression(prop.initializer) ||
                ts.isMethodDeclaration(prop.initializer)
              ) {
                const signature = typeChecker.getSignatureFromDeclaration(prop.initializer)
                console.log("Signature:", signature ? "Found" : "Not found")

                if (signature) {
                  console.log(
                    "Parameters:",
                    signature.getParameters().map((p) => p.name),
                  )
                  console.log("Return type:", typeChecker.typeToString(typeChecker.getReturnTypeOfSignature(signature)))

                  const methodSchema: SchemaMethod = {
                    input: this.extractMethodInputSchema(signature, prop.initializer),
                    output: this.extractMethodOutputSchema(signature, prop.initializer),
                    example: {
                      shell: `echo '{"jsonrpc":"2.0","method":"${methodName}","params":{},"id":1}' | nc --tcp localhost 9101`,
                      node: `node -e "const net = require('net'); const client = new net.Socket(); client.connect(9101, 'localhost', () => { client.write(JSON.stringify({jsonrpc: '2.0', method: '${methodName}', params: {}, id: Date.now()}) + '\\n'); }); client.on('data', (data) => { console.log(data.toString()); client.destroy(); });"`,
                    },
                  }
                  console.log("Method schema:", Object.keys(methodSchema).join(", "))
                  schema[methodName] = methodSchema
                } else {
                  console.log("No signature found for method:", methodName)
                }
              }
            } else if (ts.isMethodDeclaration(prop)) {
              const methodName = prop.name.getText()
              console.log("Found method:", methodName)

              const typeChecker = this.program!.getTypeChecker()
              const type = typeChecker.getTypeAtLocation(prop)
              console.log("Method type:", typeChecker.typeToString(type))

              const signature = typeChecker.getSignatureFromDeclaration(prop)
              console.log("Signature:", signature ? "Found" : "Not found")

              if (signature) {
                console.log(
                  "Parameters:",
                  signature.getParameters().map((p) => p.name),
                )
                console.log("Return type:", typeChecker.typeToString(typeChecker.getReturnTypeOfSignature(signature)))

                const methodSchema: SchemaMethod = {
                  input: this.extractMethodInputSchema(signature, prop),
                  output: this.extractMethodOutputSchema(signature, prop),
                  example: {
                    shell: `echo '{"jsonrpc":"2.0","method":"${methodName}","params":{},"id":1}' | nc --tcp localhost 9101`,
                    node: `node -e "const net = require('net'); const client = new net.Socket(); client.connect(9101, 'localhost', () => { client.write(JSON.stringify({jsonrpc: '2.0', method: '${methodName}', params: {}, id: Date.now()}) + '\\n'); }); client.on('data', (data) => { console.log(data.toString()); client.destroy(); });"`,
                  },
                }
                console.log("Method schema:", Object.keys(methodSchema).join(", "))
                schema[methodName] = methodSchema
              } else {
                console.log("No signature found for method:", methodName)
              }
            }
          })
        }
      }
    })
  }

  /**
   * Extract input schema from method definition
   * @param signature Method signature
   * @param methodNode Method node
   * @returns Object containing parameter type information
   *
   * @complexity
   * Handles complex TypeScript types including:
   * - Interface types
   * - Union types
   * - Intersection types
   * - Generic types
   *
   * @tips
   * - Use simple types when possible
   * - Document complex types with interfaces
   * - Avoid 'any' type usage
   */
  private extractMethodInputSchema(signature: ts.Signature, methodNode: ts.Node): Record<string, any> {
    const typeChecker = this.program!.getTypeChecker()
    const parameters = signature.getParameters()

    if (parameters.length === 0) {
      return {}
    }

    const firstParam = parameters[0]
    const paramType = typeChecker.getTypeOfSymbolAtLocation(firstParam, methodNode)
    const properties = paramType.getProperties()

    const inputSchema: Record<string, any> = {}
    properties.forEach((prop) => {
      const propType = typeChecker.getTypeOfSymbolAtLocation(prop, methodNode)
      const typeString = typeChecker.typeToString(propType)

      inputSchema[prop.name] = {
        type: this.mapTypeScriptTypeToSchemaType(typeString),
        description: `Parameter ${prop.name}`,
        required: true,
      }
    })

    return inputSchema
  }

  /**
   * Extract output schema from method definition
   * @param signature Method signature
   * @param methodNode Method node
   * @returns Object containing return type information
   *
   * @complexity
   * Handles complex TypeScript types including:
   * - Interface types
   * - Union types
   * - Intersection types
   * - Generic types
   *
   * @tips
   * - Use simple types when possible
   * - Document complex types with interfaces
   * - Avoid 'any' type usage
   */
  private extractMethodOutputSchema(signature: ts.Signature, methodNode: ts.Node): Record<string, any> {
    const typeChecker = this.program!.getTypeChecker()
    const returnType = typeChecker.getReturnTypeOfSignature(signature)

    // Handle Promise type
    let resolvedType = returnType
    if (returnType.symbol?.name === "Promise") {
      const typeArguments = (returnType as ts.TypeReference).typeArguments
      if (typeArguments && typeArguments.length > 0) {
        resolvedType = typeArguments[0]
      }
    }

    const properties = resolvedType.getProperties()
    const outputSchema: Record<string, any> = {}

    properties.forEach((prop) => {
      const propType = typeChecker.getTypeOfSymbolAtLocation(prop, methodNode)
      const typeString = typeChecker.typeToString(propType)

      outputSchema[prop.name] = {
        type: this.mapTypeScriptTypeToSchemaType(typeString),
        description: `Output ${prop.name}`,
      }
    })

    return outputSchema
  }

  /**
   * Map TypeScript types to schema types
   * @param tsType TypeScript type string
   * @returns Schema type string
   *
   * @complexity
   * Handles mapping of:
   * - Primitive types
   * - Object types
   * - Array types
   * - Enum types
   *
   * @tips
   * - Use consistent type naming
   * - Avoid using 'any' type
   * - Document complex types
   */
  private mapTypeScriptTypeToSchemaType(tsType: string): string {
    const cleanType = tsType.toLowerCase().trim()
    if (cleanType.includes("number")) return "number"
    if (cleanType.includes("string")) return "string"
    if (cleanType.includes("boolean")) return "boolean"
    if (cleanType.includes("date")) return "string"
    if (cleanType.includes("array")) return "array"
    if (cleanType === "any" || cleanType === "unknown") return "any"
    return "object"
  }

  /**
   * Generate schema file content
   * @param schema The schema object
   * @returns string - Generated TypeScript code
   *
   * @workflow
   * 1. Format schema object
   * 2. Generate TypeScript imports
   * 3. Create schema constant
   * 4. Format code with proper indentation
   *
   * @tips
   * - Schema is formatted for readability
   * - Imports are automatically managed
   * - Code style matches project conventions
   */
  private generateSchemaFileContent(schema: ExtensionSchema): string {
    const formatValue = (value: any, indent: number = 2): string => {
      if (typeof value === "string") {
        // Escape quotes and backticks in strings
        const escaped = value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, "\\n")
        return `'${escaped}'`
      } else if (typeof value === "object" && value !== null) {
        const spaces = " ".repeat(indent)
        const entries = Object.entries(value)
        if (entries.length === 0) return "{}"

        return `{
${entries.map(([key, val]) => `${spaces}${key}: ${formatValue(val, indent + 2)}`).join(",\n")}
${" ".repeat(indent - 2)}}`
      }
      return String(value)
    }

    return `import { ExtensionSchema } from "@arifwidianto/rpc-agent"

export const schema: ExtensionSchema = ${formatValue(schema)}
`
  }
}
