const messageInput = document.getElementById('message');
const messagesC = document.getElementById('messagesc');
const sendMessageForm = document.getElementById('sendmessage-form');
let messages = [];
let lastMessageId = -1;
let intervalId = undefined;
let currGroupElement = undefined;
let currGroup, currGroupId;

if (!token) {
    window.location.href = '../auth/login/login.html';
}

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await axiosInstance.get('/user/groups', { headers: { "Authorization": token } });
        const groups = response.data.groups;

        const groupsList = document.getElementById('groups-c');

        groups.forEach(async (group) => {
            groupsList.innerHTML += `
                <div id="${group.id}" class="group-element" onclick="showGroupMessages('${group.id}', '${group.name}')">
                    <div class="group-profile-image-c">
                        <img class="group-profile-image" src="../images/group-profile-image.jpeg" alt="Group Profile Pic">
                    </div>
                    <div class="group-name-c">
                        <h3 id="${group.id}" class="group-name">${group.name}</h3>
                    </div>
                    <div id="newMessageCount-${group.id}" class="new-message-count"></div>
                </div>
            `;

            socket.emit('join-room', group.id, groupId => {
                console.log('joined group ' + groupId);
            });

            // addToLocalStorage(group.id, null);

            syncWithLocalStorage(group.id);
        })

        $('#username').text(user.name);

        $('#default').show();
        $('#active').hide();
        $('#group-profile').hide();
    } catch (err) {
        console.log(err);
    }
})

async function syncWithLocalStorage(groupId) {
    const newMsgsServer = await loadNewMessagesFromServer(groupId);

    const newMessageCount = $(`#newMessageCount-${groupId}`);
    const count = newMsgsServer.length;
    if(count !== 0) {
        newMessageCount.text(`${count}`);
        newMessageCount.css('display', 'inline-block');
    }
}

function loadNewMessagesFromServer(groupId) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axiosInstance.get(`/user/new-messages?groupId=${groupId}`, { headers: { "Authorization": token } });
            const messages = response.data.newMessages;
            resolve(messages);
        } catch(err) {
            reject(err);
        }
    })
}

async function fetchGroupParticipants(groupId) {
    const participantsResult = await axiosInstance.get(`/user/groups/participants?groupId=${groupId}`, { headers: { "Authorization": token } });
    const participants = participantsResult.data.participants;
    const adminsResult = await axiosInstance.get(`/user/groups/admins?groupId=${groupId}`, { headers: { "Authorization": token } });
    const admins = adminsResult.data.admins;

    const groupAdmins = new Set();

    admins.forEach(admin => {
        groupAdmins.add(admin.adminId);
    })

    showParticipants(groupId, participants, groupAdmins);
}

function showParticipants(groupId, participants, groupAdmins) {
    $('#active').hide();
    $('#group-profile').show();
    const participantsList = document.getElementById('participants-list');
    participantsList.innerHTML = '';

    console.log(participants);

    participants.forEach(participant => {
        console.log(participant.id);

        let admin = false;
        if (groupAdmins.has(participant.id))
            admin = true;

        if (participant.id === user.userId)
            participant.name = 'You';

        participantsList.innerHTML += `
        <div class="user-element-container">
            <div id="user-element-${participant.id}" class="user-element">
                <span class="username" style="margin-right: 10px;">${participant.name}</span>
                <span class="username" style="margin-right: 10px;">Phone No: ${participant.phoneNo}</span>
                <button id="admin-btn-${participant.id}" class="admin-btn" style="color: black;cursor:default;margin-right: 10px;display:none;">Admin</button>
                
            </div>
        </div>
        `;

        if (admin) {
            $(`#admin-btn-${participant.id}`).show();
        }

        if (groupAdmins.has(user.userId))
            createDropdown(groupId, participant.id, admin);
    })

}

