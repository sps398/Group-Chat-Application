var socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('CONNECTED');
    socket.emit('new connection', user);
});

socket.on('new connection', data => {
    console.log(data.name, ' joined');
})

socket.on('receive message', async (from, msgObj, groupId) => {

    // addToLocalStorage(groupId, msgObj);

    if (currGroup && Number(currGroup.id) === Number(groupId)) {
        await markMessagesAsSeen(groupId);
        displayMessage(msgObj);
        messagesC.scrollTop = messagesC.scrollHeight;
        // lastMessageId = newMessage.id;
    }

    else {
        showNewMessagesCount(groupId);
    }
})

socket.on('disconnected', (msg) => {
    console.log(msg);
})

function showNewMessagesCount(groupId) {
    const newMessageCount = $(`#newMessageCount-${groupId}`);
    if (newMessageCount.css('display') === 'none') {
        newMessageCount.text('1');
        newMessageCount.css('display', 'inline-block');
    }
    else {
        newMessageCount.text(Number(newMessageCount.text()) + 1);
    }
}