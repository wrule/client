/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { ASSIGNMENT, AssignmentOptions } from '@/assignment';
import * as Option from '@/assignment/types';

interface BaseAssignment {
  readonly var: string;
  readonly method: ASSIGNMENT;
  readonly params: AssignmentOptions;
}

interface GetAssignment extends BaseAssignment {
  readonly method: ASSIGNMENT.GET;
  readonly params: Option.GetOptions;
}

interface JSONAssignment extends BaseAssignment {
  readonly method: ASSIGNMENT.JSON;
  readonly params: Option.JSONOptions;
}

interface XMLAssignment extends BaseAssignment {
  readonly method: ASSIGNMENT.XML;
  readonly params: Option.XMLOptions;
}

interface RegExpAssignment extends BaseAssignment {
  readonly method: ASSIGNMENT.REGEXP;
  readonly params: Option.RegExpOptions;
}

interface HTMLAssignment extends BaseAssignment {
  readonly method: ASSIGNMENT.HTML;
  readonly params: Option.HTMLOptions;
}

interface JSONPathAssignment extends BaseAssignment {
  readonly method: ASSIGNMENT.JSON_PATH;
  readonly params: Option.JSONPathOptions;
}

export type Assignment = GetAssignment | JSONAssignment | XMLAssignment | RegExpAssignment | HTMLAssignment | JSONPathAssignment;
