import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// If a contributor has not confirmed receipt within five hours,
// raise it so an admin can chase it.
crons.interval(
  'escalate unconfirmed withdrawals',
  { hours: 1 },
  internal.withdrawals.escalateUnconfirmed,
);

export default crons;
