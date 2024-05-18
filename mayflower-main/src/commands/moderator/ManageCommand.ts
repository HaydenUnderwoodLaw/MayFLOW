import { CommandChannelType, InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
import { customId } from '@a-djs-handler/utils';
import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	ModalBuilder,
	StringSelectMenuBuilder,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';
import { getIdFromUsername, getPlayerInfo, getPlayerThumbnail } from 'noblox.js';
import DatastoreService from '../../utils/DatastoreService';
import MessagingService from '../../utils/MessagingService';
import { CommandCategory } from '../../utils/constants';

interface ManageData {
	username: string;
	banned: false | { reason: string };
	userId: number;
	thumbnail?: string;
	warnings: string[];
}

export default class ManageCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'manage',
			category: CommandCategory.Moderator,
			description: 'Manage a Roblox user in-game.',
			type: ApplicationCommandType.ChatInput,
			channel: CommandChannelType.Guild,
			userPermissions: ['Administrator'],
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
		if (!interaction.inCachedGuild()) return;

		const username = interaction.options.getString('roblox_username', true);
		const userId = await getIdFromUsername(username).catch(() => null);

		if (!userId)
			return interaction.reply({ ephemeral: true, content: "I couldn't find a Roblox user with that username." });

		const playerInfo = await getPlayerInfo(userId).catch(() => null);
		if (!playerInfo) return interaction.reply({ ephemeral: true, content: "User doesn't exist." });

		await interaction.deferReply();

		const banDatastore = new DatastoreService('Bans');
		const warningDatastore = new DatastoreService('Warnings');
		const messagingService = new MessagingService();

		const banData = await banDatastore.getEntry<{ reason: string }>(`user_${userId}`);
		const warnings = await warningDatastore.getEntry<string[]>(`user_${userId}`);

		const thumbnail = await getPlayerThumbnail(userId, '720x720', 'png', true, 'headshot').then((d) => d[0]);

		const manageData: ManageData = {
			banned: banData || false,
			userId,
			username: playerInfo.username,
			thumbnail: thumbnail.imageUrl,
			warnings: warnings ?? [],
		};

		const msg = await interaction.editReply({ ...this.generateMessageData(manageData) });

		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (i) => i.user.id === interaction.user.id,
			idle: 300000 * 2,
			time: 300000 * 2,
		});

		collector.on('collect', async (collected) => {
			if (collected.isButton()) {
				if (collected.customId === 'cancel') {
					await collected.update({ embeds: [], components: [], content: 'Cancelled prompt.' });
					collector.stop();
				} else if (collected.customId === 'kick') {
					const modalId = customId('kick', interaction.user.id);
					const modal = new ModalBuilder()
						.setTitle('Kick User')
						.setCustomId(modalId)
						.addComponents([
							new ActionRowBuilder<TextInputBuilder>().addComponents([
								new TextInputBuilder()
									.setCustomId('reason')
									.setLabel('reason')
									.setPlaceholder('Reason for the kick')
									.setMaxLength(512)
									.setRequired(true)
									.setStyle(TextInputStyle.Paragraph),
							]),
						]);

					await collected.showModal(modal);
					const response = await collected
						.awaitModalSubmit({
							time: 120000,
							filter: (i) => i.customId === modalId && i.user.id === interaction.user.id,
						})
						.catch(() => null);

					if (!response) return;

					await messagingService.publish('Discord', {
						action: 'kick',
						reason: response.fields.getTextInputValue('reason'),
						userId,
					});

					await response.deferUpdate();
					await collected.followUp({
						ephemeral: true,
						content: `Successfully kicked ${playerInfo.username} from the server.`,
					});
				} else if (collected.customId === 'ban') {
					const modalId = customId('ban', interaction.user.id);
					const modal = new ModalBuilder()
						.setTitle('Ban User')
						.setCustomId(modalId)
						.addComponents([
							new ActionRowBuilder<TextInputBuilder>().addComponents([
								new TextInputBuilder()
									.setCustomId('reason')
									.setLabel('reason')
									.setPlaceholder('Reason for the ban')
									.setMaxLength(512)
									.setRequired(true)
									.setStyle(TextInputStyle.Paragraph),
							]),
						]);

					await collected.showModal(modal);
					const response = await collected
						.awaitModalSubmit({
							time: 120000,
							filter: (i) => i.customId === modalId && i.user.id === interaction.user.id,
						})
						.catch(() => null);

					if (!response) return;

					await banDatastore.createEntry(`user_${userId}`, { reason: response.fields.getTextInputValue('reason') });
					await messagingService.publish('Discord', { action: 'kick', reason: 'Banned.', userId });

					manageData.banned = { reason: response.fields.getTextInputValue('reason') };

					await response.deferUpdate();

					await collected.editReply(this.generateMessageData(manageData));
					await collected.followUp({
						ephemeral: true,
						content: `Successfully banned ${playerInfo.username} from the game.`,
					});
				} else if (collected.customId === 'unban') {
					await banDatastore.deleteEntry(`user_${userId}`);

					manageData.banned = false;

					await collected.reply({
						ephemeral: true,
						content: `Successfully unbanned ${playerInfo.username} from the game.`,
					});
					await collected.message.edit(this.generateMessageData(manageData));
				} else if (collected.customId === 'add-warning') {
					const modalId = customId('warn', interaction.user.id);
					const modal = new ModalBuilder()
						.setTitle('Warn User')
						.setCustomId(modalId)
						.addComponents([
							new ActionRowBuilder<TextInputBuilder>().addComponents([
								new TextInputBuilder()
									.setCustomId('reason')
									.setLabel('reason')
									.setPlaceholder('Reason for the warn')
									.setMaxLength(512)
									.setRequired(true)
									.setStyle(TextInputStyle.Paragraph),
							]),
						]);

					await collected.showModal(modal);
					const response = await collected
						.awaitModalSubmit({
							time: 120000,
							filter: (i) => i.customId === modalId && i.user.id === interaction.user.id,
						})
						.catch(() => null);

					if (!response) return;

					manageData.warnings.push(response.fields.getTextInputValue('reason'));

					await warningDatastore.createEntry(`user_${userId}`, manageData.warnings);
					await messagingService.publish('DiscordWarning', { userId });

					await response.deferUpdate();
					await collected.editReply(this.generateMessageData(manageData));
					await collected.followUp({
						ephemeral: true,
						content: `Successfully kicked ${playerInfo.username} from the server.`,
					});
				}
			} else if (collected.isStringSelectMenu()) {
				if (collected.customId === 'remove-warning') {
					manageData.warnings.splice(Number(collected.values[0]), 1);

					await warningDatastore.createEntry(`user_${userId}`, manageData.warnings);
					await messagingService.publish('DiscordWarning', { userId });

					await collected.reply({ ephemeral: true, content: 'Successfully removed the warning.' });
					await collected.message.edit(this.generateMessageData(manageData));
				}
			}
		});
	}

	private generateMessageData(data: ManageData) {
		return {
			embeds: [
				new EmbedBuilder()
					.setTitle(`Manage ${data.username}`)
					.setTimestamp()
					.setThumbnail(data.thumbnail ?? null)
					.setColor('Blue')
					.addFields([
						{ name: 'Banned', value: data.banned ? `Yes - ${data.banned.reason}` : 'No' },
						{
							name: 'Warnings',
							value: `${data.warnings.length} warning(s)\n\n\`\`\`${
								data.warnings.length ? data.warnings.map((c, i) => `${i + 1}. ${c}`).join('\n') : 'None.'
							}\`\`\``,
						},
					]),
			],
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents([
					new ButtonBuilder().setCustomId('kick').setLabel('Kick').setStyle(ButtonStyle.Primary),
					new ButtonBuilder()
						.setCustomId(data.banned ? 'unban' : 'ban')
						.setLabel(data.banned ? 'Unban' : 'Ban')
						.setStyle(data.banned ? ButtonStyle.Success : ButtonStyle.Danger),
					new ButtonBuilder().setCustomId('add-warning').setLabel('Add Warning').setStyle(ButtonStyle.Secondary),
				]),
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents([
					new StringSelectMenuBuilder()
						.setCustomId('remove-warning')
						.setMaxValues(1)
						.setMinValues(1)
						.setDisabled(!data.warnings.length)
						.setPlaceholder('Remove warning(s)...')
						.addOptions(
							data.warnings.length
								? data.warnings.map((c, i) => ({
										label: `${i + 1}.`,
										description: `Reason: ${c}`,
										value: i.toString(),
									}))
								: [{ label: 'placeholder', value: 'placeholder' }],
						),
				]),
				new ActionRowBuilder<ButtonBuilder>().addComponents([
					new ButtonBuilder().setCustomId('cancel').setStyle(ButtonStyle.Danger).setLabel('End Prompt'),
				]),
			],
		};
	}
}
