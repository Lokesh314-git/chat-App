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
const authModal = document.getElementById('authModal');
const appContainer = document.getElementById('appContainer');
const loadingScreen = document.getElementById('loadingScreen');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabBtns = document.querySelectorAll('.tab-btn');
const authTabs = document.querySelectorAll('.auth-tab');

// User elements
const sidebarUserName = document.getElementById('sidebarUserName');
const userProfilePic = document.getElementById('userProfilePic');
const logoutBtn = document.getElementById('logoutBtn');

// Chat elements
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
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

// New elements for authentication and features
const loginId = document.getElementById('loginId');
const loginPassword = document.getElementById('loginPassword');
const regName = document.getElementById('regName');
const regUserId = document.getElementById('regUserId');
const regEmail = document.getElementById('regEmail');
const regPassword = document.getElementById('regPassword');
const regConfirmPassword = document.getElementById('regConfirmPassword');
const userIdValidation = document.getElementById('userIdValidation');
const passwordValidation = document.getElementById('passwordValidation');
const searchUsers = document.getElementById('searchUsers');
const searchResults = document.getElementById('searchResults');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.getElementById('sidebar');
const roomMembersBtn = document.getElementById('roomMembersBtn');
const membersPanel = document.getElementById('membersPanel');
const closeMembersPanel = document.getElementById('closeMembersPanel');
const membersList = document.getElementById('membersList');
const membersCount = document.getElementById('membersCount');
const onlineCount = document.getElementById('onlineCount');

// Global variables
let currentUser = null;
let currentRoomId = '';
let currentRoomType = '';
let currentRoomCreator = '';
let currentRoomData = null;
let typingTimeout;
let messageListener = null;
let typingListener = null;
let onlineStatusListener = null;
let roomMembersListener = null;

// Public rooms configuration
const PUBLIC_ROOMS = [
    { id: 'general', name: 'General Chat', type: 'public' },
    { id: 'random', name: 'Random Talk', type: 'public' },
    { id: 'help', name: 'Help & Support', type: 'public' }
];

// Initialize the application
function initApp() {
    checkAuthState();
    setupEventListeners();
}

// Check if user is already logged in
function checkAuthState() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showApp();
        setupUserPresence();
    } else {
        showAuthModal();
    }
}

// Show authentication modal
function showAuthModal() {
    authModal.style.display = 'flex';
    appContainer.style.display = 'none';
    loadingScreen.style.display = 'none';
}

