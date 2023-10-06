let user;

(async function initialize() {
    try {
        user = await getUser();
    } catch(err) {
        alert('USER NOT FOUND!, PLEASE LOGIN TO CONTINUE.');
        moveToLoginPage();
    }
    if(!user)
        moveToLoginPage();      

    socketConnect();
})();

function socketConnect() {
    const socketHandle = document.createElement('script');
    socketHandle.src = '../js/socket-handle.js';
    socketHandle.onload = () => {
        console.log('Loading groups...');
        loadGroups();
    }
    document.body.appendChild(socketHandle);
}

const messageInput = document.getElementById('message');
const messagesC = document.getElementById('messagesc');
const sendMessageForm = document.getElementById('sendmessage-form');
let messages = [];
let lastMessageId = -1;
let intervalId = undefined;
let currGroupElement = undefined;
let currGroup, currGroupId;
const senderChatColor = '#025144';
const fileDownloadBtnSender = 'rgba(55, 124, 113, 0.9)';
let selectedMembers = new Set();
const main = document.getElementById('main');
const left = document.getElementById('left');
const right = document.getElementById('right');

function handleResize() {
    const totalWidth = left.offsetWidth + right.offsetWidth;
    main.style.width = `${totalWidth}px`;
}

window.addEventListener('resize', handleResize);

handleResize();

async function loadGroups() {
    try {
        $('#default').show();
        $('#active').hide();
        $('#group-profile').hide();

        const response = await axiosInstance.get('/user/groups', { headers: { "Authorization": token } });
        const groups = response.data.groups;

        const groupsList = document.getElementById('groups-c');

        if(groups.length === 0) {
            groupsList.innerHTML = getEmptyMsgElement('No groups to show');
            return;
        }

        const ee = document.getElementById('empty-msg-element');
        if(ee)
            ee.remove();

        groups.forEach(async (group) => {
            groupsList.innerHTML += getGroupElement(group);

            const grpElement = document.getElementById(`${group.id}`);
            // console.log(grpElement);
            // grpElement.addEventListener('click', () => showGroupMessages(group));

            // const attachEventListener = (group) => {
            //     grpElement.addEventListener('click', () => showGroupMessages(group));
            // };
            
            // attachEventListener(group);

            socket.emit('join-room', group.id, groupId => {
                console.log('joined group ' + groupId);
            });

            showNewMessages(group.id);
        })

        groupsList.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('group-element')) {
                const groupId = Number(target.id);
                showGroupMessages(groups.find(group => group.id === groupId));
            }
        });
    } catch (err) {
        console.log(err);
        alert('Oops! Something went wrong.');
    }
}

function getEmptyMsgElement(msg) {
    return  `
        <div id="empty-msg-element" class="flex">
            ${msg}
        </div>
    `;
}

function getGroupElement(group) {
    return `
        <div id="${group.id}" class="group-element">
            <div class="group-profile-image-c">
                <img id="grp-profile-img-${group.id}" class="group-profile-image" src="${group.groupPhoto !== null ? group.groupPhoto : '../images/group-profile-image.jpeg'}" alt="Group Profile Pic">
            </div>
            <div class="group-name-c">
                <h3 id="${group.id}" class="group-name">${group.name}</h3>
            </div>
            <div id="newMessageCount-${group.id}" class="new-message-count"></div>
        </div>
    `;
}

