# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
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

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetPerspective
You can execute the `GetPerspective` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getPerspective(vars: GetPerspectiveVariables): QueryPromise<GetPerspectiveData, GetPerspectiveVariables>;

interface GetPerspectiveRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPerspectiveVariables): QueryRef<GetPerspectiveData, GetPerspectiveVariables>;
}
export const getPerspectiveRef: GetPerspectiveRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getPerspective(dc: DataConnect, vars: GetPerspectiveVariables): QueryPromise<GetPerspectiveData, GetPerspectiveVariables>;

interface GetPerspectiveRef {
  ...
  (dc: DataConnect, vars: GetPerspectiveVariables): QueryRef<GetPerspectiveData, GetPerspectiveVariables>;
}
export const getPerspectiveRef: GetPerspectiveRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getPerspectiveRef:
```typescript
const name = getPerspectiveRef.operationName;
console.log(name);
```

### Variables
The `GetPerspective` query requires an argument of type `GetPerspectiveVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetPerspectiveVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetPerspective` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetPerspectiveData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `GetPerspective`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getPerspective, GetPerspectiveVariables } from '@dataconnect/generated';

// The `GetPerspective` query requires an argument of type `GetPerspectiveVariables`:
const getPerspectiveVars: GetPerspectiveVariables = {
  id: ..., 
};

// Call the `getPerspective()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getPerspective(getPerspectiveVars);
// Variables can be defined inline as well.
const { data } = await getPerspective({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getPerspective(dataConnect, getPerspectiveVars);

console.log(data.perspective);

// Or, you can use the `Promise` API.
getPerspective(getPerspectiveVars).then((response) => {
  const data = response.data;
  console.log(data.perspective);
});
```

### Using `GetPerspective`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getPerspectiveRef, GetPerspectiveVariables } from '@dataconnect/generated';

// The `GetPerspective` query requires an argument of type `GetPerspectiveVariables`:
const getPerspectiveVars: GetPerspectiveVariables = {
  id: ..., 
};

// Call the `getPerspectiveRef()` function to get a reference to the query.
const ref = getPerspectiveRef(getPerspectiveVars);
// Variables can be defined inline as well.
const ref = getPerspectiveRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getPerspectiveRef(dataConnect, getPerspectiveVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.perspective);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.perspective);
});
```

## GetPerspectiveMembers
You can execute the `GetPerspectiveMembers` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getPerspectiveMembers(vars: GetPerspectiveMembersVariables): QueryPromise<GetPerspectiveMembersData, GetPerspectiveMembersVariables>;

interface GetPerspectiveMembersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPerspectiveMembersVariables): QueryRef<GetPerspectiveMembersData, GetPerspectiveMembersVariables>;
}
export const getPerspectiveMembersRef: GetPerspectiveMembersRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getPerspectiveMembers(dc: DataConnect, vars: GetPerspectiveMembersVariables): QueryPromise<GetPerspectiveMembersData, GetPerspectiveMembersVariables>;

interface GetPerspectiveMembersRef {
  ...
  (dc: DataConnect, vars: GetPerspectiveMembersVariables): QueryRef<GetPerspectiveMembersData, GetPerspectiveMembersVariables>;
}
export const getPerspectiveMembersRef: GetPerspectiveMembersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getPerspectiveMembersRef:
```typescript
const name = getPerspectiveMembersRef.operationName;
console.log(name);
```

