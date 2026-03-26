import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AddPerspectiveMemberData {
  perspectiveMember_insert: PerspectiveMember_Key;
}

export interface AddPerspectiveMemberVariables {
  perspectiveId: UUIDString;
  userId: string;
  role: string;
}

export interface Connection_Key {
  id: UUIDString;
  __typename?: 'Connection_Key';
}

export interface CreateConnectionData {
  connection_insert: Connection_Key;
}

export interface CreateConnectionVariables {
  storyId: UUIDString;
  sourceType: string;
  sourceTrendId?: UUIDString | null;
  sourceConnectionId?: UUIDString | null;
  targetType: string;
  targetTrendId?: UUIDString | null;
  targetConnectionId?: UUIDString | null;
  direction: string;
  weight: number;
}

export interface CreatePerspectiveData {
  perspective_insert: Perspective_Key;
}

export interface CreatePerspectiveVariables {
  name: string;
  slug: string;
  createdBy: string;
}

export interface CreateStoryData {
  story_insert: Story_Key;
}

export interface CreateStoryVariables {
  perspectiveId: UUIDString;
  focalTrendId: UUIDString;
  name: string;
  createdBy: string;
}

export interface CreateTrendData {
  trend_insert: Trend_Key;
}

export interface CreateTrendVariables {
  name: string;
  unit?: string | null;
  description?: string | null;
  source: string;
  frequency: string;
  createdBy: string;
}

export interface CreateVariantData {
  variant_insert: Variant_Key;
}

export interface CreateVariantVariables {
  storyId: UUIDString;
  trendId: UUIDString;
  name?: string | null;
  createdBy: string;
}

export interface GetPerspectiveData {
  perspective?: {
    id: UUIDString;
    name: string;
    slug: string;
    plan: string;
    createdAt: TimestampString;
  } & Perspective_Key;
}

export interface GetPerspectiveMembersData {
  perspectiveMembers: ({
    userId: string;
    role: string;
    createdAt: TimestampString;
  })[];
}

export interface GetPerspectiveMembersVariables {
  perspectiveId: UUIDString;
}

export interface GetPerspectiveVariables {
  id: UUIDString;
}

export interface GetStoriesByPerspectiveData {
  stories: ({
    id: UUIDString;
    name: string;
    createdAt: TimestampString;
    focalTrend: {
      id: UUIDString;
      name: string;
      unit?: string | null;
      frequency: string;
    } & Trend_Key;
  } & Story_Key)[];
}

export interface GetStoriesByPerspectiveVariables {
  perspectiveId: UUIDString;
}

export interface GetStoryData {
  story?: {
    id: UUIDString;
    name: string;
    createdAt: TimestampString;
    focalTrend: {
      id: UUIDString;
      name: string;
      unit?: string | null;
      frequency: string;
    } & Trend_Key;
      connections: ({
        id: UUIDString;
        sourceType: string;
        sourceTrend?: {
          id: UUIDString;
          name: string;
        } & Trend_Key;
          targetType: string;
          targetTrend?: {
            id: UUIDString;
            name: string;
          } & Trend_Key;
            direction: string;
            weight: number;
      } & Connection_Key)[];
        variants: ({
          id: UUIDString;
          name?: string | null;
          trend: {
            id: UUIDString;
            name: string;
          } & Trend_Key;
        } & Variant_Key)[];
  } & Story_Key;
}

export interface GetStoryVariables {
  id: UUIDString;
}

export interface GetTrendData {
  trend?: {
    id: UUIDString;
    name: string;
    unit?: string | null;
    description?: string | null;
    source: string;
    frequency: string;
    createdAt: TimestampString;
  } & Trend_Key;
}

export interface GetTrendVariables {
  id: UUIDString;
}

export interface PerspectiveMember_Key {
  id: UUIDString;
  __typename?: 'PerspectiveMember_Key';
}

export interface Perspective_Key {
  id: UUIDString;
  __typename?: 'Perspective_Key';
}

