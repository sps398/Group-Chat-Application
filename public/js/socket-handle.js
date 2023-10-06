let socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('CONNECTED');
    socket.emit('new connection', user);
});

socket.on('new connection', user => {
    console.log(user.name, ' joined');
})

socket.on('new group', (newGroup) => {
    socket.emit('join-room', newGroup.id, groupId => {
        console.log('joined group ' + groupId);
    });

    const ee = document.getElementById('empty-msg-element');
    if(ee)
        ee.remove();
    const groupsList = document.getElementById('groups-c');
    groupsList.innerHTML = getGroupElement({ id: newGroup.id, name: newGroup.name }) + groupsList.innerHTML;
})

socket.on('receive message', async (from, msgObj, groupId) => {

    if (currGroup && Number(currGroup.id) === Number(groupId)) {
        await markMessagesAsSeen(groupId);
        const prevMsg = messages[messages.length-2];
        displayMessage(msgObj, prevMsg.userId, prevMsg.createdAt.split('T')[0]);
        messagesC.scrollTop = messagesC.scrollHeight;
        setTopDateLabel();
    }

    else {
        showNewMessagesCount(groupId);
    }
})

socket.on('disconnected', (msg) => {
    console.log(msg);
})

socket.on('new group', (newGroup) => {
    console.log("New Group Added ", newGroup);
})

socket.on('removed from group', (groupId, groupName) => {
    alert(`Removed from group ${groupName}`);
    document.getElementById(`${groupId}`).remove();
    if(currGroupId === groupId) {
        $('#active').hide();
        $('#default').show();
    }
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