import {App, Modal, Notice} from "obsidian";
import AgentLuhmannPlugin from "../main";
import {signIn, signUp, createApiKey} from "../api/auth";

type AuthTab = "sign-in" | "sign-up";

export class AuthModal extends Modal {
	plugin: AgentLuhmannPlugin;
	currentTab: AuthTab = "sign-in";
	formContainer: HTMLDivElement | null = null;
	private onSuccess: (() => void) | undefined;

	constructor(app: App, plugin: AgentLuhmannPlugin, onSuccess?: () => void) {
		super(app);
		this.plugin = plugin;
		this.onSuccess = onSuccess;
	}

	onOpen(): void {
		const {contentEl} = this;
		contentEl.addClass("agent-luhmann-auth-modal");
		contentEl.empty();

		contentEl.createEl("h2", {text: "AI authentication"});

		const tabContainer = contentEl.createDiv({cls: "auth-tabs"});

		const signInTab = tabContainer.createEl("button", {
			text: "Sign in",
			cls: "auth-tab active",
			attr: {"aria-label": "Sign in tab"},
		});

		const signUpTab = tabContainer.createEl("button", {
			text: "Sign up",
			cls: "auth-tab",
			attr: {"aria-label": "Sign up tab"},
		});

		const updateTabs = (active: AuthTab) => {
			this.currentTab = active;
			signInTab.className = active === "sign-in" ? "auth-tab active" : "auth-tab";
			signUpTab.className = active === "sign-up" ? "auth-tab active" : "auth-tab";
			this.renderForm();
		};

		signInTab.addEventListener("click", () => updateTabs("sign-in"));
		signUpTab.addEventListener("click", () => updateTabs("sign-up"));

		this.formContainer = contentEl.createDiv({cls: "auth-form"});
		this.renderForm();
	}

	renderForm(): void {
		if (!this.formContainer) return;
		this.formContainer.empty();

		if (this.currentTab === "sign-in") {
			this.renderSignInForm(this.formContainer);
		} else {
			this.renderSignUpForm(this.formContainer);
		}
	}

	renderSignInForm(container: HTMLElement): void {
		const emailInput = container.createEl("input", {
			attr: {
				type: "email",
				placeholder: "Email",
				"aria-label": "Email address",
			},
		});

		const passwordInput = container.createEl("input", {
			attr: {
				type: "password",
				placeholder: "Password",
				"aria-label": "Password",
			},
		});

		const submitButton = container.createEl("button", {
			text: "Sign in",
			cls: "mod-cta",
			attr: {"aria-label": "Sign in"},
		});

		submitButton.addEventListener("click", async () => {
			const email = emailInput.value.trim();
			const password = passwordInput.value;
			if (!email || !password) {
				new Notice("Please fill in all fields");
				return;
			}
			submitButton.disabled = true;
			submitButton.setText("Signing in...");
			await this.handleSignIn(email, password);
			submitButton.disabled = false;
			submitButton.setText("Sign in");
		});

		passwordInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				submitButton.click();
			}
		});

		emailInput.focus();
	}

	renderSignUpForm(container: HTMLElement): void {
		const nameInput = container.createEl("input", {
			attr: {
				type: "text",
				placeholder: "Name",
				"aria-label": "Display name",
			},
		});

		const emailInput = container.createEl("input", {
			attr: {
				type: "email",
				placeholder: "Email",
				"aria-label": "Email address",
			},
		});

		const passwordInput = container.createEl("input", {
			attr: {
				type: "password",
				placeholder: "Password",
				"aria-label": "Password",
			},
		});

		const confirmInput = container.createEl("input", {
			attr: {
				type: "password",
				placeholder: "Confirm password",
				"aria-label": "Confirm password",
			},
		});

		const submitButton = container.createEl("button", {
			text: "Sign up",
			cls: "mod-cta",
			attr: {"aria-label": "Sign up"},
		});

		submitButton.addEventListener("click", async () => {
			const name = nameInput.value.trim();
			const email = emailInput.value.trim();
			const password = passwordInput.value;
			const confirm = confirmInput.value;
			if (!name || !email || !password) {
				new Notice("Please fill in all fields");
				return;
			}
			if (password !== confirm) {
				new Notice("Passwords do not match");
				return;
			}
			submitButton.disabled = true;
			submitButton.setText("Signing up...");
			await this.handleSignUp(name, email, password);
			submitButton.disabled = false;
			submitButton.setText("Sign up");
		});

		confirmInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				submitButton.click();
			}
		});

		nameInput.focus();
	}

	async handleSignIn(email: string, password: string): Promise<void> {
		const baseUrl = this.plugin.settings.aiApiUrl;
		if (!baseUrl) {
			new Notice("Please configure the AI API URL in settings first");
			return;
		}

		try {
			const authResponse = await signIn(baseUrl, email, password);
			const apiKeyResponse = await createApiKey(baseUrl, authResponse.token, "obsidian-plugin");

			this.plugin.settings.authToken = apiKeyResponse.key;
			this.plugin.settings.userEmail = email;
			this.plugin.settings.isAuthenticated = true;
			await this.plugin.saveSettings();

			new Notice("Authenticated successfully");
			this.close();
			this.onSuccess?.();
		} catch (error) {
			new Notice(error instanceof Error ? error.message : "Sign-in failed");
		}
	}

	async handleSignUp(name: string, email: string, password: string): Promise<void> {
		const baseUrl = this.plugin.settings.aiApiUrl;
		if (!baseUrl) {
			new Notice("Please configure the AI API URL in settings first");
			return;
		}

		try {
			const authResponse = await signUp(baseUrl, email, password, name);
			const apiKeyResponse = await createApiKey(baseUrl, authResponse.token, "obsidian-plugin");

			this.plugin.settings.authToken = apiKeyResponse.key;
			this.plugin.settings.userEmail = email;
			this.plugin.settings.isAuthenticated = true;
			await this.plugin.saveSettings();

			new Notice("Account created and authenticated successfully");
			this.close();
			this.onSuccess?.();
		} catch (error) {
			new Notice(error instanceof Error ? error.message : "Sign-up failed");
		}
	}

	onClose(): void {
		const {contentEl} = this;
		contentEl.empty();
		contentEl.removeClass("agent-luhmann-auth-modal");
	}
}
