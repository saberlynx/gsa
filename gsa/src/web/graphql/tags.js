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

import {useCallback} from 'react';

import {gql, useMutation, useLazyQuery} from '@apollo/client';

import {getEntityType} from 'gmp/utils/entitytype';
import Tag from 'gmp/models/tag';

import CollectionCounts from 'gmp/collection/collectioncounts';

import {isDefined} from 'gmp/utils/identity';

export const ENTITY_TYPES = {
  alert: 'ALERT',
  host: 'HOST',
  operatingsystem: 'OPERATING_SYSTEM',
  cpe: 'CPE',
  credential: 'CREDENTIAL',
  cve: 'CVE',
  certbund: 'CERT_BUND_ADV',
  dfncert: 'DFN_CERT_ADV',
  filter: 'FILTER',
  group: 'GROUP',
  note: 'NOTE',
  nvt: 'NVT',
  ovaldef: 'OVALDEF',
  override: 'OVERRIDE',
  permission: 'PERMISSION',
  portlist: 'PORT_LIST',
  report: 'REPORT',
  reportformat: 'REPORT_FORMAT',
  result: 'RESULT',
  role: 'ROLE',
  scanconfig: 'SCAN_CONFIG',
  scanner: 'SCANNER',
  schedule: 'SCHEDULE',
  target: 'TARGET',
  task: 'TASK',
  tlscertificate: 'TLS_CERTIFICATE',
  user: 'USER',
};

export const RESOURCES_ACTION = {
  add: 'ADD',
  set: 'SET',
  remove: 'REMOVE',
};

export const CREATE_TAG = gql`
  mutation createTag($input: CreateTagInput!) {
    createTag(input: $input) {
      id
    }
  }
`;

export const useCreateTag = options => {
  const [queryCreateTag, {data, ...other}] = useMutation(CREATE_TAG, options);
  const createTag = useCallback(
    // eslint-disable-next-line no-shadow
    (inputObject, options) =>
      queryCreateTag({...options, variables: {input: inputObject}}).then(
        result => result.data.createTag.id,
      ),
    [queryCreateTag],
  );
  const tagId = data?.createTag?.id;
  return [createTag, {...other, id: tagId}];
};

export const MODIFY_TAG = gql`
  mutation modifyTag($input: ModifyTagInput!) {
    modifyTag(input: $input) {
      ok
    }
  }
`;

export const useModifyTag = options => {
  const [queryModifyTag, data] = useMutation(MODIFY_TAG, options);
  const modifyTag = useCallback(
    // eslint-disable-next-line no-shadow
    (inputObject, options) =>
      queryModifyTag({...options, variables: {input: inputObject}}),
    [queryModifyTag],
  );
  return [modifyTag, data];
};

export const TOGGLE_TAG = gql`
  mutation toggleTag($input: ToggleTagInput!) {
    toggleTag(input: $input) {
      ok
    }
  }
`;

export const useToggleTag = () => {
  const [queryToggleTag, data] = useMutation(TOGGLE_TAG);
  const toggleTag = useCallback(
    // eslint-disable-next-line no-shadow
    (tag, active) => queryToggleTag({variables: {input: {id: tag.id, active}}}),
    [queryToggleTag],
  );
  return [toggleTag, data];
};

export const REMOVE_TAG = gql`
  mutation removeTag($input: RemoveTagInput!) {
    removeTag(input: $input) {
      ok
    }
  }
`;

export const useRemoveTag = () => {
  const [queryRemoveTag, data] = useMutation(REMOVE_TAG);
  const removeTag = useCallback(
    // eslint-disable-next-line no-shadow
    (tagId, entity) =>
      queryRemoveTag({
        variables: {
          input: {
            id: tagId,
            resourceIds: [entity.id],
            resourceType: ENTITY_TYPES[getEntityType(entity)],
          },
        },
      }),
    [queryRemoveTag],
  );
  return [removeTag, data];
};

export const BULK_TAG = gql`
  mutation bulkTag($input: BulkTagInput!) {
    bulkTag(input: $input) {
      ok
    }
  }
`;

export const useBulkTag = () => {
  const [queryBulkTag, data] = useMutation(BULK_TAG);
  const bulkTag = useCallback(
    // eslint-disable-next-line no-shadow
    (tagId, {resourceType, resourceIds, resourceFilter}) =>
      queryBulkTag({
        variables: {
          input: {
            id: tagId,
            resourceType,
            resourceIds,
            resourceFilter,
          },
        },
      }),
    [queryBulkTag],
  );
  return [bulkTag, data];
};

export const GET_TAGS = gql`
  query Tags(
    $filterString: FilterString
    $after: String
    $before: String
    $first: Int
    $last: Int
  ) {
    tags(
      filterString: $filterString
      after: $after
      before: $before
      first: $first
      last: $last
    ) {
      edges {
        node {
          id
          name
        }
      }
      counts {
        total
        filtered
        offset
        limit
        length
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
        lastPageCursor
      }
    }
  }
`;

export const useLazyGetTags = (variables, options) => {
  const [queryTags, {data, ...other}] = useLazyQuery(GET_TAGS, {
    ...options,
    variables,
  });
  const tags = isDefined(data?.tags)
    ? data.tags.edges.map(entity => Tag.fromObject(entity.node))
    : undefined;

  const {total, filtered, offset = -1, limit, length} =
    data?.tags?.counts || {};
  const counts = isDefined(data?.tags?.counts)
    ? new CollectionCounts({
        all: total,
        filtered: filtered,
        first: offset + 1,
        length: length,
        rows: limit,
      })
    : undefined;
  const getTags = useCallback(
    // eslint-disable-next-line no-shadow
    (variables, options) => queryTags({...options, variables}),
    [queryTags],
  );
  const pageInfo = data?.tags?.pageInfo;
  return [getTags, {...other, counts, tags, pageInfo}];
};

// vim: set ts=2 sw=2 tw=80:
