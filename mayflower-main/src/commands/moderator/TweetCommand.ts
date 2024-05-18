import { InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
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
import { CommandCategory, TweetsChannel, VerifiedEmoji } from '../../utils/constants';
import Profiles from '../../utils/models/Profile';

export default class TweetCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'tweet',
			category: CommandCategory.Moderator,
			description: 'Make tweets.',
			type: ApplicationCommandType.ChatInput,
			userPermissions: ['ManageMessages'],
			options: [
				{
					name: 'attachment',
					type: ApplicationCommandOptionType.Attachment,
					required: false,
					description: 'The attachment to send with the tweet.',
				},
			],
		});
	}

	async run({ interaction, client }: InteractionContext) {
		const attachment = interaction.options.getAttachment('attachment', false);

		const profile = await Profiles.findOne({ userId: interaction.user.id });
		if (!profile)
			return interaction.reply({
				ephemeral: true,
				content: 'You do not have a profile yet, create one using the `/profile` command.',
			});

		const modalId = customId('tweetcommand', interaction.user.id);
		const modal = new ModalBuilder()
			.setTitle('Make a Tweet')
			.setCustomId(modalId)
			.addComponents([
				new ActionRowBuilder<TextInputBuilder>().addComponents([
					new TextInputBuilder()
						.setCustomId('body')
						.setLabel('Tweet Content')
						.setPlaceholder('The tweet content...')
						.setRequired(true)
						.setMaxLength(4000)
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
		await response.deferReply({ ephemeral: true });

		const content = response.fields.getTextInputValue('body');

		const embed = new EmbedBuilder()
			.setTitle(`@${profile.username} ${profile.verified ? VerifiedEmoji : ''}`)
			.setThumbnail(profile.avatar)
			.setDescription(content)
			.setColor(0x1da1f2)
			.setTimestamp()
			.setImage(`attachment://${attachment?.name}`)
			.setFooter({ iconURL: 'https://cdn-icons-png.flaticon.com/512/124/124021.png', text: 'Twitter' });

		const channel = client.channels.cache.get(TweetsChannel);
		if (!channel || !channel.isTextBased())
			return response.editReply({
				content: "I couldn't find the tweets channel, please report this to the bot developer.",
			});

		const msg = await channel.send({ embeds: [embed], files: attachment ? [attachment] : undefined });

		await msg.react('💙');
		await msg.react('🔁');

		await profile.updateOne({ $inc: { tweets: 1 } });

		await response.editReply('Successfully sent the tweet.');
	}
}
