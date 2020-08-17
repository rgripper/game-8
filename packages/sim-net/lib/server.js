import { merge, fromEvent, firstValueFrom, fromEventPattern, throwError } from 'rxjs';
import { AuthorizationPrefix, ReadyForFrames, AuthorizationSuccessful } from './control-commands';
import { map, mergeMap, scan, tap, first, timeout } from 'rxjs/operators';
export function createSimpleServer(clients) {
    const commands = merge(...clients.map(x => fromEvent(x.socket, 'message').pipe(map(x => JSON.parse(x.data)))));
    const sendFrame = (frame) => clients.forEach(x => x.socket.send(JSON.stringify(frame)));
    return {
        commands,
        sendFrame,
    };
}
export function createSigintObservable() {
    return fromEventPattern(x => process.on('SIGINT', x), x => process.off('SIGINT', x)).pipe(mergeMap(() => throwError(new Error('SIGINT'))));
}
/**
 * Completes when all sockets have been returned.
 * @param cancellationObservable Must throw an error
 */
export function waitForClients(server, getClientIdByToken, expectedClientCount, authTimeout, cancellationObservable) {
    return merge(cancellationObservable, fromEvent(server, 'connection')).pipe(mergeMap(async (args) => {
        const socket = Array.isArray(args) ? args[0] : args;
        const id = await firstValueFrom(merge(cancellationObservable, fromEvent(socket, 'message')).pipe(scan((negotiation, event) => {
            if (negotiation.state === SocketNegotiationState.Unauth) {
                const id = getAuthToken(event);
                if (id === null)
                    throw new Error('Expected command to be Authorization');
                return { id, state: SocketNegotiationState.AuthAndNotReady };
            }
            if (negotiation.state === SocketNegotiationState.AuthAndNotReady) {
                if (event.data !== ReadyForFrames)
                    throw new Error('Expected command to be ReadyForFrames');
                return { id: negotiation.id, state: SocketNegotiationState.AuthAndReady };
            }
            throw new Error('no more commands expected after socket has been authorized and ready');
        }, { id: null, state: SocketNegotiationState.Unauth }), tap(x => x.state === SocketNegotiationState.AuthAndNotReady && socket.send(AuthorizationSuccessful)), first(x => x.state === SocketNegotiationState.AuthAndReady), map(x => x.id), timeout(authTimeout), map(getClientIdByToken)));
        return { socket, id };
    }), scan((acc, socketAndId) => acc.concat(socketAndId), []), first(socketsAndIds => socketsAndIds.length === expectedClientCount));
}
function getAuthToken(message) {
    return ((typeof message.data === 'string' &&
        message.data.startsWith(AuthorizationPrefix) &&
        message.data.substring(AuthorizationPrefix.length)) ||
        null);
}
var SocketNegotiationState;
(function (SocketNegotiationState) {
    SocketNegotiationState[SocketNegotiationState["Unauth"] = 0] = "Unauth";
    SocketNegotiationState[SocketNegotiationState["AuthAndNotReady"] = 1] = "AuthAndNotReady";
    SocketNegotiationState[SocketNegotiationState["AuthAndReady"] = 2] = "AuthAndReady";
})(SocketNegotiationState || (SocketNegotiationState = {}));
