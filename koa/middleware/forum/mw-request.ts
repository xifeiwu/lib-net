import KoaRouter from 'koa-router';
import Koa from 'koa';
import {formatDate, getDataFromReadable, toBuffer, uuid} from '../../../service/external';
import {Post} from './service/types/backend';
import {Reaction} from './service/types/frontend';
import {
  generateRandomNotifications,
  getRandom,
  urlPrefix,
  mocked,
  postValidator,
  reactionValidator,
  validatePost,
} from './service';
import {websocketMap} from './mw-upgrade';

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
    hooray: 0,
    heart: 0,
    rocket: 0,
    eyes: 0,
  };
  const result = await validatePost(post);
  ctx.assert(result.success, 400, result.response);
  mocked.posts.push(post);
  ctx.body = post;
});

router.patch('/posts', async (ctx: Koa.Context, next) => {
  const data = await getDataFromReadable(ctx.req);
  if (!data || data.length === 0) {
    ctx.throw('data is empty', 400);
  }
  const post = JSON.parse(data.toString()) as Post;
  await postValidator.validate(post);
  const target = mocked.posts.find(it => it.id === post.id);
  Object.entries(post).forEach(([key, value]) => {
    target[key] = value;
  });
  ctx.body = target;
});

router.post('/posts/:postId/reactions', async (ctx: Koa.Context, next) => {
  const {postId} = ctx.params;
  ctx.assert(postId, 400, 'postId not found in url');
  const post = mocked.posts.find(it => it.id === postId);
  ctx.assert(post, 400, `not found post with postId: ${postId}`);
  const data = await getDataFromReadable(ctx.req);
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
router.get('/notifications/broadcast', async (ctx: Koa.Context, next) => {
  const numNotifications = getRandom(5) + 1;
  const notifications = generateRandomNotifications(Date.now() - 5 * 3600 * 1000, numNotifications);
  const buf = await toBuffer({type: 'notifications', payload: notifications});
  for (const socket of websocketMap.values()) {
    socket.send(buf, {binary: false});
  }
  ctx.body = notifications;
});

export const requestRouter = router;
