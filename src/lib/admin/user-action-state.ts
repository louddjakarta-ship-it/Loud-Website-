export type CreateUserState = {
  status: "idle" | "error" | "success";
  message?: string;
  fields?: Record<string, string>;
  created?: {
    username: string;
    password: string;
    displayName: string;
  };
};

export const initialCreateUserState: CreateUserState = { status: "idle" };
