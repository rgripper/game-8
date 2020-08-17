import { firstValueFrom, from, fromEvent, throwError } from 'rxjs';
import { AuthorizationPrefix, AuthorizationSuccessful, ReadyForFrames } from './control-commands';
import { timeout, tap, mergeMap, first, map } from 'rxjs/operators';
export async function connectToServer(socket, authToken) {
    return await firstValueFrom((socket.isOpen() ? from([true]) : fromEvent(socket, 'open')).pipe(timeout({ each: 1000, with: () => throwError(new Error('Timed out waiting for socket to open')) }), tap(() => socket.send(AuthorizationPrefix + authToken)), mergeMap(() => fromEvent(socket, 'message').pipe(first(), timeout({
        each: 1000,
        with: () => throwError(new Error('Timed out waiting for an authorization message')),
    }), tap(message => {
        if (message.data !== AuthorizationSuccessful) {
            throw new Error('Expected message data to by AuthorizationSuccessful but was something else');
        }
    }), map(() => {
        let isReady = false;
        return {
            ready: () => {
                isReady = true;
                socket.send(ReadyForFrames);
            },
            frames: fromEvent(socket, 'message').pipe(map((event) => {
                return JSON.parse(event.data);
            })),
            sendCommand: (command) => {
                if (!isReady)
                    throw new Error('Must call ready before sending commands');
                socket.send(JSON.stringify(command));
            },
        };
    })))));
}
