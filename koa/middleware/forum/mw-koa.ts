import KoaRouter from 'koa-router';
import Koa from 'koa';
import {formatDate, getDataFromReadable, convertToBuffer, uuid} from '../../../service/external';
import {Post} from './service/types/backend';
import {Reaction} from './service/types/frontend';
import {
  generateRandomNotifications,
  getRandom,
  urlPrefix,
  mocked,
  postPostValidator,
  reactionValidator,
  validate,
  patchPostValidator,
} from './service';
import {websocketMap} from './mw-http-upgrade';
import {wrapValidate} from '../../service';

const router = new KoaRouter({
  prefix: urlPrefix,
});

router.get('/users', async (ctx: Koa.Context, next) => {
  ctx.body = mocked.users;
});

router.get('/posts', async (ctx: Koa.Context, next) => {
  ctx.body = mocked.posts;
});
router.get('/posts/:postId', async (ctx: Koa.Context, next) => {
  const {postId} = ctx.params;
  ctx.assert(postId, 400, 'postId not found in url');
  const post = mocked.posts.find(it => it.id === postId);
  if (post) {
    ctx.body = post;
  } else {
    ctx.throw(`post with postId ${postId} not exist`, 400);
  }
});

router.post('/posts', async (ctx: Koa.Context, next) => {
  const data = await getDataFromReadable(ctx.req);
  if (!data || data.length === 0) {
    ctx.throw('data is empty', 400);
  }
  const post = JSON.parse(data.toString()) as Post;
  post.id = uuid(32);
  post.date = formatDate(Date.now(), 'yyyy-MM-dd hh:mm:ss');
  post.reactions = {
    thumbsUp: 0,
    tada: 0,
    heart: 0,
    rocket: 0,
    eyes: 0,
  };
  const result = await validate(postPostValidator, post);
  ctx.assert(result.success, 400, result.message);
  mocked.posts.push(post);
  ctx.body = post;
});

router.patch('/posts/:postId', async (ctx: Koa.Context) => {
  const {postId} = ctx.params;
  const data = await getDataFromReadable(ctx.req);
  if (!data || data.length === 0) {
    ctx.throw('data is empty', 400);
  }
  const post = JSON.parse(data.toString()) as Post;
  const result = await validate(patchPostValidator, post);
  ctx.assert(result.success, 400, result.message);
  const target = mocked.posts.find(it => it.id === postId);
  Object.entries(post).forEach(([key, value]) => {
    target[key] = value;
  });
  ctx.body = target;
});

router.post('/posts/:postId/reactions', async (ctx: Koa.Context) => {
  const {postId} = ctx.params;
  ctx.assert(postId, 400, 'postId not found in url');
  const post = mocked.posts.find(it => it.id === postId);
  ctx.assert(post, 400, `not found post with postId: ${postId}`);
  const data = await getDataFromReadable(ctx.req);
  if (!data || data.length === 0) {
    ctx.throw('data is empty', 400);
  }
  const payload = JSON.parse(data.toString()) as Reaction;
  const result = await wrapValidate(postPostValidator, post);
  ctx.assert(result.success, 400, result.message);
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
router.get('/notifications/broadcast', async (ctx: Koa.Context, next) => {
  const numNotifications = getRandom(5) + 1;
  const notifications = generateRandomNotifications(Date.now() - 5 * 3600 * 1000, numNotifications);
  const buf = await convertToBuffer({type: 'notifications', payload: notifications});
  for (const socket of websocketMap.values()) {
    socket.send(buf, {binary: false});
  }
  ctx.body = notifications;
});

export const forumKoaRouter = router;
export function getForumKoaMw() {
  return router.routes();
}
