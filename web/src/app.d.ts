// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			member?: import('$lib/server/auth').Member;
			/** Correlation id for this request (sgim-x60.2). */
			requestId: string;
			/** Request-scoped structured logger (bound with requestId/userId). */
			log: import('$lib/server/logger').Logger;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
