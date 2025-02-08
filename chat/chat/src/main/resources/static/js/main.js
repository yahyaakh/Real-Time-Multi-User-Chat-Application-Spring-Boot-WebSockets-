'use strict';

document.addEventListener('DOMContentLoaded', function() {
    console.log("main.js loaded");

    // Global Variables
    var stompClient = null;
    var username = null;
    var currentRoom = null; // Holds the name of the room the user has joined
    var colors = [
        '#2196F3', '#32c787', '#00BCD4', '#ff5652',
        '#ffc107', '#ff85af', '#FF9800', '#39bbb0'
    ];

    //  Chat Functionality
    var usernamePage = document.querySelector('#username-page');
    var chatPage = document.querySelector('#chat-page');
    var usernameForm = document.querySelector('#usernameForm');
    var messageForm = document.querySelector('#messageForm');
    var messageInput = document.querySelector('#message');
    var messageArea = null;  // Initialized when chat page is visible
    var connectingElement = document.querySelector('.connecting');

    // Connect user for chat messages
    function connect(event) {
        username = document.querySelector('#name').value.trim();
        if (username) {
            // Transition to chat page
            usernamePage.classList.add('hidden');
            chatPage.classList.remove('hidden');
            messageArea = document.querySelector('#messageArea');

            // Connect to WebSocket
            var socket = new SockJS("/ws");
            stompClient = Stomp.over(socket);
            stompClient.connect({}, onConnected, onError);
        }
        event.preventDefault();
    }

    function onConnected() {
        // Subscribe to public chat messages (we filter by room later)
        stompClient.subscribe('/topic/public', onMessageReceived);
        // Notify the server that a user joined (include current room)
        setTimeout(function() {
            if (stompClient && stompClient.connected) {
                stompClient.send("/app/chat.addUser", {}, JSON.stringify({
                    sender: username,
                    type: 'JOIN',
                    room: currentRoom
                }));
            }
        }, 500);
        connectingElement.classList.add('hidden');
    }

    function onError(error) {
        connectingElement.textContent = 'Could not connect to WebSocket server. Please refresh this page to try again!';
        connectingElement.style.color = 'red';
        console.error("WebSocket error:", error);
    }

    function sendMessage(event) {
        var messageContent = messageInput.value.trim();
        if (messageContent && stompClient) {
            var chatMessage = {
                sender: username,
                content: messageInput.value,
                type: 'CHAT',
                room: currentRoom
            };
            stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
            messageInput.value = '';
        }
        event.preventDefault();
    }

    function onMessageReceived(payload) {
        var message = JSON.parse(payload.body);
        // Only display messages that belong to the current room
        if (message.room !== currentRoom) {
            return;
        }
        var messageElement = document.createElement('li');

        if (message.type === 'JOIN') {
            messageElement.classList.add('event-message');
            message.content = message.sender + ' joined!';
        } else if (message.type === 'LEAVE') {
            messageElement.classList.add('event-message');
            message.content = message.sender + ' left!';
        } else {
            messageElement.classList.add('chat-message');
            var avatarElement = document.createElement('i');
            var avatarText = document.createTextNode(message.sender ? message.sender[0] : '?');
            avatarElement.appendChild(avatarText);
            avatarElement.style['background-color'] = getAvatarColor(message.sender || 'unknown');
            messageElement.appendChild(avatarElement);
            var usernameElement = document.createElement('span');
            var usernameText = document.createTextNode(message.sender || 'Unknown');
            usernameElement.appendChild(usernameText);
            messageElement.appendChild(usernameElement);
        }

        var textElement = document.createElement('p');
        var messageText = document.createTextNode(message.content);
        textElement.appendChild(messageText);
        messageElement.appendChild(textElement);
        messageArea.appendChild(messageElement);
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    function getAvatarColor(messageSender) {
        var hash = 0;
        for (var i = 0; i < messageSender.length; i++) {
            hash = (31 * hash + messageSender.charCodeAt(i)) % colors.length;
        }
        var index = Math.abs(hash) % colors.length;
        return colors[index] || '#000000';
    }

    usernameForm.addEventListener('submit', connect, true);
    messageForm.addEventListener('submit', sendMessage, true);

    // Room Creation Functionality
    var roomTypeInputs = document.getElementsByName('roomType');
    var passwordField = document.getElementById('passwordField');
    var roomPasswordInput = document.getElementById('roomPassword');

    Array.prototype.forEach.call(roomTypeInputs, function(radio) {
        radio.addEventListener('change', function() {
            if (this.value.toLowerCase() === 'private' && this.checked) {
                passwordField.classList.remove('hidden');
                roomPasswordInput.setAttribute('required', 'required');
            } else {
                passwordField.classList.add('hidden');
                roomPasswordInput.removeAttribute('required');
            }
        });
    });

    var roomTypeForm = document.getElementById('room-typeForm');
    if (roomTypeForm) {
        roomTypeForm.addEventListener('submit', function(event) {
            event.preventDefault();
            console.log("Room creation form submitted!");

            var roomName = document.getElementById('roomName').value.trim();
            var roomTypeValue = document.querySelector('input[name="roomType"]:checked').value;
            var roomPass = (roomTypeValue.toLowerCase() === 'private')
                ? document.getElementById('roomPassword').value
                : null;
            // Build the room object to send
            var room = {
                name: roomName,
                type: roomTypeValue.toLowerCase() === 'private' ? "Private" : "Public",
                password: roomTypeValue.toLowerCase() === 'private' ? roomPass : null
            };

            console.log("Room data to send:", room);
            // For the first user, creating a room also means joining that room.
            currentRoom = room.name; // Set current room to the newly created room

            if (!stompClient || !stompClient.connected) {
                var socket = new SockJS("/ws");
                stompClient = Stomp.over(socket);
                stompClient.connect({}, function(frame) {
                    console.log("Connected for room creation:", frame);
                    sendRoomCreation(room);
                    subscribeToRoomUpdates();
                }, onError);
            } else {
                sendRoomCreation(room);
            }
        });
    } else {
        console.error("Room creation form (room-typeForm) not found!");
    }

    function sendRoomCreation(room) {
        stompClient.send("/app/room.create", {}, JSON.stringify(room));
        console.log("Room creation message sent.");
    }

    // Subscribe to room creation/list updates
    function subscribeToRoomUpdates() {
        stompClient.subscribe('/topic/rooms', function(payload) {
            var data = JSON.parse(payload.body);
            console.log("Room data received:", data);
            // If data is an array, update the list; if it's a single room, add it.
            if (Array.isArray(data)) {
                updateRoomList(data);
            } else {
                updateRoomList([data]);
            }
            // For the first user, transition to the username page after room creation.
            document.getElementById('room-type-page').classList.add('hidden');
            document.getElementById('username-page').classList.remove('hidden');
        });
    }

    // Room Listing and Joining
    var listRoomsButton = document.getElementById("listRoomsButton");
    if (listRoomsButton) {
        listRoomsButton.addEventListener("click", function() {
            if (!stompClient || !stompClient.connected) {
                // Create a connection if one does not exist
                var socket = new SockJS("/ws");
                stompClient = Stomp.over(socket);
                stompClient.connect({}, function(frame) {
                    console.log("Connected for room listing:", frame);
                    subscribeToRoomUpdates(); // Subscribe to /topic/rooms
                    // Once connected, send the room list request
                    stompClient.send("/app/room.list", {}, {});
                    console.log("Room list request sent after connection.");
                }, onError);
            } else {
                // If already connected, simply send the request
                stompClient.send("/app/room.list", {}, {});
                console.log("Room list request sent.");
            }
        });
    } else {
        console.error("List Rooms Button not found!");
    }


    function updateRoomList(rooms) {
        var display = document.getElementById("roomsDisplay");
        display.innerHTML = "";
        rooms.forEach(function(room) {
            var roomDiv = document.createElement("div");
            roomDiv.className = "room-item";
            roomDiv.innerHTML = "<strong>" + room.name + "</strong> (" + room.type + ")";

            var joinButton = document.createElement("button");
            joinButton.textContent = "Join Room";
            joinButton.className = "accent";
            joinButton.onclick = function() {
                joinRoom(room);
            };
            roomDiv.appendChild(joinButton);
            display.appendChild(roomDiv);
        });
    }

    function joinRoom(room) {
        // For a private room, prompt for password.
        if (room.type === "Private") {
            var password = prompt("Enter password for room " + room.name + ":");
            if (password === null) return; // Cancelled
            //  Here you would verify the password with the server.
            console.log("Attempting to join private room:", room.name, "with password:", password);
            // If password verification is successful, set currentRoom and transition.
            currentRoom = room.name;
        } else {
            console.log("Joining public room:", room.name);
            currentRoom = room.name;
        }
        // Transition to the username page if not already there
        document.getElementById('room-type-page').classList.add('hidden');
        document.getElementById('username-page').classList.remove('hidden');
        //you may send a join message to the server to notify others.
    }

    // if stompClient is already connected, subscribe to room updates.
    if (stompClient && stompClient.connected) {
        subscribeToRoomUpdates();
    }
});
