const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = {
        email: emailInput.value,
        password: passwordInput.value
    };

    try {
        const result = await axiosInstance.post('/user/login', user);
        localStorage.setItem('token', result.data.token);
        alert(result.data.message + "..." + "Press ok to continue");
        window.location.href = "../../dashboard/chat.html";
    } catch(err) {
        alert(err.response.data.message);
    }
});