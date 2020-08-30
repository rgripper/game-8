import { Diff, SimCommand, WorldParams } from './sim/sim';
declare type OwnedCommandWrapper = {
    command: SimCommand;
    player_id: number | null;
};
export declare type Sim = (commandWrappers: OwnedCommandWrapper[]) => Diff[];
export declare function createSimInRust(world_params: WorldParams): Promise<Sim>;
export {};
