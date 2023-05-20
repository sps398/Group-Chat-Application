const messageInput = document.getElementById('message');
const displayMessagesC = document.getElementById('display-messages-c');
const sendMessageForm = document.getElementById('sendmessage-form');

const token = localStorage.getItem('token');
if(!token) {
    window.location.href = '../auth/login/login.html';
}

window.addEventListener('DOMContentLoaded', async () => {
    try {
        setInterval(async () => {
            const result = await axiosInstance.get('/user/messages', { headers: { "Authorization": token } });
            let messages = result.data.messages;
            displayMessages(messages);
        }, 1000);
    } catch(err) {
        console.log(err);
        alert('Something went wrong!');
    }
})

function displayMessages(messages) {
    displayMessagesC.innerHTML = '';
    messages.forEach(m => {
        displayMessagesC.innerHTML += `
            <div style="background-color:grey;color:white;margin: 5px 5px;padding: 5px;">${m.userName} : ${m.message}</div>
        `;
    });
}

sendMessageForm.addEventListener('submit', async (e) => {
    const message = messageInput.value;
    if(message === '') {
        alert('Please enter a message to send!');
        return;
    }

    try {
        const response = await axiosInstance.post('/user/sendmessage', { message: message }, { headers: { "Authorization": token } });
        messageInput.value = '';
    } catch(err) {
        console.log(err);
        alert('Something went wrong!');
    }
})