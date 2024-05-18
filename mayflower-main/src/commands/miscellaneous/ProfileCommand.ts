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

const generateEmbed = (profile: IProfile) =>
	new EmbedBuilder()
		.setTitle(`@${profile.username} ${profile.verified ? VerifiedEmoji : ''}`)
		.setColor(0x1da1f2)
		.setThumbnail(profile.avatar)
		.setDescription(profile.bio ?? 'No bio.');

export default class ProfileCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'profile',
			category: CommandCategory.Miscellaneous,
			description: 'Manage your profile or create a new one.',
			type: ApplicationCommandType.ChatInput,
			channel: CommandChannelType.Guild,
			options: [
				{
					name: 'create',
					type: ApplicationCommandOptionType.Subcommand,
					description: 'Create a new profile if you don\t have one.',
				},
				{ name: 'manage', type: ApplicationCommandOptionType.Subcommand, description: 'Edit your profile.' },
				{
					name: 'view',
					type: ApplicationCommandOptionType.Subcommand,
					description: "View your profile or someone else's profile.",
					options: [
						{
							name: 'user',
							type: ApplicationCommandOptionType.User,
							required: false,
							description: 'The user to view.',
						},
					],
				},
			],
		});
	}

	async run({ interaction }: InteractionContext) {
		if (!interaction.inCachedGuild()) return;
		const subcommand = interaction.options.getSubcommand(true);

		if (subcommand === 'create') {
			if (await Profiles.exists({ userId: interaction.user.id }))
				return interaction.reply({
					ephemeral: true,
					content: 'You already have a profile, use `/profile manage` to manage your profile.',
				});

			const modalId = customId('create-profile', interaction.user.id);
			const modal = new ModalBuilder()
				.setTitle('Create a Profile')
				.setCustomId(modalId)
				.addComponents([
					new ActionRowBuilder<TextInputBuilder>().addComponents([
						new TextInputBuilder()
							.setCustomId('username')
							.setLabel('Username')
							.setPlaceholder('Your profile handle/username, must be unique and within 2-32 chars.')
							.setMaxLength(32)
							.setMinLength(2)
							.setRequired(true)
							.setStyle(TextInputStyle.Short),
					]),
					new ActionRowBuilder<TextInputBuilder>().addComponents([
						new TextInputBuilder()
							.setCustomId('avatar')
							.setLabel('Avatar (leave empty for default)')
							.setPlaceholder('Your profile avatar, must be a URL. Optional.')
							.setMaxLength(4000)
							.setRequired(false)
							.setStyle(TextInputStyle.Paragraph),
					]),
					new ActionRowBuilder<TextInputBuilder>().addComponents([
						new TextInputBuilder()
							.setCustomId('banner')
							.setLabel('Banner (leave empty for nothing)')
							.setPlaceholder('Your profile banner, must be a URL. Optional.')
							.setMaxLength(4000)
							.setRequired(false)
							.setStyle(TextInputStyle.Paragraph),
					]),
					new ActionRowBuilder<TextInputBuilder>().addComponents([
						new TextInputBuilder()
							.setCustomId('bio')
							.setLabel('Bio (description)')
							.setPlaceholder('Your profile bio.')
							.setMaxLength(2000)
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

			const [username, avatar, banner, bio] = [
				response.fields.getTextInputValue('username'),
				response.fields.getTextInputValue('avatar'),
				response.fields.getTextInputValue('banner'),
				response.fields.getTextInputValue('bio'),
			];

			if (!/^(?=[a-zA-Z0-9._]{2,32}$)(?!.*[_.]{2})[^_.].*[^_.]$/.test(username))
				return response.reply({
					ephemeral: true,
					content:
						"Your username does not meet the criteria, it must: 1. Only have alphanumerical characters, underscores and dots. 2. Underscore and dot can't be at the end or the start. 3. Underscore or dot cannot be repeated twice or more in a row.",
				});
			if (avatar && !Constants.urlRegex.test(avatar))
				return response.reply({
					ephemeral: true,
					content: 'The avatar must be a valid URL, or you can leave it empty to default to your Discord avatar.',
				});
			if (banner && !Constants.urlRegex.test(banner))
				return response.reply({
					ephemeral: true,
					content: 'The banner must be a valid URL, or you can leave it empty to have none.',
				});

			await response.deferReply({ ephemeral: true });

			if (await Profiles.exists({ username }))
				return interaction.reply({ ephemeral: true, content: 'That username already exists.' });

			const embed = new EmbedBuilder()
				.setTitle(`@${username}`)
				.setThumbnail(avatar || interaction.user.displayAvatarURL())
				.setColor(0x1da1f2)
				.setDescription(bio);

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
				new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success),
				new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger),
			]);

			const msg = await response.editReply({
				embeds: [embed],
				components: [row],
				content: 'Here is a preview of your new profile, would you like to create it?',
			});
			const confirmation = await msg
				.awaitMessageComponent({
					componentType: ComponentType.Button,
					time: 120000,
					filter: (i) => i.user.id === interaction.user.id,
				})
				.catch(() => null);

			if (!confirmation) return;
			if (confirmation.customId === 'no')
				return confirmation.update({ embeds: [], components: [], content: 'Cancelled prompt.' });

			await new Profiles({
				username,
				bio,
				avatar: avatar || interaction.user.displayAvatarURL(),
				userId: interaction.user.id,
				banner: banner || null,
			}).save();

			await confirmation.update({
				components: [],
				embeds: [],
				content:
					'Successfully created your profile. You can now publish tweets and if you want to edit your profile, use the `/profile manage` command.',
			});
		} else if (subcommand === 'manage') {
			const profile = await Profiles.findOne({ userId: interaction.user.id });
			if (!profile)
				return interaction.reply({
					ephemeral: true,
					content: 'You do not have a profile, create one using the `/profile create` command.',
				});

			const embed = generateEmbed(profile);

			const rows = [
				new ActionRowBuilder<ButtonBuilder>().addComponents([
					new ButtonBuilder().setCustomId('edit-username').setLabel('Change Username').setStyle(ButtonStyle.Primary),
					new ButtonBuilder().setCustomId('edit-avatar').setLabel('Change Avatar').setStyle(ButtonStyle.Primary),
					new ButtonBuilder().setCustomId('edit-banner').setLabel('Change Banner').setStyle(ButtonStyle.Primary),
					new ButtonBuilder().setCustomId('edit-bio').setLabel('Change Bio').setStyle(ButtonStyle.Primary),
				]),
			];

			const msg = await interaction.reply({
				ephemeral: true,
				fetchReply: true,
				embeds: [embed],
				components: rows,
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
						.setTitle('Edit your username')
						.setCustomId(modalId)
						.addComponents([
							new ActionRowBuilder<TextInputBuilder>().addComponents([
								new TextInputBuilder()
									.setCustomId('username')
									.setLabel('Username')
									.setMaxLength(32)
									.setMinLength(2)
									.setPlaceholder('Your new username, must be within 2-32 chars.')
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

					if (await Profiles.exists({ username }))
						return void modalResponse.reply({
							ephemeral: true,
							content: 'There is already a profile with that username, please choose another one.',
						});

					await modalResponse.deferReply({ ephemeral: true });

					if (profile.verified) {
						const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
							new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success),
							new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger),
						]);

						const confirmMsg = await modalResponse.editReply({
							components: [row],
							content:
								'Your profile is verified, if you change your username you will lose your verification status, would you like to continue anyways?',
						});

						const response = await confirmMsg
							.awaitMessageComponent({
								componentType: ComponentType.Button,
								time: 120000,
							})
							.catch(() => null);

						if (!response) return;
						if (response.customId === 'no')
							return void response.update({ components: [], embeds: [], content: 'Cancelled prompt.' });

						profile.username = username;
						profile.verified = false;
						await profile.save();

						await response.update({ components: [], embeds: [], content: 'Successfully changed your username.' });
						await buttonInteraction.editReply({ embeds: [generateEmbed(profile)] });
					} else {
						profile.username = username;
						await profile.save();

						await modalResponse.editReply({
							components: [],
							embeds: [],
							content: 'Successfully changed your username.',
						});
						await buttonInteraction.editReply({ embeds: [generateEmbed(profile)] });
					}
				} else if (buttonInteraction.customId === 'edit-avatar') {
					const modalId = customId('edit-avatar', buttonInteraction.user.id);
					const modal = new ModalBuilder()
						.setTitle('Edit your avatar')
						.setCustomId(modalId)
						.addComponents([
							new ActionRowBuilder<TextInputBuilder>().addComponents([
								new TextInputBuilder()
									.setCustomId('avatar')
									.setLabel('Avatar (Leave empty to default)')
									.setMaxLength(4000)
									.setPlaceholder('Your new avatar, must be a valid URL.')
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

					const avatar = modalResponse.fields.getTextInputValue('avatar');
					if (avatar && !Constants.urlRegex.test(avatar))
						return void modalResponse.reply({
							ephemeral: true,
							content: 'The avatar must be a valid URL, or you can leave it empty to default to your Discord avatar.',
						});

					profile.avatar = avatar || interaction.user.displayAvatarURL();
					await profile.save();

					await modalResponse.editReply({ embeds: [generateEmbed(profile)] });
					await modalResponse.followUp({ content: 'Successfully changed your avatar.', ephemeral: true });
				} else if (buttonInteraction.customId === 'edit-bio') {
					const modalId = customId('edit-bio', buttonInteraction.user.id);
					const modal = new ModalBuilder()
						.setTitle('Edit your bio')
						.setCustomId(modalId)
						.addComponents([
							new ActionRowBuilder<TextInputBuilder>().addComponents([
								new TextInputBuilder()
									.setCustomId('bio')
									.setLabel('Bio (leave empty to remove)')
									.setMaxLength(4000)
									.setPlaceholder('Your new bio...')
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

					await modalResponse.editReply({ embeds: [generateEmbed(profile)] });
					await modalResponse.followUp({ content: 'Successfully changed your bio.', ephemeral: true });
				} else if (buttonInteraction.customId === 'edit-banner') {
					const modalId = customId('edit-banner', buttonInteraction.user.id);
					const modal = new ModalBuilder()
						.setTitle('Edit your banner')
						.setCustomId(modalId)
						.addComponents([
							new ActionRowBuilder<TextInputBuilder>().addComponents([
								new TextInputBuilder()
									.setCustomId('banner')
									.setLabel('Banner (Leave empty to remove)')
									.setMaxLength(4000)
									.setPlaceholder('Your new banner, must be a valid URL.')
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

					const banner = modalResponse.fields.getTextInputValue('banner');
					if (banner && !Constants.urlRegex.test(banner))
						return void modalResponse.reply({
							ephemeral: true,
							content: 'The banner must be a valid URL, or you can leave it empty to remove it.',
						});

					profile.banner = banner || undefined;
					await profile.save();

					await modalResponse.editReply({
						embeds: [generateEmbed(profile)],
						files: profile.banner ? [profile.banner] : [],
					});
					await modalResponse.followUp({ content: 'Successfully changed your banner.', ephemeral: true });
				}
			});
		} else if (subcommand === 'view') {
			const user = interaction.options.getUser('user', false) ?? interaction.user;
			const profile = await Profiles.findOne({ userId: user.id });
			if (!profile) return interaction.reply({ ephemeral: true, content: "That user doesn't have a profile yet." });

			const embed = generateEmbed(profile);

			await interaction.reply({ embeds: [embed], files: profile.banner ? [profile.banner] : [] });
		}
	}
}
