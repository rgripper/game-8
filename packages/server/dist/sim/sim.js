"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intersects = exports.gen_new_id = exports.ModelType = exports.BehaviourType = void 0;
var BehaviourType;
(function (BehaviourType) {
    BehaviourType["Actor"] = "Actor";
    BehaviourType["Projectile"] = "Projectile";
})(BehaviourType = exports.BehaviourType || (exports.BehaviourType = {}));
var ModelType;
(function (ModelType) {
    ModelType["Human"] = "Human";
    ModelType["Monster"] = "Monster";
    ModelType["Projectile"] = "Projectile";
})(ModelType = exports.ModelType || (exports.ModelType = {}));
let NEW_ID = 0;
// TODO: increment world_state instead, remove from global
function gen_new_id() {
    NEW_ID = NEW_ID + 1;
    return NEW_ID;
}
exports.gen_new_id = gen_new_id;
function intersects(rect1, rect2) {
    return !(rect1.top_left.x > rect2.top_left.x + rect2.size.width ||
        rect1.top_left.x + rect1.size.width < rect2.top_left.x ||
        rect1.top_left.y > rect2.top_left.y + rect2.size.height ||
        rect1.top_left.y + rect1.size.height < rect2.top_left.y);
}
exports.intersects = intersects;
