import { lastValueFrom, merge } from 'rxjs';
import { bufferTime, tap } from 'rxjs/operators';
import WebSocket from 'ws';
import { createSigintObservable, createSimpleServer, waitForClients } from 'sim-net';
import { Diff, SimCommand, WorldParams } from './sim/sim';
import { exit } from 'process';

export type Sim = (commands: SimCommand[]) => Diff[];

export async function createSimInRust(world_params: WorldParams): Promise<Sim> {
    const { SimInterop: RustSimInterop, set_panic } = await import('../../sim/pkg/sim');
    set_panic();
    const simInterop = RustSimInterop.create(world_params);
    return commands => simInterop.update(commands);
}

async function main() {
    const server = new WebSocket.Server({ port: 3888 });
    const terminator$ = createSigintObservable();
    console.log(`Server is running on ws://localhost:${3888}`);
    const clients = await lastValueFrom(waitForClients(server, x => x, 2, 200, terminator$));
    console.log('clients were received', clients);
    const simpleServer = createSimpleServer<SimCommand, Diff[]>(clients);
    const sim = await createSimInRust({ size: { height: 500, width: 500 } });
    console.log('Sim started');
    await lastValueFrom(
        merge(simpleServer.commands, terminator$).pipe(
            bufferTime<SimCommand>(10),
            tap(commands => {
                const diffs = sim(commands);
                if (diffs.length > 0) {
                    console.log('outgoing diffs', diffs);
                    simpleServer.sendFrame(diffs);
                }
            }),
        ),
    );

    console.log('Sim completed');
}

main()
    .catch(() => process.exit(1))
    .then(() => exit());
