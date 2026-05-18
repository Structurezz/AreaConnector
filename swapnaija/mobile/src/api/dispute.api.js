import client from './client';

export const getDisputeRoom = (swapId) =>
  client.get(`/dispute/swap/${swapId}`).then(r => r.data.data);

export const sendDisputeMessage = (roomId, content, messageType = 'text') =>
  client.post(`/dispute/room/${roomId}/message`, { content, messageType }).then(r => r.data.data);
