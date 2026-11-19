export type ChangePasswordState = {
  status: "idle" | "error" | "success";
  message?: string;
  fields?: Record<string, string>;
};

export const initialChangePasswordState: ChangePasswordState = {
  status: "idle",
};
