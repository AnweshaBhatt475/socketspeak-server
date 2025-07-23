// const express = require('express');
// const cors = require('cors');
// const cookieParser = require('cookie-parser');
// require('dotenv').config();
// const connectDB = require('./config/connectDB');
// const router = require('./routes/index');

// // Setup
// const app = express();
// const allowedOrigins = [
//   'https://chat-app-frontend-tt7i.onrender.com',
//   'https://socketspeak-client.onrender.com',
//   'https://socketspeakclient.onrender.com',
//   'http://localhost:5173',
// ];

// app.use(cors({
//   origin: (origin, callback) => {
//     if (!origin || allowedOrigins.includes(origin)) {
//       return callback(null, true);
//     }
//     callback(new Error('Not allowed by CORS'));
//   },
//   credentials: true,
// }));
// app.use(express.json());
// app.use(cookieParser());

// // WebSocket
// const { app: socketApp, server } = require('./socket/index');
// socketApp.use(app);

// // Routes
// app.use('/api', router);

// // Health check
// app.get('/', (req, res) => {
//   res.json({ message: 'Server running' });
// });

// // DB & Server Start
// const PORT = process.env.PORT || 4001;
// connectDB().then(() => {
//   server.listen(PORT, () => {
//     console.log(`🚀 Server running at http://localhost:${PORT}`);
//   });
// });

// index.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
require('dotenv').config();

const connectDB = require('./config/connectDB');
const router = require('./routes/index');
const setupSocket = require('./socket/index'); // ✅ Import setup function

const app = express();
const server = http.createServer(app); // ✅ Server for socket

const allowedOrigins = [
  'https://chat-app-frontend-tt7i.onrender.com',
  'https://socketspeak-client.onrender.com',
  'https://socketspeakclient.onrender.com',
  'http://localhost:5173',
];

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api', router);
app.get('/', (req, res) => {
  res.json({ message: 'Server running' });
});

// Database + Server + Socket
connectDB().then(() => {
  setupSocket(server); // ✅ Initialize Socket.IO
  const PORT = process.env.PORT || 4001;
  server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
});

