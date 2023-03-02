/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

// For GUI
import { ASSIGNMENT } from '@/assignment/enum';
import { assignmentJSON } from '@/assignment/json';
import { assignmentRegExp } from '@/assignment/reg-exp';
import { assignmentXML } from '@/assignment/xml';
import { assignmentJSONPath } from '@/assignment/json-path';
import { assignmentHTML } from '@/assignment/html';

import { GetOptions } from '@/assignment/types';

export { assignmentJSON } from '@/assignment/json';
export { assignmentRegExp } from '@/assignment/reg-exp';
export { assignmentXML } from '@/assignment/xml';
export { assignmentJSONPath } from '@/assignment/json-path';
export { assignmentHTML } from '@/assignment/html';

export { AssignmentOptions } from '@/assignment/types';
export { ASSIGNMENT } from '@/assignment/enum';

export const ASSIGNMENT_FUNCTION = {
  [ASSIGNMENT.GET]: (opt: GetOptions): unknown => opt.content,
  [ASSIGNMENT.JSON]: assignmentJSON,
  [ASSIGNMENT.REGEXP]: assignmentRegExp,
  [ASSIGNMENT.XML]: assignmentXML,
  [ASSIGNMENT.JSON_PATH]: assignmentJSONPath,
  [ASSIGNMENT.HTML]: assignmentHTML,
};
