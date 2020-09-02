import { lastValueFrom, merge } from 'rxjs';
import { bufferTime, tap } from 'rxjs/operators';
import WebSocket from 'ws';
import { createSigintObservable, createSimpleServer, waitForClients } from 'sim-net';
import { BehaviourType, Diff, ModelType, SimCommand, WorldParams } from './sim/sim';
import minimist from 'minimist';

type OwnedCommandWrapper = {
    command: SimCommand;
    player_id: number | null;
};

export type Sim = (commandWrappers: OwnedCommandWrapper[]) => Diff[];

export async function createSimInRust(world_params: WorldParams): Promise<Sim> {
    const { SimInterop: RustSimInterop, set_panic } = await import('../../sim/pkg/sim');
    set_panic();
    const simInterop = RustSimInterop.create(world_params);
    return commands => simInterop.update(commands);
}

async function main() {
    const argv = minimist(process.argv.slice(2));
    const playersCount = argv["p"] || argv["players"] || 1;

    const server = new WebSocket.Server({ port: 3888 });
    const terminator$ = createSigintObservable();

    console.log(`Server is running on ws://localhost:${3888} for ${playersCount} player(s)`);
    for (let i = 1; i <= playersCount; i++) {
        console.log(`Player ${i} link: http://localhost:9010/game?userId=${i}`);
    }
    const clients = await lastValueFrom(waitForClients({
        server,
        getClientIdByToken: x => x,
        expectedClientCount: playersCount,
        authTimeout: 200,
        cancellationObservable: terminator$
    }));
    console.log('Clients were received', clients);
    const simpleServer = createSimpleServer<SimCommand, Diff[]>(clients);
    const sim = await createSimInRust({ size: { height: 500, width: 500 } });
    console.log('Sim started');

    const initDiffs = sim([
        { type: 'AddPlayer', player: { id: 1 } },
        { type: 'AddPlayer', player: { id: 2 } },
        {
            type: 'AddEntity',
            entity_params: {
                model_type: ModelType.Human,
                behaviour_type: BehaviourType.Actor,
                boundaries: { top_left: { x: 10, y: 10 }, size: { height: 32, width: 32 } },
                health: { max: 100, current: 100 },
                player_id: 1,
                rotation: 0,
            },
        },
        {
            type: 'AddEntity',
            entity_params: {
                model_type: ModelType.Human,
                behaviour_type: BehaviourType.Actor,
                boundaries: { top_left: { x: 200, y: 200 }, size: { height: 32, width: 32 } },
                health: { max: 100, current: 100 },
                player_id: 2,
                rotation: 0,
            },
        },
    ].map(command => ({ command, player_id: null } as OwnedCommandWrapper)));

    console.log('Sending init diffs', initDiffs);

    simpleServer.sendFrame(initDiffs);

    await lastValueFrom(
        merge(simpleServer.commands, terminator$).pipe(
            bufferTime<{ command: SimCommand; socketId: string }>(10),
            tap(wrappedCommands => {
                const diffs = sim(
                    wrappedCommands.map<OwnedCommandWrapper>(sc => ({
                        command: sc.command,
                        player_id: parseInt(sc.socketId),
                    })),
                );
                if (diffs.length > 0) {
                    console.log('Sending update diffs', diffs);
                    simpleServer.sendFrame(diffs);
                }
            }),
        ),
    );

    console.log('Sim completed');
    process.exit();
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