// Show main application
function showApp() {
    authModal.style.display = 'none';
    appContainer.style.display = 'flex';
    loadingScreen.style.display = 'none';
    
    // Update user info in sidebar
    sidebarUserName.textContent = currentUser.name;
    userProfilePic.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=3498db&color=fff`;
    
    // Initialize chat features
    initializePublicRooms();
    loadUserRooms();
}

// Setup event listeners
function setupEventListeners() {
    // Auth tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchAuthTab(tab);
        });
    });

    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);

    // User ID validation
    regUserId.addEventListener('blur', checkUserIdAvailability);

    // Password confirmation validation
    regConfirmPassword.addEventListener('input', validatePasswordConfirmation);

    // Logout
    logoutBtn.addEventListener('click', handleLogout);

    // Mobile menu
    mobileMenuBtn.addEventListener('click', toggleSidebar);

    // Room members panel
    roomMembersBtn.addEventListener('click', toggleMembersPanel);
    closeMembersPanel.addEventListener('click', toggleMembersPanel);

    // Search users
    searchUsers.addEventListener('input', handleSearchUsers);

    // Existing chat event listeners
    createRoomBtn.addEventListener('click', () => {
        if (!currentUser) {
            alert('Please login first');
            return;
        }
        roomModal.style.display = 'flex';
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

    joinRoomBtn.addEventListener('click', joinRoomByCode);
    roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinRoomByCode();
    });

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    messageInput.addEventListener('input', () => {
        if (currentRoomId && currentUser) {
            updateTypingStatus();
        }
    });

    reactionBtn.addEventListener('click', () => {
        reactionPicker.style.display = reactionPicker.style.display === 'none' ? 'flex' : 'none';
    });

    document.querySelectorAll('.reaction-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const emoji = e.target.getAttribute('data-emoji');
            reactionPicker.style.display = 'none';
            // Implementation for adding reactions to specific messages would go here
        });
    });

    // Close reaction picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!reactionBtn.contains(e.target) && !reactionPicker.contains(e.target)) {
            reactionPicker.style.display = 'none';
        }
    });
}

// Auth tab switching
function switchAuthTab(tab) {
    tabBtns.forEach(btn => btn.classList.remove('active'));
    authTabs.forEach(tab => tab.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
}

// Check if user ID is available
async function checkUserIdAvailability() {
    const userId = regUserId.value.trim();
    if (!userId) return;

    try {
        const usersQuery = query(collection(db, 'users'), where('userId', '==', userId));
        const querySnapshot = await getDocs(usersQuery);
        
        if (querySnapshot.empty) {
            userIdValidation.textContent = 'User ID is available';
            userIdValidation.className = 'validation-message success';
        } else {
            userIdValidation.textContent = 'User ID already exists';
            userIdValidation.className = 'validation-message error';
        }
    } catch (error) {
        console.error('Error checking user ID:', error);
    }
}

// Validate password confirmation
function validatePasswordConfirmation() {
    const password = regPassword.value;
    const confirmPassword = regConfirmPassword.value;

    if (confirmPassword && password !== confirmPassword) {
        passwordValidation.textContent = 'Passwords do not match';
        passwordValidation.className = 'validation-message error';
    } else if (confirmPassword && password === confirmPassword) {
        passwordValidation.textContent = 'Passwords match';
        passwordValidation.className = 'validation-message success';
    } else {
        passwordValidation.textContent = '';
    }
}

// Handle user registration
async function handleRegister(e) {
    e.preventDefault();

    const name = regName.value.trim();
    const userId = regUserId.value.trim();
    const email = regEmail.value.trim();
    const password = regPassword.value;
    const confirmPassword = regConfirmPassword.value;

    // Validation
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    if (!userId || !name || !email || !password) {
        alert('Please fill all fields');
        return;
    }

    try {
        // Check if user ID already exists
        const usersQuery = query(collection(db, 'users'), where('userId', '==', userId));
        const querySnapshot = await getDocs(usersQuery);
        
        if (!querySnapshot.empty) {
            alert('User ID already exists');
            return;
        }

        // Create user document
        await addDoc(collection(db, 'users'), {
            name,
            userId,
            email,
            password, // In production, hash this password!
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        });

        // Auto-login after registration
        currentUser = { name, userId, email };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showApp();
        setupUserPresence();

        // Clear form
        registerForm.reset();
        userIdValidation.textContent = '';
        passwordValidation.textContent = '';

    } catch (error) {
        console.error('Error registering user:', error);
        alert('Error creating account. Please try again.');
    }
}

// Handle user login
async function handleLogin(e) {
    e.preventDefault();

    const loginIdentifier = loginId.value.trim();
    const password = loginPassword.value;

    if (!loginIdentifier || !password) {
        alert('Please fill all fields');
        return;
    }

    try {
        // Search by user ID or email
        const usersQuery = query(
            collection(db, 'users'),
            where('userId', '==', loginIdentifier)
        );

        const querySnapshot = await getDocs(usersQuery);
        
        if (querySnapshot.empty) {
            // Try searching by email
            const emailQuery = query(
                collection(db, 'users'),
                where('email', '==', loginIdentifier)
            );
            const emailSnapshot = await getDocs(emailQuery);
            
            if (emailSnapshot.empty) {
                alert('User not found');
                return;
            }
            
            // Check password for email match
            const userDoc = emailSnapshot.docs[0];
            const userData = userDoc.data();
            
            if (userData.password !== password) { // In production, use proper password hashing
                alert('Invalid password');
                return;
            }
            
            currentUser = {
                name: userData.name,
                userId: userData.userId,
                email: userData.email,
                id: userDoc.id
            };
            
        } else {
            // Check password for user ID match
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            
            if (userData.password !== password) { // In production, use proper password hashing
                alert('Invalid password');
                return;
            }
            
            currentUser = {
                name: userData.name,
                userId: userData.userId,
                email: userData.email,
                id: userDoc.id
            };
        }

        // Update last login
        if (currentUser.id) {
            await updateDoc(doc(db, 'users', currentUser.id), {
                lastLogin: serverTimestamp()
            });
        }

        // Save user and show app
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showApp();
        setupUserPresence();

        // Clear form
        loginForm.reset();

    } catch (error) {
        console.error('Error logging in:', error);
        alert('Error logging in. Please try again.');
    }
}

// Handle logout
function handleLogout() {
    if (currentUser) {
        // Update user offline status
        updateUserPresence('offline');
    }
    
    currentUser = null;
    localStorage.removeItem('currentUser');
    showAuthModal();
    
    // Clean up listeners
    if (messageListener) messageListener();
    if (typingListener) typingListener();
    if (onlineStatusListener) onlineStatusListener();
    if (roomMembersListener) roomMembersListener();
}

// Setup user presence system
function setupUserPresence() {
    if (!currentUser) return;

    // Set user as online
    updateUserPresence('online');

    // Listen for online status changes
    window.addEventListener('beforeunload', () => {
        updateUserPresence('offline');
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            updateUserPresence('away');
        } else {
            updateUserPresence('online');
        }
    });
}

// Update user presence status
async function updateUserPresence(status) {
    if (!currentUser) return;

    try {
        const presenceRef = doc(db, 'presence', currentUser.userId);
        await updateDoc(presenceRef, {
            status: status,
            lastSeen: serverTimestamp(),
            userId: currentUser.userId,
            userName: currentUser.name
        }, { merge: true });
    } catch (error) {
        // Document might not exist, create it
        await addDoc(collection(db, 'presence'), {
            status: status,
            lastSeen: serverTimestamp(),
            userId: currentUser.userId,
            userName: currentUser.name
        });
    }
}

// Toggle sidebar on mobile
function toggleSidebar() {
    sidebar.classList.toggle('open');
}

// Toggle members panel
function toggleMembersPanel() {
    membersPanel.classList.toggle('open');
    if (membersPanel.classList.contains('open') && currentRoomId) {
        loadRoomMembers();
    }
}

// Search users and create private chat
async function handleSearchUsers(e) {
    const searchTerm = e.target.value.trim();
    
    if (!searchTerm) {
        searchResults.style.display = 'none';
        return;
    }

    try {
        // Search by user ID
        const userIdQuery = query(
            collection(db, 'users'),
            where('userId', '>=', searchTerm),
            where('userId', '<=', searchTerm + '\uf8ff')
        );

        const querySnapshot = await getDocs(userIdQuery);
        
        searchResults.innerHTML = '';
        searchResults.style.display = 'block';

        if (querySnapshot.empty) {
            searchResults.innerHTML = '<div class="search-result-item">No users found</div>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.userId === currentUser.userId) return; // Don't show current user
            
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <strong>${userData.name}</strong>
                <div>@${userData.userId}</div>
                <small>Click to start private chat</small>
            `;
            resultItem.addEventListener('click', async () => {
                await startPrivateChat(userData);
                searchResults.style.display = 'none';
                searchUsers.value = '';
            });
            
            searchResults.appendChild(resultItem);
        });

    } catch (error) {
        console.error('Error searching users:', error);
    }
}

