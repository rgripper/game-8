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
async function createSimInRust(world_params) {
    const { SimInterop: RustSimInterop, set_panic } = await Promise.resolve().then(() => __importStar(require('../../sim/pkg/sim')));
    set_panic();
    const simInterop = RustSimInterop.create(world_params);
    return commands => simInterop.update(commands);
}
exports.createSimInRust = createSimInRust;
async function main() {
    const server = new ws_1.default.Server({ port: 3888 });
    const terminator$ = sim_net_1.createSigintObservable();
    console.log(`Server is running on ws://localhost:${3888}`);
    const clients = await rxjs_1.lastValueFrom(sim_net_1.waitForClients(server, x => x, 1, 200, terminator$));
    console.log('Clients were received', clients);
    const simpleServer = sim_net_1.createSimpleServer(clients);
    const sim = await createSimInRust({ size: { height: 500, width: 500 } });
    console.log('Sim started');
    const initDiffs = sim([
        { type: 'AddPlayer', player: { id: 1 } },
        { type: 'AddPlayer', player: { id: 2 } },
        {
            type: 'AddEntity',
            entity: {
                id: 3,
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
            entity: {
                id: 4,
                model_type: sim_1.ModelType.Human,
                behaviour_type: sim_1.BehaviourType.Actor,
                boundaries: { top_left: { x: 200, y: 200 }, size: { height: 32, width: 32 } },
                health: { max: 100, current: 100 },
                player_id: 2,
                rotation: 0,
            },
        },
    ]);
    console.log('Sending init diffs', initDiffs);
    simpleServer.sendFrame(initDiffs);
    await rxjs_1.lastValueFrom(rxjs_1.merge(simpleServer.commands, terminator$).pipe(operators_1.bufferTime(10), operators_1.tap(commands => {
        const diffs = sim(commands);
        if (diffs.length > 0) {
            console.log('Sending update diffs', diffs);
            simpleServer.sendFrame(diffs);
        }
    })));
    console.log('Sim completed');
    process.exit();
}
main().catch(error => {
    console.error(error);
    process.exit(1);
});
