import { lastValueFrom } from 'rxjs';
import WebSocket from 'ws';
import { createSigintObservable, createSimpleServer, waitForClients } from 'sim-net';

async function main() {
    const server = new WebSocket.Server({ port: 3888 });
    console.log(`Server is running on ws://localhost:${3888}`);
    const clients = await lastValueFrom(waitForClients(server, x => x, 2, 200, createSigintObservable()));
    const simpleServer = createSimpleServer<string, { value: number }>(clients);
}

main().catch(() => process.exit(1));
