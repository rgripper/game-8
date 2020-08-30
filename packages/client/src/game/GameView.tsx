import React, { useEffect, useState, useRef, useMemo } from 'react';
import * as PIXI from 'pixi.js';
import { createRenderingPipe } from './rendering/rendering';
import DebugView, { createDebuggingPipe } from './DebugView';
import { ID, Player, Process, Entity, SimCommand, Diff, ModelType } from './client-sim/sim';
import { WorldState } from './client-sim/world';
import { connectToServer, SimpleClient } from 'sim-net';
import { useAppContext } from '../AppContext';
import { mapEventsToCommands } from './client-commands/mapEventsToCommands';
import { Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, map, tap } from 'rxjs/operators';

function isDefined<T>(value: T | undefined | null): value is T {
    return value != undefined;
}

const worldParams = { size: { width: 500, height: 500 } };

const initialWorld: WorldState = {
    boundaries: { top_left: { x: 0, y: 0 }, size: worldParams.size },
    players: new Map<ID, Player>(),
    processes: new Map<ID, Process>(),
    entities: new Map<ID, Entity>(),
};

function GameView() {
    // TODO: refactor duplicate init world
    const { userId } = useAppContext();

    const [channelClient, setСhannelClient] = useState<SimpleClient<SimCommand, Diff[]> | undefined>(undefined);

    const [debuggedWorld, setDebuggedWorld] = useState<WorldState>(() => {
        return initialWorld;
    });
    const gameViewRef = useRef<HTMLDivElement | null>(null);

    const world$ = useMemo(() => new Subject<WorldState>(), []);

    useEffect(() => {
        if (gameViewRef.current === null) {
            return;
        }

        if (userId) {
            const player_id = parseInt(userId);
            const socket = new WebSocket('ws://localhost:3888');
            const client = {
                // TODO: provide a better interface
                addEventListener: socket.addEventListener.bind(socket),
                removeEventListener: socket.removeEventListener.bind(socket),
                send: (x: string) => socket.send(x),
                isOpen: () => socket.readyState === socket.OPEN,
            };

            const movementKeys = {
                forward: 'w',
                back: 's',
                left: 'a',
                right: 'd',
            };

            const controlCommands$ = mapEventsToCommands({
                target: document,
                movementKeys,
                entityId$: world$.pipe(
                    map(w =>
                        Array.from(w.entities.values()).find(
                            x => x.model_type === ModelType.Human && x.player_id === player_id,
                        ),
                    ),
                    filter(isDefined),
                    map(x => x.id),
                    distinctUntilChanged(),
                ),
            });

            let subscription: Subscription; // TODO: this is very messy, hopefully refactored away with whole client refactor
            const gameView = gameViewRef.current;
            const app = new PIXI.Application({
                backgroundColor: 0xffaaff,
                ...worldParams.size,
            });
            gameView.appendChild(app.view);

            connectToServer<SimCommand, Diff[]>(client as any, userId)
                .then(client => {
                    console.log('client is ready', client);
                    setСhannelClient(client);
                    return client;
                })
                .then(client => {
                    subscription = client.frames
                        .pipe(
                            createRenderingPipe(app),
                            createDebuggingPipe(initialWorld, w => {
                                setDebuggedWorld(w);
                                world$.next(w);
                            }),
                        )
                        .subscribe();

                    client.ready();

                    controlCommands$
                        .pipe(
                            tap(cmds => {
                                console.log('cmds', cmds);
                            }),
                        )
                        .subscribe(command => client.sendCommand(command));
                });

            return () => subscription.unsubscribe();
        }
        //createPipeline({ worldParams }).then(setСhannelClient);
    }, [userId]);

    return (
        <div className="App">
            <DebugView worldState={debuggedWorld}>
                <div ref={gameViewRef}></div>
            </DebugView>
        </div>
    );
}

export default GameView;
