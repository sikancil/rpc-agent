export interface SchemaProperty {
  type: string
  description: string
  required?: boolean
  items?: SchemaProperty
  properties?: { [key: string]: SchemaProperty }
  enum?: (string | number)[]
  additionalProperties?: SchemaProperty | boolean
  [key: string]: unknown
}

export interface SchemaMethod {
  input: { [key: string]: SchemaProperty }
  output: { [key: string]: SchemaProperty }
  example: {
    shell?: string
    node?: string
    [key: string]: string | undefined
  }
}

export type DynamicSchema = Record<string, SchemaMethod | SchemaProperty>
