import { lastValueFrom } from 'rxjs';
import WebSocket from 'ws';

const server = new WebSocket.Server({ port: 3888 });
const clients = await lastValueFrom(waitForClients(server, x => x, clientCount, 200, 5000));
const simpleServer = createSimpleServer<string, { value: number }>(clients);
