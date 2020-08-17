var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { firstValueFrom, from, fromEvent, throwError } from 'rxjs';
import { AuthorizationPrefix, AuthorizationSuccessful, ReadyForFrames } from './control-commands';
import { timeout, tap, mergeMap, first, map } from 'rxjs/operators';
export function connectToServer(socket, authToken) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield firstValueFrom((socket.isOpen() ? from([true]) : fromEvent(socket, 'open')).pipe(timeout({ each: 1000, with: () => throwError(new Error('Timed out waiting for socket to open')) }), tap(() => socket.send(AuthorizationPrefix + authToken)), mergeMap(() => fromEvent(socket, 'message').pipe(first(), timeout({
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
    });
}
