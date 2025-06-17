import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { config } from '../config';

interface ProgressMessage {
  type: 'progress';
  videoId: string;
  progress: number;
  status: 'processing' | 'completed' | 'error';
  error?: string;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket[]>;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.clients = new Map();
    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection');

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'subscribe' && data.videoId) {
            this.subscribeClient(data.videoId, ws);
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.removeClient(ws);
      });
    });
  }

  private subscribeClient(videoId: string, ws: WebSocket) {
    if (!this.clients.has(videoId)) {
      this.clients.set(videoId, []);
    }
    this.clients.get(videoId)?.push(ws);
  }

  private removeClient(ws: WebSocket) {
    for (const [videoId, clients] of this.clients.entries()) {
      const index = clients.indexOf(ws);
      if (index !== -1) {
        clients.splice(index, 1);
        if (clients.length === 0) {
          this.clients.delete(videoId);
        }
      }
    }
  }

  public broadcastProgress(videoId: string, progress: number, status: 'processing' | 'completed' | 'error', error?: string) {
    const message: ProgressMessage = {
      type: 'progress',
      videoId,
      progress,
      status,
      error,
    };

    const clients = this.clients.get(videoId) || [];
    const messageStr = JSON.stringify(message);

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
} 