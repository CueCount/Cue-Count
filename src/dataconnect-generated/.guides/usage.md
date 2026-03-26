# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useGetPerspective, useGetPerspectiveMembers, useGetStoriesByPerspective, useGetTrend, useGetStory, useSearchTrends, useCreatePerspective, useAddPerspectiveMember, useCreateTrend, useCreateStory } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useGetPerspective(getPerspectiveVars);

const { data, isPending, isSuccess, isError, error } = useGetPerspectiveMembers(getPerspectiveMembersVars);

const { data, isPending, isSuccess, isError, error } = useGetStoriesByPerspective(getStoriesByPerspectiveVars);

const { data, isPending, isSuccess, isError, error } = useGetTrend(getTrendVars);

const { data, isPending, isSuccess, isError, error } = useGetStory(getStoryVars);

const { data, isPending, isSuccess, isError, error } = useSearchTrends(searchTrendsVars);

const { data, isPending, isSuccess, isError, error } = useCreatePerspective(createPerspectiveVars);

const { data, isPending, isSuccess, isError, error } = useAddPerspectiveMember(addPerspectiveMemberVars);

const { data, isPending, isSuccess, isError, error } = useCreateTrend(createTrendVars);

const { data, isPending, isSuccess, isError, error } = useCreateStory(createStoryVars);

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { getPerspective, getPerspectiveMembers, getStoriesByPerspective, getTrend, getStory, searchTrends, createPerspective, addPerspectiveMember, createTrend, createStory } from '@dataconnect/generated';


// Operation GetPerspective:  For variables, look at type GetPerspectiveVars in ../index.d.ts
const { data } = await GetPerspective(dataConnect, getPerspectiveVars);

// Operation GetPerspectiveMembers:  For variables, look at type GetPerspectiveMembersVars in ../index.d.ts
const { data } = await GetPerspectiveMembers(dataConnect, getPerspectiveMembersVars);

// Operation GetStoriesByPerspective:  For variables, look at type GetStoriesByPerspectiveVars in ../index.d.ts
const { data } = await GetStoriesByPerspective(dataConnect, getStoriesByPerspectiveVars);

// Operation GetTrend:  For variables, look at type GetTrendVars in ../index.d.ts
const { data } = await GetTrend(dataConnect, getTrendVars);

// Operation GetStory:  For variables, look at type GetStoryVars in ../index.d.ts
const { data } = await GetStory(dataConnect, getStoryVars);

// Operation SearchTrends:  For variables, look at type SearchTrendsVars in ../index.d.ts
const { data } = await SearchTrends(dataConnect, searchTrendsVars);

// Operation CreatePerspective:  For variables, look at type CreatePerspectiveVars in ../index.d.ts
const { data } = await CreatePerspective(dataConnect, createPerspectiveVars);

// Operation AddPerspectiveMember:  For variables, look at type AddPerspectiveMemberVars in ../index.d.ts
const { data } = await AddPerspectiveMember(dataConnect, addPerspectiveMemberVars);

// Operation CreateTrend:  For variables, look at type CreateTrendVars in ../index.d.ts
const { data } = await CreateTrend(dataConnect, createTrendVars);

// Operation CreateStory:  For variables, look at type CreateStoryVars in ../index.d.ts
const { data } = await CreateStory(dataConnect, createStoryVars);


```