import { Diff, Entity, ID, Player, Process, Rect } from './sim';
export declare type WorldState = {
    boundaries: Rect;
    players: Map<ID, Player>;
    entities: Map<ID, Entity>;
    processes: Map<ID, Process>;
};
export declare function apply_diff_to_world(world: WorldState, diff: Diff): void;
