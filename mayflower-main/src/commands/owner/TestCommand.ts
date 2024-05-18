import { InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
import { ActionRowBuilder, ApplicationCommandType, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { CommandCategory } from '../../utils/constants';

export default class TestCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'test',
			category: CommandCategory.Developer,
			description: 'test command.',
			type: ApplicationCommandType.ChatInput,
			ownerOnly: true,
		});
	}

	async run({ interaction }: InteractionContext) {
		const embed = new EmbedBuilder()
			.setTitle(`@${interaction.user.username} <:verified:1164687330028822618>`)
			.setDescription(
				'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut ipsum augue, mattis quis auctor non, tempor vitae quam. Sed tincidunt, enim et laoreet viverra, sem leo dictum libero',
			)
			.setThumbnail(interaction.user.displayAvatarURL())
			.setColor(0x1da1f2);

		const rows = [
			new ActionRowBuilder<ButtonBuilder>().addComponents([
				new ButtonBuilder().setCustomId('username').setLabel('Change Username').setStyle(ButtonStyle.Primary),
				new ButtonBuilder().setCustomId('avatar').setLabel('Change Avatar').setStyle(ButtonStyle.Primary),
				new ButtonBuilder()
					.setCustomId('verify')
					.setLabel('Verify User')
					.setDisabled(true)
					.setStyle(ButtonStyle.Secondary),
			]),
		];

		await interaction.reply({ embeds: [embed], components: rows });
	}
}
