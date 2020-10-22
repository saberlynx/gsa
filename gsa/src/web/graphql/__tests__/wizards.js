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

/* eslint-disable react/prop-types */

import React, {useState} from 'react';
import {v4 as uuid} from 'uuid';

import {GraphQLError} from 'graphql';

import date, {setLocale} from 'gmp/models/date';
import {hasValue} from 'gmp/utils/identity';

import {rendererWith, screen, wait, fireEvent} from 'web/utils/testing';

import {
  useRunQuickFirstScan,
  useRunModifyTask,
  useRunQuickTask,
} from '../wizards';

import {
  createWizardTargetQueryMock,
  createWizardStartTaskQueryMock,
  createWizardTaskQueryMock,
  createWizardScheduleQueryMock,
  createWizardAlertQueryMock,
  createWizardModifyTaskQueryMock,
  createAdvancedWizardCreateTaskQueryMock,
  createAdvancedWizardTargetQueryMock,
} from '../__mocks__/wizards';

setLocale('en'); // Required for composing wizard entity name

jest.mock('uuid');

uuid.mockImplementation(() => 'fakeUUID123'); // fix event.uid generated by event.fromData

const RealDate = Date;

const mockDate = new Date(1554632430000);

beforeAll(() => {
  global.Date = jest.fn(() => mockDate);
  global.Date.now = jest.fn(() => mockDate.getTime());
});

afterAll(() => {
  global.Date = RealDate;
  global.Date.now = RealDate.now;
});

const startDate = date();
const startTimezone = 'Europe/Berlin';

const RunQuickFirstScanComponent = () => {
  const [runQuickFirstScan] = useRunQuickFirstScan();
  const [reportId, setReportId] = useState();
  const [error, setError] = useState();

  const handleRunQuickFirstScan = () =>
    runQuickFirstScan({hosts: '127.0.0.1, 192.168.0.1'})
      .then(id => setReportId(id))
      .catch(err => setError(err.message));

  return (
    <div>
      {reportId && (
        <span data-testid="started-task">{`Task started with report ${reportId}`}</span>
      )}
      {error && (
        <span data-testid="error">{`There was an error in the request: ${error}`}</span>
      )}
      <button data-testid="wizard" onClick={handleRunQuickFirstScan} />
    </div>
  );
};

describe('useRunQuickFirstScan tests', () => {
  test('Should create target, run and start task after user interaction', async () => {
    const [targetMock, targetResult] = createWizardTargetQueryMock(startDate);
    const [taskMock, taskResult] = createWizardTaskQueryMock();
    const [startTaskMock, startTaskResult] = createWizardStartTaskQueryMock();

    const {render} = rendererWith({
      queryMocks: [targetMock, taskMock, startTaskMock],
    });

    render(<RunQuickFirstScanComponent />);

    const button = screen.getByTestId('wizard');
    fireEvent.click(button);

    await wait();

    expect(targetResult).toHaveBeenCalled();

    await wait();

    expect(taskResult).toHaveBeenCalled();

    await wait();

    expect(startTaskResult).toHaveBeenCalled();

    const startTaskReportId = await screen.getByTestId('started-task');
    expect(startTaskReportId).toHaveTextContent(
      'Task started with report 13245',
    );
    expect(screen.queryByTestId('error')).not.toBeInTheDocument();
  });

  test('Should gracefully catch error in promise chain', async () => {
    const error = new GraphQLError('Oops. Something went wrong :(');
    const [targetMock, targetResult] = createWizardTargetQueryMock(startDate);
    const [taskMock, taskResult] = createWizardTaskQueryMock([error]);
    const [startTaskMock, startTaskResult] = createWizardStartTaskQueryMock();

    const {render} = rendererWith({
      queryMocks: [targetMock, taskMock, startTaskMock],
    });

    render(<RunQuickFirstScanComponent />);

    const button = screen.getByTestId('wizard');
    fireEvent.click(button);

    await wait();

    expect(targetResult).toHaveBeenCalled();

    await wait();

    expect(taskResult).toHaveBeenCalled();

    await wait();

    expect(startTaskResult).not.toHaveBeenCalled();

    expect(screen.queryByTestId('started-task')).not.toBeInTheDocument();

    const gqlError = screen.queryByTestId('error');

    expect(gqlError).toHaveTextContent(
      'There was an error in the request: Oops. Something went wrong :(',
    );
  });
});