export interface SearchTrendsData {
  trends: ({
    id: UUIDString;
    name: string;
    unit?: string | null;
    description?: string | null;
    frequency: string;
    source: string;
  } & Trend_Key)[];
}

export interface SearchTrendsVariables {
  name: string;
}

export interface Story_Key {
  id: UUIDString;
  __typename?: 'Story_Key';
}

export interface TrendValue_Key {
  id: UUIDString;
  __typename?: 'TrendValue_Key';
}

export interface Trend_Key {
  id: UUIDString;
  __typename?: 'Trend_Key';
}

export interface VariantValue_Key {
  id: UUIDString;
  __typename?: 'VariantValue_Key';
}

export interface Variant_Key {
  id: UUIDString;
  __typename?: 'Variant_Key';
}

interface GetPerspectiveRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPerspectiveVariables): QueryRef<GetPerspectiveData, GetPerspectiveVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetPerspectiveVariables): QueryRef<GetPerspectiveData, GetPerspectiveVariables>;
  operationName: string;
}
export const getPerspectiveRef: GetPerspectiveRef;

export function getPerspective(vars: GetPerspectiveVariables): QueryPromise<GetPerspectiveData, GetPerspectiveVariables>;
export function getPerspective(dc: DataConnect, vars: GetPerspectiveVariables): QueryPromise<GetPerspectiveData, GetPerspectiveVariables>;

interface GetPerspectiveMembersRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPerspectiveMembersVariables): QueryRef<GetPerspectiveMembersData, GetPerspectiveMembersVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetPerspectiveMembersVariables): QueryRef<GetPerspectiveMembersData, GetPerspectiveMembersVariables>;
  operationName: string;
}
export const getPerspectiveMembersRef: GetPerspectiveMembersRef;

export function getPerspectiveMembers(vars: GetPerspectiveMembersVariables): QueryPromise<GetPerspectiveMembersData, GetPerspectiveMembersVariables>;
export function getPerspectiveMembers(dc: DataConnect, vars: GetPerspectiveMembersVariables): QueryPromise<GetPerspectiveMembersData, GetPerspectiveMembersVariables>;

interface GetStoriesByPerspectiveRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetStoriesByPerspectiveVariables): QueryRef<GetStoriesByPerspectiveData, GetStoriesByPerspectiveVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetStoriesByPerspectiveVariables): QueryRef<GetStoriesByPerspectiveData, GetStoriesByPerspectiveVariables>;
  operationName: string;
}
export const getStoriesByPerspectiveRef: GetStoriesByPerspectiveRef;

export function getStoriesByPerspective(vars: GetStoriesByPerspectiveVariables): QueryPromise<GetStoriesByPerspectiveData, GetStoriesByPerspectiveVariables>;
export function getStoriesByPerspective(dc: DataConnect, vars: GetStoriesByPerspectiveVariables): QueryPromise<GetStoriesByPerspectiveData, GetStoriesByPerspectiveVariables>;

interface GetTrendRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetTrendVariables): QueryRef<GetTrendData, GetTrendVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetTrendVariables): QueryRef<GetTrendData, GetTrendVariables>;
  operationName: string;
}
export const getTrendRef: GetTrendRef;

export function getTrend(vars: GetTrendVariables): QueryPromise<GetTrendData, GetTrendVariables>;
export function getTrend(dc: DataConnect, vars: GetTrendVariables): QueryPromise<GetTrendData, GetTrendVariables>;

interface GetStoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetStoryVariables): QueryRef<GetStoryData, GetStoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetStoryVariables): QueryRef<GetStoryData, GetStoryVariables>;
  operationName: string;
}
export const getStoryRef: GetStoryRef;

export function getStory(vars: GetStoryVariables): QueryPromise<GetStoryData, GetStoryVariables>;
export function getStory(dc: DataConnect, vars: GetStoryVariables): QueryPromise<GetStoryData, GetStoryVariables>;

