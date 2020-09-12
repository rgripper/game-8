"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSimInRust = void 0;
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const ws_1 = __importDefault(require("ws"));
const sim_net_1 = require("sim-net");
const sim_1 = require("./sim/sim");
const minimist_1 = __importDefault(require("minimist"));
const http_1 = __importDefault(require("http"));
const serverPort = 3888;
const httpServerPort = 3889;
async function createSimInRust(world_params) {
    const { SimInterop: RustSimInterop, set_panic } = await Promise.resolve().then(() => __importStar(require('../../sim/pkg/sim')));
    set_panic();
    const simInterop = RustSimInterop.create(world_params);
    return commands => simInterop.update(commands);
}
exports.createSimInRust = createSimInRust;
async function main() {
    const argv = minimist_1.default(process.argv.slice(2));
    const playersCount = argv['p'] || argv['players'] || 1;
    const server = new ws_1.default.Server({ port: serverPort });
    const terminator$ = sim_net_1.createSigintObservable();
    console.log(`Server is running on ws://localhost:${serverPort} for ${playersCount} player(s)`);
    startHttpServer(playersCount);
    console.log(`Links for the players: http://localhost:${httpServerPort}`);
    const clients = await rxjs_1.lastValueFrom(sim_net_1.waitForClients({
        server,
        getClientIdByToken: x => x,
        expectedClientCount: playersCount,
        authTimeout: 200,
        cancellationObservable: terminator$,
    }));
    console.log('Clients were received', clients);
    const simpleServer = sim_net_1.createSimpleServer(clients);
    const sim = await createSimInRust({ size: { height: 500, width: 500 } });
    console.log('Sim started');
    const initDiffs = sim([
        { type: 'AddPlayer', player: { id: 1 } },
        { type: 'AddPlayer', player: { id: 2 } },
        {
            type: 'AddEntity',
            entity_params: {
                model_type: sim_1.ModelType.Human,
                behaviour_type: sim_1.BehaviourType.Actor,
                boundaries: { top_left: { x: 10, y: 10 }, size: { height: 32, width: 32 } },
                health: { max: 100, current: 100 },
                player_id: 1,
                rotation: 0,
            },
        },
        {
            type: 'AddEntity',
            entity_params: {
                model_type: sim_1.ModelType.Human,
                behaviour_type: sim_1.BehaviourType.Actor,
                boundaries: { top_left: { x: 200, y: 200 }, size: { height: 32, width: 32 } },
                health: { max: 100, current: 100 },
                player_id: 2,
                rotation: 0,
            },
        },
    ].map(command => ({ command, player_id: null })));
    console.log('Sending init diffs', initDiffs);
    simpleServer.sendFrame(initDiffs);
    await rxjs_1.lastValueFrom(rxjs_1.merge(simpleServer.commands, terminator$).pipe(operators_1.bufferTime(10), operators_1.tap(wrappedCommands => {
        const diffs = sim(wrappedCommands.map(sc => ({
            command: sc.command,
            player_id: parseInt(sc.socketId),
        })));
        if (diffs.length > 0) {
            console.log('Sending update diffs', diffs);
            simpleServer.sendFrame(diffs);
        }
    })));
    console.log('Sim completed');
    process.exit();
}
async function startHttpServer(playersCount) {
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
    indexPageText += '</ul>';
    indexPageText += '</body>';
    indexPageText += '</html>';
    http_1.default.createServer(function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexPageText);
    }).listen(httpServerPort);
}
main().catch(error => {
    console.error(error);
    process.exit(1);
});