### Variables
The `GetPerspectiveMembers` query requires an argument of type `GetPerspectiveMembersVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetPerspectiveMembersVariables {
  perspectiveId: UUIDString;
}
```
### Return Type
Recall that executing the `GetPerspectiveMembers` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetPerspectiveMembersData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetPerspectiveMembersData {
  perspectiveMembers: ({
    userId: string;
    role: string;
    createdAt: TimestampString;
  })[];
}
```
### Using `GetPerspectiveMembers`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getPerspectiveMembers, GetPerspectiveMembersVariables } from '@dataconnect/generated';

// The `GetPerspectiveMembers` query requires an argument of type `GetPerspectiveMembersVariables`:
const getPerspectiveMembersVars: GetPerspectiveMembersVariables = {
  perspectiveId: ..., 
};

// Call the `getPerspectiveMembers()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getPerspectiveMembers(getPerspectiveMembersVars);
// Variables can be defined inline as well.
const { data } = await getPerspectiveMembers({ perspectiveId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getPerspectiveMembers(dataConnect, getPerspectiveMembersVars);

console.log(data.perspectiveMembers);

// Or, you can use the `Promise` API.
getPerspectiveMembers(getPerspectiveMembersVars).then((response) => {
  const data = response.data;
  console.log(data.perspectiveMembers);
});
```

### Using `GetPerspectiveMembers`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getPerspectiveMembersRef, GetPerspectiveMembersVariables } from '@dataconnect/generated';

// The `GetPerspectiveMembers` query requires an argument of type `GetPerspectiveMembersVariables`:
const getPerspectiveMembersVars: GetPerspectiveMembersVariables = {
  perspectiveId: ..., 
};

// Call the `getPerspectiveMembersRef()` function to get a reference to the query.
const ref = getPerspectiveMembersRef(getPerspectiveMembersVars);
// Variables can be defined inline as well.
const ref = getPerspectiveMembersRef({ perspectiveId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getPerspectiveMembersRef(dataConnect, getPerspectiveMembersVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.perspectiveMembers);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.perspectiveMembers);
});
```

## GetStoriesByPerspective
You can execute the `GetStoriesByPerspective` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getStoriesByPerspective(vars: GetStoriesByPerspectiveVariables): QueryPromise<GetStoriesByPerspectiveData, GetStoriesByPerspectiveVariables>;

interface GetStoriesByPerspectiveRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetStoriesByPerspectiveVariables): QueryRef<GetStoriesByPerspectiveData, GetStoriesByPerspectiveVariables>;
}
export const getStoriesByPerspectiveRef: GetStoriesByPerspectiveRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getStoriesByPerspective(dc: DataConnect, vars: GetStoriesByPerspectiveVariables): QueryPromise<GetStoriesByPerspectiveData, GetStoriesByPerspectiveVariables>;

interface GetStoriesByPerspectiveRef {
  ...
  (dc: DataConnect, vars: GetStoriesByPerspectiveVariables): QueryRef<GetStoriesByPerspectiveData, GetStoriesByPerspectiveVariables>;
}
export const getStoriesByPerspectiveRef: GetStoriesByPerspectiveRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getStoriesByPerspectiveRef:
```typescript
const name = getStoriesByPerspectiveRef.operationName;
console.log(name);
```

### Variables
The `GetStoriesByPerspective` query requires an argument of type `GetStoriesByPerspectiveVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetStoriesByPerspectiveVariables {
  perspectiveId: UUIDString;
}
```
### Return Type
Recall that executing the `GetStoriesByPerspective` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetStoriesByPerspectiveData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `GetStoriesByPerspective`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getStoriesByPerspective, GetStoriesByPerspectiveVariables } from '@dataconnect/generated';

// The `GetStoriesByPerspective` query requires an argument of type `GetStoriesByPerspectiveVariables`:
const getStoriesByPerspectiveVars: GetStoriesByPerspectiveVariables = {
  perspectiveId: ..., 
};

// Call the `getStoriesByPerspective()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getStoriesByPerspective(getStoriesByPerspectiveVars);
// Variables can be defined inline as well.
const { data } = await getStoriesByPerspective({ perspectiveId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getStoriesByPerspective(dataConnect, getStoriesByPerspectiveVars);

console.log(data.stories);

// Or, you can use the `Promise` API.
getStoriesByPerspective(getStoriesByPerspectiveVars).then((response) => {
  const data = response.data;
  console.log(data.stories);
});
```

### Using `GetStoriesByPerspective`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getStoriesByPerspectiveRef, GetStoriesByPerspectiveVariables } from '@dataconnect/generated';

// The `GetStoriesByPerspective` query requires an argument of type `GetStoriesByPerspectiveVariables`:
const getStoriesByPerspectiveVars: GetStoriesByPerspectiveVariables = {
  perspectiveId: ..., 
};

// Call the `getStoriesByPerspectiveRef()` function to get a reference to the query.
const ref = getStoriesByPerspectiveRef(getStoriesByPerspectiveVars);
// Variables can be defined inline as well.
const ref = getStoriesByPerspectiveRef({ perspectiveId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getStoriesByPerspectiveRef(dataConnect, getStoriesByPerspectiveVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.stories);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.stories);
});
```

## GetTrend
You can execute the `GetTrend` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getTrend(vars: GetTrendVariables): QueryPromise<GetTrendData, GetTrendVariables>;

interface GetTrendRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetTrendVariables): QueryRef<GetTrendData, GetTrendVariables>;
}
export const getTrendRef: GetTrendRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getTrend(dc: DataConnect, vars: GetTrendVariables): QueryPromise<GetTrendData, GetTrendVariables>;

