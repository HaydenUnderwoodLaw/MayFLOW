import { setTimeout as wait } from 'node:timers/promises';
import { CommandChannelType, InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
} from 'discord.js';
import { CommandCategory } from '../../utils/constants';

export default class UltraBanCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'ultra-ban',
			category: CommandCategory.Administrator,
			description: 'Ban a user from all Discord servers the bot is in.',
			type: ApplicationCommandType.ChatInput,
			userPermissions: ['Administrator'],
			botPermissions: ['BanMembers'],
			channel: CommandChannelType.Guild,
			options: [
				{
					name: 'user',
					type: ApplicationCommandOptionType.User,
					description: 'The user to ban.',
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

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
			new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success),
			new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger),
		]);

		const msg = await interaction.reply({
			content: `**${user.username}** will be banned from ${client.guilds.cache.size} servers, are you sure you want to do this? **This action is irreversible.**`,
			fetchReply: true,
			components: [row],
		});

		const response = await msg
			.awaitMessageComponent({
				componentType: ComponentType.Button,
				time: 60000,
				filter: (i) => i.user.id === interaction.user.id,
			})
			.catch(() => null);

		if (!response) return interaction.editReply({ components: [], content: 'Cancelled.' });
		if (response.customId === 'no') return response.update({ components: [], content: 'Cancelled.' });

		await interaction.editReply({
			components: [],
			content: `Banning ${user.username} from all servers... This may take a few seconds.`,
		});

		await Promise.all(
			client.guilds.cache.map(async (guild) => {
				await guild.bans.create(user.id, { reason: `${reason} | ${interaction.user.username}` }).catch(() => null);

				await wait(2000);
			}),
		);

		await interaction.editReply({
			content: `Successfully banned ${user.username} from ${client.guilds.cache.size} servers.`,
		});
	}
}
