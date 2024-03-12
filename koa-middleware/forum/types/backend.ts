import {Post as FEPost} from './frontend';

export interface Post extends FEPost {
  id: string;
  date: string;
}
