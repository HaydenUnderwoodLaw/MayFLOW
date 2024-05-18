import { setTimeout as wait } from 'node:timers/promises';
import { CommandChannelType, InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js';
import { CommandCategory } from '../../utils/constants';

export default class UltraBanCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'unultra-ban',
			category: CommandCategory.Administrator,
			description: 'Unban a user from all Discord servers the bot is in.',
			type: ApplicationCommandType.ChatInput,
			userPermissions: ['Administrator'],
			botPermissions: ['BanMembers'],
			channel: CommandChannelType.Guild,
			options: [
				{
					name: 'user',
					type: ApplicationCommandOptionType.User,
					description: 'The user to unban.',
					required: true,
				},
				{
					name: 'reason',
					type: ApplicationCommandOptionType.String,
					description: 'The reason for the ban.',
					required: true,
				},
			],
		});
	}

	async run({ interaction, client }: InteractionContext) {
		if (!interaction.inCachedGuild()) return;

		const user = interaction.options.getUser('user', true);
		const reason = interaction.options.getString('reason', true);

		await interaction.reply({ content: `Unbanning ${user.username} from ${client.guilds.cache.size} servers...` });

		await Promise.all(
			client.guilds.cache.map(async (guild) => {
				await guild.bans.remove(user.id, `${reason} | ${interaction.user.username}`).catch(() => null);

				await wait(2000);
			}),
		);

		await interaction.editReply({
			content: `Successfully unbanned ${user.username} from ${client.guilds.cache.size} servers...`,
		});
	}
}
