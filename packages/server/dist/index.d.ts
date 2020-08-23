import { Diff, SimCommand, WorldParams } from './sim/sim';
export declare type Sim = (commands: SimCommand[]) => Diff[];
export declare function createSimInRust(world_params: WorldParams): Promise<Sim>;
