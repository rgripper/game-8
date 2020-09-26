export type Diff =
    | {
          type: 'DeleteEntity' | 'DeletePlayer' | 'DeleteProcess';
          id: ID;
      }
    | {
          type: 'UpsertEntity';
          entity: Entity;
      }
    | {
          type: 'UpsertPlayer';
          player: Player;
      }
    | {
          type: 'UpsertProcess';
          process: Process;
      };

type ActorMovePayload = {
    direction: Radians;
};

type ActorMoveStartCommand = {
    type: 'ActorMoveStart';
    actor_id: ID;
    payload: ActorMovePayload;
};

type ActorMoveStopCommand = {
    type: 'ActorMoveStop';
    actor_id: ID;
};

type ActorShootStartCommand = {
    type: 'ActorShootStart';
    actor_id: ID;
};

type ActorShootStopCommand = {
    type: 'ActorShootStop';
    actor_id: ID;
};

type AddEntityCommand = {
    type: 'AddEntity';
    entity_params: Omit<Entity, 'id'>;
};

type AddPlayerCommand = {
    type: 'AddPlayer';
    player: Player;
};

export type ActorCommand =
    | ActorMoveStartCommand
    | ActorMoveStopCommand
    | ActorShootStartCommand
    | ActorShootStopCommand;
export type CreationCommand = AddEntityCommand | AddPlayerCommand;

export type SimCommand = ActorCommand | CreationCommand;

export type Velocity = number;

export type Point = {
    x: number; // from left to right
    y: number; // from top to bottom
};

export type Size = { width: number; height: number };

export type Rect = {
    top_left: Point;
    size: Size;
};

export type Radians = number;

export type WorldParams = {
    size: { width: number; height: number };
};

export type ID = number;

export type Health = {
    max: number;
    current: number;
};

export enum BehaviourType {
    Actor = 'Actor',
    Projectile = 'Projectile',
}

export enum ModelType {
    Human = 'Human',
    Monster = 'Monster',
    Projectile = 'Projectile',
}

export type Entity = {
    id: ID;
    health: Health;
    boundaries: Rect;
    rotation: Radians;
    model_type: ModelType;
    behaviour_type: BehaviourType;
    player_id: ID;
};

export type Credit = {
    current: number;
    current_interval: number;
    initial_interval: number;
};

export type Player = {
    id: ID;
    credit: Credit;
};

export type Process = {
    id: ID;
    entity_id: ID;
    payload: ProcessPayload;
};

type ProcessPayload =
    | {
          type: 'EntityMove';
          direction: Radians;
          velocity: Velocity;
      }
    | {
          type: 'EntityShoot';
          cooldown: number;
          current_cooldown: number;
      };

let NEW_ID: ID = 0;

// TODO: increment world_state instead, remove from global
export function gen_new_id(): ID {
    NEW_ID = NEW_ID + 1;
    return NEW_ID;
}

export function intersects(rect1: Rect, rect2: Rect) {
    return !(
        rect1.top_left.x > rect2.top_left.x + rect2.size.width ||
        rect1.top_left.x + rect1.size.width < rect2.top_left.x ||
        rect1.top_left.y > rect2.top_left.y + rect2.size.height ||
        rect1.top_left.y + rect1.size.height < rect2.top_left.y
    );
}
