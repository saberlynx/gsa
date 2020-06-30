/* Copyright (C) 2016-2020 Greenbone Networks GmbH
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

import React, {useState, useEffect, useCallback} from 'react';

import _ from 'gmp/locale';

import {TASKS_FILTER_FILTER} from 'gmp/models/filter';

import {hasValue} from 'gmp/utils/identity';

import DashboardControls from 'web/components/dashboard/controls';

import Download from 'web/components/form/download';
import useDownload from 'web/components/form/useDownload';

import ManualIcon from 'web/components/icon/manualicon';
import TaskIcon from 'web/components/icon/taskicon';
import WizardIcon from 'web/components/icon/wizardicon';

import IconDivider from 'web/components/layout/icondivider';
import PageTitle from 'web/components/layout/pagetitle';

import useReload from 'web/components/loading/useReload';

import IconMenu from 'web/components/menu/iconmenu';
import MenuEntry from 'web/components/menu/menuentry';

import DialogNotification from 'web/components/notification/dialognotification';
import useDialogNotification from 'web/components/notification/useDialogNotification';

import EntitiesPage from 'web/entities/page';
import {
  BulkTagComponent,
  useExportFilteredEntities,
} from 'web/entities/bulkactions';

import {
  useLazyGetTasks,
  useDeleteTask,
  useDeleteTasks,
  useDeleteFilteredTasks,
  useCloneTask,
  useExportFilteredTasks,
} from 'web/graphql/tasks';

import PropTypes from 'web/utils/proptypes';
import SelectionType, {getEntityIds} from 'web/utils/selectiontype';
import useCapabilities from 'web/utils/useCapabilities';
import useChangeFilter from 'web/utils/useChangeFilter';
import useGmpSettings from 'web/utils/useGmpSettings';
import useFilterSortBy from 'web/utils/useFilterSortby';
import usePageFilter from 'web/utils/usePageFilter';
import useSelection from 'web/utils/useSelection';
import usePrevious from 'web/utils/usePrevious';
import useUserSessionTimeout from 'web/utils/useUserSessionTimeout';

import NewIconMenu from './icons/newiconmenu';

import TaskComponent from './component';
import TaskDashboard, {TASK_DASHBOARD_ID} from './dashboard';
import TaskFilterDialog from './filterdialog';
import TaskListTable from './table';

export const ToolBarIcons = ({
  onAdvancedTaskWizardClick,
  onModifyTaskWizardClick,
  onContainerTaskCreateClick,
  onTaskCreateClick,
  onTaskWizardClick,
}) => {
  const capabilities = useCapabilities();
  return (
    <IconDivider>
      <ManualIcon
        page="scanning"
        anchor="managing-tasks"
        title={_('Help: Tasks')}
      />
      {capabilities.mayOp('run_wizard') && (
        <IconMenu icon={<WizardIcon />} onClick={onTaskWizardClick}>
          {capabilities.mayCreate('task') && (
            <MenuEntry title={_('Task Wizard')} onClick={onTaskWizardClick} />
          )}
          {capabilities.mayCreate('task') && (
            <MenuEntry
              title={_('Advanced Task Wizard')}
              onClick={onAdvancedTaskWizardClick}
            />
          )}
          {capabilities.mayEdit('task') && (
            <MenuEntry
              title={_('Modify Task Wizard')}
              onClick={onModifyTaskWizardClick}
            />
          )}
        </IconMenu>
      )}

      <NewIconMenu
        onNewClick={onTaskCreateClick}
        onNewContainerClick={onContainerTaskCreateClick}
      />
    </IconDivider>
  );
};

ToolBarIcons.propTypes = {
  onAdvancedTaskWizardClick: PropTypes.func.isRequired,
  onContainerTaskCreateClick: PropTypes.func.isRequired,
  onModifyTaskWizardClick: PropTypes.func.isRequired,
  onTaskCreateClick: PropTypes.func.isRequired,
  onTaskWizardClick: PropTypes.func.isRequired,
};

const TasksListPage = () => {
  const gmpSettings = useGmpSettings();
  const [downloadRef, handleDownload] = useDownload();
  const [, renewSession] = useUserSessionTimeout();
  const [tagsDialogVisible, setTagsDialogVisible] = useState(false);
  const [filter, isLoadingFilter] = usePageFilter('task');
  const prevFilter = usePrevious(filter);
  const simpleFilter = filter.withoutView();
  const [
    getTasks,
    {counts, tasks, error, loading: isLoading, refetch, called, pageInfo},
  ] = useLazyGetTasks();
  const [exportFilteredTasks] = useExportFilteredTasks();
  const exportFilteredEntities = useExportFilteredEntities();

  const [deleteTask] = useDeleteTask();
  const [deleteTasks] = useDeleteTasks();
  const [deleteFilteredTasks] = useDeleteFilteredTasks();
  const [cloneTask] = useCloneTask();
  const {
    change: changeFilter,
    remove: removeFilter,
    reset: resetFilter,
  } = useChangeFilter('task');
  const {
    dialogState: notificationDialogState,
    closeDialog: closeNotificationDialog,
    showError,
  } = useDialogNotification();
  const {
    selectionType,
    selected = [],
    changeSelectionType,
    select,
    deselect,
  } = useSelection();
  const [sortBy, sortDir, handleSortChange] = useFilterSortBy(
    filter,
    changeFilter,
  );

  const timeoutFunc = useCallback(
    ({isVisible}) => {
      if (!isVisible) {
        return gmpSettings.reloadIntervalInactive;
      }
      if (hasValue(tasks) && tasks.some(task => task.isActive())) {
        return gmpSettings.reloadIntervalActive;
      }
      return gmpSettings.reloadInterval;
    },
    [tasks, gmpSettings],
  );

  const [startReload, stopReload, hasRunningTimer] = useReload(
    refetch,
    timeoutFunc,
  );

  const handleCloneTask = useCallback(
    task => cloneTask(task.id).then(refetch, showError),
    [cloneTask, refetch, showError],
  );
  const handleDeleteTask = useCallback(
    task => deleteTask(task.id).then(refetch, showError),
    [deleteTask, refetch, showError],
  );

  const handleBulkDeleteTasks = () => {
    if (selectionType === SelectionType.SELECTION_FILTER) {
      const filterAll = filter.all().toFilterString();
      return deleteFilteredTasks(filterAll).then(refetch, showError);
    }
    const tasksToDelete =
      selectionType === SelectionType.SELECTION_USER
        ? getEntityIds(selected)
        : getEntityIds(tasks);
    return deleteTasks(tasksToDelete).then(refetch, showError);
  };

  const openTagsDialog = () => {
    renewSession();
    setTagsDialogVisible(true);
  };

  const closeTagsDialog = () => {
    renewSession();
    setTagsDialogVisible(false);
  };

  const handleBulkExportTasks = () => {
    return exportFilteredEntities({
      entities: tasks,
      selected,
      filter,
      entitiesType: 'tasks',
      selectionType,
      export: exportFilteredTasks,
      onDownload: handleDownload,
      onError: showError,
    });
  };

  useEffect(() => {
    // load tasks initially after the filter is resolved
    if (!isLoadingFilter && hasValue(filter) && !called) {
      getTasks({
        filterString: filter.toFilterString(),
        first: filter.get('rows'),
      });
    }
  }, [isLoadingFilter, filter, getTasks, called]);

  useEffect(() => {
    // reload if filter has changed
    if (hasValue(refetch) && !filter.equals(prevFilter)) {
      refetch({
        filterString: filter.toFilterString(),
        first: undefined,
        last: undefined,
      });
    }
  }, [filter, prevFilter, simpleFilter, refetch]);

  useEffect(() => {
    // start reloading if tasks are available and no timer is running yet
    if (hasValue(tasks) && !hasRunningTimer) {
      startReload();
    }
  }, [tasks, startReload]); // eslint-disable-line react-hooks/exhaustive-deps

  // stop reload on unmount
  useEffect(() => stopReload, [stopReload]);

  const getNextTasks = () => {
    refetch({
      filterString: simpleFilter.toFilterString(),
      after: pageInfo.endCursor,
      before: undefined,
      first: filter.get('rows'),
      last: undefined,
    });
  };

  const getPreviousTasks = () => {
    refetch({
      filterString: simpleFilter.toFilterString(),
      after: undefined,
      before: pageInfo.startCursor,
      first: undefined,
      last: filter.get('rows'),
    });
  };

  const getFirstTasks = () => {
    refetch({
      filterString: simpleFilter.toFilterString(),
      after: undefined,
      before: undefined,
      first: filter.get('rows'),
      last: undefined,
    });
  };

  const getLastTasks = () => {
    refetch({
      filterString: simpleFilter.toFilterString(),
      after: pageInfo.lastPageCursor,
      before: undefined,
      first: filter.get('rows'),
      last: undefined,
    });
  };

  return (
    <TaskComponent
      onAdvancedTaskWizardSaved={refetch}
      onCloned={refetch}
      onCloneError={showError}
      onContainerSaved={refetch}
      onCreated={refetch}
      onContainerCreated={refetch}
      onDeleted={refetch}
      onDeleteError={showError}
      onDownloaded={handleDownload}
      onDownloadError={showError}
      onInteraction={renewSession}
      onModifyTaskWizardSaved={refetch}
      onReportImported={refetch}
      onResumed={refetch}
      onResumeError={showError}
      onSaved={refetch}
      onStarted={refetch}
      onStartError={showError}
      onStopped={refetch}
      onStopError={showError}
      onTaskWizardSaved={refetch}
    >
      {({
        create,
        createcontainer,
        download,
        edit,
        start,
        stop,
        resume,
        reportimport,
        advancedtaskwizard,
        modifytaskwizard,
        taskwizard,
      }) => (
        <React.Fragment>
          <PageTitle title={_('Tasks')} />
          <EntitiesPage
            dashboard={() => (
              <TaskDashboard
                filter={filter}
                onFilterChanged={changeFilter}
                onInteraction={renewSession}
              />
            )}
            dashboardControls={() => (
              <DashboardControls
                dashboardId={TASK_DASHBOARD_ID}
                onInteraction={renewSession}
              />
            )}
            entities={tasks}
            entitiesCounts={counts}
            entitiesError={error}
            entitiesSelected={selected}
            filter={filter}
            filterEditDialog={TaskFilterDialog}
            filtersFilter={TASKS_FILTER_FILTER}
            isLoading={isLoading}
            isUpdating={isLoading}
            selectionType={selectionType}
            sectionIcon={<TaskIcon size="large" />}
            sortBy={sortBy}
            sortDir={sortDir}
            table={TaskListTable}
            title={_('Tasks')}
            toolBarIcons={ToolBarIcons}
            onAdvancedTaskWizardClick={advancedtaskwizard}
            onContainerTaskCreateClick={createcontainer}
            onDeleteBulk={handleBulkDeleteTasks}
            onDownloadBulk={handleBulkExportTasks}
            onEntitySelected={select}
            onEntityDeselected={deselect}
            onError={showError}
            onFilterChanged={changeFilter}
            onFilterCreated={changeFilter}
            onFilterReset={resetFilter}
            onFilterRemoved={removeFilter}
            onInteraction={renewSession}
            onModifyTaskWizardClick={modifytaskwizard}
            onFirstClick={getFirstTasks}
            onLastClick={getLastTasks}
            onNextClick={getNextTasks}
            onPreviousClick={getPreviousTasks}
            onReportImportClick={reportimport}
            onSelectionTypeChange={changeSelectionType}
            onSortChange={handleSortChange}
            onTagsBulk={openTagsDialog}
            onTaskCloneClick={handleCloneTask}
            onTaskCreateClick={create}
            onTaskDeleteClick={handleDeleteTask}
            onTaskDownloadClick={download}
            onTaskEditClick={edit}
            onTaskResumeClick={resume}
            onTaskStartClick={start}
            onTaskStopClick={stop}
            onTaskWizardClick={taskwizard}
          />
          <DialogNotification
            {...notificationDialogState}
            onCloseClick={closeNotificationDialog}
          />
          <Download ref={downloadRef} />
          {tagsDialogVisible && (
            <BulkTagComponent
              entities={tasks}
              selected={selected}
              filter={filter}
              selectionType={selectionType}
              entitiesCounts={counts}
              onClose={closeTagsDialog}
            />
          )}
        </React.Fragment>
      )}
    </TaskComponent>
  );
};

export default TasksListPage;