function createDropdown(groupId, participantId, isAdmin) {
    if (participantId === user.userId)
        return;

    const userElement = document.getElementById(`user-element-${participantId}`);
    if (isAdmin) {
        userElement.innerHTML += `
        <div id="dropdown-${participantId}" class="dropdown">
            <button id="dropdown-toggle-${participantId}" class="dropdown-toggle" onclick="toggleDropdown(${participantId})"><i class="fa-solid fa-circle-chevron-down" style="font-size: large;"></i></button>
            <ul class="dropdown-menu" id="dropdown-menu-${participantId}">
                <li id="dismiss-admin-btn-${participantId}" class="dropdown-list-item" onclick="dismissAsAdmin('${groupId}','${participantId}')">Dismiss as admin</li>
                <li id="remove-user-btn-${participantId}" class="dropdown-list-item" onclick="removeUserFromGroup('${groupId}','${participantId}')">Remove User</li>
            </ul>
        </div>
        `;
    }
    else {
        userElement.innerHTML += `
        <div id="dropdown-${participantId}" class="dropdown">
            <button id="dropdown-toggle-${participantId}" class="dropdown-toggle" onclick="toggleDropdown(${participantId})"><i class="fa-solid fa-circle-chevron-down" style="font-size: large;"></i></button>
            <ul class="dropdown-menu" id="dropdown-menu-${participantId}">
                <li id="make-admin-btn-${participantId}" class="dropdown-list-item" onclick="makeAdmin('${groupId}','${participantId}')">Make admin</li>
                <li id="remove-user-btn-${participantId}" class="dropdown-list-item" onclick="removeUserFromGroup('${groupId}','${participantId}')">Remove User</li>
            </ul>
        </div>
        `;
    }
}

async function makeAdmin(groupId, participantId) {
    try {
        console.log(token);
        const result = await axiosInstance.post(`/user/groups/${groupId}/admins/add`, { participantId }, { headers: { "Authorization": token } });
        if (result.data.success)
            alert(`Added user ${participantId} as an admin`);
        fetchGroupParticipants(groupId);
    } catch (err) {
        alert(err);
    }
}

async function dismissAsAdmin(groupId, participantId) {
    try {
        const result = await axiosInstance.delete(`/user/groups/${groupId}/admins/remove/${participantId}`, { headers: { "Authorization": token } });
        if (result.data.success)
            alert(`Removed user ${participantId} as an admin`);
        fetchGroupParticipants(groupId);
    } catch (err) {
        alert(err);
    }
}

async function removeUserFromGroup(groupId, participantId) {
    try {
        const result = await axiosInstance.delete(`/user/groups/${groupId}/users/remove/${participantId}`, { headers: { "Authorization": token } });
        if (result.data.success)
            alert(`Removed user ${participantId} from group`);
        fetchGroupParticipants(groupId);
    } catch (err) {
        alert(err);
    }
}

async function markMessagesAsSeen(groupId) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axiosInstance.post('/user/messages/markAsSeen', { groupId }, { headers: { "Authorization": token } });
            resolve(response);
        } catch(err) {
            reject(err);
        }
    })
}

