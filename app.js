// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    serverTimestamp,
    orderBy,
    query,
    where,
    deleteDoc,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    getDocs,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBtZDK-PFicfTaGNm3NkAUwev191cY-RJM",
    authDomain: "chatting-f6db0.firebaseapp.com",
    projectId: "chatting-f6db0",
    storageBucket: "chatting-f6db0.firebasestorage.app",
    messagingSenderId: "991102743547",
    appId: "1:991102743547:web:505a474b980ebe0d14115e",
    measurementId: "G-SGC7990D0R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// DOM elements
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const usernameInput = document.getElementById('usernameInput');
const setUsernameBtn = document.getElementById('setUsernameBtn');
const currentUserSpan = document.getElementById('currentUser');
const currentRoomName = document.getElementById('currentRoomName');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const deleteRoomBtn = document.getElementById('deleteRoomBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const publicRooms = document.getElementById('publicRooms');
const privateRooms = document.getElementById('privateRooms');
const typingIndicator = document.getElementById('typingIndicator');
const reactionBtn = document.getElementById('reactionBtn');
const reactionPicker = document.getElementById('reactionPicker');
const roomModal = document.getElementById('roomModal');
const newRoomName = document.getElementById('newRoomName');
const confirmCreateRoom = document.getElementById('confirmCreateRoom');
const cancelCreateRoom = document.getElementById('cancelCreateRoom');

let currentUsername = '';
let currentRoomId = '';
let currentRoomType = '';
let currentRoomCreator = '';
let typingTimeout;
let messageListener = null;
let typingListener = null;

// Public rooms configuration
const PUBLIC_ROOMS = [
    { id: 'general', name: 'General Chat' },
    { id: 'random', name: 'Random Talk' },
    { id: 'help', name: 'Help & Support' }
];

// Initialize public rooms
function initializePublicRooms() {
    publicRooms.innerHTML = '';
    PUBLIC_ROOMS.forEach(room => {
        const roomElement = createRoomElement(room.id, room.name, 'public', '');
        publicRooms.appendChild(roomElement);
    });
    
    // Auto-join General room for testing
    if (PUBLIC_ROOMS.length > 0) {
        const firstRoom = PUBLIC_ROOMS[0];
        joinRoom(firstRoom.id, firstRoom.name, 'public', '');
    }
}

// Set username
setUsernameBtn.addEventListener('click', setUsername);
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') setUsername();
});

function setUsername() {
    const username = usernameInput.value.trim();
    if (username) {
        currentUsername = username;
        currentUserSpan.textContent = `Hello, ${username}!`;
        usernameInput.style.display = 'none';
        setUsernameBtn.style.display = 'none';
        initializePublicRooms();
        loadUserRooms();
    } else {
        alert('Please enter a username');
    }
}

// Room creation modal
createRoomBtn.addEventListener('click', () => {
    if (!currentUsername) {
        alert('Please set your username first');
        return;
    }
    roomModal.style.display = 'block';
    newRoomName.focus();
});

confirmCreateRoom.addEventListener('click', createPrivateRoom);
cancelCreateRoom.addEventListener('click', () => {
    roomModal.style.display = 'none';
    newRoomName.value = '';
});

document.querySelector('.close').addEventListener('click', () => {
    roomModal.style.display = 'none';
    newRoomName.value = '';
});

// Generate 6-digit room code
function generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create private room
async function createPrivateRoom() {
    const roomName = newRoomName.value.trim();
    if (!roomName) {
        alert('Please enter a room name');
        return;
    }

    const roomCode = generateRoomCode();
    
    try {
        await addDoc(collection(db, 'rooms'), {
            name: roomName,
            code: roomCode,
            type: 'private',
            creator: currentUsername,
            createdAt: serverTimestamp(),
            members: [currentUsername]
        });

        roomModal.style.display = 'none';
        newRoomName.value = '';
        loadUserRooms();
        joinRoom(roomCode, roomName, 'private', currentUsername);
        
    } catch (error) {
        console.error('Error creating room:', error);
        alert('Error creating room. Please try again.');
    }
}

// Join room with code
joinRoomBtn.addEventListener('click', joinRoomByCode);
roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinRoomByCode();
});

async function joinRoomByCode() {
    const roomCode = roomCodeInput.value.trim();
    if (!roomCode || roomCode.length !== 6) {
        alert('Please enter a valid 6-digit room code');
        return;
    }

    if (!currentUsername) {
        alert('Please set your username first');
        return;
    }

    try {
        const roomsQuery = query(
            collection(db, 'rooms'), 
            where('code', '==', roomCode)
        );
        
        const querySnapshot = await getDocs(roomsQuery);
        
        if (querySnapshot.empty) {
            alert('Room not found. Please check the code.');
            return;
        }

        const roomDoc = querySnapshot.docs[0];
        const roomData = roomDoc.data();
        
        // Add user to room members
        await updateDoc(doc(db, 'rooms', roomDoc.id), {
            members: arrayUnion(currentUsername)
        });

        roomCodeInput.value = '';
        joinRoom(roomData.code, roomData.name, roomData.type, roomData.creator);
        
    } catch (error) {
        console.error('Error joining room:', error);
        alert('Error joining room. Please try again.');
    }
}

// Load user's rooms
async function loadUserRooms() {
    if (!currentUsername) return;

    try {
        const roomsQuery = query(
            collection(db, 'rooms'),
            where('members', 'array-contains', currentUsername)
        );
        
        onSnapshot(roomsQuery, (snapshot) => {
            privateRooms.innerHTML = '';
            snapshot.forEach((doc) => {
                const roomData = doc.data();
                const roomElement = createRoomElement(
                    roomData.code, 
                    roomData.name, 
                    roomData.type, 
                    roomData.creator,
                    roomData.code
                );
                privateRooms.appendChild(roomElement);
            });
        });
    } catch (error) {
        console.error('Error loading user rooms:', error);
    }
}

// Create room element
function createRoomElement(roomId, roomName, roomType, creator, roomCode = '') {
    const roomElement = document.createElement('div');
    roomElement.className = 'room-item';
    roomElement.innerHTML = `
        <div class="room-name">${roomName}</div>
        ${roomCode ? `<div class="room-code">${roomCode}</div>` : ''}
    `;
    
    roomElement.addEventListener('click', () => {
        joinRoom(roomId, roomName, roomType, creator);
    });
    
    return roomElement;
}

// Join room function
function joinRoom(roomId, roomName, roomType, creator) {
    // Clean up previous listeners
    if (messageListener) messageListener();
    if (typingListener) typingListener();
    
    currentRoomId = roomId;
    currentRoomType = roomType;
    currentRoomCreator = creator;
    
    // Update UI
    currentRoomName.textContent = roomName;
    roomCodeDisplay.textContent = roomType === 'private' ? `Room Code: ${roomId}` : 'Public Room';
    
    // Show/hide delete button for room creator
    deleteRoomBtn.style.display = (currentRoomType === 'private' && currentRoomCreator === currentUsername) ? 'block' : 'none';
    
    // Enable input
    messageInput.disabled = false;
    sendButton.disabled = false;
    reactionBtn.disabled = false;
    messageInput.focus();
    
    // Load messages
    loadMessages();
    
    // Set up typing indicator
    setupTypingIndicator();
    
    // Update active room in sidebar
    document.querySelectorAll('.room-item').forEach(item => {
        item.classList.remove('active');
    });
}

// Delete room function
deleteRoomBtn.addEventListener('click', async () => {
    if (currentRoomType !== 'private' || currentRoomCreator !== currentUsername) {
        alert('Only the room creator can delete this room');
        return;
    }

    if (!confirm('Are you sure you want to delete this room and all its messages? This action cannot be undone.')) {
        return;
    }

    try {
        // Find the room document
        const roomsQuery = query(
            collection(db, 'rooms'),
            where('code', '==', currentRoomId)
        );
        
        const querySnapshot = await getDocs(roomsQuery);
        
        if (querySnapshot.empty) {
            alert('Room not found');
            return;
        }

        const roomDoc = querySnapshot.docs[0];
        
        // Delete all messages in the room
        const messagesQuery = query(
            collection(db, 'messages'),
            where('roomId', '==', currentRoomId)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        const batch = writeBatch(db);
        
        messagesSnapshot.forEach((messageDoc) => {
            batch.delete(messageDoc.ref);
        });
        
        // Delete the room
        batch.delete(roomDoc.ref);
        await batch.commit();
        
        // Clear current room
        currentRoomId = '';
        currentRoomName.textContent = 'Select a Room';
        roomCodeDisplay.textContent = '';
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comments fa-3x"></i>
                <h3>Room deleted successfully</h3>
                <p>Select another room to continue chatting</p>
            </div>
        `;
        
        deleteRoomBtn.style.display = 'none';
        messageInput.disabled = true;
        sendButton.disabled = true;
        reactionBtn.disabled = true;
        
    } catch (error) {
        console.error('Error deleting room:', error);
        alert('Error deleting room. Please try again.');
    }
});

// Load messages
function loadMessages() {
    messagesContainer.innerHTML = '<div class="loading">Loading messages...</div>';
    
    // Simple query without compound filters for demo
    const messagesQuery = query(
        collection(db, 'messages'),
        orderBy('timestamp', 'asc')
    );

    messageListener = onSnapshot(messagesQuery, 
        (snapshot) => {
            messagesContainer.innerHTML = '';
            
            if (snapshot.empty) {
                messagesContainer.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
                return;
            }
            
            // Filter messages by roomId on client side
            const roomMessages = [];
            snapshot.forEach((doc) => {
                const message = doc.data();
                if (message.roomId === currentRoomId) {
                    roomMessages.push({...message, id: doc.id});
                }
            });
            
            if (roomMessages.length === 0) {
                messagesContainer.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
                return;
            }
            
            // Sort by timestamp (client-side)
            roomMessages.sort((a, b) => {
                if (!a.timestamp || !b.timestamp) return 0;
                return a.timestamp.toDate() - b.timestamp.toDate();
            });
            
            // Display messages
            roomMessages.forEach(message => {
                displayMessage(message, message.id);
            });
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        },
        (error) => {
            console.error('Error loading messages:', error);
            messagesContainer.innerHTML = `
                <div class="error">
                    <p>Error loading messages: ${error.message}</p>
                    <p>This is usually a security rules issue. Please check:</p>
                    <ul>
                        <li>Firebase Firestore rules allow read/write</li>
                        <li>You're using the correct project ID</li>
                    </ul>
                </div>
            `;
        }
    );
}

// Display message
function displayMessage(message, messageId) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.username === currentUsername ? 'own' : 'other'}`;
    messageDiv.id = messageId;
    
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    const messageUsername = document.createElement('span');
    messageUsername.className = 'message-username';
    messageUsername.textContent = message.username === currentUsername ? 'You' : message.username;
    
    const messageTime = document.createElement('span');
    messageTime.className = 'message-time';
    
    // Safe timestamp handling
    try {
        if (message.timestamp && message.timestamp.toDate) {
            const date = message.timestamp.toDate();
            messageTime.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            messageTime.textContent = 'Just now';
        }
    } catch (error) {
        console.warn('Error parsing timestamp:', error);
        messageTime.textContent = 'Just now';
    }
    
    messageHeader.appendChild(messageUsername);
    messageHeader.appendChild(messageTime);
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = message.text;
    
    const messageActions = document.createElement('div');
    messageActions.className = 'message-actions';
    
    // Add delete button for user's own messages
    if (message.username === currentUsername) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-message-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete message';
        deleteBtn.addEventListener('click', () => deleteMessage(messageId));
        messageActions.appendChild(deleteBtn);
    }
    
    messageDiv.appendChild(messageHeader);
    messageDiv.appendChild(messageText);
    messageDiv.appendChild(messageActions);
    
    messagesContainer.appendChild(messageDiv);
}


// Add this at the start of your app.js after Firebase initialization
console.log('Firebase App:', app);
console.log('Firestore Database:', db);

// Test Firestore connection
async function testFirestoreConnection() {
    try {
        const testRef = collection(db, 'test');
        console.log('Firestore connection: OK');
    } catch (error) {
        console.error('Firestore connection failed:', error);
    }
}

testFirestoreConnection();



// Delete message
async function deleteMessage(messageId) {
    if (!confirm('Are you sure you want to delete this message?')) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
        console.error('Error deleting message:', error);
        alert('Error deleting message. Please try again.');
    }
}

// Setup typing indicator
function setupTypingIndicator() {
    const typingRef = collection(db, 'typing');
    
    typingListener = onSnapshot(
        query(typingRef, where('roomId', '==', currentRoomId)),
        (snapshot) => {
            const typingUsers = [];
            snapshot.forEach((doc) => {
                const typingData = doc.data();
                if (typingData.username !== currentUsername && typingData.timestamp) {
                    // Check if typing was within last 3 seconds
                    const typingTime = typingData.timestamp.toDate();
                    const now = new Date();
                    if ((now - typingTime) < 3000) {
                        typingUsers.push(typingData.username);
                    }
                }
            });
            
            if (typingUsers.length > 0) {
                const names = typingUsers.join(', ');
                typingIndicator.textContent = `${names} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`;
            } else {
                typingIndicator.textContent = '';
            }
        }
    );
}

// Typing detection
messageInput.addEventListener('input', () => {
    if (currentRoomId && currentUsername) {
        updateTypingStatus();
    }
});

async function updateTypingStatus() {
    const typingRef = collection(db, 'typing');
    
    // Add typing status
    await addDoc(typingRef, {
        roomId: currentRoomId,
        username: currentUsername,
        timestamp: serverTimestamp()
    });
    
    // Clear previous timeout
    clearTimeout(typingTimeout);
    
    // Set timeout to automatically clear typing status after 2 seconds
    typingTimeout = setTimeout(() => {
        // Typing status will expire naturally based on timestamp check
    }, 2000);
}

// Reaction system
reactionBtn.addEventListener('click', () => {
    reactionPicker.style.display = reactionPicker.style.display === 'none' ? 'flex' : 'none';
});

// Add reaction options
document.querySelectorAll('.reaction-option').forEach(option => {
    option.addEventListener('click', (e) => {
        const emoji = e.target.getAttribute('data-emoji');
        reactionPicker.style.display = 'none';
        // Last message reaction (you might want to make this more specific)
        addReactionToLastMessage(emoji);
    });
});

async function addReactionToLastMessage(emoji) {
    // This is a simplified version - you might want to implement a way to select specific messages
    alert(`Reaction ${emoji} would be added to the last message. Implement message selection as needed.`);
}

async function toggleReaction(messageId, emoji) {
    try {
        const messageRef = doc(db, 'messages', messageId);
        const messageDoc = await getDocs(query(collection(db, 'messages'), where('__name__', '==', messageId)));
        
        if (messageDoc.empty) return;
        
        const messageData = messageDoc.docs[0].data();
        const currentReactions = messageData.reactions || {};
        const userReactions = currentReactions[emoji] || [];
        
        if (userReactions.includes(currentUsername)) {
            // Remove reaction
            await updateDoc(messageRef, {
                [`reactions.${emoji}`]: arrayRemove(currentUsername)
            });
        } else {
            // Add reaction
            await updateDoc(messageRef, {
                [`reactions.${emoji}`]: arrayUnion(currentUsername)
            });
        }
    } catch (error) {
        console.error('Error toggling reaction:', error);
    }
}

// Send message
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (!messageText || !currentUsername || !currentRoomId) {
        return;
    }

    sendButton.disabled = true;
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        await addDoc(collection(db, 'messages'), {
            text: messageText,
            username: currentUsername,
            roomId: currentRoomId,
            timestamp: serverTimestamp(),
            reactions: {}
        });
        
        messageInput.value = '';
        messageInput.focus();
        reactionPicker.style.display = 'none';
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message. Please try again.');
    } finally {
        sendButton.disabled = false;
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
}

// Close reaction picker when clicking outside
document.addEventListener('click', (e) => {
    if (!reactionBtn.contains(e.target) && !reactionPicker.contains(e.target)) {
        reactionPicker.style.display = 'none';
    }
});

console.log('Advanced Chat App Initialized');