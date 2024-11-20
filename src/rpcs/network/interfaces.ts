export interface ValidatePortArguments {
  port: number
  type: "TCP" | "UDP"
}

export interface ValidatePortResponse {
  valid: boolean
  port: number
  type: "TCP" | "UDP"
}
