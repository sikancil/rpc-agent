export interface EchoArguments {
  message: string // Required field
}

export interface EchoResponse {
  message: string
  timestamp: string
}

export interface PingResponse {
  pong: true
  timestamp: string
}
