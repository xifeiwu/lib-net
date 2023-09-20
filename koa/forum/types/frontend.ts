export interface User {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  username: string;
  // posts: string[];
}

export interface Post {
  // id: string;
  // date: string;
  title: string;
  content: string;
  reactions: Reaction;
  user: string;
}

export interface Reaction {
  // id: string;
  thumbsUp: number;
  hooray: number;
  heart: number;
  rocket: number;
  eyes: number;
  // post: string;
}

export interface Comment {
  id: string;
  date: string;
  text: string;
  post: string;
}

export interface INotification {
  id: string;
  date: string;
  message: string;
  user: string;
  // read: boolean;
  // isNew: boolean;
}
