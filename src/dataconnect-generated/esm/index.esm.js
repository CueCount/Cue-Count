import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'cue-count-service',
  location: 'us-east4'
};

export const createPerspectiveRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreatePerspective', inputVars);
}
createPerspectiveRef.operationName = 'CreatePerspective';

export function createPerspective(dcOrVars, vars) {
  return executeMutation(createPerspectiveRef(dcOrVars, vars));
}

export const addPerspectiveMemberRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddPerspectiveMember', inputVars);
}
addPerspectiveMemberRef.operationName = 'AddPerspectiveMember';

export function addPerspectiveMember(dcOrVars, vars) {
  return executeMutation(addPerspectiveMemberRef(dcOrVars, vars));
}

export const createTrendRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateTrend', inputVars);
}
createTrendRef.operationName = 'CreateTrend';

export function createTrend(dcOrVars, vars) {
  return executeMutation(createTrendRef(dcOrVars, vars));
}

export const createStoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateStory', inputVars);
}
createStoryRef.operationName = 'CreateStory';

export function createStory(dcOrVars, vars) {
  return executeMutation(createStoryRef(dcOrVars, vars));
}

export const createConnectionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateConnection', inputVars);
}
createConnectionRef.operationName = 'CreateConnection';

export function createConnection(dcOrVars, vars) {
  return executeMutation(createConnectionRef(dcOrVars, vars));
}

export const createVariantRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateVariant', inputVars);
}
createVariantRef.operationName = 'CreateVariant';

export function createVariant(dcOrVars, vars) {
  return executeMutation(createVariantRef(dcOrVars, vars));
}

export const getPerspectiveRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetPerspective', inputVars);
}
getPerspectiveRef.operationName = 'GetPerspective';

export function getPerspective(dcOrVars, vars) {
  return executeQuery(getPerspectiveRef(dcOrVars, vars));
}

export const getPerspectiveMembersRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetPerspectiveMembers', inputVars);
}
getPerspectiveMembersRef.operationName = 'GetPerspectiveMembers';

export function getPerspectiveMembers(dcOrVars, vars) {
  return executeQuery(getPerspectiveMembersRef(dcOrVars, vars));
}

export const getStoriesByPerspectiveRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetStoriesByPerspective', inputVars);
}
getStoriesByPerspectiveRef.operationName = 'GetStoriesByPerspective';

export function getStoriesByPerspective(dcOrVars, vars) {
  return executeQuery(getStoriesByPerspectiveRef(dcOrVars, vars));
}

export const getTrendRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTrend', inputVars);
}
getTrendRef.operationName = 'GetTrend';

export function getTrend(dcOrVars, vars) {
  return executeQuery(getTrendRef(dcOrVars, vars));
}

export const getStoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetStory', inputVars);
}
getStoryRef.operationName = 'GetStory';

export function getStory(dcOrVars, vars) {
  return executeQuery(getStoryRef(dcOrVars, vars));
}

export const searchTrendsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'SearchTrends', inputVars);
}
searchTrendsRef.operationName = 'SearchTrends';

export function searchTrends(dcOrVars, vars) {
  return executeQuery(searchTrendsRef(dcOrVars, vars));
}

