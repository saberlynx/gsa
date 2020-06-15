/* Copyright (C) 2017-2020 Greenbone Networks GmbH
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
/* eslint-disable react-hooks/exhaustive-deps */

import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';

import _ from 'gmp/locale';
import {shortDate} from 'gmp/locale/date';

import Filter from 'gmp/models/filter';

import {hasValue} from 'gmp/utils/identity';

import {TARGET_CREDENTIAL_NAMES} from 'gmp/models/target';

import Task from 'gmp/models/task';

import Badge from 'web/components/badge/badge';

import Divider from 'web/components/layout/divider';
import IconDivider from 'web/components/layout/icondivider';
import Layout from 'web/components/layout/layout';
import PageTitle from 'web/components/layout/pagetitle';

import DetailsLink from 'web/components/link/detailslink';
import Link from 'web/components/link/link';

import AlterableIcon from 'web/components/icon/alterableicon';
import ExportIcon from 'web/components/icon/exporticon';
import ListIcon from 'web/components/icon/listicon';
import ManualIcon from 'web/components/icon/manualicon';
import NoteIcon from 'web/components/icon/noteicon';
import OverrideIcon from 'web/components/icon/overrideicon';
import ReportIcon from 'web/components/icon/reporticon';
import ResultIcon from 'web/components/icon/resulticon';
import TaskIcon from 'web/components/icon/taskicon';

import {
  NO_RELOAD,
  USE_DEFAULT_RELOAD_INTERVAL,
  USE_DEFAULT_RELOAD_INTERVAL_ACTIVE,
} from 'web/components/loading/reload';

import Tab from 'web/components/tab/tab';
import TabLayout from 'web/components/tab/tablayout';
import TabList from 'web/components/tab/tablist';
import TabPanel from 'web/components/tab/tabpanel';
import TabPanels from 'web/components/tab/tabpanels';
import Tabs from 'web/components/tab/tabs';

import InfoTable from 'web/components/table/infotable';
import TableBody from 'web/components/table/body';
import TableData from 'web/components/table/data';
import TableRow from 'web/components/table/row';

import EntityPage, {Col} from 'web/entity/page';
import EntityPermissions from 'web/entity/permissions';
import {goto_list} from 'web/entity/component';
import EntitiesTab from 'web/entity/tab';
import EntityTags from 'web/entity/tags';
import withEntityContainer, {
  permissionsResourceFilter,
} from 'web/entity/withEntityContainer';

import CloneIcon from 'web/entity/icon/cloneicon';
import EditIcon from 'web/entity/icon/editicon';
import TrashIcon from 'web/entity/icon/trashicon';

import {
  useCloneTask,
  useDeleteTask,
  useGetTask,
  useStartTask,
} from 'web/graphql/tasks';

import {
  selector as notesSelector,
  loadEntities as loadNotes,
} from 'web/store/entities/notes';
import {
  selector as overridesSelector,
  loadEntities as loadOverrides,
} from 'web/store/entities/overrides';
import {
  selector as permissionsSelector,
  loadEntities as loadPermissions,
} from 'web/store/entities/permissions';
import {
  selector as taskSelector,
  loadEntity as loadTask,
} from 'web/store/entities/tasks';

import PropTypes from 'web/utils/proptypes';
import {renderYesNo} from 'web/utils/render';
import withComponentDefaults from 'web/utils/withComponentDefaults';

import ImportReportIcon from './icons/importreporticon';
import NewIconMenu from './icons/newiconmenu';
import ResumeIcon from './icons/resumeicon';
import ScheduleIcon from './icons/scheduleicon';
import StartIcon from './icons/starticon';
import StopIcon from './icons/stopicon';

import TaskDetails from './details';
import TaskStatus from './status';
import TaskComponent from './component';

const goto_task_details = (op, props) => result => {
  const {history} = props;
  return history.push('/task/' + result.data[op].taskId);
};

