// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			member?: import('$lib/server/auth').Member;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
