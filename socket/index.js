const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');
const UserModel = require('../models/UserModel');
const { ConversationModel, MessageModel } = require('../models/ConversationModel');
const Group = require('../models/GroupModel'); // ✅ Don't forget this!
const getConversation = require('../helpers/getConversation');

const app = express();
const server = http.createServer(app);

// ✅ Socket.IO with CORS config
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://socketspeak-client.vercel.app',
      'https://socketspeakclient.vercel.app',
      'https://chat-app-frontend-tt7i.onrender.com',
    ],
    credentials: true,
  },
});

const onlineUser = new Set();

io.on('connection', async (socket) => {
  console.log('🔌 User connected:', socket.id);

  const token = socket.handshake.auth.token;
  const user = await getUserDetailsFromToken(token).catch(() => null);
  if (!user || !user._id) {
    console.log('❌ Invalid or missing token. Disconnecting:', socket.id);
    return socket.disconnect();
  }

  const userId = user._id.toString();
  socket.join(userId);
  onlineUser.add(userId);
  io.emit('onlineUser', Array.from(onlineUser));
  console.log('✅ Joined personal room:', userId);

  // ✅ Handle direct message page fetch
  socket.on('message-page', async (receiverId) => {
    try {
      const receiver = await UserModel.findById(receiverId).select('-password');
      socket.emit('message-user', {
        _id: receiver?._id,
        name: receiver?.name,
        email: receiver?.email,
        profile_pic: receiver?.profile_pic,
        online: onlineUser.has(receiverId),
      });

      const convo = await ConversationModel.findOne({
        $or: [
          { sender: userId, receiver: receiverId },
          { sender: receiverId, receiver: userId },
        ],
      })
        .populate('messages')
        .sort({ updatedAt: -1 });

      socket.emit('message', convo?.messages || []);
    } catch (err) {
      console.error('❗ message-page error:', err.message);
    }
  });

  // ✅ Handle sending a new direct message
  socket.on('new message', async (data) => {
    try {
      let convo = await ConversationModel.findOne({
        $or: [
          { sender: data.sender, receiver: data.receiver },
          { sender: data.receiver, receiver: data.sender },
        ],
      });

      if (!convo) {
        convo = await ConversationModel.create({
          sender: data.sender,
          receiver: data.receiver,
        });
      }

      const msg = await MessageModel.create({
        text: data.text,
        imageUrl: data.imageUrl,
        videoUrl: data.videoUrl,
        audioUrl: data.audioUrl,
        msgByUserId: data.msgByUserId,
      });

      await ConversationModel.updateOne(
        { _id: convo._id },
        { $push: { messages: msg._id } }
      );

      const fullConvo = await ConversationModel.findById(convo._id).populate('messages');

      io.to(data.sender).emit('message', fullConvo.messages);
      io.to(data.receiver).emit('message', fullConvo.messages);

      io.to(data.sender).emit('conversation', await getConversation(data.sender));
      io.to(data.receiver).emit('conversation', await getConversation(data.receiver));
    } catch (err) {
      console.error('❗ new message error:', err.message);
    }
  });

  // ✅ Sidebar conversations fetch
  socket.on('sidebar', async (currentUserId) => {
    try {
      const conversation = await getConversation(currentUserId);
      socket.emit('conversation', conversation);
    } catch (err) {
      console.error('❗ sidebar error:', err.message);
    }
  });

  // ✅ Mark messages as seen
  socket.on('seen', async (msgByUserId) => {
    try {
      const convo = await ConversationModel.findOne({
        $or: [
          { sender: userId, receiver: msgByUserId },
          { sender: msgByUserId, receiver: userId },
        ],
      });

      const ids = convo?.messages || [];

      await MessageModel.updateMany(
        { _id: { $in: ids }, msgByUserId },
        { $set: { seen: true } }
      );

      io.to(userId).emit('conversation', await getConversation(userId));
      io.to(msgByUserId).emit('conversation', await getConversation(msgByUserId));
    } catch (err) {
      console.error('❗ seen error:', err.message);
    }
  });

  // ✅ Group chat: join a group
  socket.on('join-group', (groupId) => {
    socket.join(groupId);
    console.log(`🟢 User ${userId} joined group ${groupId}`);
  });

  // ✅ Group chat: send a message
  socket.on('group-message', async (msg) => {
    try {
      const message = new MessageModel(msg);
      await message.save();

      await Group.findByIdAndUpdate(msg.groupId, {
        $push: { messages: message._id },
      });

      io.to(msg.groupId).emit('new-group-message', {
        ...msg,
        _id: message._id,
        createdAt: message.createdAt,
      });
    } catch (err) {
      console.error('❗ group-message error:', err.message);
    }
  });

  // ✅ Handle disconnect
  socket.on('disconnect', () => {
    onlineUser.delete(userId);
    io.emit('onlineUser', Array.from(onlineUser));
    console.log('❌ Disconnected:', socket.id);
  });
});

module.exports = {
  app,
  server,
};