async function showNewMessages(groupId) {
    const newMsgsServer = await loadNewMessagesFromServer(groupId);

    const newMessageCount = $(`#newMessageCount-${groupId}`);
    const count = newMsgsServer.length;
    if (count !== 0) {
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
        } catch (err) {
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

    showGroupInfo(groupId, participants, groupAdmins);
}

function showGroupInfo(groupId, participants, groupAdmins) {
    $('#active').hide();
    $('#group-profile').show();

    const groupImage = document.getElementById('group-info_profile-photo');
    const groupDesc = document.getElementById('group-info_desc');
    const groupReferralCode = document.getElementById('group-referral-code');
    groupImage.src = currGroup.groupPhoto;
    groupDesc.innerHTML = currGroup.description;

    groupImage.addEventListener('click', () => zoomImage(currGroup.groupPhoto));
    groupReferralCode.innerHTML = currGroup.groupCode;

    const participantsList = document.getElementById('participants-list');
    participantsList.innerHTML = '';

    participants.forEach(participant => {
        let admin = false;
        if (groupAdmins.has(participant.id))
            admin = true;

        if (participant.id === user.userId)
            participant.name = 'You';

        participantsList.innerHTML += `
        <div class="user-element-container">
            <div id="user-element-${participant.id}" class="user-element">
                <span class="username" style="margin-right: 10px;">${participant.name}</span>
                <button id="admin-btn-${participant.id}" class="admin-btn">Admin</button>
            </div>
        </div>
        `;

        if (admin) {
            $(`#admin-btn-${participant.id}`).show();
        }
        if (groupAdmins.has(user.userId))
            createDropdown(groupId, participant.id, admin);
    })

    const grpActions = document.getElementById('grp-actions');
    grpActions.innerHTML='';

    if(groupAdmins.has(user.userId)) {
        grpActions.innerHTML += `
            <button id="add-more-users-grp-btn" onclick="showAddUsersDialog(false)" class="grp-btn">Add more users</button>
        `;
    }

    grpActions.innerHTML += `
        <button id="exit-grp-btn" class="grp-btn" onclick="exitGroup()">Exit Group</button>
    `;
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
        fetchGroupParticipants(groupId);
        socket.emit('removed from group', participantId, currGroupId, currGroup.name);
    } catch (err) {
        alert(err);
    }
}

async function markMessagesAsSeen(groupId) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axiosInstance.post('/user/messages/markAsSeen', { groupId }, { headers: { "Authorization": token } });
            resolve(response);
        } catch (err) {
            reject(err);
        }
    })
}

async function showGroupMessages(group) {
    $('#default').hide();
    $('#active').show();
    $('#group-profile').hide();
    $(`#newMessageCount-${group.id}`).hide();
    $('#message').val('');
    $('#message').focus();

    makeCurrGroupElementActive(group.id);
    currGroupId = group.id;

    await markMessagesAsSeen(group.id);

    const rightHeader = document.getElementById('right-header');
    rightHeader.innerHTML = `
        <div id="group-profile-image-c-header" style="">
            <img class="group-profile-image" src="${group.groupPhoto !== null ? group.groupPhoto : '../images/group-profile-image.jpeg'}" alt="Group Profile Pic">
        </div>
        <h2 id="group-name-header">${group.name}</h2>
    `;

    rightHeader.onclick = function () {
        fetchGroupParticipants(group.id);
    }

    currGroup = group;

    const response = await axiosInstance.get(`/user/messages?groupId=${group.id}`, { headers: { "Authorization": token } });
    messages = response.data.messages;
    messagesC.innerHTML = '';
    messagesC.innerHTML = `
        <div id="oldermessagesbtnc" style="margin: 10px 0;display:flex;justify-content:center;align-items:center;"><button id="load-older-messages" onclick=loadOlderMessages('${currGroup.id}'); style="padding: 5px;cursor: pointer;background-color:#202C33;color:white;border-radius: 0.2rem;">Load older...</button></div>`;

    displayMessages(messages);
    if (messages.length !== 0) {
    }
    else {
        document.getElementById('oldermessagesbtnc').remove();
    }

    messagesC.scrollTop = messagesC.scrollHeight;
    setTopDateLabel();
}

function makeCurrGroupElementActive(groupId) {
    const prevGroupElement = document.getElementById(currGroupId);
    if (prevGroupElement)
        prevGroupElement.classList.remove('active');
    const currGroupElement = document.getElementById(groupId);

    if (currGroupElement)
        currGroupElement.classList.add('active');
}

function setTopDateLabel() {
    const topDateLabel = document.getElementById('top-date-label')
    let timer = null;
    messagesC.addEventListener('scroll', () => {
        if (timer)
            clearTimeout(timer);

        const dateLabels = document.querySelectorAll('.date-label')
        let currentDateLabel = null;
        dateLabels.forEach((dateLabel) => {
            if (messagesC.scrollTop > dateLabel.offsetTop) {
                currentDateLabel = dateLabel;
            }
        })
        if (currentDateLabel) {
            topDateLabel.style.display = 'flex';
            topDateLabel.style.opacity = '1';
            topDateLabel.innerHTML = currentDateLabel.innerHTML;

            timer = setTimeout(() => {
                topDateLabel.style.opacity = '0';
            }, 2000);
        } else {
            topDateLabel.style.opacity = '0';
            topDateLabel.style.display = 'none';
        }
    })
}

async function loadOlderMessages(groupId) {
    try {
        const result = await axiosInstance.get(`/user/olderMessages?groupId=${groupId}`, { headers: { "Authorization": token } });
        const olderMessages = result.data.messages;
        if (olderMessages)
            displayOlderMessages(olderMessages);
    } catch (err) {
        console.log(err);
        alert('Something went wrong!');
    }
}

function displayMessages(messages) {
    if (!messages || messages.length === 0)
        return;

    messagesC.innerHTML += `
        <div id="top-date-label" style="opacity:0;position:sticky;top:10px;display:flex;justify-content:center;align-items:center;"><div style="display:inline-block;margin: 10px auto;padding: 5px;background-color:#202C33;color:white;border-radius: 0.2rem;"></div></div>
    `;

    let prevDate = null, prevSender = null;
    messages.forEach(m => {
        displayMessage(m, prevSender, prevDate);
        prevSender = m.userId;
        prevDate = m.createdAt.split('T')[0];
    });
}

function getTextView(m, time) {
    return `
            <div id="chat-container-${m.id}" class="chat-container">
                <div id="triangle-receiver-${m.id}"></div>
                <div id="message-${m.id}" class="message">
                    <div id="sender-${m.id}" class="sender">~&nbsp;${m.userName}</div>
                    <div class="text">${m.message}</div>
                    <div class="timestamp">${time}</div>
                </div>
                <div id="triangle-sender-${m.id}"></div>
            </div>
        `;
}

function getFileView(m, time) {
    const msg = m.message;
    const fileObj = JSON.parse(msg);
    const fileName = fileObj.fileName;
    const fileUrl = fileObj.fileUrl;

    const lastDotIndex = fileName.lastIndexOf('.');
    const fileExtension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex + 1) : '';

    if(isImage(fileObj)) {
        return `
            <div id="chat-container-${m.id}" class="chat-container">
                <div id="triangle-receiver-${m.id}"></div>
                <div id="message-${m.id}" class="message image-message">
                    <div id="sender-${m.id}" class="sender">~&nbsp;${m.userName}</div>
                    <div class="content flex flex-column">
                        <div class="chat-image-c">
                            <img src="${fileUrl}" alt="${fileName}" onclick="zoomImage('${fileUrl}')"/>
                        </div>
                        <div class="chat-details">
                            <div class="flex flex-column">
                                <div class="file-icon"><i class="fa-solid fa-file"></i></div>
                                <div class="file-type">${fileExtension.toUpperCase()}</div>
                            </div>
                            <div class="filename">${fileName}</div>
                            <div id="file-download-btn-${m.id}" class="file-download-btn" onclick="window.location.href = '${fileUrl}';">
                                <i class="fa-regular fa-circle-down"></i>
                            </div>
                        </div>
                    </div>
                    <div class="timestamp">${time}</div>
                </div>
                <div id="triangle-sender-${m.id}"></div>
            </div>
        `;
    }

    return `
            <div id="chat-container-${m.id}" class="chat-container">
                <div id="triangle-receiver-${m.id}"></div>
                <div id="message-${m.id}" class="message file-message">
                    <div id="sender-${m.id}" class="sender">~&nbsp;${m.userName}</div>
                    <div class="content">
                        <div class="chat-details">
                            <div class="flex flex-column">
                                <div class="file-icon"><i class="fa-solid fa-file"></i></div>
                                <div class="file-type">${fileExtension.toUpperCase()}</div>
                            </div>
                            <div class="filename">${fileName}</div>
                            <div id="file-download-btn-${m.id}" class="file-download-btn" onclick="window.location.href = '${fileUrl}';">
                                <i class="fa-regular fa-circle-down"></i>
                            </div>
                        </div>
                    </div>
                    <div class="timestamp">${time}</div>
                </div>
                <div id="triangle-sender-${m.id}"></div>
                </div>
        `;
}

function displayMessage(m, prevSender, prevDate) {
    const msgDateOnlyString = m.createdAt.split('T')[0];
    if (msgDateOnlyString !== prevDate) {
        const createdAtParts = m.createdAt.split('T')[0].split('-');
        const year = parseInt(createdAtParts[0]);
        const month = parseInt(createdAtParts[1]) - 1;
        const day = parseInt(createdAtParts[2]);
        const createdAtDateObj = new Date(Date.UTC(year, month, day));
        const date = createdAtDateObj.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        messagesC.innerHTML += `<div class="date-label" style="display:flex;justify-content:center;align-items:center;"><div style="display:inline-block;margin: 10px auto;padding: 5px;background-color:#202C33;color:white;border-radius: 0.2rem;">${date}</div></div>`;
    }

    const createdAtDate = new Date(m.createdAt);
    const time = createdAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messagesC.innerHTML += (m.messageType === 'text') ? getTextView(m, time) : getFileView(m, time);

    const msgC = document.getElementById(`chat-container-${m.id}`);
    if (m.userId === user.userId) {
        msgC.style.justifyContent = 'end';
        document.getElementById(`sender-${m.id}`).style.display = 'none';
        document.getElementById(`message-${m.id}`).style.backgroundColor = senderChatColor;
        $(`#triangle-sender-${m.id}`).addClass('triangle-sender');

        if (m.messageType === 'file')
            document.getElementById(`file-download-btn-${m.id}`).style.color = fileDownloadBtnSender;
    }
    else {
        $(`#triangle-receiver-${m.id}`).addClass('triangle-receiver');
    }

    if (prevSender === m.userId)
        document.getElementById(`sender-${m.id}`).style.display = 'none';
}

function isImage(file) {
    return file.type.startsWith('image/');
}

function zoomImage(imageUrl) {
    $('#overlay-image-zoom').css('display', 'flex');
    const img = document.getElementById('zoomed-img');
    console.log(imageUrl);
    img.src=imageUrl;
}

function displayOlderMessages(olderMessages) {
    messages = [].concat(olderMessages, messages);
    const currHeight = messagesC.scrollHeight;
    messagesC.innerHTML = '';
    displayMessages(messages);
    messagesC.scrollTop = messagesC.scrollHeight - currHeight;
    setTopDateLabel();
}

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
        messages.push(recentMessage);
    } catch (err) {
        console.log(err);
        alert('Something went wrong!');
    }

    displayMsgHandler();
})

function displayMsgHandler() {
    const recentMessage = messages[messages.length-1];
    if(messages.length <= 1)
        displayMessage(recentMessage, null, null);
    else {
        const prevMsg = messages[messages.length - 2];
        displayMessage(recentMessage, prevMsg.userId, prevMsg.createdAt.split('T')[0]);
    }
    messagesC.scrollTop = messagesC.scrollHeight;
    setTopDateLabel();
}

function takeinput() {

    $('#overlay4').show();

    var cancelButton = document.getElementById('close-btn');
    cancelButton.addEventListener('click', function (e) {
        e.preventDefault();
        $('#overlay4').hide();
    });

    $('#send-file-form').on('submit', async (e) => {
        e.preventDefault();

        let recentMessage;
        try {
            var fileInput = document.getElementById('fileInput');
            var file = fileInput.files[0];

            var formData = new FormData();

            formData.append('file', file);
            formData.append('groupId', currGroup.id);

            const loader = $('#overlay-loader');

            closeDialog('#overlay4');
            loader.show();

            const response = await sendFile(formData);
            socket.emit('new message', user, response.data.fileObj, Number(currGroup.id));

            $('#spinner').css('display', 'none');
            loader.hide();

            recentMessage = response.data.fileObj;
            messages.push(recentMessage);

            displayMsgHandler();
        } catch (err) {
            console.log(err);
            alert('Something went wrong!');
        }
    })
}

async function sendFile(formData) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axiosInstance.post('/user/sendFile', formData, { headers: { "Authorization": token } });
            resolve(response);
        } catch (err) {
            alert(err);
            reject(err);
        }
    })
}

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

document.getElementById('add-group-form').addEventListener('submit', addNewGroup);

async function addNewGroup(e) {
    e.preventDefault();

    const groupName = $('#group-name').val();
    const groupDesc = $('#group-desc').val();

    if (groupName === '' || groupDesc === '') {
        alert('Please enter all fields to create!');
        return;
    }

    if (selectedMembers.length < 2) {
        alert('Please add atleast 2 members to create group!');
        return;
    }

    var fileInput = document.getElementById('group-photo');
    var file = fileInput.files[0];
    var formData = new FormData();
    formData.append('file', file);

    const newGroup = {
        name: groupName,
        description: groupDesc,
        members: [user.userId, ...selectedMembers]
    }

    formData.append('newGroup', JSON.stringify(newGroup));

    const response = await axiosInstance.post('/user/createGroup', formData, { headers: { "Authorization": token } });

    socket.emit('new group', { id: response.data.group.id, ...newGroup });

    const ee = document.getElementById('empty-msg-element');
    if(ee)
        ee.remove();
    const groupsList = document.getElementById('groups-c');
    groupsList.innerHTML = getGroupElement(response.data.group) + groupsList.innerHTML;

    alert('New group created');
    $('#overlay1').hide();
    selectedMembers = new Set();
}

function toggleCheckBoxSelect(e) {
    const checkboxValue = Number(e.value);
    if(e.checked)
        selectedMembers.add(checkboxValue);
    else
        selectedMembers.delete(checkboxValue);
    
    document.getElementById('selectedCount').innerHTML = `&#183;&nbsp;${selectedMembers.size} selected`
}

function updateMembers() {
    if (selectedMembers.size === 0) {
        alert('Please select a user to add!');
        return;
    }

    document.getElementById('participantsCount').innerHTML = `&#183;&nbsp;${selectedMembers.size} participants`

    $('#overlay2').hide();
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '../auth/login/login.html';
}

$("#overlay2").click(function (e) {
    if (e.target.id === 'overlay2')
        $("#overlay2").hide();
})

const onEmojiSelectHandler = (emoji) => {
    selectedEmoji = emoji.native;
    document.getElementById('message').value += selectedEmoji;
}

const pickerOptions = { onEmojiSelect: onEmojiSelectHandler }
const picker = new EmojiMart.Picker(pickerOptions)
const emojiPickerBtn = document.getElementById('emojiPickerBtn');
const emojiPicker = document.getElementById('emojiPicker');
emojiPicker.appendChild(picker);

document.getElementById('emojiPickerBtn').addEventListener('click', () => {
    emojiPicker.style.display = emojiPicker.style.display === "none" ? "block" : "none";
    event.stopPropagation();
})

document.addEventListener("click", (event) => {
    if (!emojiPicker.contains(event.target) && event.target !== emojiPickerBtn) {
        emojiPicker.style.display = "none";
    }
});

function toggleDropdown(participantId) {

    const dropdownMenu = document.getElementById(`dropdown-menu-${participantId}`);

    dropdownMenu.classList.add('show');

    document.addEventListener('click', function (event) {
        var dropdownMenu = document.getElementById(`dropdown-menu-${participantId}`);
        var dropdownToggle = document.getElementById(`dropdown-toggle-${participantId}`);
        if (dropdownMenu && dropdownToggle && !dropdownMenu.contains(event.target) && !dropdownToggle.contains(event.target)) {
            dropdownMenu.classList.remove('show');
        }
    });
}

function backToChatScreen() {
    $('#group-profile').hide();
    $('#active').show();
}

function showProfile() {
    $('#overlay3').show();
    console.log(user);
    $('#profile-username').text(user.name);
    $('#profile-phoneno').text(user.phoneNo);
    $('#profile-email').text(user.email);
}

function closeDialog(dialog) {
    $(dialog).hide();
}

async function getNonParticipants() {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axiosInstance.get(`/user/groups/${currGroupId}/non-participants`, { headers: { "Authorization": token } });
            resolve(response.data.users);
        } catch(err) {
            alert("Something went wrong!");
            return;
        }
    })
}

function showCreateGroupDialog() {
    $('#overlay1').show();
    document.getElementById('participantsCount').innerHTML='';
    selectedMembers = new Set();
}

async function getAllUsers() {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axiosInstance.get(`/user/getAllUsers`, { headers: { "Authorization": token } });
            resolve(response.data.users);
        } catch(err) {
            alert("Something went wrong!");
            return;
        }
    })
}

async function showAddUsersDialog(isGroupNew) {
    try {
    document.getElementById('selectedCount').innerHTML='';
    selectedMembers = new Set();
    let users;
    if(isGroupNew)
        users = await getAllUsers();
    else
        users = await getNonParticipants();

    $('#overlay2').show();
    const searchBar = document.getElementById('search-non-participants');
    searchBar.focus();

    searchBar.addEventListener('keyup', (e) => {
        const enteredValue = e.target.value.trim().toLowerCase();
        const filteredUsers = users.filter(user => {
            const name = user.name.trim().toLowerCase();
            const phoneNo = user.phoneNo.trim().toLowerCase();
            return name.startsWith(enteredValue) || phoneNo.startsWith(enteredValue);
        })
        displayUsersInDialog(filteredUsers);
    })

    displayUsersInDialog(users);

    const addUsersBtn = document.getElementById('add-users-btn');
    
    if(isGroupNew)
        addUsersBtn.onclick = updateMembers;
    else
        addUsersBtn.onclick = addMoreUsersToGroup;
    } catch(err) {
        console.log(err);
        localStorage.setItem('error', err);
    }
}

async function addMoreUsersToGroup() {
    try {
        const response = await axiosInstance.post(`/user/groups/${currGroupId}/add-members`, { members: [...selectedMembers] },  { headers: { "Authorization": token } });
        fetchGroupParticipants(currGroupId);
        socket.emit('new group', { ...currGroup, members: [...selectedMembers] });
        selectedMembers = new Set();
        $('#overlay2').hide();
    } catch(err) {
        alert(err);
    }
}

function displayUsersInDialog(users) {
    const userList = document.getElementById('user-list');
    userList.innerHTML = '';
    users.forEach(user => {
        userList.innerHTML += `
            <div class="dialog_user_element">
                <input type="checkbox" id="checkbox-${user.id}" onchange="toggleCheckBoxSelect(this)" class="userCheckBox" name="${user.name}" value="${user.id}">
                <label for="checkbox-${user.id}" class="dialog_user_details flex flex-column"><span class="username">${user.name}</span><span class="phone-no">Phone No: ${user.phoneNo}</span></label>
            </div>
        `;
    })
    markSelectedMembersAsChecked()
}

function markSelectedMembersAsChecked() {
    const checkBoxes = document.querySelectorAll('.userCheckBox');
    checkBoxes.forEach(checkBox => {
        if(selectedMembers.has(Number(checkBox.id.split('-')[1])))
            checkBox.checked=true;
    })
}

const exitGroup = () => {
    const yes = confirm('Are you sure you want to exit from group? You will lose access to all chats from this group including previous chats.');
    if(!yes)
        return;

    try {
        const response = axiosInstance.delete(`user/groups/${currGroupId}`, { headers: { 'Authorization': token } });
        loadGroups();
        $('#active').hide();
        $('#default').show();
    } catch(err) {
        alert('Something went wrong!');
    }
};

document.getElementById('search-new-groups').addEventListener('click', async () => {
    $('#overlay-groups-search').show();
    const searchBar = document.getElementById('searchbar-new-groups');
    searchBar.focus();

    let groups;

    console.log(searchBar);

    try {
        const response = await axiosInstance.get('/user/groups/new', { headers: { 'Authorization': token } });
        groups = response.data.newGroups;

        searchBar.addEventListener('keyup', (e) => {
            console.log('inside');
            const enteredValue = e.target.value.trim().toLowerCase();
            const filteredGroups = groups.filter(group => {
                const name = group.name.trim().toLowerCase();
                return name.startsWith(enteredValue);
            })
            displayGroupsInDialog(filteredGroups);
        })

    } catch(err) {
        alert('Something went wrong!');
    }

    displayGroupsInDialog(groups);
})

function displayGroupsInDialog(groups) {
    const groupsList = document.getElementById('new-groups-list');
    groupsList.innerHTML='';
    if(groups.length === 0)
        groupsList.innerHTML = getEmptyMsgElement('Nothing to show!');

    groups.forEach(group => {
        groupsList.innerHTML += `
        <div class="dialog-group-element">
            <div class="dialog-group-details">
                <div class="dialog-group-profile-image-c flex">
                    <img id="photo-${group.id}" class="dialog-group-profile-image" src="../images/group-profile-image.jpeg" alt="Group Profile Pic">
                </div>
                <div class="dialog-group-name-c">
                    <h3 id="${group.id}" class="dialog-group-name">${group.name}</h3>
                </div>
            </div>
            <div class="group-action">
                <button id="joinbtn-${group.id}" class="join-group-btn" onclick="displayEnterGroupCodeDialog('${group.id}')">Join Group</button>
            </div>
        </div>
        `;
    })
}

function hideGroupDialog() {
    $('#overlay-groups-search').hide();
}

function displayEnterGroupCodeDialog(groupId) {
    $('#overlay-enter-group-code').show();
    const groupCodeInput = document.getElementById('group-code-input');
    groupCodeInput.focus();
    document.getElementById('join-group-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const response = await axiosInstance.post(`/user/groups/${groupId}/join`, { enteredCode: groupCodeInput.value, members: [ user.userId ] }, { headers: { 'Authorization': token } });
            const group = response.data.group;
            alert(`Joined new group ${group.name}`);
            const groupsList = document.getElementById('groups-c');
            const ee = document.getElementById('empty-msg-element');
            if(ee)
                ee.remove();
            groupsList.innerHTML = getGroupElement({ id: group.id, name: group.name }) + groupsList.innerHTML;
            $('#overlay-enter-group-code').hide();
            $('#overlay-groups-search').hide();
        } catch(err) {
            alert(err.response.data.message);
        }
    })
}