// Start private chat with a user
async function startPrivateChat(targetUser) {
    try {
        // Generate a unique room ID for the private chat
        const roomId = generatePrivateRoomId(currentUser.userId, targetUser.userId);
        
        // Check if private chat already exists
        const existingRoomQuery = query(
            collection(db, 'rooms'),
            where('privateId', '==', roomId)
        );
        
        const existingRoomSnapshot = await getDocs(existingRoomQuery);
        
        let roomData;
        
        if (existingRoomSnapshot.empty) {
            // Create new private chat room
            const roomDocRef = await addDoc(collection(db, 'rooms'), {
                name: `Private: ${currentUser.name} & ${targetUser.name}`,
                code: generateRoomCode(),
                privateId: roomId,
                type: 'private',
                creator: currentUser.userId,
                creatorName: currentUser.name,
                createdAt: serverTimestamp(),
                members: [currentUser.userId, targetUser.userId],
                isPrivateChat: true,
                participants: {
                    [currentUser.userId]: currentUser.name,
                    [targetUser.userId]: targetUser.name
                }
            });
            
            roomData = {
                id: roomDocRef.id,
                name: `Private: ${targetUser.name}`,
                code: roomId,
                type: 'private',
                creator: currentUser.userId,
                isPrivateChat: true
            };
        } else {
            // Use existing private chat
            const existingRoom = existingRoomSnapshot.docs[0];
            roomData = {
                id: existingRoom.id,
                ...existingRoom.data()
            };
        }
        
        // Join the private room
        joinRoom(roomData.code, roomData.name, 'private', roomData.creator, roomData);
        
    } catch (error) {
        console.error('Error starting private chat:', error);
        alert('Error starting private chat. Please try again.');
    }
}