interface GetTrendRef {
  ...
  (dc: DataConnect, vars: GetTrendVariables): QueryRef<GetTrendData, GetTrendVariables>;
}
export const getTrendRef: GetTrendRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getTrendRef:
```typescript
const name = getTrendRef.operationName;
console.log(name);
```

### Variables
The `GetTrend` query requires an argument of type `GetTrendVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetTrendVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetTrend` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetTrendData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `GetTrend`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getTrend, GetTrendVariables } from '@dataconnect/generated';

// The `GetTrend` query requires an argument of type `GetTrendVariables`:
const getTrendVars: GetTrendVariables = {
  id: ..., 
};

// Call the `getTrend()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getTrend(getTrendVars);
// Variables can be defined inline as well.
const { data } = await getTrend({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getTrend(dataConnect, getTrendVars);

console.log(data.trend);

// Or, you can use the `Promise` API.
getTrend(getTrendVars).then((response) => {
  const data = response.data;
  console.log(data.trend);
});
```

### Using `GetTrend`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getTrendRef, GetTrendVariables } from '@dataconnect/generated';

// The `GetTrend` query requires an argument of type `GetTrendVariables`:
const getTrendVars: GetTrendVariables = {
  id: ..., 
};

// Call the `getTrendRef()` function to get a reference to the query.
const ref = getTrendRef(getTrendVars);
// Variables can be defined inline as well.
const ref = getTrendRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getTrendRef(dataConnect, getTrendVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.trend);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.trend);
});
```

## GetStory
You can execute the `GetStory` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getStory(vars: GetStoryVariables): QueryPromise<GetStoryData, GetStoryVariables>;

interface GetStoryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetStoryVariables): QueryRef<GetStoryData, GetStoryVariables>;
}
export const getStoryRef: GetStoryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getStory(dc: DataConnect, vars: GetStoryVariables): QueryPromise<GetStoryData, GetStoryVariables>;

interface GetStoryRef {
  ...
  (dc: DataConnect, vars: GetStoryVariables): QueryRef<GetStoryData, GetStoryVariables>;
}
export const getStoryRef: GetStoryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getStoryRef:
```typescript
const name = getStoryRef.operationName;
console.log(name);
```

### Variables
The `GetStory` query requires an argument of type `GetStoryVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetStoryVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetStory` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetStoryData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `GetStory`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getStory, GetStoryVariables } from '@dataconnect/generated';

// The `GetStory` query requires an argument of type `GetStoryVariables`:
const getStoryVars: GetStoryVariables = {
  id: ..., 
};

// Call the `getStory()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getStory(getStoryVars);
// Variables can be defined inline as well.
const { data } = await getStory({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getStory(dataConnect, getStoryVars);

console.log(data.story);

// Or, you can use the `Promise` API.
getStory(getStoryVars).then((response) => {
  const data = response.data;
  console.log(data.story);
});
```

### Using `GetStory`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getStoryRef, GetStoryVariables } from '@dataconnect/generated';

// The `GetStory` query requires an argument of type `GetStoryVariables`:
const getStoryVars: GetStoryVariables = {
  id: ..., 
};

// Call the `getStoryRef()` function to get a reference to the query.
const ref = getStoryRef(getStoryVars);
// Variables can be defined inline as well.
const ref = getStoryRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getStoryRef(dataConnect, getStoryVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.story);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.story);
});
```

## SearchTrends
You can execute the `SearchTrends` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
searchTrends(vars: SearchTrendsVariables): QueryPromise<SearchTrendsData, SearchTrendsVariables>;

interface SearchTrendsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: SearchTrendsVariables): QueryRef<SearchTrendsData, SearchTrendsVariables>;
}
export const searchTrendsRef: SearchTrendsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
searchTrends(dc: DataConnect, vars: SearchTrendsVariables): QueryPromise<SearchTrendsData, SearchTrendsVariables>;

interface SearchTrendsRef {
  ...
  (dc: DataConnect, vars: SearchTrendsVariables): QueryRef<SearchTrendsData, SearchTrendsVariables>;
}
export const searchTrendsRef: SearchTrendsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the searchTrendsRef:
```typescript
const name = searchTrendsRef.operationName;
console.log(name);
```

