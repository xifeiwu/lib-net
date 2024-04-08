## intro

include several apis starts with `'/api/forum'`, and they can be used as forum api:


get /users                          user info list
get /notifications                  notification list
get /posts                          post info list
get /posts/:postId                  get post info by postId
post /posts                         create a new post
path /posts                         update existing post
post /posts/:postId/reactions       update reaction info of one post by postId