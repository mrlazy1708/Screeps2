`use strict`;

function auth(name, pass, request) {
  const auth = { name, pass },
    chunks = window.location.href.split(`/`);

  fetch(`${_.initial(chunks).join(`/`)}/auth`, {
    method: `POST`,
    body: JSON.stringify({ auth, request }),
  })
    .then((response) => response.json())
    .then((json) => {
      console.log(json);
      if (json === `OK`)
        window.location.replace(`${_.initial(chunks).join(`/`)}/room`);
      return json;
    })
    .catch((err) => console.log(err));
}

function clickLogin() {
  const inputName = document.getElementById(`input-name`),
    inputPassword = document.getElementById(`input-password`);
  return auth(inputName.value, inputPassword.value, `login`);
}

function clickRegister() {
  const inputName = document.getElementById(`input-name`),
    inputPassword = document.getElementById(`input-password`);
  return auth(inputName.value, inputPassword.value, `register`);
}
