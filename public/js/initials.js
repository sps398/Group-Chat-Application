const axiosInstance = axios.create({
    baseURL: 'http://localhost:3000/'
});

const token = localStorage.getItem('token');

function getUser() {
    return new Promise(async (resolve, reject) => {
        try {
            let response;
            if(!token)
                moveToLoginPage();
            response = await axiosInstance.get('/user/verify', { headers: { 'Authorization': token }});
            const user = response.data.user;
            resolve(user);
        } catch(err) {
            reject(err);
        }
    })
}

// function decodeToken() {
//     var base64Url = token.split('.')[1];
//     var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//     var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
//         return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//     }).join(''));

//     return JSON.parse(jsonPayload);
// }

function moveToLoginPage() {
    window.location.href = '../auth/login/login.html';
}

function moveToHomePage() {
    window.location.href = "../../dashboard/chat.html";
}