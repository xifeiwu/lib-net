import KoaRouter from 'koa-router';
import {notifications, posts, users} from './mock-data';
import Koa from 'koa';
import {formatDate, getStreamData, toBuffer, uuid} from '../../external';
import {Post} from './types/backend';
import {postValidator, reactionValidator} from './rules';
import {Reaction} from './types/frontend';
import {generateRandomNotifications, getRandom, prefix} from './service';
import {handleUpgrade, wss} from './websocket';

const router = new KoaRouter({
  prefix,
});

router.get('/users', async (ctx: Koa.Context, next) => {
  ctx.body = users;
});

router.get('/posts', async (ctx: Koa.Context, next) => {
  ctx.body = posts;
});
router.get('/posts/:postId', async (ctx: Koa.Context, next) => {
  const {postId} = ctx.params;
  ctx.assert(postId, 400, 'postId not found in url');
  const post = posts.find(it => it.id === postId);
  if (post) {
    ctx.body = post;
  } else {
    ctx.throw(`post with postId ${postId} not exist`, 400);
  }
});

router.post('/posts', async (ctx: Koa.Context, next) => {
  const data = await getStreamData(ctx.req);
  if (!data || data.length === 0) {
    ctx.throw('data is empty', 400);
  }
  const post = JSON.parse(data.toString()) as Post;
  post.id = uuid(32);
  post.date = formatDate(Date.now(), 'yyyy-MM-dd hh:mm:ss');
  post.reactions = {
    thumbsUp: 0,
    hooray: 0,
    heart: 0,
    rocket: 0,
    eyes: 0,
  };
  await postValidator.validate(post);
  posts.push(post);
  ctx.body = post;
});

router.patch('/posts', async (ctx: Koa.Context, next) => {
  const data = await getStreamData(ctx.req);
  if (!data || data.length === 0) {
    ctx.throw('data is empty', 400);
  }
  const post = JSON.parse(data.toString()) as Post;
  await postValidator.validate(post);
  const target = posts.find(it => it.id === post.id);
  Object.entries(post).forEach(([key, value]) => {
    target[key] = value;
  });
  ctx.body = target;
});

router.post('/posts/:postId/reactions', async (ctx: Koa.Context, next) => {
  const {postId} = ctx.params;
  ctx.assert(postId, 400, 'postId not found in url');
  const post = posts.find(it => it.id === postId);
  ctx.assert(post, 400, `not found post with postId: ${postId}`);
  const data = await getStreamData(ctx.req);
  if (!data || data.length === 0) {
    ctx.throw('data is empty', 400);
  }
  const payload = JSON.parse(data.toString()) as Reaction;
  await reactionValidator.validate(payload);
  Object.entries(payload).forEach(([key, _value]) => {
    if (!Object.prototype.hasOwnProperty.call(post.reactions, key)) {
      ctx.throw(`${key} is not a key of reactions`);
    }
    post.reactions[key]++;
  });
  ctx.body = post.reactions;
});

router.get('/notifications', async (ctx: Koa.Context, next) => {
  const numNotifications = getRandom(5) + 1;
  const notifications = generateRandomNotifications(Date.now() - 5 * 3600 * 1000, numNotifications);
  ctx.body = notifications;
});
/** broadcast notification to all connected websocket */
router.get('/ws/notifications/broadcast', async (ctx: Koa.Context, next) => {
  const numNotifications = getRandom(5) + 1;
  const notifications = generateRandomNotifications(Date.now() - 5 * 3600 * 1000, numNotifications);
  const buf = await toBuffer({type: 'notifications', payload: notifications});
  for (const socket of wss.clients.values()) {
    socket.send(buf, {binary: false});
  }
  ctx.body = notifications;
});

const middlewareForum = router.routes();

export {handleUpgrade};
export default middlewareForum;
