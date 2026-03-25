import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";

// Mock useAuth
const mockLogin = vi.fn();
const mockUseAuth = vi.fn(() => ({
  login: mockLogin,
  isAuthenticated: false,
  isLoading: false,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import LoginForm from "@/components/auth/LoginForm";

function renderLoginForm() {
  return render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>,
  );
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders email and password fields", () => {
    renderLoginForm();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders sign in button", () => {
    renderLoginForm();

    const buttons = screen.getAllByRole("button", { name: /sign in/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders link to signup page", () => {
    renderLoginForm();

    const links = screen.getAllByText(/sign up/i);
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it("renders forgot password link", () => {
    renderLoginForm();

    const links = screen.getAllByText(/forgot password/i);
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it("updates email input on change", () => {
    renderLoginForm();

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    expect(emailInput.value).toBe("test@example.com");
  });

  it("updates password input on change", () => {
    renderLoginForm();

    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "mypassword" } });
    expect(passwordInput.value).toBe("mypassword");
  });

  it("calls login on form submit", async () => {
    mockLogin.mockResolvedValue({});
    renderLoginForm();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "securepass123" } });

    const submitButtons = screen.getAllByRole("button", { name: /sign in/i });
    fireEvent.click(submitButtons[0]!);

    await vi.waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@example.com", "securepass123");
    });
  });

  it("displays error message on login failure", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials"));
    renderLoginForm();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });

    const submitButtons = screen.getAllByRole("button", { name: /sign in/i });
    fireEvent.click(submitButtons[0]!);

    await vi.waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("displays generic error on non-Error failure", async () => {
    mockLogin.mockRejectedValue("something went wrong");
    renderLoginForm();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password1" } });

    const submitButtons = screen.getAllByRole("button", { name: /sign in/i });
    fireEvent.click(submitButtons[0]!);

    await vi.waitFor(() => {
      const errorMessages = screen.getAllByText(/login failed/i);
      expect(errorMessages.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows submitting state during login", async () => {
    let resolveLogin: () => void;
    mockLogin.mockImplementation(
      () => new Promise<void>((resolve) => { resolveLogin = resolve; }),
    );
    renderLoginForm();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    const submitButtons = screen.getAllByRole("button", { name: /sign in/i });
    fireEvent.click(submitButtons[0]!);

    await vi.waitFor(() => {
      const signingInElements = screen.getAllByText(/signing in/i);
      expect(signingInElements.length).toBeGreaterThanOrEqual(1);
    });

    // Resolve the login
    resolveLogin!();
  });

  it("has required attributes on email input", () => {
    renderLoginForm();

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(emailInput.type).toBe("email");
    expect(emailInput.required).toBe(true);
    expect(emailInput.autocomplete).toBe("email");
  });

  it("has required attributes on password input", () => {
    renderLoginForm();

    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");
    expect(passwordInput.required).toBe(true);
    expect(passwordInput.autocomplete).toBe("current-password");
  });
});
