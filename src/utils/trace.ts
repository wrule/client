/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import crypto from 'node:crypto';

export const createTracing = (): string => `00-${crypto.randomBytes(16).toString('hex')}-${crypto.randomBytes(8).toString('hex')}-01`;
