import { createAuthClient } from 'better-auth/react';

const authClient = createAuthClient({
	baseURL: `${import.meta.env.VITE_APP_API_URL}/auth`,
	fetchOptions: {
		credentials: 'include',
	},
});

type ErrorTypes = Record<
	keyof typeof authClient.$ERROR_CODES,
	string // paraglide key for error message
>;

export const errorCodes = {
	USER_ALREADY_EXISTS: 'userAlreadyExists',
	ACCOUNT_NOT_FOUND: 'accountNotFound',
	ASYNC_VALIDATION_NOT_SUPPORTED: 'asyncValidationNotSupported',
	CALLBACK_URL_REQUIRED: 'callbackUrlRequired',
	EMAIL_ALREADY_VERIFIED: 'emailAlreadyVerified',
	CROSS_SITE_NAVIGATION_LOGIN_BLOCKED: 'crossSiteNavigationLoginBlocked',
	CREDENTIAL_ACCOUNT_NOT_FOUND: 'credentialAccountNotFound',
	EMAIL_CAN_NOT_BE_UPDATED: 'emailCanNotBeUpdated',
	EMAIL_MISMATCH: 'emailMismatch',
	INVALID_EMAIL: 'invalidEmail',
	EMAIL_NOT_VERIFIED: 'emailNotVerified',
	FAILED_TO_CREATE_SESSION: 'failedToCreateSession',
	FAILED_TO_CREATE_USER: 'failedToCreateUser',
	FAILED_TO_CREATE_VERIFICATION: 'failedToCreateVerification',
	FAILED_TO_GET_SESSION: 'failedToGetSession',
	FAILED_TO_GET_USER_INFO: 'failedToGetUserInfo',
	FAILED_TO_UPDATE_USER: 'failedToUpdateUser',
	FAILED_TO_UNLINK_LAST_ACCOUNT: 'failedToUnlinkLastAccount',
	FIELD_NOT_ALLOWED: 'fieldNotAllowed',
	ID_TOKEN_NOT_SUPPORTED: 'idTokenNotSupported',
	INVALID_CALLBACK_URL: 'invalidCallbackUrl',
	INVALID_EMAIL_OR_PASSWORD: 'invalidEmailOrPassword',
	INVALID_PASSWORD: 'invalidPassword',
	INVALID_ERROR_CALLBACK_URL: 'invalidErrorCallbackUrl',
	INVALID_NEW_USER_CALLBACK_URL: 'invalidNewUserCallbackUrl',
	INVALID_ORIGIN: 'invalidOrigin',
	INVALID_REDIRECT_URL: 'invalidRedirectUrl',
	INVALID_TOKEN: 'invalidToken',
	LINKED_ACCOUNT_ALREADY_EXISTS: 'linkedAccountAlreadyExists',
	MISSING_FIELD: 'missingField',
	MISSING_OR_NULL_ORIGIN: 'missingOrNullOrigin',
	PASSWORD_TOO_LONG: 'passwordTooLong',
	PASSWORD_TOO_SHORT: 'passwordTooShort',
	PROVIDER_NOT_FOUND: 'providerNotFound',
	SESSION_EXPIRED: 'sessionExpired',
	SESSION_NOT_FRESH: 'sessionNotFresh',
	SOCIAL_ACCOUNT_ALREADY_LINKED: 'socialAccountAlreadyLinked',
	USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'userAlreadyExistsUseAnotherEmail',
	USER_NOT_FOUND: 'userNotFound',
	USER_ALREADY_HAS_PASSWORD: 'userAlreadyHasPassword',
	USER_EMAIL_NOT_FOUND: 'userEmailNotFound',
	VALIDATION_ERROR: 'validationError',
	VERIFICATION_EMAIL_NOT_ENABLED: 'verificationEmailNotEnabled',
	INVALID_USER: 'invalidUser',
	TOKEN_EXPIRED: 'tokenExpired',
	METHOD_NOT_ALLOWED_DEFER_SESSION_REQUIRED:
		'methodNotAllowedDeferSessionRequired',
	BODY_MUST_BE_AN_OBJECT: 'bodyMustBeAnObject',
	PASSWORD_ALREADY_SET: 'passwordAlreadySet',
} as const satisfies ErrorTypes;

export function isValidBetterAuthErrorCode(
	code: unknown,
): code is keyof typeof errorCodes {
	if (typeof code !== 'string') {
		return false;
	}
	return code in errorCodes;
}

export const useClientSession = authClient.useSession; // The session is handled by the loader in home.layout.tsx, so we can use this hook to get the session on the client side without making an additional request
export const { signIn, signUp, signOut } = authClient;
