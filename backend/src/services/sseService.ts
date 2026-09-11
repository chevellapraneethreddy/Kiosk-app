import { Response } from 'express';
import { logger } from '../utils/logger';

interface Client {
  id: string;
  res: Response;
  sessionId?: string;
  generationId?: string;
}

class SSEService {
  private clients: Map<string, Client> = new Map();

  addClient(id: string, res: Response, sessionId?: string, generationId?: string): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    this.clients.set(id, { id, res, sessionId, generationId });
    logger.info(`SSE Client connected: ${id} (Session: ${sessionId || 'none'}, Generation: ${generationId || 'none'})`);

    res.on('close', () => {
      this.clients.delete(id);
      logger.info(`SSE Client disconnected: ${id}`);
    });
  }

  sendEventToSession(sessionId: string, eventType: string, data: any): void {
    for (const client of this.clients.values()) {
      if (client.sessionId === sessionId) {
        client.res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    }
  }

  sendEventToGeneration(generationId: string, eventType: string, data: any): void {
    for (const client of this.clients.values()) {
      if (client.generationId === generationId || client.sessionId === data?.sessionId) {
        client.res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    }
  }

  broadcast(eventType: string, data: any): void {
    for (const client of this.clients.values()) {
      client.res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  }
}

export const sseService = new SSEService();
