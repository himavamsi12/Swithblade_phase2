import { signOut } from "../actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="h-12 w-full border border-black bg-white text-body-2 tracking-[0.08em] text-black uppercase transition-colors hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Sign out
      </button>
    </form>
  );
}
