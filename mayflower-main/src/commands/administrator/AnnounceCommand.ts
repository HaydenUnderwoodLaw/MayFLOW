import { CommandChannelType, Constants, InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
import { customId } from '@a-djs-handler/utils';
import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
	EmbedBuilder,
	ModalBuilder,
	TextBasedChannel,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';
import { CommandCategory } from '../../utils/constants';

export default class AnnounceCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'hannounce',
			category: CommandCategory.Administrator,
			description: ' Posts an announcement needed by Staff / Government.',
			type: ApplicationCommandType.ChatInput,
			userPermissions: ['ManageChannels'],
			channel: CommandChannelType.Guild,
			options: [
				{
					name: 'channel',
					type: ApplicationCommandOptionType.Channel,
					required: true,
					description: 'The channel to send the announcement in.',
					channelTypes: [ChannelType.GuildAnnouncement, ChannelType.GuildText, ChannelType.PublicThread],
				},
				{
					name: 'mention_type',
					type: ApplicationCommandOptionType.String,
					required: true,
					description: 'The mention type.',
					choices: [
						{ name: '@here', value: 'here' },
						{ name: '@everyone', value: 'everyone' },
					],
				},
			],
		});
	}

	async run({ interaction }: InteractionContext) {
		if (!interaction.inCachedGuild()) return;

		const channel = interaction.options.getChannel('channel', true) as TextBasedChannel;
		const mentionType = interaction.options.getString('mention_type', true);

		const modalId = customId('announce', interaction.user.id);
		const modal = new ModalBuilder()
			.setTitle('Announce Command')
			.setCustomId(modalId)
			.addComponents([
				new ActionRowBuilder<TextInputBuilder>().addComponents([
					new TextInputBuilder()
						.setCustomId('title')
						.setLabel('announcement title')
						.setMaxLength(256)
						.setRequired(true)
						.setStyle(TextInputStyle.Paragraph),
				]),
				new ActionRowBuilder<TextInputBuilder>().addComponents([
					new TextInputBuilder()
						.setCustomId('body')
						.setLabel('announcement content')
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

		const [title, body] = [response.fields.getTextInputValue('title'), response.fields.getTextInputValue('body')];

		const embed = new EmbedBuilder()
			.setTitle(title)
			.setTimestamp()
			.setColor(Constants.COLOR_TYPES.INFO)
			.setDescription(body);

		await channel.send({ embeds: [embed], content: `@${mentionType}`, allowedMentions: { parse: ['everyone'] } });

		await response.reply('Successfully sent the announcement.');
	}
}
