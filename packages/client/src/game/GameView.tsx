import React, { useEffect, useState, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { createRenderingPipe } from './rendering/rendering';
import { concat } from 'rxjs';
import DebugView, { createDebuggingPipe } from './DebugView';
import createCommands from './client-commands/createCommands';
import { ID, Player, Process, Entity, SimCommand, Diff } from './client-sim/sim';
import { WorldState } from './client-sim/world';
import { connectToServer, SimpleClient } from 'sim-net';
import { useAppContext } from '../AppContext';
import { mapEventsToCommands } from './client-commands/mapEventsToCommands';

function GameView() {
    // TODO: refactor duplicate init world
    const { userId } = useAppContext();
    const worldParams = { size: { width: 500, height: 500 } };
    const initialWorld: WorldState = {
        boundaries: { top_left: { x: 0, y: 0 }, size: worldParams.size },
        players: new Map<ID, Player>(),
        processes: new Map<ID, Process>(),
        entities: new Map<ID, Entity>(),
    };

    const [channelClient, setСhannelClient] = useState<SimpleClient<SimCommand, Diff[]> | undefined>(undefined);

    const [debuggedWorld, setDebuggedWorld] = useState<WorldState>(initialWorld);
    const gameViewRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (userId) {
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
                entityId: 3,
            });

            connectToServer<SimCommand, Diff[]>(client as any, userId)
                .then(client => {
                    console.log('client is ready', client);
                    setСhannelClient(client);
                    return client;
                })
                .then(client => {
                    client.ready();

                    controlCommands$.subscribe(command => client.sendCommand(command));
                });
        }
        //createPipeline({ worldParams }).then(setСhannelClient);
    }, [userId]);

    useEffect(() => {
        if (gameViewRef.current === null) {
            return;
        }

        if (channelClient === undefined) {
            return;
        }

        console.log('channelClient', channelClient);

        const gameView = gameViewRef.current;
        const app = new PIXI.Application({
            backgroundColor: 0xffaaff,
            ...worldParams.size,
        });
        gameView.appendChild(app.view);

        const subscription = channelClient.frames
            .pipe(createRenderingPipe(app), createDebuggingPipe(initialWorld, setDebuggedWorld))
            .subscribe();

        return () => subscription.unsubscribe();
    }, [channelClient]);

    return (
        <div className="App">
            <DebugView worldState={debuggedWorld}>
                <div ref={gameViewRef}></div>
            </DebugView>
        </div>
    );
}

export default GameView;