### Variables
The `SearchTrends` query requires an argument of type `SearchTrendsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface SearchTrendsVariables {
  name: string;
}
```
### Return Type
Recall that executing the `SearchTrends` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `SearchTrendsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `SearchTrends`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, searchTrends, SearchTrendsVariables } from '@dataconnect/generated';

// The `SearchTrends` query requires an argument of type `SearchTrendsVariables`:
const searchTrendsVars: SearchTrendsVariables = {
  name: ..., 
};

// Call the `searchTrends()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await searchTrends(searchTrendsVars);
// Variables can be defined inline as well.
const { data } = await searchTrends({ name: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await searchTrends(dataConnect, searchTrendsVars);

console.log(data.trends);

// Or, you can use the `Promise` API.
searchTrends(searchTrendsVars).then((response) => {
  const data = response.data;
  console.log(data.trends);
});
```

### Using `SearchTrends`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, searchTrendsRef, SearchTrendsVariables } from '@dataconnect/generated';

// The `SearchTrends` query requires an argument of type `SearchTrendsVariables`:
const searchTrendsVars: SearchTrendsVariables = {
  name: ..., 
};

// Call the `searchTrendsRef()` function to get a reference to the query.
const ref = searchTrendsRef(searchTrendsVars);
// Variables can be defined inline as well.
const ref = searchTrendsRef({ name: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = searchTrendsRef(dataConnect, searchTrendsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.trends);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.trends);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreatePerspective
You can execute the `CreatePerspective` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createPerspective(vars: CreatePerspectiveVariables): MutationPromise<CreatePerspectiveData, CreatePerspectiveVariables>;

interface CreatePerspectiveRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePerspectiveVariables): MutationRef<CreatePerspectiveData, CreatePerspectiveVariables>;
}
export const createPerspectiveRef: CreatePerspectiveRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createPerspective(dc: DataConnect, vars: CreatePerspectiveVariables): MutationPromise<CreatePerspectiveData, CreatePerspectiveVariables>;

interface CreatePerspectiveRef {
  ...
  (dc: DataConnect, vars: CreatePerspectiveVariables): MutationRef<CreatePerspectiveData, CreatePerspectiveVariables>;
}
export const createPerspectiveRef: CreatePerspectiveRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createPerspectiveRef:
```typescript
const name = createPerspectiveRef.operationName;
console.log(name);
```

### Variables
The `CreatePerspective` mutation requires an argument of type `CreatePerspectiveVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreatePerspectiveVariables {
  name: string;
  slug: string;
  createdBy: string;
}
```
### Return Type
Recall that executing the `CreatePerspective` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreatePerspectiveData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreatePerspectiveData {
  perspective_insert: Perspective_Key;
}
```
### Using `CreatePerspective`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createPerspective, CreatePerspectiveVariables } from '@dataconnect/generated';

// The `CreatePerspective` mutation requires an argument of type `CreatePerspectiveVariables`:
const createPerspectiveVars: CreatePerspectiveVariables = {
  name: ..., 
  slug: ..., 
  createdBy: ..., 
};

// Call the `createPerspective()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createPerspective(createPerspectiveVars);
// Variables can be defined inline as well.
const { data } = await createPerspective({ name: ..., slug: ..., createdBy: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createPerspective(dataConnect, createPerspectiveVars);

console.log(data.perspective_insert);

// Or, you can use the `Promise` API.
createPerspective(createPerspectiveVars).then((response) => {
  const data = response.data;
  console.log(data.perspective_insert);
});
```

### Using `CreatePerspective`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createPerspectiveRef, CreatePerspectiveVariables } from '@dataconnect/generated';

// The `CreatePerspective` mutation requires an argument of type `CreatePerspectiveVariables`:
const createPerspectiveVars: CreatePerspectiveVariables = {
  name: ..., 
  slug: ..., 
  createdBy: ..., 
};

// Call the `createPerspectiveRef()` function to get a reference to the mutation.
const ref = createPerspectiveRef(createPerspectiveVars);
// Variables can be defined inline as well.
const ref = createPerspectiveRef({ name: ..., slug: ..., createdBy: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createPerspectiveRef(dataConnect, createPerspectiveVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.perspective_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.perspective_insert);
});
```

## AddPerspectiveMember
You can execute the `AddPerspectiveMember` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
addPerspectiveMember(vars: AddPerspectiveMemberVariables): MutationPromise<AddPerspectiveMemberData, AddPerspectiveMemberVariables>;

interface AddPerspectiveMemberRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddPerspectiveMemberVariables): MutationRef<AddPerspectiveMemberData, AddPerspectiveMemberVariables>;
}
export const addPerspectiveMemberRef: AddPerspectiveMemberRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addPerspectiveMember(dc: DataConnect, vars: AddPerspectiveMemberVariables): MutationPromise<AddPerspectiveMemberData, AddPerspectiveMemberVariables>;

interface AddPerspectiveMemberRef {
  ...
  (dc: DataConnect, vars: AddPerspectiveMemberVariables): MutationRef<AddPerspectiveMemberData, AddPerspectiveMemberVariables>;
}
export const addPerspectiveMemberRef: AddPerspectiveMemberRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addPerspectiveMemberRef:
```typescript
const name = addPerspectiveMemberRef.operationName;
console.log(name);
```

### Variables
The `AddPerspectiveMember` mutation requires an argument of type `AddPerspectiveMemberVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AddPerspectiveMemberVariables {
  perspectiveId: UUIDString;
  userId: string;
  role: string;
}
```
### Return Type
Recall that executing the `AddPerspectiveMember` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddPerspectiveMemberData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddPerspectiveMemberData {
  perspectiveMember_insert: PerspectiveMember_Key;
}
```
### Using `AddPerspectiveMember`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addPerspectiveMember, AddPerspectiveMemberVariables } from '@dataconnect/generated';

// The `AddPerspectiveMember` mutation requires an argument of type `AddPerspectiveMemberVariables`:
const addPerspectiveMemberVars: AddPerspectiveMemberVariables = {
  perspectiveId: ..., 
  userId: ..., 
  role: ..., 
};

// Call the `addPerspectiveMember()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addPerspectiveMember(addPerspectiveMemberVars);
// Variables can be defined inline as well.
const { data } = await addPerspectiveMember({ perspectiveId: ..., userId: ..., role: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addPerspectiveMember(dataConnect, addPerspectiveMemberVars);

console.log(data.perspectiveMember_insert);

// Or, you can use the `Promise` API.
addPerspectiveMember(addPerspectiveMemberVars).then((response) => {
  const data = response.data;
  console.log(data.perspectiveMember_insert);
});
```

### Using `AddPerspectiveMember`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addPerspectiveMemberRef, AddPerspectiveMemberVariables } from '@dataconnect/generated';

// The `AddPerspectiveMember` mutation requires an argument of type `AddPerspectiveMemberVariables`:
const addPerspectiveMemberVars: AddPerspectiveMemberVariables = {
  perspectiveId: ..., 
  userId: ..., 
  role: ..., 
};

// Call the `addPerspectiveMemberRef()` function to get a reference to the mutation.
const ref = addPerspectiveMemberRef(addPerspectiveMemberVars);
// Variables can be defined inline as well.
const ref = addPerspectiveMemberRef({ perspectiveId: ..., userId: ..., role: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addPerspectiveMemberRef(dataConnect, addPerspectiveMemberVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.perspectiveMember_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.perspectiveMember_insert);
});
```

## CreateTrend
You can execute the `CreateTrend` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createTrend(vars: CreateTrendVariables): MutationPromise<CreateTrendData, CreateTrendVariables>;

interface CreateTrendRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateTrendVariables): MutationRef<CreateTrendData, CreateTrendVariables>;
}
export const createTrendRef: CreateTrendRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createTrend(dc: DataConnect, vars: CreateTrendVariables): MutationPromise<CreateTrendData, CreateTrendVariables>;

interface CreateTrendRef {
  ...
  (dc: DataConnect, vars: CreateTrendVariables): MutationRef<CreateTrendData, CreateTrendVariables>;
}
export const createTrendRef: CreateTrendRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createTrendRef:
```typescript
const name = createTrendRef.operationName;
console.log(name);
```

### Variables
The `CreateTrend` mutation requires an argument of type `CreateTrendVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
Recall that executing the `CreateTrend` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateTrendData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateTrendData {
  trend_insert: Trend_Key;
}
```
### Using `CreateTrend`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createTrend, CreateTrendVariables } from '@dataconnect/generated';

// The `CreateTrend` mutation requires an argument of type `CreateTrendVariables`:
const createTrendVars: CreateTrendVariables = {
  name: ..., 
  unit: ..., // optional
  description: ..., // optional
  source: ..., 
  frequency: ..., 
  createdBy: ..., 
};

// Call the `createTrend()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createTrend(createTrendVars);
// Variables can be defined inline as well.
const { data } = await createTrend({ name: ..., unit: ..., description: ..., source: ..., frequency: ..., createdBy: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createTrend(dataConnect, createTrendVars);

console.log(data.trend_insert);

// Or, you can use the `Promise` API.
createTrend(createTrendVars).then((response) => {
  const data = response.data;
  console.log(data.trend_insert);
});
```

### Using `CreateTrend`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createTrendRef, CreateTrendVariables } from '@dataconnect/generated';

// The `CreateTrend` mutation requires an argument of type `CreateTrendVariables`:
const createTrendVars: CreateTrendVariables = {
  name: ..., 
  unit: ..., // optional
  description: ..., // optional
  source: ..., 
  frequency: ..., 
  createdBy: ..., 
};

// Call the `createTrendRef()` function to get a reference to the mutation.
const ref = createTrendRef(createTrendVars);
// Variables can be defined inline as well.
const ref = createTrendRef({ name: ..., unit: ..., description: ..., source: ..., frequency: ..., createdBy: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createTrendRef(dataConnect, createTrendVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.trend_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.trend_insert);
});
```

## CreateStory
You can execute the `CreateStory` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createStory(vars: CreateStoryVariables): MutationPromise<CreateStoryData, CreateStoryVariables>;

interface CreateStoryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateStoryVariables): MutationRef<CreateStoryData, CreateStoryVariables>;
}
export const createStoryRef: CreateStoryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createStory(dc: DataConnect, vars: CreateStoryVariables): MutationPromise<CreateStoryData, CreateStoryVariables>;

interface CreateStoryRef {
  ...
  (dc: DataConnect, vars: CreateStoryVariables): MutationRef<CreateStoryData, CreateStoryVariables>;
}
export const createStoryRef: CreateStoryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createStoryRef:
```typescript
const name = createStoryRef.operationName;
console.log(name);
```

### Variables
The `CreateStory` mutation requires an argument of type `CreateStoryVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateStoryVariables {
  perspectiveId: UUIDString;
  focalTrendId: UUIDString;
  name: string;
  createdBy: string;
}
```
### Return Type
Recall that executing the `CreateStory` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateStoryData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateStoryData {
  story_insert: Story_Key;
}
```
### Using `CreateStory`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createStory, CreateStoryVariables } from '@dataconnect/generated';

// The `CreateStory` mutation requires an argument of type `CreateStoryVariables`:
const createStoryVars: CreateStoryVariables = {
  perspectiveId: ..., 
  focalTrendId: ..., 
  name: ..., 
  createdBy: ..., 
};

// Call the `createStory()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createStory(createStoryVars);
// Variables can be defined inline as well.
const { data } = await createStory({ perspectiveId: ..., focalTrendId: ..., name: ..., createdBy: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createStory(dataConnect, createStoryVars);

console.log(data.story_insert);

// Or, you can use the `Promise` API.
createStory(createStoryVars).then((response) => {
  const data = response.data;
  console.log(data.story_insert);
});
```

### Using `CreateStory`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createStoryRef, CreateStoryVariables } from '@dataconnect/generated';

// The `CreateStory` mutation requires an argument of type `CreateStoryVariables`:
const createStoryVars: CreateStoryVariables = {
  perspectiveId: ..., 
  focalTrendId: ..., 
  name: ..., 
  createdBy: ..., 
};

// Call the `createStoryRef()` function to get a reference to the mutation.
const ref = createStoryRef(createStoryVars);
// Variables can be defined inline as well.
const ref = createStoryRef({ perspectiveId: ..., focalTrendId: ..., name: ..., createdBy: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createStoryRef(dataConnect, createStoryVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.story_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.story_insert);
});
```

## CreateConnection
You can execute the `CreateConnection` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createConnection(vars: CreateConnectionVariables): MutationPromise<CreateConnectionData, CreateConnectionVariables>;

interface CreateConnectionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateConnectionVariables): MutationRef<CreateConnectionData, CreateConnectionVariables>;
}
export const createConnectionRef: CreateConnectionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createConnection(dc: DataConnect, vars: CreateConnectionVariables): MutationPromise<CreateConnectionData, CreateConnectionVariables>;

interface CreateConnectionRef {
  ...
  (dc: DataConnect, vars: CreateConnectionVariables): MutationRef<CreateConnectionData, CreateConnectionVariables>;
}
export const createConnectionRef: CreateConnectionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createConnectionRef:
```typescript
const name = createConnectionRef.operationName;
console.log(name);
```

### Variables
The `CreateConnection` mutation requires an argument of type `CreateConnectionVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
Recall that executing the `CreateConnection` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateConnectionData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateConnectionData {
  connection_insert: Connection_Key;
}
```
### Using `CreateConnection`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createConnection, CreateConnectionVariables } from '@dataconnect/generated';

// The `CreateConnection` mutation requires an argument of type `CreateConnectionVariables`:
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

// Call the `createConnection()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createConnection(createConnectionVars);
// Variables can be defined inline as well.
const { data } = await createConnection({ storyId: ..., sourceType: ..., sourceTrendId: ..., sourceConnectionId: ..., targetType: ..., targetTrendId: ..., targetConnectionId: ..., direction: ..., weight: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createConnection(dataConnect, createConnectionVars);

console.log(data.connection_insert);

// Or, you can use the `Promise` API.
createConnection(createConnectionVars).then((response) => {
  const data = response.data;
  console.log(data.connection_insert);
});
```

### Using `CreateConnection`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createConnectionRef, CreateConnectionVariables } from '@dataconnect/generated';

// The `CreateConnection` mutation requires an argument of type `CreateConnectionVariables`:
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

// Call the `createConnectionRef()` function to get a reference to the mutation.
const ref = createConnectionRef(createConnectionVars);
// Variables can be defined inline as well.
const ref = createConnectionRef({ storyId: ..., sourceType: ..., sourceTrendId: ..., sourceConnectionId: ..., targetType: ..., targetTrendId: ..., targetConnectionId: ..., direction: ..., weight: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createConnectionRef(dataConnect, createConnectionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.connection_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.connection_insert);
});
```

## CreateVariant
You can execute the `CreateVariant` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createVariant(vars: CreateVariantVariables): MutationPromise<CreateVariantData, CreateVariantVariables>;

interface CreateVariantRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateVariantVariables): MutationRef<CreateVariantData, CreateVariantVariables>;
}
export const createVariantRef: CreateVariantRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createVariant(dc: DataConnect, vars: CreateVariantVariables): MutationPromise<CreateVariantData, CreateVariantVariables>;

interface CreateVariantRef {
  ...
  (dc: DataConnect, vars: CreateVariantVariables): MutationRef<CreateVariantData, CreateVariantVariables>;
}
export const createVariantRef: CreateVariantRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createVariantRef:
```typescript
const name = createVariantRef.operationName;
console.log(name);
```

### Variables
The `CreateVariant` mutation requires an argument of type `CreateVariantVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateVariantVariables {
  storyId: UUIDString;
  trendId: UUIDString;
  name?: string | null;
  createdBy: string;
}
```
### Return Type
Recall that executing the `CreateVariant` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateVariantData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateVariantData {
  variant_insert: Variant_Key;
}
```
### Using `CreateVariant`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createVariant, CreateVariantVariables } from '@dataconnect/generated';

// The `CreateVariant` mutation requires an argument of type `CreateVariantVariables`:
const createVariantVars: CreateVariantVariables = {
  storyId: ..., 
  trendId: ..., 
  name: ..., // optional
  createdBy: ..., 
};

// Call the `createVariant()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createVariant(createVariantVars);
// Variables can be defined inline as well.
const { data } = await createVariant({ storyId: ..., trendId: ..., name: ..., createdBy: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createVariant(dataConnect, createVariantVars);

console.log(data.variant_insert);

// Or, you can use the `Promise` API.
createVariant(createVariantVars).then((response) => {
  const data = response.data;
  console.log(data.variant_insert);
});
```

### Using `CreateVariant`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createVariantRef, CreateVariantVariables } from '@dataconnect/generated';

// The `CreateVariant` mutation requires an argument of type `CreateVariantVariables`:
const createVariantVars: CreateVariantVariables = {
  storyId: ..., 
  trendId: ..., 
  name: ..., // optional
  createdBy: ..., 
};

// Call the `createVariantRef()` function to get a reference to the mutation.
const ref = createVariantRef(createVariantVars);
// Variables can be defined inline as well.
const ref = createVariantRef({ storyId: ..., trendId: ..., name: ..., createdBy: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createVariantRef(dataConnect, createVariantVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.variant_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.variant_insert);
});
```

