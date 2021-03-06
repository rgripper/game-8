"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToServer = exports.waitForClients = exports.createSimpleServer = void 0;
var server_1 = require("./server");
Object.defineProperty(exports, "createSimpleServer", { enumerable: true, get: function () { return server_1.createSimpleServer; } });
Object.defineProperty(exports, "waitForClients", { enumerable: true, get: function () { return server_1.waitForClients; } });
var client_1 = require("./client");
Object.defineProperty(exports, "connectToServer", { enumerable: true, get: function () { return client_1.connectToServer; } });
