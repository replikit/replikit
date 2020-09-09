/// <reference path="../typings/index.d.ts" />
import "@replikit/attachments";

export * from "./sessions/randomUserSession";
export * from "./randomLocale";
export * from "./startup";

import "./locales/en";
import "./locales/ru";

import "./commands/calc";
import "./commands/delete";
import "./commands/test";
import "./commands/edit";
import "./commands/tokenize";
import "./commands/format";
import "./commands/echo";
import "./commands/avatar";

import "./handlers/silence";
import "./handlers/random";
import "./handlers/inline";
