export type CollaborationEvent =
  | { type: "document.update"; update: unknown }
  | {
      type: "presence.update";
      userId: number;
      username: string;
      action: "joined" | "left";
    }
  | { type: "error"; code: string; message: string };

type EventListener = (event: CollaborationEvent) => void;

const DEFAULT_WEBSOCKET_URL = "ws://localhost:8000";

export class CollaborationClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<EventListener>();
  private pendingUpdates: unknown[] = [];

  constructor(
    private readonly documentId: string,
    private readonly accessToken: string,
  ) {}

  connect() {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;
    const baseUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? DEFAULT_WEBSOCKET_URL;
    const token = encodeURIComponent(this.accessToken);
    this.socket = new WebSocket(
      `${baseUrl}/ws/documents/${this.documentId}/?token=${token}`,
    );
    this.socket.addEventListener("open", () => {
      for (const update of this.pendingUpdates) this.sendNow(update);
      this.pendingUpdates = [];
    });
    this.socket.addEventListener("message", (message) => {
      const event = JSON.parse(message.data as string) as CollaborationEvent;
      for (const listener of this.listeners) listener(event);
    });
  }

  updateDocument(update: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) this.sendNow(update);
    else {
      this.pendingUpdates.push(update);
      this.connect();
    }
  }

  subscribe(listener: EventListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
    this.pendingUpdates = [];
  }

  private sendNow(update: unknown) {
    this.socket?.send(JSON.stringify({ type: "document.update", update }));
  }
}
