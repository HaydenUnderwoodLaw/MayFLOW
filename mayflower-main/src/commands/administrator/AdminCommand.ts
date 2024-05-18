/* eslint-disable no-void */
import { CommandChannelType, Constants, InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
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
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';
import { CommandCategory, VerifiedEmoji } from '../../utils/constants';
import Profiles, { IProfile } from '../../utils/models/Profile';

const generateMessageData = (profile: IProfile) => ({
	files: profile.banner ? [profile.banner] : [],
	embeds: [
		new EmbedBuilder()
			.setTitle(`@${profile.username} ${profile.verified ? VerifiedEmoji : ''}`)
			.setColor(0x1da1f2)
			.setThumbnail(profile.avatar)
			.setDescription(profile.bio ?? 'No bio.'),
	],
	components: [
		new ActionRowBuilder<ButtonBuilder>().addComponents([
			new ButtonBuilder().setCustomId('edit-username').setLabel('Change Username').setStyle(ButtonStyle.Primary),
			new ButtonBuilder().setCustomId('edit-avatar').setLabel('Change Avatar').setStyle(ButtonStyle.Primary),
			new ButtonBuilder().setCustomId('edit-banner').setLabel('Change Banner').setStyle(ButtonStyle.Primary),
			new ButtonBuilder().setCustomId('edit-bio').setLabel('Change Bio').setStyle(ButtonStyle.Primary),
		]),
		new ActionRowBuilder<ButtonBuilder>().addComponents([
			new ButtonBuilder()
				.setCustomId('toggle-verify')
				.setEmoji(profile.verified ? '1169043548004421652' : '1169043546054086727')
				.setLabel('Toggle Verification')
				.setStyle(ButtonStyle.Secondary),
		]),
	],
});

export default class AdminCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'admin',
			category: CommandCategory.Administrator,
			description: 'Admin commands.',
			type: ApplicationCommandType.ChatInput,
			userPermissions: ['Administrator'],
			channel: CommandChannelType.Guild,
			options: [
				{
					name: 'profile',
					type: ApplicationCommandOptionType.SubcommandGroup,
					description: 'Profile-related admin commands',
					options: [
						{
							name: 'manage',
							type: ApplicationCommandOptionType.Subcommand,
							description: "Manage someone's profile.",
							options: [
								{
									name: 'user',
									type: ApplicationCommandOptionType.User,
									required: true,
									description: 'The user to manage.',
								},
							],
						},
					],
				},
			],
		});
	}

	async run({ interaction }: InteractionContext) {
		const subcommandGroup = interaction.options.getSubcommandGroup(true);
		const subcommand = interaction.options.getSubcommand(true);

		if (subcommandGroup === 'profile') {
			if (subcommand === 'manage') {
				const user = interaction.options.getUser('user', true);

				const profile = await Profiles.findOne({ userId: user.id });
				if (!profile)
					return interaction.reply({
						ephemeral: true,
						content: 'The user does not have a profile, they should create one using the `/profile create` command.',
					});

				const msg = await interaction.reply({
					ephemeral: true,
					fetchReply: true,
					...generateMessageData(profile),
				});

				const collector = msg.createMessageComponentCollector({
					componentType: ComponentType.Button,
					filter: (i) => i.user.id === interaction.user.id,
					time: 300000,
				});

				collector.on('collect', async (buttonInteraction) => {
					if (buttonInteraction.customId === 'edit-username') {
						const modalId = customId('edit-username', buttonInteraction.user.id);
						const modal = new ModalBuilder()
							.setTitle('Edit the username')
							.setCustomId(modalId)
							.addComponents([
								new ActionRowBuilder<TextInputBuilder>().addComponents([
									new TextInputBuilder()
										.setCustomId('username')
										.setLabel('Username')
										.setMaxLength(32)
										.setMinLength(2)
										.setPlaceholder("The user's new username, must be within 2-32 chars.")
										.setRequired(true)
										.setStyle(TextInputStyle.Short),
								]),
							]);

						await buttonInteraction.showModal(modal);
						const modalResponse = await buttonInteraction
							.awaitModalSubmit({
								time: 120000,
								filter: (i) => i.user.id === buttonInteraction.user.id,
							})
							.catch(() => null);

						if (!modalResponse) return;

						const username = modalResponse.fields.getTextInputValue('username');
						if (!/^(?=[a-zA-Z0-9._]{2,32}$)(?!.*[_.]{2})[^_.].*[^_.]$/.test(username))
							return void modalResponse.reply({
								ephemeral: true,
								content:
									"Your username does not meet the criteria, it must: 1. Only have alphanumerical characters, underscores and dots. 2. Underscore and dot can't be at the end or the start. 3. Underscore or dot cannot be repeated twice or more in a row.",
							});

						await modalResponse.deferReply({ ephemeral: true });

						profile.username = username;
						await profile.save();

						await modalResponse.editReply({
							components: [],
							embeds: [],
							content: 'Successfully changed the username.',
						});
						await buttonInteraction.editReply(generateMessageData(profile));
					} else if (buttonInteraction.customId === 'edit-avatar') {
						const modalId = customId('edit-avatar', buttonInteraction.user.id);
						const modal = new ModalBuilder()
							.setTitle('Edit the avatar')
							.setCustomId(modalId)
							.addComponents([
								new ActionRowBuilder<TextInputBuilder>().addComponents([
									new TextInputBuilder()
										.setCustomId('avatar')
										.setLabel('Avatar')
										.setMaxLength(4000)
										.setPlaceholder("The user's new avatar, must be a valid URL.")
										.setRequired(true)
										.setStyle(TextInputStyle.Paragraph),
								]),
							]);

						await buttonInteraction.showModal(modal);
						const modalResponse = await buttonInteraction
							.awaitModalSubmit({
								time: 120000,
								filter: (i) => i.user.id === buttonInteraction.user.id,
							})
							.catch(() => null);

						if (!modalResponse) return;
						await modalResponse.deferUpdate();

						const avatar = modalResponse.fields.getTextInputValue('avatar');
						if (!Constants.urlRegex.test(avatar))
							return void modalResponse.reply({
								ephemeral: true,
								content: 'The avatar must be a valid URL, or you can leave it empty to default to your Discord avatar.',
							});

						profile.avatar = avatar;
						await profile.save();

						await modalResponse.editReply(generateMessageData(profile));
						await modalResponse.followUp({ content: 'Successfully changed the avatar.', ephemeral: true });
					} else if (buttonInteraction.customId === 'edit-bio') {
						const modalId = customId('edit-bio', buttonInteraction.user.id);
						const modal = new ModalBuilder()
							.setTitle('Edit the bio')
							.setCustomId(modalId)
							.addComponents([
								new ActionRowBuilder<TextInputBuilder>().addComponents([
									new TextInputBuilder()
										.setCustomId('bio')
										.setLabel('Bio (leave empty to remove)')
										.setMaxLength(4000)
										.setPlaceholder("The user's new bio...")
										.setRequired(false)
										.setStyle(TextInputStyle.Paragraph),
								]),
							]);

						await buttonInteraction.showModal(modal);
						const modalResponse = await buttonInteraction
							.awaitModalSubmit({
								time: 120000,
								filter: (i) => i.user.id === buttonInteraction.user.id,
							})
							.catch(() => null);

						if (!modalResponse) return;
						await modalResponse.deferUpdate();

						const bio = modalResponse.fields.getTextInputValue('bio');

						profile.bio = bio;
						await profile.save();

						await modalResponse.editReply(generateMessageData(profile));
						await modalResponse.followUp({ content: 'Successfully changed the bio.', ephemeral: true });
					} else if (buttonInteraction.customId === 'toggle-verify') {
						profile.verified = !profile.verified;
						await profile.save();

						await buttonInteraction.update(generateMessageData(profile));
						await buttonInteraction.followUp({
							ephemeral: true,
							content: "Successfully toggled the user's verification status.",
						});
					} else if (buttonInteraction.customId === 'edit-banner') {
						const modalId = customId('edit-banner', buttonInteraction.user.id);
						const modal = new ModalBuilder()
							.setTitle('Edit the banner')
							.setCustomId(modalId)
							.addComponents([
								new ActionRowBuilder<TextInputBuilder>().addComponents([
									new TextInputBuilder()
										.setCustomId('banner')
										.setLabel('Banner')
										.setMaxLength(4000)
										.setPlaceholder("The user's new banner, must be a valid URL.")
										.setRequired(true)
										.setStyle(TextInputStyle.Paragraph),
								]),
							]);

						await buttonInteraction.showModal(modal);
						const modalResponse = await buttonInteraction
							.awaitModalSubmit({
								time: 120000,
								filter: (i) => i.user.id === buttonInteraction.user.id,
							})
							.catch(() => null);

						if (!modalResponse) return;
						await modalResponse.deferUpdate();

						const banner = modalResponse.fields.getTextInputValue('banner');
						if (!Constants.urlRegex.test(banner))
							return void modalResponse.reply({ ephemeral: true, content: 'The banner must be a valid URL.' });

						profile.banner = banner;
						await profile.save();

						await modalResponse.editReply(generateMessageData(profile));
						await modalResponse.followUp({ content: 'Successfully changed the banner.', ephemeral: true });
					}
				});
			}
		}
	}
}
