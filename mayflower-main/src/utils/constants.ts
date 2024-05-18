/* eslint-disable no-shadow */
// eslint-disable-next-line import/prefer-default-export
export enum CommandCategory {
	Miscellaneous = 'miscellaneous',
	Administrator = 'administrator',
	Moderator = 'moderator',
	Developer = 'developer',
}

export const TweetsChannel = '1158221860811587685';
export const SSUChannel = '1169037352644128779';
export const VerifiedEmoji = '<:verified:1169043550596518010>';

export interface RoverRobloxResponse {
	robloxId: number;
	cachedUsername: string;
	discordId: string;
	guildId: string;
}

export interface RoverDiscordResponse {
	discordUsers: {
		avatar: string | null;
		communication_disabled_until: unknown;
		flags: number;
		is_pending: boolean;
		joined_at: string;
		nick: string | null;
		pending: boolean;
		premium_since: string | null;
		roles: string[];
		user: {
			id: string;
			username: string;
			avatar: string | null;
			avatar_decoration: unknown;
			discriminator: string;
			public_flags: number;
		};
		mute: boolean;
		deaf: boolean;
	}[];
	robloxId: number;
	guildId: string;
}

export interface RoverErrorResponse {
	errorCode: string;
	message: string;
	detail?: string;
	content?: string;
}
