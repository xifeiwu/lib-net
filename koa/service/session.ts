import Koa from 'koa';
import KoaSession from 'koa-session';

export function getStore() {
  const sessionData = {};
  const store: KoaSession.opts['store'] = {
    async get(key) {
      return sessionData[key];
    },
    async set(key, value) {
      sessionData[key] = value;
    },
    async destroy(key) {
      delete sessionData[key];
    },
  };
  return {store, sessionData};
}

export function getContextStore() {
  const sessionData = {};
  class ContextStore {
    ctx: Koa.Context;
    constructor(ctx: Koa.Context) {
      this.ctx = ctx;
    }
    async get(key) {
      return sessionData[key];
    }
    async set(key, value) {
      sessionData[key] = value;
    }
    async destroy(key) {
      delete sessionData[key];
    }
  }
  return {ContextStore, sessionData};
}
