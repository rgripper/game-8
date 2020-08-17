import { Observable } from 'rxjs';
import { HasEventTargetAddRemove, NodeCompatibleEventEmitter, WebSocketLike } from './base';
export declare type SimpleServer<TCommand, TFrame> = {
    commands: Observable<TCommand>;
    sendFrame(frame: TFrame): void;
};
export declare function createSimpleServer<TCommand, TFrame>(clients: SocketAndId<WebSocketLike>[]): SimpleServer<TCommand, TFrame>;
/**
 * Completes when all sockets have been returned.
 */
export declare function waitForClients<TClient extends WebSocketLike, TServer extends ServerLike>(server: TServer, getClientIdByToken: (authToken: string) => string, expectedClientCount: number, authTimeout: number, waitForClientsTimeout: number): Observable<SocketAndId<TClient>[]>;
declare type SocketAndId<T extends WebSocketLike> = {
    socket: T;
    id: string;
};
declare type ServerLike = NodeCompatibleEventEmitter | HasEventTargetAddRemove<any>;
export {};
