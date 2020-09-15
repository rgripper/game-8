import { Observable, merge, fromEvent, firstValueFrom, fromEventPattern, throwError } from 'rxjs';
import { AuthorizationPrefix, ReadyForFrames, AuthorizationSuccessful } from './control-commands';
import { map, mergeMap, scan, tap, first, timeout, skipWhile } from 'rxjs/operators';
import { HasEventTargetAddRemove, NodeCompatibleEventEmitter, MessageEvent, WebSocketLike } from './base';

export type SimpleServer<TCommand, TFrame> = {
    commands: Observable<{ command: TCommand; socketId: string }>;
    sendFrame(frame: TFrame): void;
};

export function createSimpleServer<TCommand, TFrame>(
    clients: SocketAndId<WebSocketLike>[],
): SimpleServer<TCommand, TFrame> {
    const commands = merge(
        ...clients.map(x =>
            fromEvent<MessageEvent>(x.socket, 'message').pipe(
                map(m => ({ command: JSON.parse(m.data as string), socketId: x.id })),
            ),
        ),
    );
    const sendFrame = (frame: TFrame) => clients.forEach(x => x.socket.send(JSON.stringify(frame)));
    return {
        commands,
        sendFrame,
    };
}

export type WaitForClientArguments<TServer extends ServerLike> = {
    server: TServer;
    getClientIdByToken: (authToken: string) => string;
    expectedClientCount: number;
    authTimeout: number;
};

function negotinationReducer<TClient>(negotiation: SocketNegotiation<TClient>, event: MessageEvent) {
    if (negotiation.state === SocketNegotiationState.Unauth) {
        const id = getAuthToken(event);
        if (id === null) throw new Error('Expected command to be Authorization');
        return { ...negotiation, id, state: SocketNegotiationState.AuthAndNotReady };
    }

    if (negotiation.state === SocketNegotiationState.AuthAndNotReady) {
        if (event.data !== ReadyForFrames) throw new Error('Expected command to be ReadyForFrames');
        return { ...negotiation, state: SocketNegotiationState.AuthAndReady };
    }

    throw new Error('no more commands expected after socket has been authorized and ready');
}

function negoriateClientToReady<TClient extends WebSocketLike>({
    socket,
    authTimeout,
    getClientIdByToken,
}: {
    socket: TClient;
    authTimeout: number;
    getClientIdByToken: (authToken: string) => string;
}) {
    return fromEvent<MessageEvent>(socket, 'message').pipe(
        scan<MessageEvent, SocketNegotiation<TClient>>((a, b) => negotinationReducer<TClient>(a, b), {
            id: null,
            state: SocketNegotiationState.Unauth,
            socket,
        } as SocketNegotiation<TClient>),
        tap(
            x => x.state === SocketNegotiationState.AuthAndNotReady && socket.send(AuthorizationSuccessful), // TODO: make sure it's sent only once
        ),
        skipWhile(x => x.state === SocketNegotiationState.Unauth),
        timeout({
            each: authTimeout,
            with: () => throwError(new Error('Timed out waiting for auth to complete')),
        }),
        first(x => x.state === SocketNegotiationState.AuthAndReady),
        map(x => x.id!),
        map(getClientIdByToken),
        map(id => ({ socket, id })),
    );
}
/**
 * Completes when all sockets have been returned.
 * @param cancellationObservable Must throw an error
 */
export function waitForClients<TClient extends WebSocketLike, TServer extends ServerLike>({
    server,
    getClientIdByToken,
    expectedClientCount,
    authTimeout,
}: WaitForClientArguments<TServer>): Observable<SocketAndId<TClient>[]> {
    return fromEvent<TClient | [TClient]>(server, 'connection').pipe(
        map(args => (Array.isArray(args) ? args[0] : args)),
        mergeMap(socket => negoriateClientToReady({ socket, authTimeout, getClientIdByToken })),
        scan((acc, socketAndId) => acc.concat(socketAndId), [] as SocketAndId<TClient>[]),
        first(socketsAndIds => socketsAndIds.length === expectedClientCount),
    );
}

function getAuthToken(message: MessageEvent) {
    return (
        (typeof message.data === 'string' &&
            message.data.startsWith(AuthorizationPrefix) &&
            message.data.substring(AuthorizationPrefix.length)) ||
        null
    );
}

type SocketAndId<T extends WebSocketLike> = { socket: T; id: string };

enum SocketNegotiationState {
    Unauth,
    AuthAndNotReady,
    AuthAndReady,
}
type SocketNegotiation<T> = { state: SocketNegotiationState; id: null | string; socket: T };

type ServerLike = NodeCompatibleEventEmitter | HasEventTargetAddRemove<any>;
