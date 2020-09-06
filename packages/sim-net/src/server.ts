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

export function createSigintObservable(): Observable<never> {
    return fromEventPattern(
        x => process.on('SIGINT', x),
        x => process.off('SIGINT', x),
    ).pipe(mergeMap(() => throwError(new Error('SIGINT'))));
}

export type WaitForClientArguments<TServer extends ServerLike> = {
    server: TServer;
    getClientIdByToken: (authToken: string) => string;
    expectedClientCount: number;
    authTimeout: number;
    cancellationObservable: Observable<never>;
}

/**
 * Completes when all sockets have been returned.
 * @param cancellationObservable Must throw an error
 */
export function waitForClients<TClient extends WebSocketLike, TServer extends ServerLike>(
    {
        server,
        getClientIdByToken,
        expectedClientCount,
        authTimeout,
        cancellationObservable
    }: WaitForClientArguments<TServer>
): Observable<SocketAndId<TClient>[]> {
    return merge(cancellationObservable, fromEvent<TClient | [TClient]>(server, 'connection')).pipe(
        mergeMap(async args => {
            const socket = Array.isArray(args) ? args[0] : args;
            const id = await firstValueFrom(
                merge(cancellationObservable, fromEvent<MessageEvent>(socket, 'message')).pipe(
                    scan(
                        (negotiation, event: MessageEvent) => {
                            if (negotiation.state === SocketNegotiationState.Unauth) {
                                const id = getAuthToken(event);
                                if (id === null) throw new Error('Expected command to be Authorization');
                                return { id, state: SocketNegotiationState.AuthAndNotReady };
                            }

                            if (negotiation.state === SocketNegotiationState.AuthAndNotReady) {
                                if (event.data !== ReadyForFrames)
                                    throw new Error('Expected command to be ReadyForFrames');
                                return { id: negotiation.id, state: SocketNegotiationState.AuthAndReady };
                            }

                            throw new Error('no more commands expected after socket has been authorized and ready');
                        },
                        { id: null, state: SocketNegotiationState.Unauth } as SocketNegotiation,
                    ),
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
                ),
            );
            return { socket, id };
        }),
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
type SocketNegotiation = { state: SocketNegotiationState; id: null | string };

type ServerLike = NodeCompatibleEventEmitter | HasEventTargetAddRemove<any>;
