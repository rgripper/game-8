"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForClients = exports.createSimpleServer = void 0;
const rxjs_1 = require("rxjs");
const control_commands_1 = require("./control-commands");
const operators_1 = require("rxjs/operators");
function createSimpleServer(clients) {
    const commands = rxjs_1.merge(...clients.map(x => rxjs_1.fromEvent(x.socket, 'message').pipe(operators_1.map(m => ({ command: JSON.parse(m.data), socketId: x.id })))));
    const sendFrame = (frame) => clients.forEach(x => x.socket.send(JSON.stringify(frame)));
    return {
        commands,
        sendFrame,
    };
}
exports.createSimpleServer = createSimpleServer;
function negotinationReducer(negotiation, event) {
    if (negotiation.state === SocketNegotiationState.Unauth) {
        const id = getAuthToken(event);
        if (id === null)
            throw new Error('Expected command to be Authorization');
        return Object.assign(Object.assign({}, negotiation), { id, state: SocketNegotiationState.AuthAndNotReady });
    }
    if (negotiation.state === SocketNegotiationState.AuthAndNotReady) {
        if (event.data !== control_commands_1.ReadyForFrames)
            throw new Error('Expected command to be ReadyForFrames');
        return Object.assign(Object.assign({}, negotiation), { state: SocketNegotiationState.AuthAndReady });
    }
    throw new Error('no more commands expected after socket has been authorized and ready');
}
function negoriateClientToReady({ socket, authTimeout, getClientIdByToken, }) {
    return rxjs_1.fromEvent(socket, 'message').pipe(operators_1.scan((a, b) => negotinationReducer(a, b), {
        id: null,
        state: SocketNegotiationState.Unauth,
        socket,
    }), operators_1.tap(x => x.state === SocketNegotiationState.AuthAndNotReady && socket.send(control_commands_1.AuthorizationSuccessful)), operators_1.skipWhile(x => x.state === SocketNegotiationState.Unauth), operators_1.timeout({
        each: authTimeout,
        with: () => rxjs_1.throwError(new Error('Timed out waiting for auth to complete')),
    }), operators_1.first(x => x.state === SocketNegotiationState.AuthAndReady), operators_1.map(x => x.id), operators_1.map(getClientIdByToken), operators_1.map(id => ({ socket, id })));
}
/**
 * Completes when all sockets have been returned.
 * @param cancellationObservable Must throw an error
 */
function waitForClients({ server, getClientIdByToken, expectedClientCount, authTimeout, }) {
    return rxjs_1.fromEvent(server, 'connection').pipe(operators_1.map(args => (Array.isArray(args) ? args[0] : args)), operators_1.mergeMap(socket => negoriateClientToReady({ socket, authTimeout, getClientIdByToken })), operators_1.scan((acc, socketAndId) => acc.concat(socketAndId), []), operators_1.first(socketsAndIds => socketsAndIds.length === expectedClientCount));
}
exports.waitForClients = waitForClients;
function getAuthToken(message) {
    return ((typeof message.data === 'string' &&
        message.data.startsWith(control_commands_1.AuthorizationPrefix) &&
        message.data.substring(control_commands_1.AuthorizationPrefix.length)) ||
        null);
}
var SocketNegotiationState;
(function (SocketNegotiationState) {
    SocketNegotiationState[SocketNegotiationState["Unauth"] = 0] = "Unauth";
    SocketNegotiationState[SocketNegotiationState["AuthAndNotReady"] = 1] = "AuthAndNotReady";
    SocketNegotiationState[SocketNegotiationState["AuthAndReady"] = 2] = "AuthAndReady";
})(SocketNegotiationState || (SocketNegotiationState = {}));
