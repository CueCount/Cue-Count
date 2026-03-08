# Generated React README
This README will guide you through the process of using the generated React SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `JavaScript README`, you can find it at [`dataconnect-generated/README.md`](../README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

You can use this generated SDK by importing from the package `@dataconnect/generated/react` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#react).

# Table of Contents
- [**Overview**](#generated-react-readme)
- [**TanStack Query Firebase & TanStack React Query**](#tanstack-query-firebase-tanstack-react-query)
  - [*Package Installation*](#installing-tanstack-query-firebase-and-tanstack-react-query-packages)
  - [*Configuring TanStack Query*](#configuring-tanstack-query)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetPerspective*](#getperspective)
  - [*GetPerspectiveMembers*](#getperspectivemembers)
  - [*GetStoriesByPerspective*](#getstoriesbyperspective)
  - [*GetTrend*](#gettrend)
  - [*GetStory*](#getstory)
  - [*SearchTrends*](#searchtrends)
- [**Mutations**](#mutations)
  - [*CreatePerspective*](#createperspective)
  - [*AddPerspectiveMember*](#addperspectivemember)
  - [*CreateTrend*](#createtrend)
  - [*CreateStory*](#createstory)
  - [*CreateConnection*](#createconnection)
  - [*CreateVariant*](#createvariant)

# TanStack Query Firebase & TanStack React Query
This SDK provides [React](https://react.dev/) hooks generated specific to your application, for the operations found in the connector `example`. These hooks are generated using [TanStack Query Firebase](https://react-query-firebase.invertase.dev/) by our partners at Invertase, a library built on top of [TanStack React Query v5](https://tanstack.com/query/v5/docs/framework/react/overview).

***You do not need to be familiar with Tanstack Query or Tanstack Query Firebase to use this SDK.*** However, you may find it useful to learn more about them, as they will empower you as a user of this Generated React SDK.

## Installing TanStack Query Firebase and TanStack React Query Packages
In order to use the React generated SDK, you must install the `TanStack React Query` and `TanStack Query Firebase` packages.
```bash
npm i --save @tanstack/react-query @tanstack-query-firebase/react
```
```bash
npm i --save firebase@latest # Note: React has a peer dependency on ^11.3.0
```

You can also follow the installation instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#tanstack-install), or the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react) and [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/installation).

## Configuring TanStack Query
In order to use the React generated SDK in your application, you must wrap your application's component tree in a `QueryClientProvider` component from TanStack React Query. None of your generated React SDK hooks will work without this provider.

```javascript
import { QueryClientProvider } from '@tanstack/react-query';

// Create a TanStack Query client instance
const queryClient = new QueryClient()

function App() {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      <MyApplication />
    </QueryClientProvider>
  )
}
```

To learn more about `QueryClientProvider`, see the [TanStack React Query documentation](https://tanstack.com/query/latest/docs/framework/react/quick-start) and the [TanStack Query Firebase documentation](https://invertase.docs.page/tanstack-query-firebase/react#usage).

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`.

You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#emulator-react-angular).

```javascript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) using the hooks provided from your generated React SDK.

# Queries

The React generated SDK provides Query hook functions that call and return [`useDataConnectQuery`](https://react-query-firebase.invertase.dev/react/data-connect/querying) hooks from TanStack Query Firebase.

Calling these hook functions will return a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and the most recent data returned by the Query, among other things. To learn more about these hooks and how to use them, see the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react/data-connect/querying).

TanStack React Query caches the results of your Queries, so using the same Query hook function in multiple places in your application allows the entire application to automatically see updates to that Query's data.

Query hooks execute their Queries automatically when called, and periodically refresh, unless you change the `queryOptions` for the Query. To learn how to stop a Query from automatically executing, including how to make a query "lazy", see the [TanStack React Query documentation](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries).

To learn more about TanStack React Query's Queries, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/queries).

## Using Query Hooks
Here's a general overview of how to use the generated Query hooks in your code:

- If the Query has no variables, the Query hook function does not require arguments.
- If the Query has any required variables, the Query hook function will require at least one argument: an object that contains all the required variables for the Query.
- If the Query has some required and some optional variables, only required variables are necessary in the variables argument object, and optional variables may be provided as well.
- If all of the Query's variables are optional, the Query hook function does not require any arguments.
- Query hook functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.
- Query hooks functions can be called with or without passing in an `options` argument of type `useDataConnectQueryOptions`. To learn more about the `options` argument, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/query-options).
  - ***Special case:***  If the Query has all optional variables and you would like to provide an `options` argument to the Query hook function without providing any variables, you must pass `undefined` where you would normally pass the Query's variables, and then may provide the `options` argument.

Below are examples of how to use the `example` connector's generated Query hook functions to execute each Query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#operations-react-angular).

## GetPerspective
You can execute the `GetPerspective` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useGetPerspective(dc: DataConnect, vars: GetPerspectiveVariables, options?: useDataConnectQueryOptions<GetPerspectiveData>): UseDataConnectQueryResult<GetPerspectiveData, GetPerspectiveVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetPerspective(vars: GetPerspectiveVariables, options?: useDataConnectQueryOptions<GetPerspectiveData>): UseDataConnectQueryResult<GetPerspectiveData, GetPerspectiveVariables>;
```

### Variables
The `GetPerspective` Query requires an argument of type `GetPerspectiveVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetPerspectiveVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `GetPerspective` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetPerspective` Query is of type `GetPerspectiveData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetPerspectiveData {
  perspective?: {
    id: UUIDString;
    name: string;
    slug: string;
    plan: string;
    createdAt: TimestampString;
  } & Perspective_Key;
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetPerspective`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetPerspectiveVariables } from '@dataconnect/generated';
import { useGetPerspective } from '@dataconnect/generated/react'

export default function GetPerspectiveComponent() {
  // The `useGetPerspective` Query hook requires an argument of type `GetPerspectiveVariables`:
  const getPerspectiveVars: GetPerspectiveVariables = {
    id: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetPerspective(getPerspectiveVars);
  // Variables can be defined inline as well.
  const query = useGetPerspective({ id: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetPerspective(dataConnect, getPerspectiveVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetPerspective(getPerspectiveVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetPerspective(dataConnect, getPerspectiveVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.perspective);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetPerspectiveMembers
You can execute the `GetPerspectiveMembers` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useGetPerspectiveMembers(dc: DataConnect, vars: GetPerspectiveMembersVariables, options?: useDataConnectQueryOptions<GetPerspectiveMembersData>): UseDataConnectQueryResult<GetPerspectiveMembersData, GetPerspectiveMembersVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetPerspectiveMembers(vars: GetPerspectiveMembersVariables, options?: useDataConnectQueryOptions<GetPerspectiveMembersData>): UseDataConnectQueryResult<GetPerspectiveMembersData, GetPerspectiveMembersVariables>;
```

### Variables
The `GetPerspectiveMembers` Query requires an argument of type `GetPerspectiveMembersVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetPerspectiveMembersVariables {
  perspectiveId: UUIDString;
}
```
### Return Type
Recall that calling the `GetPerspectiveMembers` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetPerspectiveMembers` Query is of type `GetPerspectiveMembersData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetPerspectiveMembersData {
  perspectiveMembers: ({
    userId: string;
    role: string;
    createdAt: TimestampString;
  })[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetPerspectiveMembers`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetPerspectiveMembersVariables } from '@dataconnect/generated';
import { useGetPerspectiveMembers } from '@dataconnect/generated/react'

export default function GetPerspectiveMembersComponent() {
  // The `useGetPerspectiveMembers` Query hook requires an argument of type `GetPerspectiveMembersVariables`:
  const getPerspectiveMembersVars: GetPerspectiveMembersVariables = {
    perspectiveId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetPerspectiveMembers(getPerspectiveMembersVars);
  // Variables can be defined inline as well.
  const query = useGetPerspectiveMembers({ perspectiveId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetPerspectiveMembers(dataConnect, getPerspectiveMembersVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetPerspectiveMembers(getPerspectiveMembersVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetPerspectiveMembers(dataConnect, getPerspectiveMembersVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.perspectiveMembers);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetStoriesByPerspective
You can execute the `GetStoriesByPerspective` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useGetStoriesByPerspective(dc: DataConnect, vars: GetStoriesByPerspectiveVariables, options?: useDataConnectQueryOptions<GetStoriesByPerspectiveData>): UseDataConnectQueryResult<GetStoriesByPerspectiveData, GetStoriesByPerspectiveVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetStoriesByPerspective(vars: GetStoriesByPerspectiveVariables, options?: useDataConnectQueryOptions<GetStoriesByPerspectiveData>): UseDataConnectQueryResult<GetStoriesByPerspectiveData, GetStoriesByPerspectiveVariables>;
```

### Variables
The `GetStoriesByPerspective` Query requires an argument of type `GetStoriesByPerspectiveVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetStoriesByPerspectiveVariables {
  perspectiveId: UUIDString;
}
```
### Return Type
Recall that calling the `GetStoriesByPerspective` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetStoriesByPerspective` Query is of type `GetStoriesByPerspectiveData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetStoriesByPerspective`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetStoriesByPerspectiveVariables } from '@dataconnect/generated';
import { useGetStoriesByPerspective } from '@dataconnect/generated/react'

export default function GetStoriesByPerspectiveComponent() {
  // The `useGetStoriesByPerspective` Query hook requires an argument of type `GetStoriesByPerspectiveVariables`:
  const getStoriesByPerspectiveVars: GetStoriesByPerspectiveVariables = {
    perspectiveId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetStoriesByPerspective(getStoriesByPerspectiveVars);
  // Variables can be defined inline as well.
  const query = useGetStoriesByPerspective({ perspectiveId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetStoriesByPerspective(dataConnect, getStoriesByPerspectiveVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetStoriesByPerspective(getStoriesByPerspectiveVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetStoriesByPerspective(dataConnect, getStoriesByPerspectiveVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.stories);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetTrend
You can execute the `GetTrend` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useGetTrend(dc: DataConnect, vars: GetTrendVariables, options?: useDataConnectQueryOptions<GetTrendData>): UseDataConnectQueryResult<GetTrendData, GetTrendVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetTrend(vars: GetTrendVariables, options?: useDataConnectQueryOptions<GetTrendData>): UseDataConnectQueryResult<GetTrendData, GetTrendVariables>;
```

### Variables
The `GetTrend` Query requires an argument of type `GetTrendVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetTrendVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `GetTrend` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetTrend` Query is of type `GetTrendData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetTrend`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetTrendVariables } from '@dataconnect/generated';
import { useGetTrend } from '@dataconnect/generated/react'

export default function GetTrendComponent() {
  // The `useGetTrend` Query hook requires an argument of type `GetTrendVariables`:
  const getTrendVars: GetTrendVariables = {
    id: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetTrend(getTrendVars);
  // Variables can be defined inline as well.
  const query = useGetTrend({ id: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetTrend(dataConnect, getTrendVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetTrend(getTrendVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetTrend(dataConnect, getTrendVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.trend);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetStory
You can execute the `GetStory` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useGetStory(dc: DataConnect, vars: GetStoryVariables, options?: useDataConnectQueryOptions<GetStoryData>): UseDataConnectQueryResult<GetStoryData, GetStoryVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetStory(vars: GetStoryVariables, options?: useDataConnectQueryOptions<GetStoryData>): UseDataConnectQueryResult<GetStoryData, GetStoryVariables>;
```

### Variables
The `GetStory` Query requires an argument of type `GetStoryVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetStoryVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `GetStory` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetStory` Query is of type `GetStoryData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetStory`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetStoryVariables } from '@dataconnect/generated';
import { useGetStory } from '@dataconnect/generated/react'

export default function GetStoryComponent() {
  // The `useGetStory` Query hook requires an argument of type `GetStoryVariables`:
  const getStoryVars: GetStoryVariables = {
    id: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetStory(getStoryVars);
  // Variables can be defined inline as well.
  const query = useGetStory({ id: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetStory(dataConnect, getStoryVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetStory(getStoryVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetStory(dataConnect, getStoryVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.story);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## SearchTrends
You can execute the `SearchTrends` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useSearchTrends(dc: DataConnect, vars: SearchTrendsVariables, options?: useDataConnectQueryOptions<SearchTrendsData>): UseDataConnectQueryResult<SearchTrendsData, SearchTrendsVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useSearchTrends(vars: SearchTrendsVariables, options?: useDataConnectQueryOptions<SearchTrendsData>): UseDataConnectQueryResult<SearchTrendsData, SearchTrendsVariables>;
```

### Variables
The `SearchTrends` Query requires an argument of type `SearchTrendsVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface SearchTrendsVariables {
  name: string;
}
```
### Return Type
Recall that calling the `SearchTrends` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `SearchTrends` Query is of type `SearchTrendsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `SearchTrends`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, SearchTrendsVariables } from '@dataconnect/generated';
import { useSearchTrends } from '@dataconnect/generated/react'

export default function SearchTrendsComponent() {
  // The `useSearchTrends` Query hook requires an argument of type `SearchTrendsVariables`:
  const searchTrendsVars: SearchTrendsVariables = {
    name: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useSearchTrends(searchTrendsVars);
  // Variables can be defined inline as well.
  const query = useSearchTrends({ name: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useSearchTrends(dataConnect, searchTrendsVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useSearchTrends(searchTrendsVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useSearchTrends(dataConnect, searchTrendsVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.trends);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

# Mutations

The React generated SDK provides Mutations hook functions that call and return [`useDataConnectMutation`](https://react-query-firebase.invertase.dev/react/data-connect/mutations) hooks from TanStack Query Firebase.

Calling these hook functions will return a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, and the most recent data returned by the Mutation, among other things. To learn more about these hooks and how to use them, see the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react/data-connect/mutations).

Mutation hooks do not execute their Mutations automatically when called. Rather, after calling the Mutation hook function and getting a `UseMutationResult` object, you must call the `UseMutationResult.mutate()` function to execute the Mutation.

To learn more about TanStack React Query's Mutations, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/mutations).

## Using Mutation Hooks
Here's a general overview of how to use the generated Mutation hooks in your code:

- Mutation hook functions are not called with the arguments to the Mutation. Instead, arguments are passed to `UseMutationResult.mutate()`.
- If the Mutation has no variables, the `mutate()` function does not require arguments.
- If the Mutation has any required variables, the `mutate()` function will require at least one argument: an object that contains all the required variables for the Mutation.
- If the Mutation has some required and some optional variables, only required variables are necessary in the variables argument object, and optional variables may be provided as well.
- If all of the Mutation's variables are optional, the Mutation hook function does not require any arguments.
- Mutation hook functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.
- Mutation hooks also accept an `options` argument of type `useDataConnectMutationOptions`. To learn more about the `options` argument, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/mutations#mutation-side-effects).
  - `UseMutationResult.mutate()` also accepts an `options` argument of type `useDataConnectMutationOptions`.
  - ***Special case:*** If the Mutation has no arguments (or all optional arguments and you wish to provide none), and you want to pass `options` to `UseMutationResult.mutate()`, you must pass `undefined` where you would normally pass the Mutation's arguments, and then may provide the options argument.

Below are examples of how to use the `example` connector's generated Mutation hook functions to execute each Mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#operations-react-angular).

## CreatePerspective
You can execute the `CreatePerspective` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreatePerspective(options?: useDataConnectMutationOptions<CreatePerspectiveData, FirebaseError, CreatePerspectiveVariables>): UseDataConnectMutationResult<CreatePerspectiveData, CreatePerspectiveVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreatePerspective(dc: DataConnect, options?: useDataConnectMutationOptions<CreatePerspectiveData, FirebaseError, CreatePerspectiveVariables>): UseDataConnectMutationResult<CreatePerspectiveData, CreatePerspectiveVariables>;
```

### Variables
The `CreatePerspective` Mutation requires an argument of type `CreatePerspectiveVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreatePerspectiveVariables {
  name: string;
  slug: string;
  createdBy: string;
}
```
### Return Type
Recall that calling the `CreatePerspective` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreatePerspective` Mutation is of type `CreatePerspectiveData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreatePerspectiveData {
  perspective_insert: Perspective_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreatePerspective`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreatePerspectiveVariables } from '@dataconnect/generated';
import { useCreatePerspective } from '@dataconnect/generated/react'

export default function CreatePerspectiveComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreatePerspective();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreatePerspective(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreatePerspective(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreatePerspective(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreatePerspective` Mutation requires an argument of type `CreatePerspectiveVariables`:
  const createPerspectiveVars: CreatePerspectiveVariables = {
    name: ..., 
    slug: ..., 
    createdBy: ..., 
  };
  mutation.mutate(createPerspectiveVars);
  // Variables can be defined inline as well.
  mutation.mutate({ name: ..., slug: ..., createdBy: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createPerspectiveVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.perspective_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## AddPerspectiveMember
You can execute the `AddPerspectiveMember` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useAddPerspectiveMember(options?: useDataConnectMutationOptions<AddPerspectiveMemberData, FirebaseError, AddPerspectiveMemberVariables>): UseDataConnectMutationResult<AddPerspectiveMemberData, AddPerspectiveMemberVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useAddPerspectiveMember(dc: DataConnect, options?: useDataConnectMutationOptions<AddPerspectiveMemberData, FirebaseError, AddPerspectiveMemberVariables>): UseDataConnectMutationResult<AddPerspectiveMemberData, AddPerspectiveMemberVariables>;
```

### Variables
The `AddPerspectiveMember` Mutation requires an argument of type `AddPerspectiveMemberVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface AddPerspectiveMemberVariables {
  perspectiveId: UUIDString;
  userId: string;
  role: string;
}
```
### Return Type
Recall that calling the `AddPerspectiveMember` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `AddPerspectiveMember` Mutation is of type `AddPerspectiveMemberData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface AddPerspectiveMemberData {
  perspectiveMember_insert: PerspectiveMember_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `AddPerspectiveMember`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, AddPerspectiveMemberVariables } from '@dataconnect/generated';
import { useAddPerspectiveMember } from '@dataconnect/generated/react'

export default function AddPerspectiveMemberComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useAddPerspectiveMember();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useAddPerspectiveMember(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useAddPerspectiveMember(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useAddPerspectiveMember(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useAddPerspectiveMember` Mutation requires an argument of type `AddPerspectiveMemberVariables`:
  const addPerspectiveMemberVars: AddPerspectiveMemberVariables = {
    perspectiveId: ..., 
    userId: ..., 
    role: ..., 
  };
  mutation.mutate(addPerspectiveMemberVars);
  // Variables can be defined inline as well.
  mutation.mutate({ perspectiveId: ..., userId: ..., role: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(addPerspectiveMemberVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.perspectiveMember_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateTrend
You can execute the `CreateTrend` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateTrend(options?: useDataConnectMutationOptions<CreateTrendData, FirebaseError, CreateTrendVariables>): UseDataConnectMutationResult<CreateTrendData, CreateTrendVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateTrend(dc: DataConnect, options?: useDataConnectMutationOptions<CreateTrendData, FirebaseError, CreateTrendVariables>): UseDataConnectMutationResult<CreateTrendData, CreateTrendVariables>;
```

### Variables
The `CreateTrend` Mutation requires an argument of type `CreateTrendVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateTrendVariables {
  name: string;
  unit?: string | null;
  description?: string | null;
  source: string;
  frequency: string;
  createdBy: string;
}
```
### Return Type
Recall that calling the `CreateTrend` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateTrend` Mutation is of type `CreateTrendData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateTrendData {
  trend_insert: Trend_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateTrend`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateTrendVariables } from '@dataconnect/generated';
import { useCreateTrend } from '@dataconnect/generated/react'

export default function CreateTrendComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateTrend();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateTrend(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateTrend(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateTrend(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateTrend` Mutation requires an argument of type `CreateTrendVariables`:
  const createTrendVars: CreateTrendVariables = {
    name: ..., 
    unit: ..., // optional
    description: ..., // optional
    source: ..., 
    frequency: ..., 
    createdBy: ..., 
  };
  mutation.mutate(createTrendVars);
  // Variables can be defined inline as well.
  mutation.mutate({ name: ..., unit: ..., description: ..., source: ..., frequency: ..., createdBy: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createTrendVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.trend_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateStory
You can execute the `CreateStory` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateStory(options?: useDataConnectMutationOptions<CreateStoryData, FirebaseError, CreateStoryVariables>): UseDataConnectMutationResult<CreateStoryData, CreateStoryVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateStory(dc: DataConnect, options?: useDataConnectMutationOptions<CreateStoryData, FirebaseError, CreateStoryVariables>): UseDataConnectMutationResult<CreateStoryData, CreateStoryVariables>;
```

### Variables
The `CreateStory` Mutation requires an argument of type `CreateStoryVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateStoryVariables {
  perspectiveId: UUIDString;
  focalTrendId: UUIDString;
  name: string;
  createdBy: string;
}
```
### Return Type
Recall that calling the `CreateStory` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateStory` Mutation is of type `CreateStoryData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateStoryData {
  story_insert: Story_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateStory`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateStoryVariables } from '@dataconnect/generated';
import { useCreateStory } from '@dataconnect/generated/react'

export default function CreateStoryComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateStory();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateStory(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateStory(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateStory(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateStory` Mutation requires an argument of type `CreateStoryVariables`:
  const createStoryVars: CreateStoryVariables = {
    perspectiveId: ..., 
    focalTrendId: ..., 
    name: ..., 
    createdBy: ..., 
  };
  mutation.mutate(createStoryVars);
  // Variables can be defined inline as well.
  mutation.mutate({ perspectiveId: ..., focalTrendId: ..., name: ..., createdBy: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createStoryVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.story_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateConnection
You can execute the `CreateConnection` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateConnection(options?: useDataConnectMutationOptions<CreateConnectionData, FirebaseError, CreateConnectionVariables>): UseDataConnectMutationResult<CreateConnectionData, CreateConnectionVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateConnection(dc: DataConnect, options?: useDataConnectMutationOptions<CreateConnectionData, FirebaseError, CreateConnectionVariables>): UseDataConnectMutationResult<CreateConnectionData, CreateConnectionVariables>;
```

### Variables
The `CreateConnection` Mutation requires an argument of type `CreateConnectionVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
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
```
### Return Type
Recall that calling the `CreateConnection` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateConnection` Mutation is of type `CreateConnectionData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateConnectionData {
  connection_insert: Connection_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateConnection`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateConnectionVariables } from '@dataconnect/generated';
import { useCreateConnection } from '@dataconnect/generated/react'

export default function CreateConnectionComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateConnection();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateConnection(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateConnection(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateConnection(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateConnection` Mutation requires an argument of type `CreateConnectionVariables`:
  const createConnectionVars: CreateConnectionVariables = {
    storyId: ..., 
    sourceType: ..., 
    sourceTrendId: ..., // optional
    sourceConnectionId: ..., // optional
    targetType: ..., 
    targetTrendId: ..., // optional
    targetConnectionId: ..., // optional
    direction: ..., 
    weight: ..., 
  };
  mutation.mutate(createConnectionVars);
  // Variables can be defined inline as well.
  mutation.mutate({ storyId: ..., sourceType: ..., sourceTrendId: ..., sourceConnectionId: ..., targetType: ..., targetTrendId: ..., targetConnectionId: ..., direction: ..., weight: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createConnectionVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.connection_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateVariant
You can execute the `CreateVariant` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateVariant(options?: useDataConnectMutationOptions<CreateVariantData, FirebaseError, CreateVariantVariables>): UseDataConnectMutationResult<CreateVariantData, CreateVariantVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateVariant(dc: DataConnect, options?: useDataConnectMutationOptions<CreateVariantData, FirebaseError, CreateVariantVariables>): UseDataConnectMutationResult<CreateVariantData, CreateVariantVariables>;
```

### Variables
The `CreateVariant` Mutation requires an argument of type `CreateVariantVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateVariantVariables {
  storyId: UUIDString;
  trendId: UUIDString;
  name?: string | null;
  createdBy: string;
}
```
### Return Type
Recall that calling the `CreateVariant` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateVariant` Mutation is of type `CreateVariantData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateVariantData {
  variant_insert: Variant_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateVariant`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateVariantVariables } from '@dataconnect/generated';
import { useCreateVariant } from '@dataconnect/generated/react'

export default function CreateVariantComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateVariant();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateVariant(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateVariant(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateVariant(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateVariant` Mutation requires an argument of type `CreateVariantVariables`:
  const createVariantVars: CreateVariantVariables = {
    storyId: ..., 
    trendId: ..., 
    name: ..., // optional
    createdBy: ..., 
  };
  mutation.mutate(createVariantVars);
  // Variables can be defined inline as well.
  mutation.mutate({ storyId: ..., trendId: ..., name: ..., createdBy: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createVariantVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.variant_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

