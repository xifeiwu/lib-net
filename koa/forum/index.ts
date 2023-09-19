import KoaRouter from 'koa-router';
import {posts} from './mock-data';
import Koa from 'koa';
import {formatDate, getStreamData, uuid} from '../../node';
import {Post} from './types/backend';
import {postValidator, reactionValidator} from './rules';
import {Reaction} from './types/frontend';
// import {getStreamData} from '../node';

export const prefix = '/api/forum';
const router = new KoaRouter({
  prefix,
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

router.post('posts/:postId/reactions', async (ctx: Koa.Context, next) => {
  const {postId} = ctx.params;
  ctx.assert(postId, 400, 'postId not found in url');
  const post = posts.find(it => it.id === postId);
  ctx.assert(post, 400, `not found post with postId: ${postId}`);
  const data = await getStreamData(ctx.req);
  if (!data || data.length === 0) {
    ctx.throw('data is empty', 400);
  }
  const {reaction} = data as unknown as {reaction: Reaction};
  ctx.assert(reaction, 400, 'property reaction not found in request payload.');
  await reactionValidator.validate(reaction);
});

const middlewareForum = router.routes();

export default middlewareForum;
