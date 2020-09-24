import { merge, Observable, Subject } from 'rxjs';
import { bufferTime, last, switchMap, tap } from 'rxjs/operators';
import { BehaviourType, Diff, ModelType, SimCommand, WorldParams } from './sim/sim';
import minimist from 'minimist';
import http from 'http';
import WebSocket from 'ws';
import { createSimpleServer, waitForClients } from 'sim-net';

type OwnedCommandWrapper = {
    command: SimCommand;
    player_id: number | null;
};

const serverPort = 3888;
const httpServerPort = 3889;

export type Sim = (commandWrappers: OwnedCommandWrapper[]) => Diff[];

export async function createSimInRust(world_params: WorldParams): Promise<Sim> {
    const { SimInterop: RustSimInterop, set_panic } = await import('../../sim/pkg/sim');
    set_panic();
    const simInterop = RustSimInterop.create(world_params);
    return commands => simInterop.update(commands);
}

async function main() {
    const argv = minimist(process.argv.slice(2));
    const playerCount = parseInt(argv['p'] ?? argv['players']) || 1;

    const restartSubject = new Subject<undefined>();

    const subscription = restartSubject.pipe(switchMap(() => startServer(playerCount))).subscribe();
    restartSubject.next(undefined);
    // process.on('SIGINT', () => subscription.unsubscribe());
    // process.on('exit', () => {
    //     console.log('unsubscribing');
    //     subscription.unsubscribe();
    // });
    console.log(`Server is running on ws://localhost:${serverPort} for ${playerCount} player(s)`);
    console.log(`Links for the players: http://localhost:${httpServerPort}`);
    startHttpServer(playerCount, restartSubject);

    // TODO: terminate with subscription.unsubscribe()
    // process.exit();
}

function createSeverObservable({ port }: { port: number }) {
    return new Observable<WebSocket.Server>(subscriber => {
        const server = new WebSocket.Server({ port });
        subscriber.next(server);
        return () => {
            server.close();
            console.info('Websocket closed.');
        };
    });
}

function startServer(playersCount: number) {
    return createSeverObservable({ port: serverPort }).pipe(
        switchMap(server => {
            console.log(`WebSocket server is waiting for clients...`);
            return waitForClients({
                server,
                getClientIdByToken: x => x,
                expectedClientCount: playersCount,
                authTimeout: 1000,
            });
        }),
        switchMap(async clients => {
            console.log('Clients were received', clients);
            const simpleServer = createSimpleServer<SimCommand, Diff[]>(clients);
            const sim = await createSimInRust({ size: { height: 500, width: 500 } });
            return {
                simpleServer,
                sim,
            };
        }),
        switchMap(({ simpleServer, sim }) => {
            const initCommands = [
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
            ];

            const initDiffs = sim(initCommands.map(command => ({ command, player_id: null } as OwnedCommandWrapper)));
            simpleServer.sendFrame(initDiffs);

            const finalFrame = simpleServer.commands.pipe(
                bufferTime<{ command: SimCommand; socketId: string }>(10),
                tap(wrappedCommands => {
                    const diffs = sim(
                        wrappedCommands.map<OwnedCommandWrapper>(sc => ({
                            command: sc.command,
                            player_id: parseInt(sc.socketId),
                        })),
                    );
                    if (diffs.length > 0) {
                        simpleServer.sendFrame(diffs);
                    }
                }),
                last(),
            );

            return finalFrame;
        }),
    );
}

function startHttpServer(playersCount: number, restartSubject: Subject<undefined>) {
    let indexPageText = '';

    indexPageText += '<!DOCTYPE html><html>';
    indexPageText += '<head>Links for the players</head>';

    indexPageText += '<body>';
    indexPageText += '<ul>';
    for (let i = 1; i <= playersCount; i++) {
        indexPageText += `<li><a href="http://localhost:9010/game?userId=${i}">`;
        indexPageText += `Player ${i} link`;
        indexPageText += '</a></li>';
    }
    indexPageText += '</ul><br/>';
    // some dirty inline javascript
    indexPageText += `<button onclick="function btn_restart(){ fetch('/restart').then(alert('restarted')); };btn_restart()">Restart game</a>`;
    indexPageText += '</body>';

    indexPageText += '</html>';

    return http
        .createServer(function (req, res) {
            if (req.url === '/restart') {
                console.log('restart event');
                restartSubject.next(undefined);
                return;
            }

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexPageText);
        })
        .listen(httpServerPort);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
