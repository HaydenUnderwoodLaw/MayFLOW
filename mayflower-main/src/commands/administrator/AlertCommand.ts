import { setTimeout as wait } from 'node:timers/promises';
/* eslint-disable no-await-in-loop */
import { CommandChannelType, Constants, InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
import { customId } from '@a-djs-handler/utils';
import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	EmbedBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';
import ms from 'ms';
import { CommandCategory } from '../../utils/constants';

export default class AlertCommand extends InteractionCommand {
	public OperationRunning = false;

	constructor() {
		super({
			name: 'salert',
			category: CommandCategory.Administrator,
			description: ' Send a direct message to all Staff Members with a specified role.',
			type: ApplicationCommandType.ChatInput,
			userPermissions: ['Administrator'],
			channel: CommandChannelType.Guild,
			options: [
				{
					name: 'role',
					type: ApplicationCommandOptionType.Role,
					required: true,
					description: 'The role to alert.',
				},
			],
		});
	}

	async run({ interaction }: InteractionContext) {
		if (!interaction.inCachedGuild()) return;

		if (this.OperationRunning)
			return interaction.reply({ ephemeral: true, content: 'There is already an alert being currently sent. ' });

		const role = interaction.options.getRole('role', true);

		const modalId = customId('alert', interaction.user.id);
		const modal = new ModalBuilder()
			.setTitle('Alert Command')
			.setCustomId(modalId)
			.addComponents([
				new ActionRowBuilder<TextInputBuilder>().addComponents([
					new TextInputBuilder()
						.setCustomId('title')
						.setLabel('alert title')
						.setMaxLength(256)
						.setRequired(true)
						.setStyle(TextInputStyle.Paragraph),
				]),
				new ActionRowBuilder<TextInputBuilder>().addComponents([
					new TextInputBuilder()
						.setCustomId('body')
						.setLabel('alert content')
						.setMaxLength(4000)
						.setRequired(true)
						.setStyle(TextInputStyle.Paragraph),
				]),
			]);

		await interaction.showModal(modal);

		const response = await interaction
			.awaitModalSubmit({
				time: 300000,
				filter: (i) => i.user.id === interaction.user.id && i.customId === modalId,
			})
			.catch(() => null);

		if (!response) return;

		await response.deferReply();

		const [title, body] = [response.fields.getTextInputValue('title'), response.fields.getTextInputValue('body')];
		const members = (await interaction.guild.members.fetch()).filter((c) => c.roles.cache.has(role.id));

		if (!members.size) return response.editReply({ content: 'There are no members with that role.' });

		await response.editReply(
			`Started DMing operation, this may take approximately ${ms(members.size * 2 * 1000, { long: true })}...`,
		);

		this.OperationRunning = true;

		const embed = new EmbedBuilder()
			.setTitle(title)
			.setTimestamp()
			.setColor(Constants.COLOR_TYPES.INFO)
			.setDescription(body);

		// eslint-disable-next-line no-restricted-syntax
		for (const member of members.values()) {
			await member.user.send({ embeds: [embed] }).catch(() => null);

			await wait(2000);
		}

		this.OperationRunning = false;

		await response.editReply(`Successfully sent the alert to ${members.size} members.`).catch(() => null);
	}
}
