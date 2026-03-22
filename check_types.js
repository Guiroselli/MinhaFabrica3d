"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var genai_1 = require("@google/genai");
var ai = new genai_1.GoogleGenAI({ apiKey: 'test' });
// @ts-expect-error - forcing TS to show the keys in a crash or log
var keys = {};
