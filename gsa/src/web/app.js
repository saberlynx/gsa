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
import React, {useEffect} from 'react';

import {Provider as StoreProvider} from 'react-redux';

import {ApolloProvider} from 'react-apollo';
import {ApolloClient} from 'apollo-client';
import {createHttpLink} from 'apollo-link-http';
import {InMemoryCache} from 'apollo-cache-inmemory';

import Gmp from 'gmp';
import GmpSettings from 'gmp/gmpsettings';

import {buildServerUrl} from 'gmp/http/utils';

import {LOG_LEVEL_DEBUG} from 'gmp/log';

import {_, initLocale} from 'gmp/locale/lang';

import {isDefined} from 'gmp/utils/identity';

import ErrorBoundary from 'web/components/error/errorboundary';

import GlobalStyles from 'web/components/layout/globalstyles';

import LocaleObserver from 'web/components/observer/localeobserver';

import GmpContext from 'web/components/provider/gmpprovider';

import {
  setUsername,
  setTimezone,
  setIsLoggedIn,
} from 'web/store/usersettings/actions';

import configureStore from './store';

import {clearStore} from './store/actions';

import Routes from './routes';

initLocale();

const settings = new GmpSettings(global.localStorage, global.config);
const gmp = new Gmp(settings);

const store = configureStore(
  isDefined(settings.enableStoreDebugLog)
    ? settings.enableStoreDebugLog
    : settings.logLevel === LOG_LEVEL_DEBUG,
);

window.gmp = gmp;

const httpLink = createHttpLink({
  uri: buildServerUrl(
    settings.graphqlApiServer,
    settings.graphqlApiLocation,
    settings.graphqlApiProtocol,
  ),
  credentials: 'include',
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

const initStore = () => {
  console.log('initStore run!');
  const {timezone, username} = gmp.settings;

  if (isDefined(timezone)) {
    store.dispatch(setTimezone(timezone));
  }
  if (isDefined(username)) {
    store.dispatch(setUsername(username));
  }
  store.dispatch(setIsLoggedIn(gmp.isLoggedIn()));
};

const App = props => {
  const handleLogout = () => {
    console.log('handleLogout run!');
    // cleanup store
    clearStore(store.dispatch);
  };

  useEffect(() => {
    console.log('App cDM run!');

    const unsubscribeFromLogout = gmp.subscribeToLogout(handleLogout);
    initStore();

    return () => {
      console.log('cWU called!');
      if (isDefined(unsubscribeFromLogout)) {
        unsubscribeFromLogout();
      }
    };
  }, []);

  return (
    <React.Fragment>
      <GlobalStyles />
      <ErrorBoundary message={_('An error occurred on this page')}>
        <ApolloProvider client={client}>
          <GmpContext.Provider value={gmp}>
            <StoreProvider store={store}>
              <LocaleObserver>
                <Routes />
              </LocaleObserver>
            </StoreProvider>
          </GmpContext.Provider>
        </ApolloProvider>
      </ErrorBoundary>
    </React.Fragment>
  );
};

export default App;

// vim: set ts=2 sw=2 tw=80:
