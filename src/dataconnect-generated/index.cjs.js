const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'cue-count-service',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const createPerspectiveRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreatePerspective', inputVars);
}
createPerspectiveRef.operationName = 'CreatePerspective';
exports.createPerspectiveRef = createPerspectiveRef;

exports.createPerspective = function createPerspective(dcOrVars, vars) {
  return executeMutation(createPerspectiveRef(dcOrVars, vars));
};

const addPerspectiveMemberRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddPerspectiveMember', inputVars);
}
addPerspectiveMemberRef.operationName = 'AddPerspectiveMember';
exports.addPerspectiveMemberRef = addPerspectiveMemberRef;

exports.addPerspectiveMember = function addPerspectiveMember(dcOrVars, vars) {
  return executeMutation(addPerspectiveMemberRef(dcOrVars, vars));
};

const createTrendRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateTrend', inputVars);
}
createTrendRef.operationName = 'CreateTrend';
exports.createTrendRef = createTrendRef;

exports.createTrend = function createTrend(dcOrVars, vars) {
  return executeMutation(createTrendRef(dcOrVars, vars));
};

const createStoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateStory', inputVars);
}
createStoryRef.operationName = 'CreateStory';
exports.createStoryRef = createStoryRef;

exports.createStory = function createStory(dcOrVars, vars) {
  return executeMutation(createStoryRef(dcOrVars, vars));
};

const createConnectionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateConnection', inputVars);
}
createConnectionRef.operationName = 'CreateConnection';
exports.createConnectionRef = createConnectionRef;

exports.createConnection = function createConnection(dcOrVars, vars) {
  return executeMutation(createConnectionRef(dcOrVars, vars));
};

const createVariantRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateVariant', inputVars);
}
createVariantRef.operationName = 'CreateVariant';
exports.createVariantRef = createVariantRef;

exports.createVariant = function createVariant(dcOrVars, vars) {
  return executeMutation(createVariantRef(dcOrVars, vars));
};

const getPerspectiveRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetPerspective', inputVars);
}
getPerspectiveRef.operationName = 'GetPerspective';
exports.getPerspectiveRef = getPerspectiveRef;

exports.getPerspective = function getPerspective(dcOrVars, vars) {
  return executeQuery(getPerspectiveRef(dcOrVars, vars));
};

const getPerspectiveMembersRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetPerspectiveMembers', inputVars);
}
getPerspectiveMembersRef.operationName = 'GetPerspectiveMembers';
exports.getPerspectiveMembersRef = getPerspectiveMembersRef;

exports.getPerspectiveMembers = function getPerspectiveMembers(dcOrVars, vars) {
  return executeQuery(getPerspectiveMembersRef(dcOrVars, vars));
};

const getStoriesByPerspectiveRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetStoriesByPerspective', inputVars);
}
getStoriesByPerspectiveRef.operationName = 'GetStoriesByPerspective';
exports.getStoriesByPerspectiveRef = getStoriesByPerspectiveRef;

exports.getStoriesByPerspective = function getStoriesByPerspective(dcOrVars, vars) {
  return executeQuery(getStoriesByPerspectiveRef(dcOrVars, vars));
};

const getTrendRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTrend', inputVars);
}
getTrendRef.operationName = 'GetTrend';
exports.getTrendRef = getTrendRef;

exports.getTrend = function getTrend(dcOrVars, vars) {
  return executeQuery(getTrendRef(dcOrVars, vars));
};

const getStoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetStory', inputVars);
}
getStoryRef.operationName = 'GetStory';
exports.getStoryRef = getStoryRef;

exports.getStory = function getStory(dcOrVars, vars) {
  return executeQuery(getStoryRef(dcOrVars, vars));
};

const searchTrendsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'SearchTrends', inputVars);
}
searchTrendsRef.operationName = 'SearchTrends';
exports.searchTrendsRef = searchTrendsRef;

exports.searchTrends = function searchTrends(dcOrVars, vars) {
  return executeQuery(searchTrendsRef(dcOrVars, vars));
};
