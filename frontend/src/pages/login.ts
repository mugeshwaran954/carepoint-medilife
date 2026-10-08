import {
  login,
  register
} from "../auth/auth";
import type { RegisterInput } from "../types";

export function renderLogin(
  onLoginSuccess: () => void
): void {
  const app = document.querySelector<HTMLDivElement>("#app");

  if (!app) {
    throw new Error("App root not found");
  }

  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-brand">
        <div class="brand-icon">🏥</div>
        <div>
          <h1>CarePoint</h1>
          <p>MediLife Healthcare Management</p>
        </div>
      </div>

      <div class="login-card">
        <div class="auth-tabs">
          <button id="tab-login" type="button" class="auth-tab-btn active">
            Sign In
          </button>
          <button id="tab-register" type="button" class="auth-tab-btn">
            Register New Account
          </button>
        </div>

        <!-- ================= LOGIN TAB ================= -->
        <div id="login-tab-content" class="auth-tab-panel">
          <div class="login-header">
            <h2>Welcome back</h2>
            <p>Sign in to manage your appointments and consultations.</p>
          </div>

          <div id="login-global-success" class="alert alert-success hidden"></div>

          <form id="login-form">
            <div class="form-group">
              <label for="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                class="form-control"
                placeholder="you@example.com"
                autocomplete="email"
                required
              />
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                class="form-control"
                placeholder="Enter your password"
                autocomplete="current-password"
                required
              />
            </div>

            <div id="login-error" class="alert alert-danger hidden"></div>

            <button
              id="login-button"
              type="submit"
              class="btn btn-primary w-full"
            >
              Sign in
            </button>
          </form>

          <div class="demo-accounts">
            <p class="demo-title">
              Quick Demo Accounts (Password: Password@123)
            </p>

            <button
              type="button"
              class="demo-account"
              data-email="patient1@healthcare.local"
            >
              <span>👤</span>
              <span>
                <strong>Patient 1 (Rahul Menon)</strong>
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
                <strong>Doctor 1 (Dr. Arun Kumar - General Med)</strong>
                <small>doctor1@healthcare.local</small>
              </span>
            </button>

            <button
              type="button"
              class="demo-account"
              data-email="doctor2@healthcare.local"
            >
              <span>❤️</span>
              <span>
                <strong>Doctor 2 (Dr. Priya Sharma - Cardiology)</strong>
                <small>doctor2@healthcare.local</small>
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

        <!-- ================= REGISTER TAB ================= -->
        <div id="register-tab-content" class="auth-tab-panel hidden">
          <div class="login-header">
            <h2>Create an Account</h2>
            <p>Register as a patient or doctor to access healthcare services.</p>
          </div>

          <form id="register-form">
            <div class="form-group">
              <label for="reg-name">Full Name *</label>
              <input
                id="reg-name"
                name="fullName"
                type="text"
                class="form-control"
                placeholder="e.g. Ananya Sharma"
                required
              />
            </div>

            <div class="form-group">
              <label for="reg-email">Email address *</label>
              <input
                id="reg-email"
                name="email"
                type="email"
                class="form-control"
                placeholder="name@example.com"
                required
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="reg-password">Password *</label>
                <input
                  id="reg-password"
                  name="password"
                  type="password"
                  class="form-control"
                  placeholder="Min 6 characters"
                  minlength="6"
                  required
                />
              </div>

              <div class="form-group">
                <label for="reg-role">Account Role *</label>
                <select id="reg-role" name="role" class="form-control">
                  <option value="PATIENT" selected>Patient</option>
                  <option value="DOCTOR">Doctor</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="reg-phone">Phone Number</label>
                <input
                  id="reg-phone"
                  name="phone"
                  type="tel"
                  class="form-control"
                  placeholder="+91 9876543210"
                />
              </div>

              <div class="form-group">
                <label for="reg-gender">Gender</label>
                <select id="reg-gender" name="gender" class="form-control">
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="reg-dob">Date of Birth</label>
                <input
                  id="reg-dob"
                  name="dateOfBirth"
                  type="date"
                  class="form-control"
                />
              </div>

              <div class="form-group">
                <label for="reg-age">Age (Years)</label>
                <input
                  id="reg-age"
                  name="age"
                  type="number"
                  min="1"
                  max="120"
                  class="form-control"
                  placeholder="e.g. 28"
                />
              </div>
            </div>

            <div id="register-error" class="alert alert-danger hidden"></div>
            <div id="register-success" class="alert alert-success hidden"></div>

            <button
              id="register-button"
              type="submit"
              class="btn btn-primary w-full"
            >
              Register & Sign In
            </button>

            <p class="auth-switch-prompt">
              Already have an account?
              <button id="switch-to-login" type="button" class="btn-link">
                Sign in here
              </button>
            </p>
          </form>
        </div>
      </div>

      <p class="auth-footer">
        CarePoint MediLife · Secure Healthcare Management Platform
      </p>
    </div>
  `;

  // Tab switching logic
  const tabLogin = document.querySelector<HTMLButtonElement>("#tab-login");
  const tabRegister = document.querySelector<HTMLButtonElement>("#tab-register");
  const loginPanel = document.querySelector<HTMLDivElement>("#login-tab-content");
  const registerPanel = document.querySelector<HTMLDivElement>("#register-tab-content");
  const switchToLoginBtn = document.querySelector<HTMLButtonElement>("#switch-to-login");

  const activateTab = (tab: "login" | "register") => {
    if (tab === "login") {
      tabLogin?.classList.add("active");
      tabRegister?.classList.remove("active");
      loginPanel?.classList.remove("hidden");
      registerPanel?.classList.add("hidden");
    } else {
      tabRegister?.classList.add("active");
      tabLogin?.classList.remove("active");
      registerPanel?.classList.remove("hidden");
      loginPanel?.classList.add("hidden");
    }
  };

  tabLogin?.addEventListener("click", () => activateTab("login"));
  tabRegister?.addEventListener("click", () => activateTab("register"));
  switchToLoginBtn?.addEventListener("click", () => activateTab("login"));

  // Login form handling
  const loginForm = document.querySelector<HTMLFormElement>("#login-form");
  const emailInput = document.querySelector<HTMLInputElement>("#email");
  const passwordInput = document.querySelector<HTMLInputElement>("#password");
  const loginButton = document.querySelector<HTMLButtonElement>("#login-button");
  const loginErrorBox = document.querySelector<HTMLDivElement>("#login-error");

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
      if (loginErrorBox) {
        loginErrorBox.textContent = "Please enter your email and password.";
        loginErrorBox.classList.remove("hidden");
      }
      return;
    }

    if (loginButton) {
      loginButton.disabled = true;
      loginButton.textContent = "Signing in...";
    }
    loginErrorBox?.classList.add("hidden");

    try {
      await login(email, password);
      onLoginSuccess();
    } catch (error) {
      if (loginErrorBox) {
        loginErrorBox.textContent =
          error instanceof Error
            ? error.message
            : "Unable to sign in. Please try again.";
        loginErrorBox.classList.remove("hidden");
      }
      if (loginButton) {
        loginButton.disabled = false;
        loginButton.textContent = "Sign in";
      }
    }
  });

  // Register form handling
  const registerForm = document.querySelector<HTMLFormElement>("#register-form");
  const regNameInput = document.querySelector<HTMLInputElement>("#reg-name");
  const regEmailInput = document.querySelector<HTMLInputElement>("#reg-email");
  const regPasswordInput = document.querySelector<HTMLInputElement>("#reg-password");
  const regRoleSelect = document.querySelector<HTMLSelectElement>("#reg-role");
  const regPhoneInput = document.querySelector<HTMLInputElement>("#reg-phone");
  const regGenderSelect = document.querySelector<HTMLSelectElement>("#reg-gender");
  const regDobInput = document.querySelector<HTMLInputElement>("#reg-dob");
  const regAgeInput = document.querySelector<HTMLInputElement>("#reg-age");
  const registerButton = document.querySelector<HTMLButtonElement>("#register-button");
  const regErrorBox = document.querySelector<HTMLDivElement>("#register-error");
  const regSuccessBox = document.querySelector<HTMLDivElement>("#register-success");

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = regNameInput?.value.trim();
    const email = regEmailInput?.value.trim();
    const password = regPasswordInput?.value;
    const role = (regRoleSelect?.value as any) || "PATIENT";
    const phone = regPhoneInput?.value.trim();
    const gender = (regGenderSelect?.value as any) || undefined;
    const dateOfBirth = regDobInput?.value || undefined;
    const ageVal = regAgeInput?.value ? parseInt(regAgeInput.value, 10) : undefined;

    if (!fullName || !email || !password) {
      if (regErrorBox) {
        regErrorBox.textContent = "Please fill in all required fields.";
        regErrorBox.classList.remove("hidden");
      }
      return;
    }

    if (registerButton) {
      registerButton.disabled = true;
      registerButton.textContent = "Creating account...";
    }
    regErrorBox?.classList.add("hidden");
    regSuccessBox?.classList.add("hidden");

    const payload: RegisterInput = {
      fullName,
      email,
      password,
      role,
      phone: phone || undefined,
      gender,
      dateOfBirth,
      age: ageVal
    };

    try {
      await register(payload);

      if (regSuccessBox) {
        regSuccessBox.textContent = "Registration successful! Welcome to CarePoint.";
        regSuccessBox.classList.remove("hidden");
      }

      // Automatically sign in and load workspace
      setTimeout(() => {
        onLoginSuccess();
      }, 800);
    } catch (err: any) {
      if (registerButton) {
        registerButton.disabled = false;
        registerButton.textContent = "Register & Sign In";
      }
      if (regErrorBox) {
        regErrorBox.textContent =
          err instanceof Error
            ? err.message
            : "Registration failed. Please check your information.";
        regErrorBox.classList.remove("hidden");
      }
    }
  });

  // Demo accounts autofill
  document
    .querySelectorAll<HTMLButtonElement>(".demo-account")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const email = button.dataset.email;
        if (email && emailInput && passwordInput) {
          emailInput.value = email;
          passwordInput.value = "Password@123";
          passwordInput.focus();
        }
      });
    });
}