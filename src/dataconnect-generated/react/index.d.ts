import { CreatePerspectiveData, CreatePerspectiveVariables, AddPerspectiveMemberData, AddPerspectiveMemberVariables, CreateTrendData, CreateTrendVariables, CreateStoryData, CreateStoryVariables, CreateConnectionData, CreateConnectionVariables, CreateVariantData, CreateVariantVariables, GetPerspectiveData, GetPerspectiveVariables, GetPerspectiveMembersData, GetPerspectiveMembersVariables, GetStoriesByPerspectiveData, GetStoriesByPerspectiveVariables, GetTrendData, GetTrendVariables, GetStoryData, GetStoryVariables, SearchTrendsData, SearchTrendsVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreatePerspective(options?: useDataConnectMutationOptions<CreatePerspectiveData, FirebaseError, CreatePerspectiveVariables>): UseDataConnectMutationResult<CreatePerspectiveData, CreatePerspectiveVariables>;
export function useCreatePerspective(dc: DataConnect, options?: useDataConnectMutationOptions<CreatePerspectiveData, FirebaseError, CreatePerspectiveVariables>): UseDataConnectMutationResult<CreatePerspectiveData, CreatePerspectiveVariables>;

export function useAddPerspectiveMember(options?: useDataConnectMutationOptions<AddPerspectiveMemberData, FirebaseError, AddPerspectiveMemberVariables>): UseDataConnectMutationResult<AddPerspectiveMemberData, AddPerspectiveMemberVariables>;
export function useAddPerspectiveMember(dc: DataConnect, options?: useDataConnectMutationOptions<AddPerspectiveMemberData, FirebaseError, AddPerspectiveMemberVariables>): UseDataConnectMutationResult<AddPerspectiveMemberData, AddPerspectiveMemberVariables>;

export function useCreateTrend(options?: useDataConnectMutationOptions<CreateTrendData, FirebaseError, CreateTrendVariables>): UseDataConnectMutationResult<CreateTrendData, CreateTrendVariables>;
export function useCreateTrend(dc: DataConnect, options?: useDataConnectMutationOptions<CreateTrendData, FirebaseError, CreateTrendVariables>): UseDataConnectMutationResult<CreateTrendData, CreateTrendVariables>;

export function useCreateStory(options?: useDataConnectMutationOptions<CreateStoryData, FirebaseError, CreateStoryVariables>): UseDataConnectMutationResult<CreateStoryData, CreateStoryVariables>;
export function useCreateStory(dc: DataConnect, options?: useDataConnectMutationOptions<CreateStoryData, FirebaseError, CreateStoryVariables>): UseDataConnectMutationResult<CreateStoryData, CreateStoryVariables>;

export function useCreateConnection(options?: useDataConnectMutationOptions<CreateConnectionData, FirebaseError, CreateConnectionVariables>): UseDataConnectMutationResult<CreateConnectionData, CreateConnectionVariables>;
export function useCreateConnection(dc: DataConnect, options?: useDataConnectMutationOptions<CreateConnectionData, FirebaseError, CreateConnectionVariables>): UseDataConnectMutationResult<CreateConnectionData, CreateConnectionVariables>;

export function useCreateVariant(options?: useDataConnectMutationOptions<CreateVariantData, FirebaseError, CreateVariantVariables>): UseDataConnectMutationResult<CreateVariantData, CreateVariantVariables>;
export function useCreateVariant(dc: DataConnect, options?: useDataConnectMutationOptions<CreateVariantData, FirebaseError, CreateVariantVariables>): UseDataConnectMutationResult<CreateVariantData, CreateVariantVariables>;

export function useGetPerspective(vars: GetPerspectiveVariables, options?: useDataConnectQueryOptions<GetPerspectiveData>): UseDataConnectQueryResult<GetPerspectiveData, GetPerspectiveVariables>;
export function useGetPerspective(dc: DataConnect, vars: GetPerspectiveVariables, options?: useDataConnectQueryOptions<GetPerspectiveData>): UseDataConnectQueryResult<GetPerspectiveData, GetPerspectiveVariables>;

export function useGetPerspectiveMembers(vars: GetPerspectiveMembersVariables, options?: useDataConnectQueryOptions<GetPerspectiveMembersData>): UseDataConnectQueryResult<GetPerspectiveMembersData, GetPerspectiveMembersVariables>;
export function useGetPerspectiveMembers(dc: DataConnect, vars: GetPerspectiveMembersVariables, options?: useDataConnectQueryOptions<GetPerspectiveMembersData>): UseDataConnectQueryResult<GetPerspectiveMembersData, GetPerspectiveMembersVariables>;

export function useGetStoriesByPerspective(vars: GetStoriesByPerspectiveVariables, options?: useDataConnectQueryOptions<GetStoriesByPerspectiveData>): UseDataConnectQueryResult<GetStoriesByPerspectiveData, GetStoriesByPerspectiveVariables>;
export function useGetStoriesByPerspective(dc: DataConnect, vars: GetStoriesByPerspectiveVariables, options?: useDataConnectQueryOptions<GetStoriesByPerspectiveData>): UseDataConnectQueryResult<GetStoriesByPerspectiveData, GetStoriesByPerspectiveVariables>;

export function useGetTrend(vars: GetTrendVariables, options?: useDataConnectQueryOptions<GetTrendData>): UseDataConnectQueryResult<GetTrendData, GetTrendVariables>;
export function useGetTrend(dc: DataConnect, vars: GetTrendVariables, options?: useDataConnectQueryOptions<GetTrendData>): UseDataConnectQueryResult<GetTrendData, GetTrendVariables>;

export function useGetStory(vars: GetStoryVariables, options?: useDataConnectQueryOptions<GetStoryData>): UseDataConnectQueryResult<GetStoryData, GetStoryVariables>;
export function useGetStory(dc: DataConnect, vars: GetStoryVariables, options?: useDataConnectQueryOptions<GetStoryData>): UseDataConnectQueryResult<GetStoryData, GetStoryVariables>;

export function useSearchTrends(vars: SearchTrendsVariables, options?: useDataConnectQueryOptions<SearchTrendsData>): UseDataConnectQueryResult<SearchTrendsData, SearchTrendsVariables>;
export function useSearchTrends(dc: DataConnect, vars: SearchTrendsVariables, options?: useDataConnectQueryOptions<SearchTrendsData>): UseDataConnectQueryResult<SearchTrendsData, SearchTrendsVariables>;
