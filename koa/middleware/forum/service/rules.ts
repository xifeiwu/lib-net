import Schema, {Rules, ValidateError, Values} from 'async-validator';
import {mocked} from './mock-data';
import {Post} from './types/frontend';

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

const postPostRule: Rules = {
  id: {
    type: 'string',
    required: true,
  },
  date: {
    type: 'string',
    // required: false,
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

export const postPostValidator = new Schema(postPostRule);

const patchPostRule = {...postPostRule};
delete patchPostRule.user;
export const patchPostValidator = new Schema(patchPostRule);

export async function validate(rules: Schema, data: Values) {
  try {
    const success = await rules.validate(data);
    return {success};
  } catch (err) {
    // return err;
    return {
      success: false,
      message: JSON.stringify(err.fields),
    };
  }
}
