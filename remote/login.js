`use strict`;

function auth(name, pass, request) {
  const auth = { name, pass },
    origin = `${window.location.protocol}//${window.location.host}`;

  fetch(`${origin}/auth`, {
    method: `POST`,
    body: JSON.stringify({ auth, request }),
  })
    .then((response) => response.json())
    .then((json) => {
      console.log(json);
      if (json === `OK`) {
        window.sessionStorage.setItem(`name`, name);
        window.sessionStorage.setItem(`pass`, pass);
        const prevUrl = window.sessionStorage.getItem(`prev`);
        window.location.replace(prevUrl || origin);
      } else return json;
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
