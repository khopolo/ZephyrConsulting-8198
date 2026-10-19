import { base } from '../__core/app';
import { admin } from '../middleware/auth';
import { db } from '../database';
import { readinessEvidence } from '../database/schema';
import { assessReadiness, publicReadiness } from '../services/readiness';

export const readiness = {
  status: base.handler(async () => publicReadiness(assessReadiness(process.env, await db.select().from(readinessEvidence)))),
  administration: admin.handler(async () => {
    const evidence = await db.select().from(readinessEvidence);
    return { ...assessReadiness(process.env, evidence), evidence };
  }),
};