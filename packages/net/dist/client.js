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
exports.connectToServer = void 0;
const rxjs_1 = require("rxjs");
const control_commands_1 = require("./control-commands");
const operators_1 = require("rxjs/dist/types/operators");
function connectToServer(socket, authToken) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield rxjs_1.firstValueFrom((socket.isOpen() ? rxjs_1.from([true]) : rxjs_1.fromEvent(socket, 'open')).pipe(operators_1.timeoutWith(1000, rxjs_1.throwError(new Error('Timed out waiting for socket to open'))), operators_1.tap(() => socket.send(control_commands_1.AuthorizationPrefix + authToken)), operators_1.mergeMap(() => rxjs_1.fromEvent(socket, 'message').pipe(operators_1.first(), operators_1.timeoutWith(1000, rxjs_1.throwError(new Error('Timed out waiting for an authorization message'))), operators_1.tap(message => {
            if (message.data !== control_commands_1.AuthorizationSuccessful) {
                throw new Error('Expected message data to by AuthorizationSuccessful but was something else');
            }
        }), operators_1.map(() => {
            let isReady = false;
            return {
                ready: () => {
                    isReady = true;
                    socket.send(control_commands_1.ReadyForFrames);
                },
                frames: rxjs_1.fromEvent(socket, 'message').pipe(operators_1.map((event) => {
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
exports.connectToServer = connectToServer;
