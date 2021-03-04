/* Copyright (C) 2021 Greenbone Networks GmbH
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

import React from 'react';

import Capabilities from 'gmp/capabilities/capabilities';
import CollectionCounts from 'gmp/collection/collectioncounts';

import {setLocale} from 'gmp/locale/lang';

import Credential from 'gmp/models/credential';
import Filter from 'gmp/models/filter';

import {isDefined} from 'gmp/utils/identity';

import {entityLoadingActions} from 'web/store/entities/credentials';
import {setTimezone, setUsername} from 'web/store/usersettings/actions';

import {rendererWith} from 'web/utils/testing';

import Detailspage from '../detailspage';

setLocale('en');

if (!isDefined(window.URL)) {
  window.URL = {};
}
window.URL.createObjectURL = jest.fn();

const caps = new Capabilities(['everything']);

const reloadInterval = -1;
const manualUrl = 'test/';

const credential = Credential.fromElement({
  _id: '6575',
  allow_insecure: 1,
  creation_time: '2020-12-16T15:23:59Z',
  comment: 'blah',
  formats: {format: 'pem'},
  full_type: 'client certificate',
  in_use: 0,
  login: '',
  modification_time: '2021-03-02T10:28:15Z',
  name: 'credential 1',
  owner: {name: 'admin'},
  permissions: {permission: {name: 'Everything'}},
  type: 'cc',
  writable: 1,
});

const getCredential = jest.fn().mockResolvedValue({
  data: credential,
});

const getEntities = jest.fn().mockResolvedValue({
  data: [],
  meta: {
    filter: Filter.fromString(),
    counts: new CollectionCounts(),
  },
});

const currentSettings = jest.fn().mockResolvedValue({
  foo: 'bar',
});

describe('Credential Detailspage tests', () => {
  test('should render full Detailspage', () => {
    const gmp = {
      credential: {
        get: getCredential,
      },
      permissions: {
        get: getEntities,
      },
      settings: {manualUrl, reloadInterval},
      user: {
        currentSettings,
      },
    };

    const {render, store} = rendererWith({
      capabilities: caps,
      gmp,
      router: true,
      store: true,
    });

    store.dispatch(setTimezone('CET'));
    store.dispatch(setUsername('admin'));

    store.dispatch(entityLoadingActions.success('6575', credential));

    const {baseElement} = render(<Detailspage id="6575" />);

    expect(baseElement).toMatchSnapshot();
  });
});
