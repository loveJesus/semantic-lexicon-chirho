// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter()
	}
};

export default config;
