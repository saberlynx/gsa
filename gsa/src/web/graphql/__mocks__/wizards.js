/* Copyright (C) 2020 Greenbone Networks GmbH
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import Event from 'gmp/models/event';

import date from 'gmp/models/date';

import {ALL_IANA_ASSIGNED_TCP} from 'gmp/models/portlist';
import {FULL_AND_FAST_SCAN_CONFIG_ID} from 'gmp/models/scanconfig';
import {OPENVAS_DEFAULT_SCANNER_ID} from 'gmp/models/scanner';

import {hasValue} from 'gmp/utils/identity';

import {CREATE_ALERT} from 'web/graphql/alerts';

import {CREATE_SCHEDULE} from 'web/graphql/schedules';

import {CREATE_TARGET} from 'web/graphql/targets';
import {CREATE_TASK, START_TASK, MODIFY_TASK} from 'web/graphql/tasks';

import {
  INCLUDE_MESSAGE_DEFAULT,
  DEFAULT_NOTICE_REPORT_FORMAT,
} from 'web/pages/alerts/dialog';

import {createGenericQueryMock} from 'web/utils/testing';

const mockDate = date('2020-03-28');
const mockTimezone = 'Europe/Berlin';

export const createTargetInput = startDate => {
  return {
    input: {
      name: `Target for immediate scan of IP 127.0.0.1, 192.168.0.1 - ${startDate.toISOString()}`,
      hosts: '127.0.0.1, 192.168.0.1',
      portListId: ALL_IANA_ASSIGNED_TCP,
    },
  };
};

const createTargetResult = {
  createTarget: {
    id: '13579',
    status: 200,
  },
};

export const createTaskInput = {
  input: {
    name: 'Immediate scan of IP 127.0.0.1, 192.168.0.1',
    configId: FULL_AND_FAST_SCAN_CONFIG_ID,
    targetId: '13579',
    scannerId: OPENVAS_DEFAULT_SCANNER_ID,
  },
};

const createTaskResult = {
  createTask: {
    id: '24680',
    status: 200,
  },
};

export const startTaskInput = {id: '24680'};

export const startTaskResult = {
  startTask: {
    reportId: '13245',
  },
};

export const createWizardTargetQueryMock = (startDate = mockDate, errors) =>
  createGenericQueryMock(
    CREATE_TARGET,
    createTargetResult,
    createTargetInput(startDate),
    errors,
  );

export const createWizardTaskQueryMock = errors =>
  createGenericQueryMock(
    CREATE_TASK,
    createTaskResult,
    createTaskInput,
    errors,
  );

export const createWizardStartTaskQueryMock = errors =>
  createGenericQueryMock(START_TASK, startTaskResult, startTaskInput, errors);

export const createScheduleInput = (taskName, startDate, startTimezone) => {
  const event = Event.fromData({startDate}, startTimezone);

  return {
    input: {
      name: `Schedule for ${taskName} - ${startDate.toISOString()}`,
      icalendar: event.toIcalString(),
      timezone: startTimezone,
      comment: 'Automatically generated by wizard',
    },
  };
};
const createScheduleResult = {
  createSchedule: {
    id: '12345',
    status: 200,
  },
};

export const createWizardScheduleQueryMock = (
  taskName = 'Foo',
  startDate = mockDate,
  startTimezone = mockTimezone,
  errors,
) =>
  createGenericQueryMock(
    CREATE_SCHEDULE,
    createScheduleResult,
    createScheduleInput(taskName, startDate, startTimezone),
    errors,
  );

const createAlertResult = {
  createAlert: {
    id: '23456',
    status: 200,
  },
};

export const createAlertInput = (taskName, startDate) => {
  return {
    input: {
      name: `Email Alert for ${taskName} - ${startDate.toISOString()}`,
      comment: 'Automatically generated by wizard',
      event: 'TASK_RUN_STATUS_CHANGED',
      eventData: {
        status: 'DONE',
      },
      method: 'EMAIL',
      methodData: {
        to_address: 'foo@bar.com',
        from_address: 'foo@bar.com',
        message: INCLUDE_MESSAGE_DEFAULT,
        notice: 0,
        notice_report_format: DEFAULT_NOTICE_REPORT_FORMAT,
      },
      condition: 'ALWAYS',
    },
  };
};

export const createWizardAlertQueryMock = (
  taskName = 'Foo',
  startDate = mockDate,
  errors,
) =>
  createGenericQueryMock(
    CREATE_ALERT,
    createAlertResult,
    createAlertInput(taskName, startDate),
    errors,
  );

const modifyTaskResult = {
  modifyTask: {
    ok: true,
  },
};

export const createWizardModifyTaskQueryMock = (scheduleId, alertId) => {
  const modifyTaskInput = {
    input: {
      id: '13579',
      scheduleId: hasValue(scheduleId) ? scheduleId : null,
      alertIds: hasValue(alertId) ? ['34567', alertId] : null,
    },
  };

  return createGenericQueryMock(MODIFY_TASK, modifyTaskResult, modifyTaskInput);
};

const advancedWizardTargetInput = (taskName, startDate) => {
  return {
    input: {
      name: `Target for ${taskName} - ${startDate.toISOString()}`,
      hosts: '127.0.0.1, 192.168.0.1',
      portListId: ALL_IANA_ASSIGNED_TCP,
      esxiCredentialId: '11111',
      sshCredentialId: null,
      sshCredentialPort: 22,
      smbCredentialId: null,
      comment: 'Automatically generated by wizard',
    },
  };
};

export const createAdvancedWizardTargetQueryMock = (
  taskName = 'Foo',
  startDate = mockDate,
) =>
  createGenericQueryMock(
    CREATE_TARGET,
    createTargetResult,
    advancedWizardTargetInput(taskName, startDate),
  );

export const createAdvancedWizardCreateTaskQueryMock = (
  taskName = 'Foo',
  scheduleId,
  alertId,
) => {
  const advancedWizardCreateTaskInput = {
    input: {
      name: taskName,
      configId: '08642',
      targetId: '13579',
      scannerId: OPENVAS_DEFAULT_SCANNER_ID,
      scheduleId: hasValue(scheduleId) ? scheduleId : null,
      alertIds: hasValue(alertId) ? [alertId] : null,
      comment: 'Automatically generated by wizard',
    },
  };

  return createGenericQueryMock(
    CREATE_TASK,
    createTaskResult,
    advancedWizardCreateTaskInput,
  );
};
