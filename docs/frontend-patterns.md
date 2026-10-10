# Frontend patterns

Keep responsibilities separate: `routes` defines navigation, `domain/<feature>/pages` renders the page, `domain/<feature>/services` owns API/query operations, `common` holds infrastructure, and `shared/components` holds reusable UI.

## Router + Query

The Router Vite plugin generates `src/routeTree.gen.ts` from `src/routes`. Do not edit the generated file. Keep it committed so TypeScript checks also work before starting Vite.

`src/app/main.tsx` registers the router with typed `{ trpc, queryClient }` context and wraps it in the TanStack Query provider. Route files import domain pages rather than implementing feature logic themselves.

Use the feature service from components:

```tsx
import { welcomeService } from '@/domain/welcome/services';

const welcome = welcomeService.useGetWelcome();
```

The same service exposes options for route loaders:

```ts
await context.queryClient.ensureQueryData(welcomeService.getWelcomeQueryOptions());
```

The welcome service is an infrastructure example; the home page renders the meeting feature. Render loading, error/retry, empty, and success states when using queries.

## Reusable forms

`shared/components/form` uses TanStack Form's `createFormHookContexts` + `createFormHook` APIs. Contexts live in their own module to avoid circular imports. Field adapters render CLI-generated shadcn primitives.

Available components:

- `field.TextField`: string fields; text/email/password/tel/search/url inputs.
- `field.TextArea`: multiline strings.
- `field.CheckboxField`: booleans.
- `field.SelectOptionsField`: string values and `{ label, value, disabled? }` options. Use nonempty option values, as required by Radix Select.
- `form.SubmitButton`: submission/loading state, validity, and dirty-state handling.

The barrel exports `useAppForm`, `withForm`, and the field/form contexts. Add specialized adapters only when a feature needs them.

Example of a reusable form:

```tsx
import { z } from 'zod';
import { useAppForm } from '@/shared/components/form';

const nameSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter your name').max(50),
});

type Props = {
  onSave: (displayName: string) => Promise<void>;
};

export function DisplayNameForm({ onSave }: Props) {
  const form = useAppForm({
    defaultValues: { displayName: '' },
    validators: { onChange: nameSchema, onSubmit: nameSchema },
    onSubmit: async ({ value }) => {
      await onSave(value.displayName);
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.AppField name="displayName">
        {(field) => <field.TextField label="Your name" autoComplete="name" />}
      </form.AppField>
      <form.AppForm>
        <form.SubmitButton label="Save" loadingLabel="Saving..." />
      </form.AppForm>
    </form>
  );
}
```

Place feature schemas in the feature's `schemas` directory once they need reuse. Handle rejected server mutations in the feature (for example, with a visible form-level error and retry); shared fields only render validation errors.

`SubmitButton` defaults to requiring changes. Set `requireDirty={false}` for forms whose initial values can be submitted, and `allowInvalid` only when the UX should allow submission attempts with visible validation errors. Pending submissions always disable the button.

Validation errors appear after touch or a submission attempt, and inputs reference their error text through `aria-describedby`. Field labels use unique React IDs so separate forms can reuse the same field names.

## Firebase listeners

Use the Firebase client only for subscriptions. Writes go through feature tRPC mutations to backend services.

```tsx
import { useEffect } from 'react';
import { subscribeToMeeting } from '@/common/lib/firebase';

useEffect(() => {
  return subscribeToMeeting(
    'meeting/participants',
    (snapshot) => {
      // Validate snapshot.val() against the feature's schema before using it.
    },
    (error) => {
      // Display the subscription failure in the feature's error state.
    },
  );
}, []);
```

The returned cleanup removes the listener. Do not use TanStack Query polling as a substitute for Firebase's realtime events.
