
/**
 * @file dwelling.js
 * 
 * This file contains GraphQL queries and mutations related to dwellings.
 * 
 * Queries:
 * - Query.dwelling: Fetch a single dwelling by ID.
 * - Query.dwellings: Fetch a list of dwellings.
 * - Query.myDwelling: Fetch the current user's dwelling.
 * 
 * Mutations:
 * - Mutation.createDwelling: Create a new dwelling.
 * - Mutation.updateDwelling: Update an existing dwelling.
 * - Mutation.deleteDwelling: Delete a dwelling.
 * 
 * Dwelling Type Resolvers:
 * - Dwelling.rooms: Fetch the rooms of a dwelling.
 * - Dwelling.totalRooms: Calculate the total number of rooms in a dwelling.
 * - Dwelling.totalItems: Calculate the total number of items in a dwelling.
 * - Dwelling.totalValue: Calculate the total value of items in a dwelling.
 */