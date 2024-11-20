export interface MethodSchema {
  // input: CommonObject
  input: {
    [key: string]: {
      [paramName: string]: {
        type: string
        description: string
      }
    }
  }
  output: {
    [key: string]: {
      [paramName: string]: {
        type: string
        description: string
      }
    }
  }
  example?: {
    [key: string]: {
      [paramName: string]: string
    }
  }
}

export interface RPCMethod {
  (params: any): Promise<any> | any
  schema?: MethodSchema
}

export interface RPCPlugin {
  name: string
  version: string
  methods: {
    [key: string]: RPCMethod
  }
}

export interface PluginRegistry {
  [key: string]: RPCPlugin
}
