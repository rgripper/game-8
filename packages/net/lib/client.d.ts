import { Observable } from 'rxjs';
import { WebSocketLike } from './base';
export declare type SimpleClient<TCommand, TFrame> = {
    frames: Observable<TFrame>;
    sendCommand(command: TCommand): void;
    ready: () => void;
};
export declare function connectToServer<TCommand, TFrame>(socket: WebSocketLike, authToken: string): Promise<SimpleClient<TCommand, TFrame>>;
