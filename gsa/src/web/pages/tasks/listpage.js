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

import React, {useEffect, useCallback, useState} from 'react';

import _ from 'gmp/locale';

import {TASKS_FILTER_FILTER} from 'gmp/models/filter';

import {YES_VALUE} from 'gmp/parser';

import {map} from 'gmp/utils/array';
import {hasValue} from 'gmp/utils/identity';
import {typeName} from 'gmp/utils/entitytype';

import DashboardControls from 'web/components/dashboard/controls';

import Download from 'web/components/form/download';
import useDownload from 'web/components/form/useDownload';

import ManualIcon from 'web/components/icon/manualicon';
import TaskIcon from 'web/components/icon/taskicon';
import WizardIcon from 'web/components/icon/wizardicon';

import IconDivider from 'web/components/layout/icondivider';
import PageTitle from 'web/components/layout/pagetitle';

import IconMenu from 'web/components/menu/iconmenu';
import MenuEntry from 'web/components/menu/menuentry';

import DialogNotification from 'web/components/notification/dialognotification';
import useDialogNotification from 'web/components/notification/useDialogNotification';

import EntitiesPage from 'web/entities/page';
import TagsDialog from 'web/entities/tagsdialog';
import TagDialog from 'web/pages/tags/dialog';

import {
  useLazyGetTasks,
  useDeleteTask,
  useGetAllFiltered,
  useCloneTask,
} from 'web/graphql/tasks';