export const ToolBarIcons = ({
  entity,
  links,
  notes = [],
  overrides = [],
  onTaskDeleteClick,
  onTaskCloneClick,
  onTaskDownloadClick,
  onTaskEditClick,
  onReportImportClick,
  onTaskCreateClick,
  onContainerTaskCreateClick,
  onTaskStartClick,
  onTaskStopClick,
  onTaskResumeClick,
  ...props
}) => {
  const reportsCounts = entity.reports.counts;
  const currentResults = entity.results?.counts?.current;
  const {lastReport, currentReport} = entity.reports;
  return (
    <Divider margin="10px">
      <IconDivider align={['start', 'start']}>
        <ManualIcon
          page="scanning"
          anchor="managing-tasks"
          title={_('Help: Tasks')}
        />
        <ListIcon title={_('Task List')} page="tasks" />
        {entity.isAlterable() && !entity.isNew() && (
          <AlterableIcon
            title={_(
              'This is an Alterable Task. Reports may not relate to ' +
                'current Scan Config or Target!',
            )}
          />
        )}
      </IconDivider>

      <IconDivider>
        <NewIconMenu
          onNewClick={onTaskCreateClick}
          onNewContainerClick={onContainerTaskCreateClick}
        />
        <CloneIcon
          entity={entity}
          name="task"
          onClick={() => onTaskCloneClick({taskId: entity.id})}
        />
        <EditIcon entity={entity} name="task" onClick={onTaskEditClick} />
        <TrashIcon
          entity={entity}
          name="task"
          onClick={() => onTaskDeleteClick({taskId: entity.id})}
        />
        <ExportIcon
          value={entity}
          title={_('Export Task as XML')}
          onClick={onTaskDownloadClick}
        />
      </IconDivider>

      <IconDivider>
        {hasValue(entity.schedule) && (
          <ScheduleIcon
            schedule={entity.schedule}
            schedulePeriods={entity.schedule_periods}
            links={links}
          />
        )}
        <StartIcon
          task={entity}
          onClick={() => onTaskStartClick({taskId: entity.id})}
        />

        <ImportReportIcon task={entity} onClick={onReportImportClick} />

        <StopIcon task={entity} onClick={onTaskStopClick} />

        {!entity.isContainer() && (
          <ResumeIcon task={entity} onClick={onTaskResumeClick} />
        )}
      </IconDivider>

      <Divider margin="10px">
        <IconDivider>
          {hasValue(currentReport) && (
            <DetailsLink
              type="report"
              id={currentReport.id}
              title={_('Current Report for Task {{- name}} from {{- date}}', {
                name: entity.name,
                date: shortDate(currentReport.scanStart),
              })}
            >
              <ReportIcon />
            </DetailsLink>
          )}
          {!hasValue(currentReport) && hasValue(lastReport) && (
            <DetailsLink
              type="report"
              id={lastReport.id}
              title={_('Last Report for Task {{- name}} from {{- date}}', {
                name: entity.name,
                date: shortDate(lastReport.scanStart),
              })}
            >
              <ReportIcon />
            </DetailsLink>
          )}

          <Link
            to="reports"
            filter={'task_id=' + entity.id}
            title={_('Total Reports for Task {{- name}}', entity)}
          >
            <Badge content={reportsCounts.total}>
              <ReportIcon />
            </Badge>
          </Link>
        </IconDivider>

        <Link
          to="results"
          filter={'task_id=' + entity.id}
          title={_('Results for Task {{- name}}', entity)}
        >
          <Badge content={currentResults}>
            <ResultIcon />
          </Badge>
        </Link>

        <IconDivider>
          <Link
            to="notes"
            filter={'task_id=' + entity.id}
            title={_('Notes for Task {{- name}}', entity)}
          >
            <Badge content={notes.length}>
              <NoteIcon />
            </Badge>
          </Link>

          <Link
            to="overrides"
            filter={'task_id=' + entity.id}
            title={_('Overrides for Task {{- name}}', entity)}
          >
            <Badge content={overrides.length}>
              <OverrideIcon />
            </Badge>
          </Link>
        </IconDivider>
      </Divider>
    </Divider>
  );
};

ToolBarIcons.propTypes = {
  entity: PropTypes.model.isRequired,
  links: PropTypes.bool,
  notes: PropTypes.array,
  overrides: PropTypes.array,
  onContainerTaskCreateClick: PropTypes.func.isRequired,
  onReportImportClick: PropTypes.func.isRequired,
  onTaskCloneClick: PropTypes.func.isRequired,
  onTaskCreateClick: PropTypes.func.isRequired,
  onTaskDeleteClick: PropTypes.func.isRequired,
  onTaskDownloadClick: PropTypes.func.isRequired,
  onTaskEditClick: PropTypes.func.isRequired,
  onTaskResumeClick: PropTypes.func.isRequired,
  onTaskStartClick: PropTypes.func.isRequired,
  onTaskStopClick: PropTypes.func.isRequired,
};

