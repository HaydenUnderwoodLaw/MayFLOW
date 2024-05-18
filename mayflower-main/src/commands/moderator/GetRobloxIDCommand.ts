import { InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js';
import { getIdFromUsername } from 'noblox.js';
import { CommandCategory } from '../../utils/constants';

export default class GetRobloxIDCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'get-roblox-id',
			category: CommandCategory.Moderator,
			description: "Get a user's Roblox ID from their username.",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: 'roblox_username',
					type: ApplicationCommandOptionType.String,
					required: true,
					description: 'The Roblox username of the user.',
				},
			],
		});
	}

	async run({ interaction }: InteractionContext) {
		const username = interaction.options.getString('roblox_username', true);

		const id = await getIdFromUsername(username).catch(() => null);
		if (!id)
			return interaction.reply({ ephemeral: true, content: "I couldn't find a Roblox user with that username." });

		await interaction.reply({ ephemeral: true, content: `The user's Roblox ID: \`${id}\`` });
	}
}
