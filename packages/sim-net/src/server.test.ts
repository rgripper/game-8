import { lastValueFrom } from 'rxjs';
import { AuthorizationPrefix, ReadyForFrames } from './control-commands';
import { createSimpleServer, waitForClients } from './server';
import { EventEmitter } from 'events';

const createFakeClient = () => {
    // TODO: make return type obey WebSocketLike
    const clientEmitter = new EventEmitter();
    const client = {
        emitter: clientEmitter,
        addEventListener: clientEmitter.addListener.bind(clientEmitter),
        removeEventListener: clientEmitter.removeListener.bind(clientEmitter),
        isOpen: () => true,
        send: jest.fn(),
    };
    return client;
};

describe('server', () => {
    const createFakeServer = (serverEmitter: EventEmitter) => ({
        addEventListener: serverEmitter.addListener.bind(serverEmitter),
        removeEventListener: serverEmitter.removeListener.bind(serverEmitter),
    });

    xit('throws if socket is not authorized', async () => {});

    xit('times out if socket did not auth in time', () => {});

    it('returns all sockets when count is reached', async () => {
        const serverEmitter = new EventEmitter();
        const server = createFakeServer(serverEmitter);
        const waitForClientsPromise = lastValueFrom(
            waitForClients({
                server,
                getClientIdByToken: x => x,
                expectedClientCount: 3,
                authTimeout: 1000,
            }),
        );

        const client1 = createFakeClient();
        serverEmitter.emit('connection', client1);
        client1.emitter.emit('message', { data: AuthorizationPrefix + '111' });
        client1.emitter.emit('message', { data: ReadyForFrames });
        const client2 = createFakeClient();
        serverEmitter.emit('connection', client2);
        client2.emitter.emit('message', { data: AuthorizationPrefix + '222' });
        client2.emitter.emit('message', { data: ReadyForFrames });
        const client3 = createFakeClient();
        serverEmitter.emit('connection', client3);
        client3.emitter.emit('message', { data: AuthorizationPrefix + '333' });
        client3.emitter.emit('message', { data: ReadyForFrames });

        const clients = await waitForClientsPromise;
        expect(clients).toHaveLength(3);
        expect(clients.map(x => x.id)).toEqual(['111', '222', '333']);
    });
});

describe(createSimpleServer, () => {
    it('receives commands and broadcasts frames', async () => {
        const clients = [
            { id: '1', socket: createFakeClient() },
            { id: '2', socket: createFakeClient() },
        ];

        const simpleServer = createSimpleServer<string, { value: number }>(clients);

        const receivedCommandWrappers: { command: string; socketId: string }[] = [];
        simpleServer.commands.subscribe(wrapper => receivedCommandWrappers.push(wrapper));

        simpleServer.sendFrame({ value: 44 });
        await Promise.resolve();

        expect(clients[0].socket.send).toBeCalledWith('{"value":44}');
        expect(clients[1].socket.send).toBeCalledWith('{"value":44}');

        clients[1].socket.emitter.emit('message', { data: 20 });
        clients[0].socket.emitter.emit('message', { data: 10 });
        await Promise.resolve();

        expect(receivedCommandWrappers).toEqual([
            { command: 20, socketId: '2' },
            { command: 10, socketId: '1' },
        ]);
    });
});
