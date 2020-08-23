"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply_diff_to_world = void 0;
function apply_diff_to_world(world, diff) {
    switch (diff.type) {
        case 'UpsertEntity': {
            world.entities.set(diff.entity.id, diff.entity);
            break;
        }
        case 'UpsertPlayer': {
            world.players.set(diff.player.id, diff.player);
            break;
        }
        case 'UpsertProcess': {
            world.processes.set(diff.process.id, diff.process);
            break;
        }
        case 'DeleteEntity': {
            world.entities.delete(diff.id);
            Array.from(world.processes.values())
                .filter(x => x.entity_id === diff.id)
                .forEach(x => world.processes.delete(x.id));
            break;
        }
        case 'DeleteProcess': {
            world.processes.delete(diff.id);
            break;
        }
        case 'DeletePlayer': {
            world.players.delete(diff.id);
            break;
        }
    }
}
exports.apply_diff_to_world = apply_diff_to_world;