import PropTypes from 'web/utils/proptypes';
import SelectionType from 'web/utils/selectiontype';
import useCapabilities from 'web/utils/useCapabilities';
import useChangeFilter from 'web/utils/useChangeFilter';
import useFilterSortBy from 'web/utils/useFilterSortby';
import useGmp from 'web/utils/useGmp';
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
  const gmp = useGmp();

  const [tags, setTags] = useState();
  const [tag, setTag] = useState({});
  const [tagsDialogVisible, setTagsDialogVisible] = useState(false);
  const [multiTagTasksCount, setMultiTagTasksCount] = useState({});
  const [tagsDialogTitle, setTagsDialogTitle] = useState(_('Add Tag'));
  const [tagDialogVisible, setTagDialogVisible] = useState(false);

  console.log(tags);

  const [, renewSession] = useUserSessionTimeout();
  const [filter, isLoadingFilter] = usePageFilter('task');
  const prevFilter = usePrevious(filter);
  const simpleFilter = filter.withoutView();
  const [
    getTasks,
    {counts, tasks, error, loading: isLoading, refetch, called, pageInfo},
  ] = useLazyGetTasks();

  const [getAllFiltered, filteredTasks = []] = useGetAllFiltered();

  const [deleteTask] = useDeleteTask();
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
  const [downloadRef, handleDownload] = useDownload();
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

  const handleCloneTask = useCallback(
    task => cloneTask(task.id).then(refetch, showError),
    [cloneTask, refetch, showError],
  );
  const handleDeleteTask = useCallback(
    task => deleteTask(task.id).then(refetch, showError),
    [deleteTask, refetch, showError],
  );

  const handleDeleteTaskBulk = async () => {
    // can be its own import e.g. handleGraphqlDeleteBulk = (deleteFunc, entities, selectionType, selected, ...) => {...}
    let idsToDelete = [];

    if (selectionType === SelectionType.SELECTION_USER) {
      console.log('user selection type');
      selected.forEach(item => {
        const promise = deleteTask(item.id);

        idsToDelete.push(promise);
      });
    } else if (selectionType === SelectionType.SELECTION_PAGE_CONTENTS) {
      console.log('page content type');

      tasks.forEach(task => {
        const promise = deleteTask(task.id);

        idsToDelete.push(promise);
      });
    } else {
      filteredTasks.forEach(task => {
        const promise = deleteTask(task.id);
        idsToDelete.push(promise);
      });
    }

    return Promise.all([...idsToDelete]).then(refetch, showError);
  };

  const getMultiTagTasksCount = () => {
    if (selectionType === SelectionType.SELECTION_USER) {
      return selected.size;
    }

    if (selectionType === SelectionType.SELECTION_PAGE_CONTENTS) {
      return tasks.length;
    }

    return counts.filtered;
  };

  const getTaskTags = () => {
    if (tasks.length > 0) {
      const filter = 'resource_type=task';
      gmp.tags.getAll({filter}).then(response => {
        const {data: tags} = response;
        setTags(tags);
      });
    }
  };

  const handleTagChange = id => {
    renewSession();

    gmp.tag.get({id}).then(response => {
      setTag(response.data);
    });
  };

  const closeTagsDialog = () => {
    setTagsDialogVisible(false);
  };

  const handleAddMultiTag = ({comment, id, name, value = ''}) => {
    let resourceIds;
    let resourceIdsArray;
    let appliedFilter;
    if (selectionType === SelectionType.SELECTION_USER) {
      resourceIds = map(selected, res => res.id);
      resourceIdsArray = [...resourceIds];
      appliedFilter = undefined;
    } else if (selectionType === SelectionType.SELECTION_PAGE_CONTENTS) {
      appliedFilter = filter;
    } else {
      appliedFilter = filter.all();
    }

    renewSession();

    return gmp.tag
      .save({
        active: YES_VALUE,
        comment,
        filter: appliedFilter,
        id,
        name,
        resource_ids: resourceIdsArray,
        resource_type: 'task',
        resources_action: 'add',
        value,
      })
      .then(() => closeTagsDialog());
  };

  const openTagsDialog = () => {
    console.log('tried to bulk tag!');
    getTaskTags();
    setTagsDialogVisible(true);
    setMultiTagTasksCount(getMultiTagTasksCount());
    renewSession();
  };

  const openTagDialog = () => {
    setTagDialogVisible(true);
    renewSession();
  };

  const closeTagDialog = () => {
    setTagDialogVisible(false);
  };

  const handleCloseTagDialog = () => {
    closeTagDialog();
    renewSession();
  };

  const handleCreateTag = data => {
    renewSession();

    return gmp.tag
      .create(data)
      .then(response => gmp.tag.get(response.data))
      .then(response => {
        closeTagDialog();
        const newTag = response.data;
        setTag(newTag);
        setTags(prevTags => [...prevTags, newTag]);
      });
  };

  useEffect(() => {
    // load tasks initially after the filter is resolved
    if (!isLoadingFilter && hasValue(filter) && !called) {
      getTasks({
        filterString: filter.toFilterString(),
        first: filter.get('rows'),
      });

      const allFilter = filter.all().toFilterString();
      getAllFiltered(allFilter);
    }
  }, [isLoadingFilter, filter, getTasks, called, getAllFiltered]);

  useEffect(() => {
    // reload if filter has changed
    if (hasValue(refetch) && !filter.equals(prevFilter)) {
      refetch({
        filterString: filter.toFilterString(),
        first: undefined,
        last: undefined,
      });
      const allFilter = filter.all().toFilterString();
      getAllFiltered(allFilter);
    }
  }, [filter, prevFilter, simpleFilter, refetch, getAllFiltered]);

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
            onDeleteBulk={handleDeleteTaskBulk}
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
            <TagsDialog
              comment={tag.comment}
              entitiesCount={multiTagTasksCount}
              filter={filter}
              name={tag.name}
              tagId={tag.id}
              tags={tags}
              title={tagsDialogTitle}
              value={tag.value}
              onClose={closeTagsDialog}
              onSave={handleAddMultiTag}
              onNewTagClick={openTagDialog}
              onTagChanged={handleTagChange}
            />
          )}
          {tagDialogVisible && (
            <TagDialog
              fixed={true}
              resources={selected}
              resource_type={'task'}
              resource_types={[['task', typeName('task')]]}
              onClose={handleCloseTagDialog}
              onSave={handleCreateTag}
            />
          )}
        </React.Fragment>
      )}
    </TaskComponent>
  );
};

export default TasksListPage;
