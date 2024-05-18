import { CommandChannelType, Constants, InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
import { ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder } from 'discord.js';
import { CommandCategory, SSUChannel } from '../../utils/constants';

export default class SSUCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'ssu',
			category: CommandCategory.Moderator,
			description: 'Posts a server startup to the #ssu channel.',
			type: ApplicationCommandType.ChatInput,
			userPermissions: ['ManageMessages'],
			channel: CommandChannelType.Guild,
			options: [
				{
					name: 'game_link',
					type: ApplicationCommandOptionType.String,
					required: true,
					description: 'The game link.',
				},
				{
					name: 'notes',
					type: ApplicationCommandOptionType.String,
					required: false,
					description: 'Additional notes to send alongside the startup message..',
				},
			],
		});
	}

	async run({ interaction, client }: InteractionContext) {
		const gameLink = interaction.options.getString('game_link', true);
		const notes = interaction.options.getString('notes', false) ?? 'None.';

		if (!/https?:\/\/(?:www\.)?roblox\.com\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi.test(gameLink))
			return interaction.reply({ ephemeral: true, content: 'Game link must be a Roblox URL.' });

		const embed = new EmbedBuilder()
			.setColor(Constants.COLOR_TYPES.INFO)
			.setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
			.setTitle('Server Startup')
			.setDescription(`${interaction.user} [${interaction.user.username}] is conducting a server startup!`)
			.addFields([
				{ name: ':link: Link', value: `[Game Link](${gameLink})` },
				{ name: ':book: Additional Notes', value: notes },
			])
			.setTimestamp();

		const channel = client.channels.cache.get(SSUChannel);
		if (!channel || !channel.isTextBased())
			return interaction.reply({
				ephemeral: true,
				content: "I couldn't find the SSU channel, please report this to the bot developer.",
			});

		await channel.send({ embeds: [embed], content: '@here', allowedMentions: { parse: ['everyone'] } });
		await interaction.reply({ ephemeral: true, content: 'Successfully sent the startup message.' });
	}
}
