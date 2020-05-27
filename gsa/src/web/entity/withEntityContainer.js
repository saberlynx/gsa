/* Copyright (C) 2018-2020 Greenbone Networks GmbH
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
import React, {useCallback} from 'react';

import {connect, useDispatch, useSelector} from 'react-redux';

import {withRouter} from 'react-router-dom';

import Filter from 'gmp/models/filter';

import {isDefined} from 'gmp/utils/identity';

import withDownload from 'web/components/form/withDownload';

import withDialogNotification from 'web/components/notification/withDialogNotifiaction'; // eslint-disable-line max-len

import compose from 'web/utils/compose';
import PropTypes from 'web/utils/proptypes';
import withGmp from 'web/utils/withGmp';
import useUserSessionTimeout from 'web/utils/useUserSessionTimeout';

import EntityContainer from './container';
import Reload, {
  NO_RELOAD,
  USE_DEFAULT_RELOAD_INTERVAL,
} from 'web/components/loading/reload';

const defaultEntityReloadIntervalFunc = ({entity}) =>
  isDefined(entity) ? USE_DEFAULT_RELOAD_INTERVAL : NO_RELOAD;

// get permissions assigned to the entity as resource
export const permissionsResourceFilter = id =>
  Filter.fromString('resource_uuid=' + id).all();

export const permissionsSubjectFilter = id =>
  Filter.fromString(
    'subject_uuid=' +
      id +
      ' and not resource_uuid=""' +
      ' or resource_uuid=' +
      id,
  ).all();

const withEntityContainer = (
  entityType,
  {
    load,
    entitySelector,
    mapStateToProps: componentMapStateToProps,
    reloadInterval = defaultEntityReloadIntervalFunc,
  },
) => Component => {
  const EntityContainerWrapper = props => {
    const {gmp, id} = props;
    const [, renewSessionTimeout] = useUserSessionTimeout();
    const dispatch = useDispatch();
    const loadEntity = useCallback(
      (entityId = id) => dispatch(load(gmp)(entityId)),
      [dispatch, gmp, load, id],
    );

    const entitySel = useSelector(entitySelector);
    const isLoading = entitySel.isLoadingEntity(id);
    const entity = entitySel.getEntity(id);
    const entityError = entitySel.getEntityError(id);

    return (
      <Reload
        reloadInterval={() => reloadInterval(props)}
        reload={(entityId = id) => loadEntity(entityId)}
        name={entityType}
      >
        {({reload}) => (
          <EntityContainer
            {...props}
            isLoading={isLoading}
            entity={entity}
            entityError={entityError}
            onInteraction={renewSessionTimeout}
            entityType={entityType}
            reload={reload}
          >
            {cprops => <Component {...cprops} />}
          </EntityContainer>
        )}
      </Reload>
    );
  };

  EntityContainerWrapper.propTypes = {
    id: PropTypes.id.isRequired,
    load: PropTypes.func.isRequired,
  };

  const mapStateToProps = (rootState, {gmp, id, match, ...props}) => {
    if (!isDefined(id)) {
      id = decodeURIComponent(match.params.id); // decodeURIComponent needs to be done for CPE IDs
    }
    const otherProps = isDefined(componentMapStateToProps)
      ? componentMapStateToProps(rootState, {
          gmp,
          id,
          ...props,
        })
      : undefined;
    return {
      ...otherProps,
      id,
    };
  };

  return compose(
    withGmp,
    withRouter,
    withDialogNotification,
    withDownload,
    connect(mapStateToProps, undefined),
  )(EntityContainerWrapper);
};

export default withEntityContainer;

// vim: set ts=2 sw=2 tw=80:
