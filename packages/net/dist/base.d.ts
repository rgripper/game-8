/// <reference types="node" />
declare type NodeEventHandler = (...args: any[]) => void;
export interface HasEventTargetAddRemove<E> {
    addEventListener(type: string, listener: ((evt: E) => void) | null): void;
    removeEventListener(type: string, listener?: ((evt: E) => void) | null): void;
}
export interface NodeCompatibleEventEmitter {
    addListener: (eventName: string, handler: NodeEventHandler) => void | {};
    removeListener: (eventName: string, handler: NodeEventHandler) => void | {};
}
export declare type WebSocketLike = HasEventTargetAddRemove<any> & {
    send: (data: Data) => void;
    isOpen(): boolean;
};
export declare type MessageEvent = {
    data: Data;
    type: string;
};
declare type Data = string | Buffer | ArrayBuffer | Buffer[];
export {};
