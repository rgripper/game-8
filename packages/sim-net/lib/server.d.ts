import { Observable } from 'rxjs';
import { HasEventTargetAddRemove, NodeCompatibleEventEmitter, WebSocketLike } from './base';
export declare type SimpleServer<TCommand, TFrame> = {
    commands: Observable<{
        command: TCommand;
        socketId: string;
    }>;
    sendFrame(frame: TFrame): void;
};
export declare function createSimpleServer<TCommand, TFrame>(clients: SocketAndId<WebSocketLike>[]): SimpleServer<TCommand, TFrame>;
export declare type WaitForClientArguments<TServer extends ServerLike> = {
    server: TServer;
    getClientIdByToken: (authToken: string) => string;
    expectedClientCount: number;
    authTimeout: number;
};
/**
 * Completes when all sockets have been returned.
 * @param cancellationObservable Must throw an error
 */
export declare function waitForClients<TClient extends WebSocketLike, TServer extends ServerLike>({ server, getClientIdByToken, expectedClientCount, authTimeout, }: WaitForClientArguments<TServer>): Observable<SocketAndId<TClient>[]>;
declare type SocketAndId<T extends WebSocketLike> = {
    socket: T;
    id: string;
};
declare type ServerLike = NodeCompatibleEventEmitter | HasEventTargetAddRemove<any>;
export {};
