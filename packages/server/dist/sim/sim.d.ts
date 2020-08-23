export declare type Diff = {
    type: 'DeleteEntity' | 'DeletePlayer' | 'DeleteProcess';
    id: ID;
} | {
    type: 'UpsertEntity';
    entity: Entity;
} | {
    type: 'UpsertPlayer';
    player: Player;
} | {
    type: 'UpsertProcess';
    process: Process;
};
declare type ActorMovePayload = {
    direction: Radians;
};
declare type ActorMoveStartCommand = {
    type: 'ActorMoveStart';
    actor_id: ID;
    payload: ActorMovePayload;
};
declare type ActorMoveStopCommand = {
    type: 'ActorMoveStop';
    actor_id: ID;
};
declare type ActorShootStartCommand = {
    type: 'ActorShootStart';
    actor_id: ID;
};
declare type ActorShootStopCommand = {
    type: 'ActorShootStop';
    actor_id: ID;
};
declare type AddEntityCommand = {
    type: 'AddEntity';
    entity: Entity;
};
declare type AddPlayerCommand = {
    type: 'AddPlayer';
    player: Player;
};
export declare type ActorCommand = ActorMoveStartCommand | ActorMoveStopCommand | ActorShootStartCommand | ActorShootStopCommand;
export declare type CreationCommand = AddEntityCommand | AddPlayerCommand;
export declare type SimCommand = ActorCommand | CreationCommand;
export declare type Velocity = number;
export declare type Point = {
    x: number;
    y: number;
};
export declare type Size = {
    width: number;
    height: number;
};
export declare type Rect = {
    top_left: Point;
    size: Size;
};
export declare type Radians = number;
export declare type WorldParams = {
    size: {
        width: number;
        height: number;
    };
};
export declare type ID = number;
export declare type Health = {
    max: number;
    current: number;
};
export declare enum BehaviourType {
    Actor = "Actor",
    Projectile = "Projectile"
}
export declare enum ModelType {
    Human = "Human",
    Monster = "Monster",
    Projectile = "Projectile"
}
export declare type Entity = {
    id: ID;
    health: Health;
    boundaries: Rect;
    rotation: Radians;
    model_type: ModelType;
    behaviour_type: BehaviourType;
    player_id: ID;
};
export declare type Player = {
    id: ID;
};
export declare type Process = {
    id: ID;
    entity_id: ID;
    payload: ProcessPayload;
};
declare type ProcessPayload = {
    type: 'EntityMove';
    direction: Radians;
    velocity: Velocity;
} | {
    type: 'EntityShoot';
    cooldown: number;
    current_cooldown: number;
};
export declare function gen_new_id(): ID;
export declare function intersects(rect1: Rect, rect2: Rect): boolean;
export {};