async function showGroupMessages(groupId, groupName) {
    $('#default').hide();
    $('#active').show();
    $('#group-profile').hide();
    $(`#newMessageCount-${groupId}`).hide();

    makeCurrGroupElementActive(groupId);
    currGroupId = groupId;
    // lastMessageId = 0;               

    const group = {
        id: groupId,
        name: groupName
    }

    await markMessagesAsSeen(groupId);

    const rightHeader = document.getElementById('right-header');
    rightHeader.innerHTML = `
        <div style="display:inline-block;width:5%;height:70%;position:absolute;top:15%;left:1.5%">
            <img class="group-profile-image" src="../images/group-profile-image.jpeg" alt="Group Profile Pic">
        </div>
        <h2 style="position:absolute;top:0%;left:10%;color:black;">${group.name}</h2>
    `;

    rightHeader.onclick = function () {
        fetchGroupParticipants(groupId);
    }

    currGroup = group;

    const response = await axiosInstance.get(`/user/messages?groupId=${group.id}`, { headers: { "Authorization": token } });
    messages = response.data.messages;

    // if (messages.length !== 0)
    //     lastMessageId = messages[messages.length - 1].id;

    // console.log(messages);

    messagesC.innerHTML = '';

    // messagesC.innerHTML = `
    //     <div id="oldermessagesbtnc" style="margin: 10px 0;display:flex;justify-content:center;align-items:center;"><button id="load-older-messages" onclick=loadOlderMessages('${currGroup.id}'); style="padding: 5px;cursor: pointer;background-color:#6294c0;color:white;">Load older...</button></div>`;

    // messages = loadMessagesFromLocalStorage(currGroup, 0);

    displayMessages(messages);
    // if (messages.length !== 0)
    //     lastMessageId = messages[messages.length - 1].id;
    // else {
    //     document.getElementById('oldermessagesbtnc').remove();
    //     lastMessageId=0;
    // }

    messagesC.scrollTop = messagesC.scrollHeight;
}

// function loadMessagesFromLocalStorage(currGroup, lastMessageId) {
//     recentChats = JSON.parse(localStorage.getItem('recent_chats'));

//     recentChats = new Map(recentChats);

//     if (!recentChats)
//         return undefined;

//     messages = recentChats.get(Number(currGroup.id));

//     messages = messages.filter(m => m.id > lastMessageId);

//     console.log(messages);

//     if (!messages)
//         return undefined;

//     return messages;
// }

function makeCurrGroupElementActive(groupId) {
    const prevGroupElement = document.getElementById(currGroupId);
    if (prevGroupElement)
        prevGroupElement.classList.remove('active');
    const currGroupElement = document.getElementById(groupId);

    if (currGroupElement)
        currGroupElement.classList.add('active');
}

// async function loadOlderMessages(groupId) {
//     try {
//         let recentChats = JSON.parse(localStorage.getItem('recent_chats'));
//         recentChats = new Map(recentChats);
//         const groupMessages = recentChats.get(Number(groupId));
//         const result = await axiosInstance.get(`/user/olderMessages?groupId=${groupId}&lastMessageId=${groupMessages[0].id}`, { headers: { "Authorization": token } });
//         messages = result.data.messages;
//         if (messages)
//             displayOlderMessages(messages);
//     } catch (err) {
//         console.log(err);
//         alert('Something went wrong!');
//     }
// }

function displayMessages(messages) {
    if (!messages || messages.length === 0)
        return;

    messages.forEach(m => {
        displayMessage(m);
    });
}

function displayMessage(m) {
    const createdAt = m.createdAt;
    const createdAtDate = new Date(createdAt);
    const time = createdAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messagesC.innerHTML += `
            <div id="chat-container-${m.id}" class="chat-container">
                <div id="triangle-receiver-${m.id}"></div>
                <div id="message-${m.id}" class="message">
                    <div class="sender">~&nbsp;${m.userName}</div>
                    <div class="text">${m.message}</div>
                    <div class="timestamp">${time}</div>
                </div>
                <div id="triangle-sender-${m.id}"></div>
            </div>
        `;

    const msg = document.getElementById(`chat-container-${m.id}`);

    if (m.userId === user.userId) {
        msg.style.justifyContent = 'end';
        document.getElementById(`message-${m.id}`).style.backgroundColor = '#216666';
        $(`#triangle-sender-${m.id}`).addClass('triangle-sender');
    }
    else {
        $(`#triangle-receiver-${m.id}`).addClass('triangle-receiver');
    }
}

// function displayOlderMessages(messages) {
//     const currHeight = messagesC.scrollHeight;
//     document.getElementById('oldermessagesbtnc').remove();
//     const temp = messagesC.innerHTML;
//     messagesC.innerHTML='';
//     messages.forEach(m => {
//         displayMessage(m);
//     })
//     messagesC.innerHTML += temp;
//     messagesC.scrollTop = messagesC.scrollHeight - currHeight;
// }

sendMessageForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = messageInput.value;
    if (message === '') {
        alert('Please enter a message to send!');
        return;
    }

    let recentMessage;
    try {
        const response = await sendMessage(message);
        socket.emit('new message', user, response.data.messageObj, Number(currGroup.id));
        messageInput.value = '';
        recentMessage = response.data.messageObj;
    } catch (err) {
        console.log(err);
        alert('Something went wrong!');
    }

    // addToLocalStorage(Number(currGroup.id), [ recentMessage ]);
    
    displayMessage(recentMessage);

    messagesC.scrollTop = messagesC.scrollHeight;
})

async function sendMessage(message) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axiosInstance.post(`/user/sendmessage`, { message: message, groupId: currGroup.id }, { headers: { "Authorization": token } });
            resolve(response);
        } catch (err) {
            alert(err);
            reject(err);
        }
    })
}

function showAlert(response) {
    alert(response);
}

let members = [];

async function addNewGroup() {
    //add to backend...

    const groupName = $('#group-name').val();
    const groupDesc = $('#group-desc').val();

    if (groupName === '' || groupDesc === '') {
        alert('Please enter all fields to create!');
        return;
    }

    if (members.length < 2) {
        alert('Please add atleast 2 members to create group!');
        return;
    }

    console.log(groupName, groupDesc);

    const newGroup = {
        name: groupName,
        description: groupDesc,
        members: members
    }

    const response = await axiosInstance.post('/user/createGroup', { newGroup: newGroup }, { headers: { "Authorization": token } });

    console.log(response);

    alert('New group created');
    members = [];
    $(document).ready(function () {
        $('#add-group-form')[0].reset();
    });

    $('#overlay1').hide();

    //add to localstorage...

    // try {
    //     addToLocalStorage(response.data.group.id, null);
    //     alert('Added to localstorage!');
    // } catch (err) {
    //     alert(err);
    // }

}

async function showUsersDialog() {
    $('#overlay2').show();

    let users;

    try {
        response = await axiosInstance.get('/user/getAllUsers', { headers: { "Authorization": token } });
    } catch (err) {
        alert(err);
    }

    users = response.data.users;

    console.log(users);

    const userList = document.getElementById('user-list');
    userList.innerHTML = '';

    users.forEach(user => {
        userList.innerHTML += `
            <div class="user">
                <input type="checkbox" id="${user.id}" class="userCheckBox" name="${user.name}" value="${user.name}">
                <label for="${user.id}">${user.name}</label>
            </div>
        `;
    })
}

function addMembers() {
    members = [];
    let count = 0;
    Array.from($('.userCheckBox')).forEach((user) => {
        if (user.checked) {
            members.push(user.id);
            count++;
        }
    })

    if (count === 0) {
        alert('Please select a user to add!');
        return;
    }

    $('#overlay2').hide();
}

// function addToLocalStorage(groupId, recentMessages) {
//     let recentChats = JSON.parse(localStorage.getItem('recent_chats'));
//     let groupMessages, unseenMessages=[];
//     if (recentChats) {
//         recentChats = new Map(recentChats);

//         if (!recentChats.has(groupId)) {
//             groupMessages = [];
//         }
//         else
//             groupMessages = recentChats.get(groupId);

//         if (groupMessages.length === 10 && recentMessages !== null)
//             groupMessages.splice(0, 1);
//     }
//     else {
//         recentChats = new Map();
//         groupMessages = [];
//     }

//     if (recentMessages) {
//         recentMessages.forEach(recentMessage => {
//             groupMessages.push(recentMessage);
//             if (groupMessages.length === 10)
//                 groupMessages.splice(0, 1);
//         })
//     }

//     recentChats.set(groupId, { groupMessages, unseenMessages });

//     localStorage.setItem('recent_chats', JSON.stringify(Array.from(recentChats.entries())));
// }

function logout() {
    localStorage.removeItem('token');
    window.location.href = '../auth/login/login.html';
}