const Details = ({entity, ...props}) => {
  return (
    <Layout flex="column">
      <InfoTable>
        <colgroup>
          <Col width="10%" />
          <Col width="90%" />
        </colgroup>
        <TableBody>
          <TableRow>
            <TableData>{_('Name')}</TableData>
            <TableData>{entity.name}</TableData>
          </TableRow>

          <TableRow>
            <TableData>{_('Comment')}</TableData>
            <TableData>{entity.comment}</TableData>
          </TableRow>

          <TableRow>
            <TableData>{_('Alterable')}</TableData>
            <TableData>{renderYesNo(entity.isAlterable())}</TableData>
          </TableRow>

          <TableRow>
            <TableData>{_('Status')}</TableData>
            <TableData>
              <TaskStatus task={entity} />
            </TableData>
          </TableRow>
        </TableBody>
      </InfoTable>

      <TaskDetails entity={entity} {...props} />
    </Layout>
  );
};

Details.propTypes = {
  entity: PropTypes.model.isRequired,
};

const Page = props => {
  const {id} = useParams();
  const query = useGetTask();
  const {data, refetch, loading} = query({id});

  const clone = useCloneTask();
  const cloneTask = vars =>
    clone(vars).then(goto_task_details('cloneTask', props));

  const start = useStartTask();
  const startTask = vars => start(vars).then(refetch);

  const del = useDeleteTask();
  const deleteTask = vars => del(vars).then(goto_list('tasks', props));

  const [entity, setEntity] = useState();
  useEffect(() => {
    if (hasValue(data)) {
      setEntity(Task.fromObject(data.task));
    } else {
      setEntity();
    }
  }, [data]);

  useEffect(() => {
    const {history} = props;
    if (hasValue(entity) && entity.usageType === 'audit') {
      return history.replace('/audit/' + entity.id);
    }
  }, [props]);

  const {
    permissions = [],
    onChanged,
    onDownloaded,
    onError,
    onInteraction,
  } = props;
  return (
    <TaskComponent
      onCloned={onChanged}
      onCloneError={onError}
      onCreated={goto_task_details('createTask', props)}
      onContainerCreated={goto_task_details('createContainerTask', props)}
      onContainerSaved={refetch}
      onDeleted={goto_list('tasks', props)}
      onDeleteError={onError}
      onDownloaded={onDownloaded}
      onDownloadError={onError}
      onInteraction={onInteraction}
      onReportImported={onChanged}
      onResumed={onChanged}
      onResumeError={onError}
      onSaved={refetch}
      onStarted={onChanged}
      onStartError={onError}
      onStopped={onChanged}
      onStopError={onError}
    >
      {({
        create,
        createcontainer,
        download,
        edit,
        stop,
        resume,
        reportimport,
      }) => {
        return (
          <EntityPage
            {...props}
            entity={entity}
            isLoading={loading}
            sectionIcon={<TaskIcon size="large" />}
            title={_('Task')}
            toolBarIcons={ToolBarIcons}
            onChanged={onChanged}
            onContainerTaskCreateClick={createcontainer}
            onError={onError}
            onInteraction={onInteraction}
            onReportImportClick={reportimport}
            onTaskCloneClick={cloneTask} // Clone is special because TaskComponent doesn't define it, so I'm assuming that EntityComponent is passing this method instead
            onTaskCreateClick={create}
            onTaskDeleteClick={deleteTask}
            onTaskDownloadClick={download}
            onTaskEditClick={edit}
            onTaskResumeClick={resume}
            onTaskStartClick={startTask}
            onTaskStopClick={stop}
          >
            {({activeTab = 0, onActivateTab}) => {
              return (
                <React.Fragment>
                  <PageTitle title={_('Task: {{name}}', {name: entity.name})} />
                  <Layout grow="1" flex="column">
                    <TabLayout grow="1" align={['start', 'end']}>
                      <TabList
                        active={activeTab}
                        align={['start', 'stretch']}
                        onActivateTab={onActivateTab}
                      >
                        <Tab>{_('Information')}</Tab>
                        <EntitiesTab entities={entity.userTags}>
                          {_('User Tags')}
                        </EntitiesTab>
                        <EntitiesTab entities={permissions}>
                          {_('Permissions')}
                        </EntitiesTab>
                      </TabList>
                    </TabLayout>

                    <Tabs active={activeTab}>
                      <TabPanels>
                        <TabPanel>
                          <Details entity={entity} />
                        </TabPanel>
                        <TabPanel>
                          <EntityTags
                            entity={entity}
                            onChanged={refetch}
                            onError={onError}
                            onInteraction={onInteraction}
                          />
                        </TabPanel>
                        <TabPanel>
                          <TaskPermissions
                            entity={entity}
                            permissions={permissions}
                            onChanged={onChanged}
                            onDownloaded={onDownloaded}
                            onInteraction={onInteraction}
                            onError={onError}
                          />
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                  </Layout>
                </React.Fragment>
              );
            }}
          </EntityPage>
        );
      }}
    </TaskComponent>
  );
};

