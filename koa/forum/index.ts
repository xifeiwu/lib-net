import KoaRouter from 'koa-router';
import {posts} from './mock-data';
import Koa from 'koa';
import {getStreamData} from '../../node';
import {Post} from './type';
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

// export interface Post {
//   id: string;
//   title: string;
//   date: string;
//   content: string;
//   reactions: Reaction;
//   comments?: Comment;
//   user: string;
// }
router.post('/posts', async (ctx: Koa.Context, next) => {
  const data = await getStreamData(ctx.req);
  try {
    const post = JSON.parse(data.toString()) as Post;
    posts.push(post);
    ctx.body = post;
  } catch (err) {
    ctx.throw(`parse payload error`, 400);
  }
});

const middlewareForum = router.routes();

export default middlewareForum;
