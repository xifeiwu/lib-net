import {uuid} from '../../node';
import {users} from './mock-data';

export const prefix = '/api/forum';

const notificationTemplates = ['poked you', 'says hi!', `is glad we're friends`, 'sent you a gift'];
export function getRandom(max: number) {
  return Math.floor(Math.random() * max);
}
function randomFromArray(arr: any[]) {
  return arr[getRandom(arr.length)];
}

function dateToISO(date: Date | string | number) {
  return new Date(date).toISOString();
}
function generateISODate(startDate: Date) {
  const stepCntInMinute = (Date.now() - startDate.getTime()) / 1000;
  const step = getRandom(stepCntInMinute);
  return dateToISO(startDate.getTime() + step * 1000);
}

export function generateRandomNotifications(since: string | number, numNotifications: number) {
  const now = new Date();
  let pastDate;

  if (since) {
    pastDate = new Date(since);
  } else {
    pastDate = new Date(now.valueOf());
    pastDate.setMinutes(pastDate.getMinutes() - 15);
  }

  // Create N random notifications. We won't bother saving these
  // in the DB - just generate a new batch and return them.
  const notifications = [...Array(numNotifications)].map(() => {
    const user = randomFromArray(users);
    const template = randomFromArray(notificationTemplates);
    return {
      id: uuid(),
      date: generateISODate(pastDate),
      message: template,
      user: user.id,
    };
  });

  return notifications;
}