const RunModifyTaskComponent = ({alertEmail, reschedule}) => {
  const [runModifyTask] = useRunModifyTask();
  const [ok, setOk] = useState(false);
  const [error, setError] = useState();

  const handleRunModifyTask = () => {
    runModifyTask({
      alertEmail,
      startDate,
      startTimezone,
      reschedule,
      tasks: [
        {
          name: 'myFirstTask',
          id: '13579',
          alerts: [{id: '34567'}],
        },
      ],
    })
      .then(() => setOk(true))
      .catch(err => setError(err.message));
  };

  return (
    <div>
      {ok && <span data-testid="modify-task">{'Task modified'}</span>}
      {error && (
        <span data-testid="error">{`There was an error in the request: ${error}`}</span>
      )}
      <button data-testid="wizard" onClick={handleRunModifyTask} />
    </div>
  );
};

describe('useRunModifyTask tests', () => {
  test('Should create schedule, alert, and modify task after user interaction', async () => {
    const [scheduleMock, scheduleResult] = createWizardScheduleQueryMock(
      'myFirstTask',
      startDate,
      startTimezone,
    );
    const [alertMock, alertResult] = createWizardAlertQueryMock(
      'myFirstTask',
      startDate,
    );
    const [modifyTaskMock, modifyTaskResult] = createWizardModifyTaskQueryMock(
      '12345',
      '23456',
    );

    const {render} = rendererWith({
      queryMocks: [scheduleMock, alertMock, modifyTaskMock],
    });

    render(
      <RunModifyTaskComponent alertEmail={'foo@bar.com'} reschedule={1} />,
    );

    const button = screen.getByTestId('wizard');
    fireEvent.click(button);

    await wait();

    expect(scheduleResult).toHaveBeenCalled();

    await wait();

    expect(alertResult).toHaveBeenCalled();

    await wait();

    expect(modifyTaskResult).toHaveBeenCalled();

    const taskModified = await screen.getByTestId('modify-task');
    expect(taskModified).toHaveTextContent('Task modified');
    expect(screen.queryByTestId('error')).not.toBeInTheDocument();
  });

  test('Should gracefully catch error in promise chain', async () => {
    const error = new GraphQLError('Oops. Something went wrong :(');
    const [
      scheduleMock,
      scheduleResult,
    ] = createWizardScheduleQueryMock('myFirstTask', startDate, startTimezone, [
      error,
    ]);
    const [alertMock, alertResult] = createWizardAlertQueryMock(
      'myFirstTask',
      startDate,
    );
    const [modifyTaskMock, modifyTaskResult] = createWizardModifyTaskQueryMock(
      '12345',
      '23456',
    );

    const {render} = rendererWith({
      queryMocks: [scheduleMock, alertMock, modifyTaskMock],
    });

    render(
      <RunModifyTaskComponent alertEmail={'foo@bar.com'} reschedule={1} />,
    );

    const button = screen.getByTestId('wizard');
    fireEvent.click(button);

    await wait();

    expect(scheduleResult).toHaveBeenCalled();

    await wait();

    expect(alertResult).not.toHaveBeenCalled();

    await wait();

    expect(modifyTaskResult).not.toHaveBeenCalled();

    expect(screen.queryByTestId('modify-task')).not.toBeInTheDocument();

    const gqlError = screen.queryByTestId('error');

    expect(gqlError).toHaveTextContent(
      'There was an error in the request: Oops. Something went wrong :(',
    );
  });

  test('Should not create a schedule if reschedule is 0', async () => {
    const [scheduleMock, scheduleResult] = createWizardScheduleQueryMock(
      'myFirstTask',
      startDate,
      startTimezone,
    );
    const [alertMock, alertResult] = createWizardAlertQueryMock(
      'myFirstTask',
      startDate,
    );
    const [modifyTaskMock, modifyTaskResult] = createWizardModifyTaskQueryMock(
      undefined,
      '23456',
    );

    const {render} = rendererWith({
      queryMocks: [scheduleMock, alertMock, modifyTaskMock],
    });

    render(
      <RunModifyTaskComponent alertEmail={'foo@bar.com'} reschedule={0} />,
    );

    const button = screen.getByTestId('wizard');
    fireEvent.click(button);

    await wait();

    expect(scheduleResult).not.toHaveBeenCalled();

    await wait();

    expect(alertResult).toHaveBeenCalled();

    await wait();

    expect(modifyTaskResult).toHaveBeenCalled();

    const taskModified = await screen.getByTestId('modify-task');
    expect(taskModified).toHaveTextContent('Task modified');
    expect(screen.queryByTestId('error')).not.toBeInTheDocument();
  });

  test('Should not create an alert if alertEmail is empty string', async () => {
    const [scheduleMock, scheduleResult] = createWizardScheduleQueryMock(
      'myFirstTask',
      startDate,
      startTimezone,
    );
    const [alertMock, alertResult] = createWizardAlertQueryMock(
      'myFirstTask',
      startDate,
    );
    const [modifyTaskMock, modifyTaskResult] = createWizardModifyTaskQueryMock(
      '12345',
      undefined,
    );

    const {render} = rendererWith({
      queryMocks: [scheduleMock, alertMock, modifyTaskMock],
    });

    render(<RunModifyTaskComponent alertEmail={''} reschedule={1} />);

    const button = screen.getByTestId('wizard');
    fireEvent.click(button);

    await wait();

    expect(scheduleResult).toHaveBeenCalled();

    await wait();

    expect(alertResult).not.toHaveBeenCalled();

    await wait();

    expect(modifyTaskResult).toHaveBeenCalled();

    const taskModified = await screen.getByTestId('modify-task');
    expect(taskModified).toHaveTextContent('Task modified');
    expect(screen.queryByTestId('error')).not.toBeInTheDocument();
  });
});

