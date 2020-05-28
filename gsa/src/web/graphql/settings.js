/* Copyright (C) 2020 Greenbone Networks GmbH
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
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
import gql from 'graphql-tag';

import {useQuery} from '@apollo/react-hooks';

import Setting from 'gmp/models/setting';

import {hasValue} from 'gmp/utils/identity';

import {toFruitfulQuery} from 'web/utils/graphql';

export const GET_SETTING = gql`
  query UserSetting($id: UUID!) {
    userSetting(id: $id) {
      id
      name
      value
      comment
    }
  }
`;

export const useGetSetting = (id, options) => {
  const {data, ...other} = useQuery(GET_SETTING, {...options, variables: {id}});
  const setting = hasValue(data?.userSetting)
    ? Setting.fromObject(data.userSetting)
    : undefined;
  return {...other, setting};
};

export const GET_SETTINGS = gql`
  query UserSettings($filterString: String) {
    userSettings(filterString: $filterString) {
      id
      name
      value
      comment
    }
  }
`;

export const useGetSettings = () => {
  return toFruitfulQuery(useQuery)(GET_SETTINGS);
};