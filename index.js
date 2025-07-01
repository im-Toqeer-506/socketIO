const socketIO = require("socket.io");
const app = require("express")();
const http = require("http");
const cors = require("cors");
const server = http.createServer(app);
const io = socketIO(server);
app.use(cors());
require("dotenv").config({
  path: "./.env",
});
app.get("/", (req, res) => {
  res.send("Hello World!");
});
let users = [];
const addUser = (userId, socketId) => {
  !users.some((user) => user.userId) && users.push({ userId, socketId });
};
const removerUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};
const getUser = (reciverId) => {
  return users.find((user) => user.userId === reciverId);
};
//Define a Message Object with a Seen PROP
const createMessage = ({ senderId, reciverId, text, images }) => ({
  senderId,
  reciverId,
  text,
  images,
  seen: false,
});

io.on("connection", (socket) => {
  //when connect
  console.log("a user is connected!");
  //take user and socket id for the User
  socket.on("addUser", (userId) => {
    addUser(userId, socket.id);
    io.emit("getUser", users);
  });
  //send and get Message
  const messages = []; //object to track messages sent to each other
  socket.on("sendMessage", ({ senderId, reciverId, text, images }) => {
    const message = createMessage({ senderId, reciverId, text, images });
    const user = getUser(reciverId);
    if (!messages[reciverId]) {
      messages[reciverId] = [message];
    } else {
      messages[reciverId].push(message);
    }
    //send the message to rerciver
    io.to(user?.socketId).emit("getMessage", message);
  });
  socket.on("messageSeen", ({ senderId, reciverId, messageId }) => {
    const user = getUser(senderId);
    //update the seen falg for the message
    if (messages[senderId]) {
      const message = messages[senderId].find(
        (message) => message.reciverId === reciverId && message.id === messageId
      );
      if (message) {
        message.seen = true;
        //send a message seen event to the Sender
        io.to(user?.socketId).emit("messageSeen", {
          senderId,
          reciverId,
          messageId,
        });
      }
    }
  });
  //Update and get the last message
  socket.on("updateLastMessage", ({ lastMessage, lastMessageId }) => {
    io.emit("getLastMessage", {
      lastMessage,
      lastMessageId,
    });
  });
  //when socket will disconnected
  socket.on("disconnect", () => {
    console.log(`a user is disconnected!`);
    removerUser(socket.id);
    io.emit("getUsers", users);
  });
});

server.listen(process.env.PORT || 4000, () => {
  console.log(`Server is running on the PORT:${process.env.PORT || 4000}`);
});
