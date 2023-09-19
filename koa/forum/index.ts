import KoaRouter from 'koa-router';
import {posts} from './mock-data';
import Koa from 'koa';
import {formatDate, getStreamData, uuid} from '../../node';
import {Post} from './types/backend';
import {postValidator} from './rules';
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
  try {
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
  } catch (err) {
    if (err.errors && err.fields) {
      const {errors: [firstError], fields} = err;
      ctx.throw(firstError.message, 400);
    } else {
      const message = err.message ? err.message : `unknown error for POST /post`;
      ctx.throw(message, 400);
    }
  }
});

const middlewareForum = router.routes();

export default middlewareForum;
