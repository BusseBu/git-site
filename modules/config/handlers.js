const path = require('path');
const fs = require('fs');

let handlerNames = [
  'jsengine/koa/static',
  'jsengine/koa/requestId',
  'jsengine/koa/requestLog',
  'jsengine/koa/nocache',

  // this middleware adds this.render method
  // it is *before error*, because errors need this.render
  'render',

  // errors wrap everything
  'jsengine/koa/error',

  // this logger only logs HTTP status and URL
  // before everything to make sure it log all
  'jsengine/koa/accessLogger',

  // before anything that may deal with body
  // it parses JSON & URLENCODED FORMS,
  // it does not parse form/multipart
  'jsengine/koa/bodyParser',

  // parse FORM/MULTIPART
  // (many tweaks possible, lets the middleware decide how to parse it)
  'jsengine/koa/multipartParser',

  // right after parsing body, make sure we logged for development
  'jsengine/koa/verboseLogger',

  'jsengine/koa/conditional',

  'frontpage'
].filter(Boolean);

let handlers = {};

for (const name of handlerNames) {
  let handlerPath = require.resolve(name);
  if (handlerPath.endsWith('index.js')) {
    handlerPath = path.dirname(handlerPath);
  }
  handlers[name] = {
    path: handlerPath
  }
}

module.exports = handlers;
