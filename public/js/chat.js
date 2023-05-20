const messageInput = document.getElementById('message');
const sendBtn = document.getElementById('sendbtn');

const token = localStorage.getItem('token');
if(!token) {
    window.location.href = '../auth/login/login.html';
}

window.addEventListener('DOMContentLoaded', async () => {
    try {
        await axiosInstance.get('/user/messages', { headers: { "Authorization": token } });
    } catch(err) {
        console.log(err);
        alert('Something went wrong!');
    }
})

sendBtn.addEventListener('click', async (e) => {
    const message = messageInput.value;
    if(message === '') {
        alert('Please enter a message to send!');
        return;
    }

    try {
        const response = await axiosInstance.post('/user/sendmessage', { message: message }, { headers: { "Authorization": token } });
        alert(response.data.message);
        messageInput.value = '';
    } catch(err) {
        console.log(err);
        alert('Something went wrong!');
    }
})