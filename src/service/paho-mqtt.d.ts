// src/service/paho-mqtt.d.ts

export interface PahoMessageOptions {
  payloadString?: string;
  destinationName?: string;
  qos?: 0 | 1 | 2;
  retained?: boolean;
}

export class Message {
  payloadString: string;
  destinationName?: string;
  qos?: 0 | 1 | 2;
  retained?: boolean;

  constructor(payload: string);
}

export interface OnConnectionLostResponse {
  errorCode: number;
  errorMessage: string;
}

export interface ConnectOptions {
  onSuccess?: () => void;
  onFailure?: (err: { errorCode: number; errorMessage: string }) => void;
  userName?: string;
  password?: string;
  useSSL?: boolean;
  cleanSession?: boolean;
  reconnect?: boolean;
  timeout?: number;
}

export type OnMessageArrivedCallback = (message: Message) => void;
export type OnMessageDeliveredCallback = (message: Message) => void;
export type OnConnectedCallback = (reconnect: boolean, uri: string) => void;
export type OnConnectionLostCallback = (responseObject: OnConnectionLostResponse) => void;

export class Client {
  host: string;
  port: number;
  path: string;
  clientId: string;

  onConnectionLost: OnConnectionLostCallback | null;
  onMessageDelivered: OnMessageDeliveredCallback | null;
  onMessageArrived: OnMessageArrivedCallback | null;
  onConnected: OnConnectedCallback | null;

  disconnectedPublishing?: boolean;
  disconnectedBufferSize?: number;
  trace?: (...args: any[]) => void;

  constructor(host: string, port: number, path: string, clientId: string);

  connect(options?: ConnectOptions): void;
  subscribe(topic: string, options?: { qos?: 0 | 1 | 2 }): void;
  unsubscribe(topic: string): void;
  send(message: Message): void;
  disconnect(): void;
}