// Generate unique private room ID
function generatePrivateRoomId(userId1, userId2) {
    const sortedIds = [userId1, userId2].sort();
    return `private_${sortedIds[0]}_${sortedIds[1]}`;
}

// Load room members
function loadRoomMembers() {
    if (!currentRoomId || !currentRoomData) return;

    membersList.innerHTML = '';

    // For private rooms, show specific members
    if (currentRoomData.members && currentRoomData.members.length > 0) {
        let onlineMembers = 0;
        
        currentRoomData.members.forEach(memberId => {
            // In a real app, you'd check online status from presence collection
            const isOnline = Math.random() > 0.5; // Mock online status
            
            if (isOnline) onlineMembers++;
            
            const memberItem = document.createElement('div');
            memberItem.className = 'member-item';
            memberItem.innerHTML = `
                <div class="member-status ${isOnline ? 'online' : 'offline'}"></div>
                <div class="member-name">${currentRoomData.participants?.[memberId] || memberId}</div>
                <div class="member-id">@${memberId}</div>
            `;
            membersList.appendChild(memberItem);
        });

        // Update counters
        membersCount.textContent = currentRoomData.members.length;
        onlineCount.textContent = `${onlineMembers} online`;
    }
}

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
        const roomDocRef = await addDoc(collection(db, 'rooms'), {
            name: roomName,
            code: roomCode,
            type: 'private',
            creator: currentUser.userId,
            creatorName: currentUser.name,
            createdAt: serverTimestamp(),
            members: [currentUser.userId],
            isPrivateChat: false // This is a group room, not 1-on-1 chat
        });

        roomModal.style.display = 'none';
        newRoomName.value = '';
        loadUserRooms();
        
        // Join the newly created room
        const roomData = {
            id: roomDocRef.id,
            name: roomName,
            code: roomCode,
            type: 'private',
            creator: currentUser.userId,
            members: [currentUser.userId]
        };
        joinRoom(roomCode, roomName, 'private', currentUser.userId, roomData);
        
    } catch (error) {
        console.error('Error creating room:', error);
        alert('Error creating room. Please try again.');
    }
}

// Join room with code
async function joinRoomByCode() {
    const roomCode = roomCodeInput.value.trim();
    if (!roomCode || roomCode.length !== 6) {
        alert('Please enter a valid 6-digit room code');
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
        
        // Check if user is already a member
        if (!roomData.members.includes(currentUser.userId)) {
            // Add user to room members
            await updateDoc(doc(db, 'rooms', roomDoc.id), {
                members: arrayUnion(currentUser.userId)
            });
        }

        roomCodeInput.value = '';
        joinRoom(roomData.code, roomData.name, roomData.type, roomData.creator, {
            id: roomDoc.id,
            ...roomData
        });
        
    } catch (error) {
        console.error('Error joining room:', error);
        alert('Error joining room. Please try again.');
    }
}

// Initialize public rooms
function initializePublicRooms() {
    publicRooms.innerHTML = '';
    PUBLIC_ROOMS.forEach(room => {
        const roomElement = createRoomElement(room.id, room.name, 'public', '');
        publicRooms.appendChild(roomElement);
    });
}

// Load user's rooms (only rooms they've joined)
async function loadUserRooms() {
    if (!currentUser) return;

    try {
        const roomsQuery = query(
            collection(db, 'rooms'),
            where('members', 'array-contains', currentUser.userId)
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
                    roomData.code,
                    roomData
                );
                privateRooms.appendChild(roomElement);
            });
        });
    } catch (error) {
        console.error('Error loading user rooms:', error);
    }
}

