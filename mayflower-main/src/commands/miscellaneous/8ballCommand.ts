import { Constants, InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
import { ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder } from 'discord.js';
import { CommandCategory } from '../../utils/constants';

const answers = [
	'It is certain',
	'Without a doubt',
	'Definitely',
	'Most likely',
	'Outlook good',
	'Yes!',
	'Try again',
	'Reply hazy',
	"Can't predict",
	'No!',
	'Unlikely',
	'Sources say no',
	'Very doubtful',
];

export default class EightBallCommand extends InteractionCommand {
	constructor() {
		super({
			name: '8ball',
			category: CommandCategory.Miscellaneous,
			description: 'Ask the magic 8ball.',
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: 'input',
					type: ApplicationCommandOptionType.String,
					required: true,
					description: 'What question do you want to ask?',
				},
			],
		});
	}

	async run({ interaction }: InteractionContext) {
		const input = interaction.options.getString('input', true);

		const response = answers.random();

		const embed = new EmbedBuilder()
			.setTitle('8ball')
			.setColor(Constants.COLOR_TYPES.INFO)
			.setTimestamp()
			.addFields([
				{ name: 'Your question', value: `${input}` },
				{ name: '8ball Response', value: response },
			]);

		await interaction.reply({ embeds: [embed] });
	}
}
