import { Extension, ExtensionMetadata } from "../../interfaces/extension.interface"

export interface StatusResponse {
  name: string
  status: string
  metadata: ExtensionMetadata
  uptime: number
  methods: string[]
}

export interface ListExtensionsResponse {
  extensions: Partial<Extension>[]
  total: number
}

export interface GetExtensionArguments {
  name: string
}

export interface GetExtensionResponse {
  extension: ExtensionMetadata
}
