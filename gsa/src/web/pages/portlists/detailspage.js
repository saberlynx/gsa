/* Greenbone Security Assistant
 *
 * Authors:
 * Björn Ricks <bjoern.ricks@greenbone.net>
 * Steffen Waterkamp <steffen.waterkamp@greenbone.net>
 *
 * Copyright:
 * Copyright (C) 2017 - 2018 Greenbone Networks GmbH
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 */
import React from 'react';

import _ from 'gmp/locale';

import ExportIcon from 'web/components/icon/exporticon';
import ManualIcon from 'web/components/icon/manualicon';
import ListIcon from 'web/components/icon/listicon';

import Divider from 'web/components/layout/divider';
import IconDivider from 'web/components/layout/icondivider';
import Layout from 'web/components/layout/layout';

import Tab from 'web/components/tab/tab';
import TabLayout from 'web/components/tab/tablayout';
import TabList from 'web/components/tab/tablist';
import TabPanel from 'web/components/tab/tabpanel';
import TabPanels from 'web/components/tab/tabpanels';
import Tabs from 'web/components/tab/tabs';

import EntityPage from 'web/entity/page';
import EntityContainer, {
  permissions_resource_loader,
} from 'web/entity/container';
import {goto_details, goto_list} from 'web/entity/component';
import EntitiesTab from 'web/entity/tab';
import EntityTags from 'web/entity/tags';

import CloneIcon from 'web/entity/icon/cloneicon';
import CreateIcon from 'web/entity/icon/createicon';
import EditIcon from 'web/entity/icon/editicon';
import TrashIcon from 'web/entity/icon/trashicon';

import PropTypes from 'web/utils/proptypes';

import PortListComponent from './component';
import PortListDetails from './details';
import PortRangesTable from './portrangestable';

const ToolBarIcons = ({
  entity,
  onPortListCloneClick,
  onPortListCreateClick,
  onPortListDeleteClick,
  onPortListDownloadClick,
  onPortListEditClick,
}) => (
  <Divider margin="10px">
    <IconDivider>
      <ManualIcon
        page="search"
        searchTerm="port list"
        title={_('Help: PortList Details')}
      />
      <ListIcon
        title={_('PortList List')}
        page="portlists"
      />
    </IconDivider>
    <IconDivider>
      <CreateIcon
        entity={entity}
        onClick={onPortListCreateClick}
      />
      <CloneIcon
        entity={entity}
        onClick={onPortListCloneClick}
      />
      <EditIcon
        entity={entity}
        onClick={onPortListEditClick}
      />
      <TrashIcon
        entity={entity}
        onClick={onPortListDeleteClick}
      />
      <ExportIcon
        value={entity}
        title={_('Export PortList as XML')}
        onClick={onPortListDownloadClick}
      />
    </IconDivider>
  </Divider>
);

ToolBarIcons.propTypes = {
  entity: PropTypes.model.isRequired,
  onPortListCloneClick: PropTypes.func.isRequired,
  onPortListCreateClick: PropTypes.func.isRequired,
  onPortListDeleteClick: PropTypes.func.isRequired,
  onPortListDownloadClick: PropTypes.func.isRequired,
  onPortListEditClick: PropTypes.func.isRequired,
};

const Details = ({
  entity,
  links = true,
}) => {
  return (
    <Layout flex="column">
      <PortListDetails
        entity={entity}
        links={links}
      />
    </Layout>
  );
};

Details.propTypes = {
  entity: PropTypes.model.isRequired,
  links: PropTypes.bool,
};

const PortRanges = ({entity}) => {
  const {
    port_ranges = [],
  } = entity;

  return (
    <Layout
      title={_('Port Ranges ({{count}})', {count: port_ranges.length})}
    >
      {port_ranges.length === 0 &&
        _('No port ranges available')
      }
      {port_ranges.length > 0 &&
        <PortRangesTable
          actions={false}
          portRanges={port_ranges}
        />
      }
    </Layout>
  );
};