interface SearchTrendsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: SearchTrendsVariables): QueryRef<SearchTrendsData, SearchTrendsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: SearchTrendsVariables): QueryRef<SearchTrendsData, SearchTrendsVariables>;
  operationName: string;
}
export const searchTrendsRef: SearchTrendsRef;

export function searchTrends(vars: SearchTrendsVariables): QueryPromise<SearchTrendsData, SearchTrendsVariables>;
export function searchTrends(dc: DataConnect, vars: SearchTrendsVariables): QueryPromise<SearchTrendsData, SearchTrendsVariables>;

interface CreatePerspectiveRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePerspectiveVariables): MutationRef<CreatePerspectiveData, CreatePerspectiveVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreatePerspectiveVariables): MutationRef<CreatePerspectiveData, CreatePerspectiveVariables>;
  operationName: string;
}
export const createPerspectiveRef: CreatePerspectiveRef;

export function createPerspective(vars: CreatePerspectiveVariables): MutationPromise<CreatePerspectiveData, CreatePerspectiveVariables>;
export function createPerspective(dc: DataConnect, vars: CreatePerspectiveVariables): MutationPromise<CreatePerspectiveData, CreatePerspectiveVariables>;

interface AddPerspectiveMemberRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddPerspectiveMemberVariables): MutationRef<AddPerspectiveMemberData, AddPerspectiveMemberVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddPerspectiveMemberVariables): MutationRef<AddPerspectiveMemberData, AddPerspectiveMemberVariables>;
  operationName: string;
}
export const addPerspectiveMemberRef: AddPerspectiveMemberRef;

export function addPerspectiveMember(vars: AddPerspectiveMemberVariables): MutationPromise<AddPerspectiveMemberData, AddPerspectiveMemberVariables>;
export function addPerspectiveMember(dc: DataConnect, vars: AddPerspectiveMemberVariables): MutationPromise<AddPerspectiveMemberData, AddPerspectiveMemberVariables>;

interface CreateTrendRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateTrendVariables): MutationRef<CreateTrendData, CreateTrendVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateTrendVariables): MutationRef<CreateTrendData, CreateTrendVariables>;
  operationName: string;
}
export const createTrendRef: CreateTrendRef;

export function createTrend(vars: CreateTrendVariables): MutationPromise<CreateTrendData, CreateTrendVariables>;
export function createTrend(dc: DataConnect, vars: CreateTrendVariables): MutationPromise<CreateTrendData, CreateTrendVariables>;

interface CreateStoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateStoryVariables): MutationRef<CreateStoryData, CreateStoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateStoryVariables): MutationRef<CreateStoryData, CreateStoryVariables>;
  operationName: string;
}
export const createStoryRef: CreateStoryRef;

export function createStory(vars: CreateStoryVariables): MutationPromise<CreateStoryData, CreateStoryVariables>;
export function createStory(dc: DataConnect, vars: CreateStoryVariables): MutationPromise<CreateStoryData, CreateStoryVariables>;

interface CreateConnectionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateConnectionVariables): MutationRef<CreateConnectionData, CreateConnectionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateConnectionVariables): MutationRef<CreateConnectionData, CreateConnectionVariables>;
  operationName: string;
}
export const createConnectionRef: CreateConnectionRef;

export function createConnection(vars: CreateConnectionVariables): MutationPromise<CreateConnectionData, CreateConnectionVariables>;
export function createConnection(dc: DataConnect, vars: CreateConnectionVariables): MutationPromise<CreateConnectionData, CreateConnectionVariables>;

interface CreateVariantRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateVariantVariables): MutationRef<CreateVariantData, CreateVariantVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateVariantVariables): MutationRef<CreateVariantData, CreateVariantVariables>;
  operationName: string;
}
export const createVariantRef: CreateVariantRef;

export function createVariant(vars: CreateVariantVariables): MutationPromise<CreateVariantData, CreateVariantVariables>;
export function createVariant(dc: DataConnect, vars: CreateVariantVariables): MutationPromise<CreateVariantData, CreateVariantVariables>;

