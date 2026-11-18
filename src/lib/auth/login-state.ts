export type LoginState = {
  status: "idle" | "error";
  message?: string;
  fields?: Record<string, string>;
};

export const initialLoginState: LoginState = { status: "idle" };
