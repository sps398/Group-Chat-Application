const messageInput = document.getElementById('message');
const messagesC = document.getElementById('messagesc');
const sendMessageForm = document.getElementById('sendmessage-form');
let messages = [];
let lastMessageId = -1;
let intervalId=undefined;
let currGroupElement=undefined;
let currGroup, currGroupId;

if (!token) {
    window.location.href = '../auth/login/login.html';
}

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await axiosInstance.get('/user/groups', { headers: { "Authorization": token } });
        const groups = response.data.groups;
        
        const groupsList = document.getElementById('groups-c');
        
        groups.forEach(group => {
            groupsList.innerHTML += `
                <div id="${group.id}" class="group-element" onclick="showGroupMessages('${group.id}', '${group.name}')">
                    <h3 id="${group.id}" class="group-name">${group.name}</h3>
                </div>
            `;
        })

        $('#username').text(user.name);

        $('#default').show();
        $('#active').hide();
    } catch(err) {
        console.log(err);
    }
})

async function showGroupMessages(groupId, groupName) {
    $('#default').hide();
    $('#active').show();

    makeCurrGroupElementActive(groupId);
    currGroupId = groupId;

    if(intervalId)
        clearInterval(intervalId);

    intervalId = undefined;
    lastMessageId=0;
    const group = {
        id: groupId,
        name: groupName
    }
    const rightHeader = document.getElementById('right-header');
    rightHeader.innerHTML = `
        <h2 style="text-align:center;color:black;">${group.name}</h2>
    `;

    currGroup=group;

    const response = await axiosInstance.get(`/user/messages?groupId=${group.id}&lastMessageId=0`, { headers: { "Authorization": token } });
    messages = response.data.messages;

    console.log(messages);

    if(messages.length !== 0)
        lastMessageId = messages[messages.length-1].id;

    messagesC.innerHTML = '';

    // messagesC.innerHTML = `
    //     <div id="oldermessagesbtnc" style="margin: 10px 0;display:flex;justify-content:center;align-items:center;"><button id="load-older-messages" onclick=loadOlderMessages(); style="padding: 5px;cursor: pointer;background-color:blue;color:white;">Load older messages</button></div>`;
    
    // recentChats = JSON.parse(localStorage.getItem('recent_chats'));
    // if (recentChats) {
    //     recentChats = new Map(recentChats);
        displayMessages(messages);
    //     lastMessageId = messages[messages.length - 1].id;
    // }
    // else {
    //     document.getElementById('oldermessagesbtnc').remove();
    //     lastMessageId=0;
    // }

    messagesC.scrollTop = messagesC.scrollHeight;
    try {
        intervalId = setInterval(async () => {
            const result = await axiosInstance.get(`/user/messages?groupId=${group.id}&lastMessageId=${lastMessageId}`, { headers: { "Authorization": token } });
            messages = result.data.messages;
            console.log(messages);
            if (messages && messages.length != 0) {
                displayMessages(messages);
                messagesC.scrollTop = messagesC.scrollHeight;
                lastMessageId = messages[messages.length - 1].id;
                console.log(lastMessageId);
            }
        }, 1000);
    } catch (err) {
        console.log(err);
        alert('Something went wrong!');
    }
}

function makeCurrGroupElementActive(groupId) {
    const prevGroupElement = document.getElementById(currGroupId);
    if(prevGroupElement)
        prevGroupElement.classList.remove('active');
    const currGroupElement = document.getElementById(groupId);
    
    if(currGroupElement)
        currGroupElement.classList.add('active');
}

// window.addEventListener('DOMContentLoaded', async () => {
    // messagesC.innerHTML = `
    //     <div id="oldermessagesbtnc" style="margin: 10px 0;display:flex;justify-content:center;align-items:center;"><button id="load-older-messages" onclick=loadOlderMessages(); style="padding: 5px;cursor: pointer;background-color:blue;color:white;">Load older messages</button></div>`;
    
    // messages = JSON.parse(localStorage.getItem('recent_chats'));
    // console.log(messages);
    // if (messages) {
    //     displayMessages(messages);
    //     lastMessageId = messages[messages.length - 1].id;
    // }
    // else {
    //     document.getElementById('oldermessagesbtnc').remove();
    //     lastMessageId=0;
    // }

    // messagesC.scrollTop = messagesC.scrollHeight;
    // try {
    //     setInterval(async () => {
    //         const result = await axiosInstance.get(`/user/messages?lastMessageId=${lastMessageId}`, { headers: { "Authorization": token } });
    //         messages = result.data.messages;
    //         if (messages && messages.length != 0) {
    //             displayMessages(messages);
    //             messagesC.scrollTop = messagesC.scrollHeight;
    //             lastMessageId = messages[messages.length - 1].id;
    //         }
    //     }, 1000);
    // } catch (err) {
    //     console.log(err);
    //     alert('Something went wrong!');
    // }
// })

async function loadOlderMessages() {
    try {
        messages = JSON.parse(localStorage.getItem('recent_chats'));
        console.log(messages);
        const result = await axiosInstance.get(`/user/olderMessages?lastMessageId=${messages[0].id}`, { headers: { "Authorization": token } });
        messages = result.data.messages;
        if (messages)
            displayOlderMessages(messages);
    } catch (err) {
        console.log(err);
        alert('Something went wrong!');
    }
}

function displayMessages(messages) {
    if(!messages || messages.length === 0)
        return;

    messages.forEach(m => {
        const createdAt = m.createdAt;
        const createdAtDate = new Date(createdAt);
        const time = createdAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messagesC.innerHTML += `
            <div id="${m.id}" class="chat-container">
                <div class="message">
                    <div class="sender">~&nbsp;${m.userName}</div>
                    <div class="text">${m.message}</div>
                    <div class="timestamp">${time}</div>
                </div>
            </div>
        `;

        const msg = document.getElementById(m.id);

        if(m.userId === user.userId) {
            console.log('true');
            msg.style.justifyContent = 'end';
        }
    });
    /* <div style="background-color:rgb(45 104 157);color:white;margin: 5px 5px;padding: 5px;">${m.id}  ${m.userName} : ${m.message}</div> */
}


function displayOlderMessages(messages) {
    document.getElementById('oldermessagesbtnc').remove();
    const temp = messagesC.innerHTML;
    messagesC.innerHTML='';
    messages.forEach(m => {
        messagesC.innerHTML += `
            <div style="background-color:grey;color:white;margin: 5px 5px;padding: 5px;">${m.id}  ${m.userName} : ${m.message}</div>
        `;
    })
    messagesC.innerHTML += temp;
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
        messageInput.value = '';
        // recentMessage = {
        //     id: response.data.messageId,
        //     message: message,
        //     userName: response.data.userName
        // };
    } catch (err) {
        console.log(err);
        alert('Something went wrong!');
    }

    // addToLocalStorage(groupId, recentMessage);
})

async function sendMessage(message) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axiosInstance.post(`/user/sendmessage?groupId=${currGroup.id}`, { message: message }, { headers: { "Authorization": token } });
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

    if(groupName === '' || groupDesc === '') {
        alert('Please enter all fields to create!');
        return;
    }

    if(members.length < 2) {
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
    $(document).ready(function() {
        $('#add-group-form')[0].reset();
    });
      
    $('#overlay1').hide();

    //add to localstorage...

    try {
        addToLocalStorage(response.data.group.id, null);
        alert('Added to localstorage!');
    } catch(err) {
        alert(err);
    }

}

async function showUsersDialog() {
    $('#overlay2').show();

    let users;

    try {
        response = await axiosInstance.get('/user/getAllUsers', { headers: { "Authorization": token } });
    } catch(err) {
        alert(err);
    }

    users = response.data.users;

    console.log(users);

    const userList = document.getElementById('user-list');
    userList.innerHTML='';

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
    let count=0;
    Array.from($('.userCheckBox')).forEach((user) => {
        if(user.checked) {
            members.push(user.id);
            count++;
        }
    })

    if(count===0) {
        alert('Please select a user to add!');
        return;
    }

    $('#overlay2').hide();
}

function addToLocalStorage(groupId, recentMessage) {
    let recentChats = JSON.parse(localStorage.getItem('recent_chats'));
    let groupMessages;
    if (recentChats) {
        recentChats = new Map(recentChats);

        groupMessages = recentChats.get(groupId);

        if(!groupMessages) {
            groupMessages = [];
        }

        if (groupMessages.length === 10)
            groupMessages.splice(0, 1);
    }
    else {
        recentChats = new Map();
        groupMessages = [];
    }

    if(recentMessage !== null)
        groupMessages.push(recentMessage);

    console.log(groupId, groupMessages);

    recentChats.set(groupId, groupMessages);

    console.log(recentChats);
    localStorage.setItem('recent_chats', JSON.stringify(Array.from(recentChats.entries())));
}