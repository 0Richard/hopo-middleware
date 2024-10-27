/**
 * @file room.js
 * 
 * This file contains GraphQL queries and mutations related to rooms.
 * 
 * Queries:
 * - Query.room: Fetch a single room by ID.
 * - Query.rooms: Fetch a list of rooms.
 * 
 * Mutations:
 * - Mutation.createRoom: Create a new room.
 * - Mutation.updateRoom: Update an existing room.
 * - Mutation.deleteRoom: Delete a room.
 * - Mutation.uploadRoomImage: Upload an image for a room.
 * 
 * Room Type Resolvers:
 * - Room.items: Fetch the items in a room.
 * - Room.itemCount: Calculate the total number of items in a room.
 * - Room.totalValue: Calculate the total value of items in a room.
 */