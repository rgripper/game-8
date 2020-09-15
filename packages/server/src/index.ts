import { Subject } from 'rxjs';
import { Diff, SimCommand, WorldParams } from './sim/sim';
import minimist from 'minimist';
import http from 'http';

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
    const playersCount = argv['p'] || argv['players'] || 1;

    const restartSubject = new Subject<undefined>();

    restartSubject.next(undefined);

    console.log(`Server is running on ws://localhost:${serverPort} for ${playersCount} player(s)`);
    startHttpServer(playersCount, restartSubject);
    console.log(`Links for the players: http://localhost:${httpServerPort}`);

    // TODO: terminate with subscription.unsubscribe()
    // process.exit();
}

async function startHttpServer(playersCount: number, restartSubject: Subject<undefined>) {
    let indexPageText = '';

    indexPageText += '<!DOCTYPE html><html>';
    indexPageText += '<head>Links for the players</head>';

    indexPageText += '<body>';
    indexPageText += '<ul>';
    for (let i = 1; i <= playersCount; i++) {
        indexPageText += `<li><a href="http://localhost:9010/game?userId=${i}}">`;
        indexPageText += `Player ${i} link`;
        indexPageText += '</a></li>';
    }
    indexPageText += '</ul><br/>';
    // some dirty inline javascript
    indexPageText += `<button onclick="function btn_restart(){ fetch('/restart').then(alert('restarted')); };btn_restart()">Restart game</a>`;
    indexPageText += '</body>';

    indexPageText += '</html>';

    http.createServer(function (req, res) {
        if (req.url === '/restart') {
            console.log('restart event');
            restartSubject.next(undefined);
            return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexPageText);
    }).listen(httpServerPort);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