Page.propTypes = {
  entity: PropTypes.model,
  history: PropTypes.object.isRequired,
  permissions: PropTypes.array,
  onChanged: PropTypes.func.isRequired,
  onDownloaded: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
  onInteraction: PropTypes.func.isRequired,
};

export const TaskPermissions = withComponentDefaults({
  relatedResourcesLoaders: [
    ({entity, gmp}) =>
      hasValue(entity.alerts)
        ? Promise.resolve([...entity.alerts])
        : Promise.resolve([]),
    ({entity, gmp}) => {
      const resources = [];
      const names = ['config', 'scanner', 'schedule'];

      for (const name of names) {
        if (hasValue(entity[name])) {
          resources.push(entity[name]);
        }
      }
      return Promise.resolve(resources);
    },
    ({entity, gmp}) => {
      if (hasValue(entity.target)) {
        return gmp.target.get(entity.target).then(response => {
          const target = response.data;
          const resources = [target];

          for (const name of ['port_list', ...TARGET_CREDENTIAL_NAMES]) {
            const cred = target[name];
            if (hasValue(cred)) {
              resources.push(cred);
            }
          }
          return resources;
        });
      }
      return Promise.resolve([]);
    },
  ],
})(EntityPermissions);

const taskIdFilter = id => Filter.fromString('task_id=' + id).all();

const mapStateToProps = (rootState, {id}) => {
  const permSel = permissionsSelector(rootState);
  const notesSel = notesSelector(rootState);
  const overridesSel = overridesSelector(rootState);
  return {
    notes: notesSel.getEntities(taskIdFilter(id)),
    overrides: overridesSel.getEntities(taskIdFilter(id)),
    permissions: permSel.getEntities(permissionsResourceFilter(id)),
  };
};

const load = gmp => {
  const loadTaskFunc = loadTask(gmp);
  const loadPermissionsFunc = loadPermissions(gmp);
  const loadNotesFunc = loadNotes(gmp);
  const loadOverridesFunc = loadOverrides(gmp);

  if (gmp.settings.enableHyperionOnly) {
    return id => dispatch => Promise.resolve(); // promise is required by withEntityContainer
  }

  return id => dispatch =>
    Promise.all([
      dispatch(loadTaskFunc(id)),
      dispatch(loadPermissionsFunc(permissionsResourceFilter(id))),
      dispatch(loadNotesFunc(taskIdFilter(id))),
      dispatch(loadOverridesFunc(taskIdFilter(id))),
    ]);
};

export const reloadInterval = ({entity}) => {
  if (!hasValue(entity) || entity.isContainer()) {
    return NO_RELOAD;
  }
  return entity.isActive()
    ? USE_DEFAULT_RELOAD_INTERVAL_ACTIVE
    : USE_DEFAULT_RELOAD_INTERVAL;
};

export default withEntityContainer('task', {
  load,
  entitySelector: taskSelector,
  mapStateToProps,
  reloadInterval,
})(Page);

// vim: set ts=2 sw=2 tw=80:
