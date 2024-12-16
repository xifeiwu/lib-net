import Schema, {Rules} from 'async-validator';
import {mocked} from './mock-data';

const reactionRule: Rules = {
  thumbsUp: {
    type: 'number',
    // required: true,
  },
  hooray: {
    type: 'number',
    // required: true,
  },
  heart: {
    type: 'number',
    // required: true,
  },
  rocket: {
    type: 'number',
    // required: true,
  },
  eyes: {
    type: 'number',
    // required: true,
  },
};
export const reactionValidator = new Schema(reactionRule);

export const postRule: Rules = {
  id: {
    type: 'string',
    required: true,
  },
  date: {
    type: 'string',
    required: true,
  },
  title: {
    type: 'string',
    required: true,
  },
  content: {
    type: 'string',
    required: true,
  },
  reactions: {
    type: 'object',
    fields: reactionRule,
  },
  user: {
    type: 'string',
    validator(rule, value) {
      return mocked.users.some(it => it.id === value);
    },
  },
};

export const postValidator = new Schema(postRule);
