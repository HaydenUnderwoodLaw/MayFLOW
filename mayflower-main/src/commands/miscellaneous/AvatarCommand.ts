import { Constants, InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
import { ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder } from 'discord.js';
import { CommandCategory } from '../../utils/constants';

export default class AvatarCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'avatar',
			category: CommandCategory.Miscellaneous,
			description: "Get someone's avatar.",
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: 'user',
					type: ApplicationCommandOptionType.User,
					required: true,
					description: 'The user.',
				},
				{
					name: 'format',
					type: ApplicationCommandOptionType.String,
					required: false,
					description: 'The image format (png, jpg, etc).',
					choices: [
						{ name: 'PNG', value: 'png' },
						{ name: 'JPG', value: 'jpg' },
						{ name: 'webp', value: 'webp' },
						{ name: 'JPEG', value: 'jpeg' },
						{ name: 'GIF', value: 'gif' },
					],
				},
			],
		});
	}

	async run({ interaction }: InteractionContext) {
		const user = interaction.options.getUser('user', true);
		const format = interaction.options.getString('format', false) ?? 'png';

		const avatar = user.displayAvatarURL({ extension: format as 'png', size: 2048 });

		const embed = new EmbedBuilder()
			.setTitle(`Avatar | ${user.username}`)
			.setImage(avatar)
			.setColor(Constants.COLOR_TYPES.INFO)
			.setDescription(`[Direct Link](${avatar})`)
			.setTimestamp();

		await interaction.reply({ ephemeral: true, embeds: [embed] });
	}
}
