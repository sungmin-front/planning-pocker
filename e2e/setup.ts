import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import WebSocket from 'ws';
import path from 'path';

export interface TestEnvironment {
  serverProcess: ChildProcess | null;
  clientProcess: ChildProcess | null;
  serverUrl: string;
  clientUrl: string;
  wsUrl: string;
}

export const testEnv: TestEnvironment = {
  serverProcess: null,
  clientProcess: null,
  serverUrl: 'http://localhost:8081',
  clientUrl: 'http://localhost:5174',
  wsUrl: 'ws://localhost:8081'
};

export async function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '../server');
    
    testEnv.serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: serverPath,
      env: { ...process.env, PORT: '8081' },
      stdio: 'pipe'
    });

    testEnv.serverProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`[SERVER] ${output}`);
      if (output.includes('WebSocket server listening on port 8081')) {
        resolve();
      }
    });

    testEnv.serverProcess.stderr?.on('data', (data) => {
      console.error(`[SERVER ERROR] ${data}`);
    });

    testEnv.serverProcess.on('error', reject);

    // Timeout after 30 seconds
    setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, 30000);
  });
}

export async function startClient(): Promise<void> {
  return new Promise((resolve, reject) => {
    const clientPath = path.join(__dirname, '../client');
    
    testEnv.clientProcess = spawn('npm', ['run', 'dev'], {
      cwd: clientPath,
      env: { 
        ...process.env, 
        PORT: '5174',
        VITE_WEBSOCKET_URL: 'ws://localhost:8081'
      },
      stdio: 'pipe'
    });

    testEnv.clientProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`[CLIENT] ${output}`);
      if (output.includes('Local:') && output.includes('5174')) {
        // Wait a bit more for the server to be fully ready
        setTimeout(resolve, 2000);
      }
    });

    testEnv.clientProcess.stderr?.on('data', (data) => {
      console.error(`[CLIENT ERROR] ${data}`);
    });

    testEnv.clientProcess.on('error', reject);

    // Timeout after 30 seconds
    setTimeout(() => {
      reject(new Error('Client startup timeout'));
    }, 30000);
  });
}

export function stopServer(): void {
  if (testEnv.serverProcess) {
    testEnv.serverProcess.kill('SIGTERM');
    testEnv.serverProcess = null;
  }
}

export function stopClient(): void {
  if (testEnv.clientProcess) {
    testEnv.clientProcess.kill('SIGTERM');
    testEnv.clientProcess = null;
  }
}

export async function waitForServer(): Promise<void> {
  const maxAttempts = 30;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const ws = new WebSocket(testEnv.wsUrl);
      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          ws.close();
          resolve(true);
        });
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 1000);
      });
      return;
    } catch (error) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Server not responding after 30 attempts');
}

export class WebSocketTestClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, Function[]> = new Map();
  private messages: any[] = [];

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(testEnv.wsUrl);
      
      this.ws.on('open', () => {
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.messages.push(message);
          
          const handlers = this.messageHandlers.get(message.type) || [];
          handlers.forEach(handler => handler(message));
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });

      this.ws.on('error', reject);
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
    this.messages = [];
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket not connected');
    }
  }

  on(messageType: string, handler: Function): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType)!.push(handler);
  }

  off(messageType: string, handler: Function): void {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  async waitForMessage(messageType: string, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(messageType, handler);
        reject(new Error(`Timeout waiting for message: ${messageType}`));
      }, timeout);

      const handler = (message: any) => {
        clearTimeout(timer);
        this.off(messageType, handler);
        resolve(message);
      };

      this.on(messageType, handler);
    });
  }

  getMessages(): any[] {
    return [...this.messages];
  }

  getLastMessage(): any | null {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  clearMessages(): void {
    this.messages = [];
  }
}