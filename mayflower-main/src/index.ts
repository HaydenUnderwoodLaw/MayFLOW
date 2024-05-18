import path from 'node:path';
import { Handler } from '@a-djs-handler/framework';
import { ActivityType, IntentsBitField, Options, Partials } from 'discord.js';

import 'dotenv/config';
import './utils/Database';
import './utils/string.extensions';

const handler = new Handler({
	partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
	intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers],
	token: process.env.TOKEN!,
	paths: {
		commands: path.join(__dirname, '/commands'),
		events: path.join(__dirname, '/events'),
	},
	developers: ['413834975347998720'],
	prefix: '.',
	allowedMentions: { parse: [] },
	presence: {
		activities: [
			{
				name: 'with guns',
				type: ActivityType.Playing,
			},
		],
	},
	makeCache: Options.cacheWithLimits({
		MessageManager: 0,
		PresenceManager: 0,
	}),
});

await handler.start();
