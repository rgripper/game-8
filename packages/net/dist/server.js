"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForClients = exports.createSimpleServer = void 0;
const rxjs_1 = require("rxjs");
const control_commands_1 = require("./control-commands");
const operators_1 = require("rxjs/operators");
function createSimpleServer(clients) {
    const commands = rxjs_1.merge(...clients.map(x => rxjs_1.fromEvent(x.socket, 'message').pipe(operators_1.map(x => JSON.parse(x.data)))));
    const sendFrame = (frame) => clients.forEach(x => x.socket.send(JSON.stringify(frame)));
    return {
        commands,
        sendFrame,
    };
}
exports.createSimpleServer = createSimpleServer;
/**
 * Completes when all sockets have been returned.
 */
function waitForClients(server, getClientIdByToken, expectedClientCount, authTimeout, waitForClientsTimeout) {
    return rxjs_1.fromEvent(server, 'connection').pipe(operators_1.mergeMap((args) => __awaiter(this, void 0, void 0, function* () {
        const socket = Array.isArray(args) ? args[0] : args;
        const id = yield rxjs_1.firstValueFrom(rxjs_1.fromEvent(socket, 'message').pipe(operators_1.scan((negotiation, event) => {
            if (negotiation.state === SocketNegotiationState.Unauth) {
                const id = getAuthToken(event);
                if (id === null)
                    throw new Error('Expected command to be Authorization');
                return { id, state: SocketNegotiationState.AuthAndNotReady };
            }
            if (negotiation.state === SocketNegotiationState.AuthAndNotReady) {
                if (event.data !== control_commands_1.ReadyForFrames)
                    throw new Error('Expected command to be ReadyForFrames');
                return { id: negotiation.id, state: SocketNegotiationState.AuthAndReady };
            }
            throw new Error('no more commands expected after socket has been authorized and ready');
        }, { id: null, state: SocketNegotiationState.Unauth }), operators_1.tap(x => x.state === SocketNegotiationState.AuthAndNotReady && socket.send(control_commands_1.AuthorizationSuccessful)), operators_1.first(x => x.state === SocketNegotiationState.AuthAndReady), operators_1.map(x => x.id), operators_1.timeout(authTimeout), operators_1.map(getClientIdByToken)));
        return { socket, id };
    })), operators_1.scan((acc, socketAndId) => acc.concat(socketAndId), []), operators_1.first(socketsAndIds => socketsAndIds.length === expectedClientCount), operators_1.timeout(waitForClientsTimeout));
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
// const clients = await lastValueFrom(waitForClients(server, x => x, clientCount, 200, 5000));
