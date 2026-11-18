export type EventActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fields?: Record<string, string>;
  redirectTo?: string;
};

export const initialEventActionState: EventActionState = { status: "idle" };
