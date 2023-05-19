const signUpForm = document.getElementById('signup-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const phonenoInput = document.getElementById('phoneno');
const passwordInput = document.getElementById('password');

signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = {
        name: nameInput.value,
        email: emailInput.value,
        phoneNo: phonenoInput.value,
        password: passwordInput.value
    };

    try {
        const result = await axiosInstance.post('/user/signup', user);
        alert(result.data.message);
    } catch(err) {
        alert(err.response.data.message);
    }
});