PortRanges.propTypes = {
  entity: PropTypes.model.isRequired,
};

const Page = ({
  onError,
  onChanged,
  onDownloaded,
  onTagAddClick,
  onTagCreateClick,
  onTagDeleteClick,
  onTagDisableClick,
  onTagEditClick,
  onTagEnableClick,
  onTagRemoveClick,
  ...props
}) => (
  <PortListComponent
    onCloned={goto_details('portlist', props)}
    onCloneError={onError}
    onCreated={goto_details('portlist', props)}
    onDeleted={goto_list('portlists', props)}
    onDeleteError={onError}
    onDownloaded={onDownloaded}
    onDownloadError={onError}
    onSaved={onChanged}
  >
    {({
      clone,
      create,
      delete: delete_func,
      download,
      edit,
      save,
    }) => (
      <EntityPage
        {...props}
        sectionIcon="port_list.svg"
        title={_('Port List')}
        detailsComponent={Details}
        toolBarIcons={ToolBarIcons}
        onChanged={onChanged}
        onDownloaded={onDownloaded}
        onError={onError}
        onPortListCloneClick={clone}
        onPortListCreateClick={create}
        onPortListDeleteClick={delete_func}
        onPortListDownloadClick={download}
        onPortListEditClick={edit}
        onPortListSaveClick={save}
        onPermissionChanged={onChanged}
        onPermissionDownloaded={onDownloaded}
        onPermissionDownloadError={onError}
      >
        {({
          activeTab = 0,
          links = true,
          permissionsComponent,
          permissionsTitle,
          onActivateTab,
          entity,
          ...other
        }) => {
          return (
            <Layout grow="1" flex="column">
              <TabLayout
                grow="1"
                align={['start', 'end']}
              >
                <TabList
                  active={activeTab}
                  align={['start', 'stretch']}
                  onActivateTab={onActivateTab}
                >
                  <Tab>
                    {_('Information')}
                  </Tab>
                  <EntitiesTab entities={entity.port_ranges}>
                    {_('Port Ranges')}
                  </EntitiesTab>
                  <EntitiesTab entities={entity.userTags}>
                    {_('User Tags')}
                  </EntitiesTab>
                  <Tab>
                    {permissionsTitle}
                  </Tab>
                </TabList>
              </TabLayout>

              <Tabs active={activeTab}>
                <TabPanels>
                  <TabPanel>
                    <PortListDetails
                      entity={entity}
                      links={links}
                    />
                  </TabPanel>
                  <TabPanel>
                    <PortRanges entity={entity}/>
                  </TabPanel>
                  <TabPanel>
                    <EntityTags
                      entity={entity}
                      onTagAddClick={onTagAddClick}
                      onTagDeleteClick={onTagDeleteClick}
                      onTagDisableClick={onTagDisableClick}
                      onTagEditClick={onTagEditClick}
                      onTagEnableClick={onTagEnableClick}
                      onTagCreateClick={onTagCreateClick}
                      onTagRemoveClick={onTagRemoveClick}
                    />
                  </TabPanel>
                  <TabPanel>
                    {permissionsComponent}
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Layout>
          );
        }}
      </EntityPage>
    )}
  </PortListComponent>
);

Page.propTypes = {
  onChanged: PropTypes.func.isRequired,
  onDownloaded: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
  onTagAddClick: PropTypes.func.isRequired,
  onTagCreateClick: PropTypes.func.isRequired,
  onTagDeleteClick: PropTypes.func.isRequired,
  onTagDisableClick: PropTypes.func.isRequired,
  onTagEditClick: PropTypes.func.isRequired,
  onTagEnableClick: PropTypes.func.isRequired,
  onTagRemoveClick: PropTypes.func.isRequired,
};

const PortListPage = props => (
  <EntityContainer
    {...props}
    name="portlist"
    loaders={[
      permissions_resource_loader,
    ]}
  >
    {cprops => <Page {...props} {...cprops} />}
  </EntityContainer>
);

export default PortListPage;
