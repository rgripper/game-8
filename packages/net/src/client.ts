import { Observable, firstValueFrom, from, fromEvent, throwError } from 'rxjs';
import { AuthorizationPrefix, AuthorizationSuccessful, ReadyForFrames } from './control-commands';
import { timeout, tap, mergeMap, first, map } from 'rxjs/operators';
import { MessageEvent, WebSocketLike } from './base';
import WebSocket from 'ws';

export type SimpleClient<TCommand, TFrame> = {
    frames: Observable<TFrame>;
    sendCommand(command: TCommand): void;
    ready: () => void;
};

export async function connectToServer<TCommand, TFrame>(
    socket: WebSocketLike,
    authToken: string,
): Promise<SimpleClient<TCommand, TFrame>> {
    return await firstValueFrom(
        (socket.isOpen() ? from([true]) : fromEvent(socket, 'open')).pipe(
            timeout({ each: 1000, with: () => throwError(new Error('Timed out waiting for socket to open')) }),
            tap<WebSocket>(() => socket.send(AuthorizationPrefix + authToken)),
            mergeMap(() =>
                fromEvent<MessageEvent>(socket, 'message').pipe(
                    first(),
                    timeout({
                        each: 1000,
                        with: () => throwError(new Error('Timed out waiting for an authorization message')),
                    }),
                    tap(message => {
                        if (message.data !== AuthorizationSuccessful) {
                            throw new Error(
                                'Expected message data to by AuthorizationSuccessful but was something else',
                            );
                        }
                    }),
                    map(
                        (): SimpleClient<TCommand, TFrame> => {
                            let isReady = false;
                            return {
                                ready: () => {
                                    isReady = true;
                                    socket.send(ReadyForFrames);
                                },
                                frames: fromEvent(socket, 'message').pipe(
                                    map((event: MessageEvent) => {
                                        return JSON.parse(event.data as string) as TFrame;
                                    }),
                                ),
                                sendCommand: (command: TCommand) => {
                                    if (!isReady) throw new Error('Must call ready before sending commands');
                                    socket.send(JSON.stringify(command));
                                },
                            };
                        },
                    ),
                ),
            ),
        ),
    );
}