// Create room element
function createRoomElement(roomId, roomName, roomType, creator, roomCode = '', roomData = null) {
    const roomElement = document.createElement('div');
    roomElement.className = 'room-item';
    
    let displayName = roomName;
    // For private chats, show the other person's name
    if (roomData?.isPrivateChat && roomData.participants) {
        const otherUserId = Object.keys(roomData.participants).find(id => id !== currentUser.userId);
        if (otherUserId) {
            displayName = roomData.participants[otherUserId];
        }
    }
    
    roomElement.innerHTML = `
        <div class="room-name">${displayName}</div>
        ${roomCode && roomType === 'private' && !roomData?.isPrivateChat ? `<div class="room-code">${roomCode}</div>` : ''}
        ${roomData?.isPrivateChat ? `<div class="room-type">Private</div>` : ''}
    `;
    
    roomElement.addEventListener('click', () => {
        joinRoom(roomId, displayName, roomType, creator, roomData);
    });
    
    return roomElement;
}

// Join room function
function joinRoom(roomId, roomName, roomType, creator, roomData = null) {
    // Clean up previous listeners
    if (messageListener) messageListener();
    if (typingListener) typingListener();
    if (onlineStatusListener) onlineStatusListener();
    
    currentRoomId = roomId;
    currentRoomType = roomType;
    currentRoomCreator = creator;
    currentRoomData = roomData;
    
    // Update UI
    let displayName = roomName;
    if (roomData?.isPrivateChat && roomData.participants) {
        const otherUserId = Object.keys(roomData.participants).find(id => id !== currentUser.userId);
        if (otherUserId) {
            displayName = roomData.participants[otherUserId];
        }
    }
    
    currentRoomName.textContent = displayName;
    roomCodeDisplay.textContent = roomType === 'private' ? 
        (roomData?.isPrivateChat ? 'Private Chat' : `Room Code: ${roomId}`) : 
        'Public Room';
    
    // Show/hide delete button for room creator
    deleteRoomBtn.style.display = (currentRoomType === 'private' && currentRoomCreator === currentUser.userId && !roomData?.isPrivateChat) ? 'block' : 'none';
    
    // Show/hide members button for private rooms
    roomMembersBtn.style.display = currentRoomType === 'private' ? 'flex' : 'none';
    
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

    // Load room members if private room
    if (currentRoomType === 'private') {
        loadRoomMembers();
    }
}

// Load messages
function loadMessages() {
    messagesContainer.innerHTML = '<div class="loading">Loading messages...</div>';
    
    const messagesQuery = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));

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
                messagesContainer.innerHTML = '<div class="no-messages">No messages in this room yet. Start the conversation!</div>';
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
                </div>
            `;
        }
    );
}

// Display message
function displayMessage(message, messageId) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.username === currentUser.userId ? 'own' : 'other'}`;
    messageDiv.id = messageId;
    
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    const messageUsername = document.createElement('span');
    messageUsername.className = 'message-username';
    messageUsername.textContent = message.username === currentUser.userId ? 'You' : (message.userDisplayName || message.username);
    
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
    if (message.username === currentUser.userId) {
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
                if (typingData.username !== currentUser.userId && typingData.timestamp) {
                    // Check if typing was within last 3 seconds
                    const typingTime = typingData.timestamp.toDate();
                    const now = new Date();
                    if ((now - typingTime) < 3000) {
                        // Get display name for typing user
                        const displayName = currentRoomData?.participants?.[typingData.username] || typingData.username;
                        typingUsers.push(displayName);
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

// Update typing status
async function updateTypingStatus() {
    const typingRef = collection(db, 'typing');
    
    // Add typing status
    await addDoc(typingRef, {
        roomId: currentRoomId,
        username: currentUser.userId,
        userDisplayName: currentUser.name,
        timestamp: serverTimestamp()
    });
    
    // Clear previous timeout
    clearTimeout(typingTimeout);
    
    // Set timeout to automatically clear typing status after 2 seconds
    typingTimeout = setTimeout(() => {
        // Typing status will expire naturally based on timestamp check
    }, 2000);
}

// Send message
async function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (!messageText || !currentUser || !currentRoomId) {
        return;
    }

    sendButton.disabled = true;
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        await addDoc(collection(db, 'messages'), {
            text: messageText,
            username: currentUser.userId,
            userDisplayName: currentUser.name,
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

// Delete room function
deleteRoomBtn.addEventListener('click', async () => {
    if (currentRoomType !== 'private' || currentRoomCreator !== currentUser.userId) {
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

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', initApp);

console.log('Advanced Chat App with Private Messaging Initialized');
