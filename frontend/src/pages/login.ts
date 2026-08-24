import {
  login
} from "../auth/auth";

export function renderLogin(
  onLoginSuccess: () => void
): void {
  const app =
    document.querySelector<HTMLDivElement>("#app");

  if (!app) {
    throw new Error("App root not found");
  }

  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-brand">
        <div class="brand-icon">🏥</div>
        <div>
          <h1>CarePoint</h1>
          <p>Healthcare Appointment Manager</p>
        </div>
      </div>

      <div class="login-card">
        <div class="login-header">
          <h2>Welcome back</h2>
          <p>
            Sign in to manage your healthcare appointments.
          </p>
        </div>

        <form id="login-form">

          <div class="form-group">
            <label for="email">
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              required
            />
          </div>

          <div class="form-group">
            <label for="password">
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              autocomplete="current-password"
              required
            />
          </div>

          <div
            id="login-error"
            class="form-error hidden"
          ></div>

          <button
            id="login-button"
            type="submit"
            class="primary-button"
          >
            Sign in
          </button>

        </form>

        <div class="demo-accounts">
          <p class="demo-title">
            Demo accounts
          </p>

          <button
            type="button"
            class="demo-account"
            data-email="patient1@healthcare.local"
          >
            <span>👤</span>
            <span>
              <strong>Patient</strong>
              <small>patient1@healthcare.local</small>
            </span>
          </button>

          <button
            type="button"
            class="demo-account"
            data-email="doctor1@healthcare.local"
          >
            <span>🩺</span>
            <span>
              <strong>Doctor</strong>
              <small>doctor1@healthcare.local</small>
            </span>
          </button>

          <button
            type="button"
            class="demo-account"
            data-email="admin@healthcare.local"
          >
            <span>⚙️</span>
            <span>
              <strong>Administrator</strong>
              <small>admin@healthcare.local</small>
            </span>
          </button>
        </div>
      </div>

      <p class="auth-footer">
        Secure healthcare appointment management
      </p>
    </div>
  `;

  const form =
    document.querySelector<HTMLFormElement>(
      "#login-form"
    );

  const emailInput =
    document.querySelector<HTMLInputElement>(
      "#email"
    );

  const passwordInput =
    document.querySelector<HTMLInputElement>(
      "#password"
    );

  const loginButton =
    document.querySelector<HTMLButtonElement>(
      "#login-button"
    );

  const errorBox =
    document.querySelector<HTMLDivElement>(
      "#login-error"
    );

  if (
    !form ||
    !emailInput ||
    !passwordInput ||
    !loginButton ||
    !errorBox
  ) {
    return;
  }

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const email =
        emailInput.value.trim();

      const password =
        passwordInput.value;

      if (!email || !password) {
        errorBox.textContent =
          "Please enter your email and password.";

        errorBox.classList.remove(
          "hidden"
        );

        return;
      }

      loginButton.disabled = true;
      loginButton.textContent =
        "Signing in...";

      errorBox.classList.add(
        "hidden"
      );

      try {
        await login(
          email,
          password
        );

        onLoginSuccess();

      } catch (error) {
        errorBox.textContent =
          error instanceof Error
            ? error.message
            : "Unable to sign in. Please try again.";

        errorBox.classList.remove(
          "hidden"
        );

        loginButton.disabled = false;
        loginButton.textContent =
          "Sign in";
      }
    }
  );

  document
    .querySelectorAll<HTMLButtonElement>(
      ".demo-account"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const email =
            button.dataset.email;

          if (email) {
            emailInput.value = email;
            passwordInput.value =
              "Password@123";

            passwordInput.focus();
          }
        }
      );
    });
}