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
import React, {useState, useEffect, useCallback} from 'react';

import _ from 'gmp/locale';

import {ALERTS_FILTER_FILTER} from 'gmp/models/filter';
import {hasValue} from 'gmp/utils/identity';

import PropTypes from 'web/utils/proptypes';

import EntitiesPage from 'web/entities/page.js';
import withEntitiesContainer from 'web/entities/withEntitiesContainer.js';
import {BulkTagComponent} from 'web/entities/bulkactions';

import useDownload from 'web/components/form/useDownload';

import ManualIcon from 'web/components/icon/manualicon.js';
import NewIcon from 'web/components/icon/newicon.js';

import IconDivider from 'web/components/layout/icondivider';
import PageTitle from 'web/components/layout/pagetitle';

import AlertIcon from 'web/components/icon/alerticon';

import {createFilterDialog} from 'web/components/powerfilter/dialog.js';
import useDialogNotification from 'web/components/notification/useDialogNotification';
import DialogNotification from 'web/components/notification/dialognotification';
import Download from 'web/components/form/download';

import {useLazyGetAlerts} from 'web/graphql/alerts';

import useCapabilities from 'web/utils/useCapabilities';
import useChangeFilter from 'web/utils/useChangeFilter';
import useGmpSettings from 'web/utils/useGmpSettings';
import useFilterSortBy from 'web/utils/useFilterSortby';
import usePageFilter from 'web/utils/usePageFilter';
import useSelection from 'web/utils/useSelection';
import usePrevious from 'web/utils/usePrevious';
import useUserSessionTimeout from 'web/utils/useUserSessionTimeout';

import {
  loadEntities,
  selector as entitiesSelector,
} from 'web/store/entities/alerts';

import AlertComponent from './component.js';
import AlertTable, {SORT_FIELDS} from './table.js';
import useReload from 'web/components/loading/useReload.js';

const ToolBarIcons = ({onAlertCreateClick}) => {
  const capabilities = useCapabilities();
  return (
    <IconDivider>
      <ManualIcon
        page="scanning"
        anchor="managing-alerts"
        title={_('Help: Alerts')}
      />
      {capabilities.mayCreate('alert') && (
        <NewIcon title={_('New Alert')} onClick={onAlertCreateClick} />
      )}
    </IconDivider>
  );
};

ToolBarIcons.propTypes = {
  onAlertCreateClick: PropTypes.func.isRequired,
};

const AlertFilterDialog = createFilterDialog({
  sortFields: SORT_FIELDS,
});

