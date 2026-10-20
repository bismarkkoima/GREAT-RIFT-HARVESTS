"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import type { ActionState } from "@/app/actions/types";

// Like useActionState, but submits via onSubmit so React doesn't clear the form
// after the action runs. A failed submit keeps everything the user typed.
export function useFormAction(
  action: (state: ActionState, form: FormData) => Promise<ActionState>,
  { resetOnSuccess = false }: { resetOnSuccess?: boolean } = {},
) {
  const [state, dispatch, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.ok) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    formRef.current = e.currentTarget;
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  };

  return [state, onSubmit, pending] as const;
}
