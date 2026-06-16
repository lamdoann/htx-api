import { gunzipSync } from 'zlib';
import WebSocket, { RawData } from 'ws';

import { Logger } from './logger';

export interface WsConnectionParams {
  /** Human-readable name for logging, e.g. `"market"` / `"account"`. */
  name: string;
  url: string;
  /** Whether inbound frames are GZIP-compressed (true for the market `/ws`). */
  gzip: boolean;
  reconnect: boolean;
  reconnectIntervalMs: number;
  logger: Logger;
  onOpen: () => void;
  onMessage: (message: unknown) => void;
  onError: (error: Error) => void;
  onClose: () => void;
  onReconnecting: () => void;
}

/**
 * Single WebSocket connection with GZIP handling, JSON decoding and
 * auto-reconnect. Protocol concerns (ping/pong, auth, routing) are delegated to
 * the owner via `onMessage`/`onOpen`.
 */
export class WsConnection {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private closedByUser = false;

  constructor(private readonly params: WsConnectionParams) {}

  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.closedByUser = false;
    this.params.logger.info(`[${this.params.name}] connecting to ${this.params.url}`);

    const ws = new WebSocket(this.params.url);
    this.ws = ws;

    ws.on('open', () => {
      this.params.logger.info(`[${this.params.name}] connected`);
      this.params.onOpen();
    });
    ws.on('message', (data) => this.handleMessage(data));
    ws.on('error', (err) => this.params.onError(err));
    ws.on('close', () => this.handleClose());
  }

  send(payload: Record<string, unknown>): void {
    if (!this.isOpen) {
      this.params.logger.debug(
        `[${this.params.name}] socket not open; dropping message`,
        payload,
      );
      return;
    }
    this.ws!.send(JSON.stringify(payload));
  }

  /** Graceful close; stops reconnecting. */
  close(): void {
    this.closedByUser = true;
    this.clearReconnect();
    this.ws?.close();
    this.ws = null;
  }

  /** Forcefully tear down the socket immediately; stops reconnecting. */
  terminate(): void {
    this.closedByUser = true;
    this.clearReconnect();
    this.ws?.terminate();
    this.ws = null;
  }

  private handleMessage(raw: RawData): void {
    try {
      const buffer = this.toBuffer(raw);
      const text = this.params.gzip
        ? gunzipSync(buffer).toString('utf-8')
        : buffer.toString('utf-8');
      this.params.onMessage(JSON.parse(text));
    } catch (err) {
      this.params.onError(err as Error);
    }
  }

  private handleClose(): void {
    this.params.logger.info(`[${this.params.name}] closed`);
    this.params.onClose();
    if (this.params.reconnect && !this.closedByUser) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    this.params.onReconnecting();
    this.params.logger.info(
      `[${this.params.name}] reconnecting in ${this.params.reconnectIntervalMs}ms`,
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.params.reconnectIntervalMs);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private toBuffer(raw: RawData): Buffer {
    if (Buffer.isBuffer(raw)) {
      return raw;
    }
    if (Array.isArray(raw)) {
      return Buffer.concat(raw);
    }
    return Buffer.from(raw as ArrayBuffer);
  }
}
