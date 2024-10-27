/**
 * @file index.js
 * 
 * This file contains the main GraphQL resolvers for the application.
 * 
 * Queries:
 * - Query.dwelling: Fetch a single dwelling by ID.
 * - Query.dwellings: Fetch a list of dwellings.
 * - Query.myDwelling: Fetch the current user's dwelling.
 * - Query.room: Fetch a single room by ID.
 * - Query.rooms: Fetch a list of rooms.
 * - Query.item: Fetch a single item by ID.
 * - Query.items: Fetch a list of items.
 * - Query.search: Perform a search across entities.
 * 
 * Mutations:
 * - Mutation.createDwelling: Create a new dwelling.
 * - Mutation.updateDwelling: Update an existing dwelling.
 * - Mutation.deleteDwelling: Delete a dwelling.
 * - Mutation.createRoom: Create a new room.
 * - Mutation.updateRoom: Update an existing room.
 * - Mutation.deleteRoom: Delete a room.
 * - Mutation.uploadRoomImage: Upload an image for a room.
 * - Mutation.createItem: Create a new item.
 * - Mutation.updateItem: Update an existing item.
 * - Mutation.deleteItem: Delete an item.
 * 
 * Field Resolvers:
 * - Dwelling.rooms: Fetch the rooms of a dwelling.
 * - Dwelling.totalRooms: Calculate the total number of rooms in a dwelling.
 * - Dwelling.totalItems: Calculate the total number of items in a dwelling.
 * - Dwelling.totalValue: Calculate the total value of items in a dwelling.
 * - Room.items: Fetch the items in a room.
 * - Room.itemCount: Calculate the total number of items in a room.
 * - Room.totalValue: Calculate the total value of items in a room.
 */