const AlertsPage = ({showSuccess, onChanged, ...props}) => {
  // Page methods and hooks
  const gmpSettings = useGmpSettings();
  const [downloadRef, handleDownload] = useDownload();
  const [, renewSession] = useUserSessionTimeout();
  const [filter, isLoadingFilter] = usePageFilter('alert');
  const prevFilter = usePrevious(filter);
  const simpleFilter = filter.withoutView();
  const {
    change: changeFilter,
    remove: removeFilter,
    reset: resetFilter,
  } = useChangeFilter('alert');
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
  const [tagsDialogVisible, setTagsDialogVisible] = useState(false);

  // Alert list state variables and methods
  const [
    getAlerts,
    {counts, alerts, error, loading: isLoading, refetch, called, pageInfo},
  ] = useLazyGetAlerts();

  const timeoutFunc = useCallback(
    ({isVisible}) => {
      if (!isVisible) {
        return gmpSettings.reloadIntervalInactive;
      }
      if (hasValue(alerts) && alerts.some(alert => alert.isActive())) {
        return gmpSettings.reloadIntervalActive;
      }
      return gmpSettings.reloadInterval;
    },
    [alerts, gmpSettings],
  );

  const [startReload, stopReload, hasRunningTimer] = useReload(
    refetch,
    timeoutFunc,
  );

  // Pagination methods
  const getNextAlerts = () => {
    refetch({
      filterString: simpleFilter.toFilterString(),
      after: pageInfo.endCursor,
      before: undefined,
      first: filter.get('rows'),
      last: undefined,
    });
  };

  const getPreviousAlerts = () => {
    refetch({
      filterString: simpleFilter.toFilterString(),
      after: undefined,
      before: pageInfo.startCursor,
      first: undefined,
      last: filter.get('rows'),
    });
  };

  const getFirstAlerts = () => {
    refetch({
      filterString: simpleFilter.toFilterString(),
      after: undefined,
      before: undefined,
      first: filter.get('rows'),
      last: undefined,
    });
  };

  const getLastAlerts = () => {
    refetch({
      filterString: simpleFilter.toFilterString(),
      after: pageInfo.lastPageCursor,
      before: undefined,
      first: filter.get('rows'),
      last: undefined,
    });
  };

  const closeTagsDialog = () => {
    renewSession();
    setTagsDialogVisible(false);
  };

  // Side effects
  useEffect(() => {
    // load alerts initially after the filter is resolved
    if (!isLoadingFilter && hasValue(filter) && !called) {
      getAlerts({
        filterString: filter.toFilterString(),
        first: filter.get('rows'),
      });
    }
  }, [isLoadingFilter, filter, getAlerts, called]);

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
    // start reloading if alerts are available and no timer is running yet
    if (hasValue(alerts) && !hasRunningTimer) {
      startReload();
    }
  }, [alerts, startReload]); // eslint-disable-line react-hooks/exhaustive-deps

  // stop reload on unmount
  useEffect(() => stopReload, [stopReload]);

  return (
    <AlertComponent
      onCreated={refetch}
      onSaved={refetch}
      onCloned={refetch}
      onCloneError={showError}
      onDeleted={refetch}
      onDeleteError={showError}
      onDownloaded={handleDownload}
      onDownloadError={showError}
      onInteraction={renewSession}
      onTestSuccess={showSuccess}
      onTestError={showError}
    >
      {({clone, create, delete: delete_func, download, edit, save, test}) => (
        <React.Fragment>
          <PageTitle title={_('Alerts')} />
          <EntitiesPage
            {...props}
            entities={alerts}
            entitiesCounts={counts}
            entitiesError={error}
            entitiesSelected={selected}
            filterEditDialog={AlertFilterDialog}
            filtersFilter={ALERTS_FILTER_FILTER}
            isLoading={isLoading}
            isUpdating={isLoading}
            selectionType={selectionType}
            sectionIcon={<AlertIcon size="large" />}
            sortBy={sortBy}
            sortDir={sortDir}
            table={AlertTable}
            title={_('Alerts')}
            toolBarIcons={ToolBarIcons}
            onAlertCloneClick={clone}
            onAlertCreateClick={create}
            onAlertDeleteClick={delete_func}
            onAlertDownloadClick={download}
            onAlertEditClick={edit}
            onAlertTestClick={test}
            onAlertSaveClick={save}
            onEntitySelected={select}
            onEntityDeselected={deselect}
            onError={showError}
            onFilterChanged={changeFilter}
            onFilterCreated={changeFilter}
            onFilterReset={resetFilter}
            onFilterRemoved={removeFilter}
            onInteraction={renewSession}
            onFirstClick={getFirstAlerts}
            onLastClick={getLastAlerts}
            onNextClick={getNextAlerts}
            onPreviousClick={getPreviousAlerts}
            onSelectionTypeChange={changeSelectionType}
            onSortChange={handleSortChange}
            onPermissionChanged={refetch}
            onPermissionDownloaded={handleDownload}
            onPermissionDownloadError={showError}
          />
          <DialogNotification
            {...notificationDialogState}
            onCloseClick={closeNotificationDialog}
          />
          <Download ref={downloadRef} />
          {tagsDialogVisible && (
            <BulkTagComponent
              entities={alerts}
              selected={selected}
              filter={filter}
              selectionType={selectionType}
              entitiesCounts={counts}
              onClose={closeTagsDialog}
            />
          )}
        </React.Fragment>
      )}
    </AlertComponent>
  );
};

AlertsPage.propTypes = {
  showSuccess: PropTypes.func.isRequired,
};

export default withEntitiesContainer('alert', {
  entitiesSelector,
  loadEntities,
})(AlertsPage);

// vim: set ts=2 sw=2 tw=80:
