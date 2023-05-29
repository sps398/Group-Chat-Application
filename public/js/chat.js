const messageInput = document.getElementById('message');
const displayMessagesC = document.getElementById('display-messages-c');
const sendMessageForm = document.getElementById('sendmessage-form');
let messages = [];
let lastMessageId = -1;

const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '../auth/login/login.html';
}

window.addEventListener('DOMContentLoaded', async () => {
    displayMessagesC.innerHTML = `
        <div id="oldermessagesbtnc" style="margin: 10px 0;display:flex;justify-content:center;align-items:center;"><button id="load-older-messages" onclick=loadOlderMessages(); style="padding: 5px;cursor: pointer;background-color:blue;color:white;">Load older messages</button></div>`;
    
    messages = JSON.parse(localStorage.getItem('recent_chats'));
    console.log(messages);
    if (messages) {
        displayMessages(messages);
        lastMessageId = messages[messages.length - 1].id;
    }
    else {
        document.getElementById('oldermessagesbtnc').remove();
        lastMessageId=0;
    }

    displayMessagesC.scrollTop = displayMessagesC.scrollHeight;
    try {
        setInterval(async () => {
            const result = await axiosInstance.get(`/user/messages?lastMessageId=${lastMessageId}`, { headers: { "Authorization": token } });
            messages = result.data.messages;
            if (messages && messages.length != 0) {
                displayMessages(messages);
                displayMessagesC.scrollTop = displayMessagesC.scrollHeight;
                lastMessageId = messages[messages.length - 1].id;
            }
        }, 1000);
    } catch (err) {
        console.log(err);
        alert('Something went wrong!');
    }
})

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
    messages.forEach(m => {
        displayMessagesC.innerHTML += `
            <div style="background-color:grey;color:white;margin: 5px 5px;padding: 5px;">${m.id}  ${m.userName} : ${m.message}</div>
        `;
    });
}

function displayOlderMessages(messages) {
    document.getElementById('oldermessagesbtnc').remove();
    const temp = displayMessagesC.innerHTML;
    displayMessagesC.innerHTML='';
    messages.forEach(m => {
        displayMessagesC.innerHTML += `
            <div style="background-color:grey;color:white;margin: 5px 5px;padding: 5px;">${m.id}  ${m.userName} : ${m.message}</div>
        `;
    })
    displayMessagesC.innerHTML += temp;
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
        recentMessage = {
            id: response.data.messageId,
            message: message,
            userName: response.data.userName
        };
    } catch (err) {
        console.log(err);
        alert('Something went wrong!');
    }

    let recentChats = JSON.parse(localStorage.getItem('recent_chats'));
    if (recentChats) {
        if (recentChats.length === 10) {
            recentChats.splice(0, 1);
            console.log(true);
        }

        recentChats.push(recentMessage);
    }
    else {
        recentChats = [];
        recentChats.push(recentMessage);
    }

    localStorage.setItem('recent_chats', JSON.stringify(recentChats));
})

async function sendMessage(message) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axiosInstance.post('/user/sendmessage', { message: message }, { headers: { "Authorization": token } });
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