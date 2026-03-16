import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function parseCookie(cookieString: string): Record<string, string> {
	if (!cookieString) return {};
	return Object.fromEntries(
		cookieString.split(';').map((cookie) => {
			const [key, ...value] = cookie.split('=');
			return [key.trim(), decodeURIComponent(value.join('='))];
		}),
	);
}