const RunQuickTaskComponent = ({alertEmail, autoStart}) => {
  const [runQuickTask] = useRunQuickTask();
  const [reportId, setReportId] = useState();
  const [error, setError] = useState();

  const handleRunQuickTask = async () => {
    try {
      await runQuickTask({
        taskName: 'New Quick Task',
        alertEmail,
        autoStart,
        configId: '08642',
        esxiCredential: '11111',
        smbCredential: '',
        sshCredential: '',
        targetHosts: '127.0.0.1, 192.168.0.1',
        sshPort: 22,
        startDate,
        startTimezone,
      }).then(id => {
        if (hasValue(id)) {
          setReportId(id);
        } else {
          setReportId('null');
        }
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {reportId && (
        <span data-testid="started-task">{`Task started with report id ${reportId}`}</span>
      )}
      {error && (
        <span data-testid="error">{`There was an error in the request: ${error}`}</span>
      )}
      <button data-testid="wizard" onClick={handleRunQuickTask} />
    </div>
  );
};

describe('useRunQuickTask tests', () => {
  test('Should create target, alert, task and start task after user interaction', async () => {
    const [scheduleMock, scheduleResult] = createWizardScheduleQueryMock(
      'New Quick Task',
      startDate,
      startTimezone,
    );
    const [alertMock, alertResult] = createWizardAlertQueryMock(
      'New Quick Task',
      startDate,
    );
    const [targetMock, targetResult] = createAdvancedWizardTargetQueryMock(
      'New Quick Task',
      startDate,
    );
    const [
      createTaskMock,
      createTaskResult,
    ] = createAdvancedWizardCreateTaskQueryMock(
      'New Quick Task',
      undefined,
      '23456',
    );
    const [startTaskMock, startTaskResult] = createWizardStartTaskQueryMock();

    const {render} = rendererWith({
      queryMocks: [
        startTaskMock,
        targetMock,
        scheduleMock,
        alertMock,
        createTaskMock,
      ],
    });

    render(
      <RunQuickTaskComponent alertEmail={'foo@bar.com'} autoStart={'2'} />,
    );

    const button = screen.getByTestId('wizard');
    fireEvent.click(button);

    await wait();

    expect(alertResult).toHaveBeenCalled();

    await wait();

    expect(scheduleResult).not.toHaveBeenCalled();

    await wait();

    expect(targetResult).toHaveBeenCalled();

    await wait();

    expect(createTaskResult).toHaveBeenCalled();

    await wait();

    expect(startTaskResult).toHaveBeenCalled();

    const taskElement = await screen.getByTestId('started-task');
    expect(taskElement).toHaveTextContent('Task started with report id 13245');
    expect(screen.queryByTestId('error')).not.toBeInTheDocument();
  });

  test('Should gracefully catch error in promise chain', async () => {
    const error = new GraphQLError('Oops. Something went wrong :(');

    const [scheduleMock, scheduleResult] = createWizardScheduleQueryMock(
      'New Quick Task',
      startDate,
      startTimezone,
    );
    const [
      alertMock,
      alertResult,
    ] = createWizardAlertQueryMock('New Quick Task', startDate, [error]);
    const [targetMock, targetResult] = createAdvancedWizardTargetQueryMock(
      'New Quick Task',
      startDate,
    );
    const [
      createTaskMock,
      createTaskResult,
    ] = createAdvancedWizardCreateTaskQueryMock(
      'New Quick Task',
      undefined,
      '23456',
    );
    const [startTaskMock, startTaskResult] = createWizardStartTaskQueryMock();

    const {render} = rendererWith({
      queryMocks: [
        startTaskMock,
        targetMock,
        scheduleMock,
        alertMock,
        createTaskMock,
      ],
    });

    render(
      <RunQuickTaskComponent alertEmail={'foo@bar.com'} autoStart={'2'} />,
    );

    const button = screen.getByTestId('wizard');
    fireEvent.click(button);

    await wait();

    expect(alertResult).toHaveBeenCalled();

    await wait();

    expect(scheduleResult).not.toHaveBeenCalled();

    await wait();

    expect(targetResult).not.toHaveBeenCalled();

    await wait();

    expect(createTaskResult).not.toHaveBeenCalled();

    await wait();

    expect(startTaskResult).not.toHaveBeenCalled();

    expect(screen.queryByTestId('started-task')).not.toBeInTheDocument();

    const gqlError = screen.queryByTestId('error');

    expect(gqlError).toHaveTextContent(
      'There was an error in the request: Oops. Something went wrong :(',
    );
  });

  test('Should not create a schedule or start task if autoStart is 0', async () => {
    const [scheduleMock, scheduleResult] = createWizardScheduleQueryMock(
      'New Quick Task',
      startDate,
      startTimezone,
    );
    const [alertMock, alertResult] = createWizardAlertQueryMock(
      'New Quick Task',
      startDate,
    );
    const [targetMock, targetResult] = createAdvancedWizardTargetQueryMock(
      'New Quick Task',
      startDate,
    );
    const [
      createTaskMock,
      createTaskResult,
    ] = createAdvancedWizardCreateTaskQueryMock(
      'New Quick Task',
      undefined,
      '23456',
    );
    const [startTaskMock, startTaskResult] = createWizardStartTaskQueryMock();

    const {render} = rendererWith({
      queryMocks: [
        startTaskMock,
        targetMock,
        scheduleMock,
        alertMock,
        createTaskMock,
      ],
    });

    render(
      <RunQuickTaskComponent alertEmail={'foo@bar.com'} autoStart={'0'} />,
    );

    const button = screen.getByTestId('wizard');
    fireEvent.click(button);

    await wait();

    expect(alertResult).toHaveBeenCalled();

    await wait();

    expect(scheduleResult).not.toHaveBeenCalled();

    await wait();

    expect(targetResult).toHaveBeenCalled();

    await wait();

    expect(createTaskResult).toHaveBeenCalled();

    await wait();

    expect(startTaskResult).not.toHaveBeenCalled();

    const startTaskReportId = await screen.getByTestId('started-task');
    expect(startTaskReportId).toHaveTextContent(
      'Task started with report id null',
    ); // task is not started
    expect(screen.queryByTestId('error')).not.toBeInTheDocument();
  });
});
