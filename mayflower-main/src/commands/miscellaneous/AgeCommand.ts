import { InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js';
import { CommandCategory } from '../../utils/constants';

export default class AgeCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'age',
			category: CommandCategory.Miscellaneous,
			description: 'Responds with how old someone born in a certain year is.',
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: 'year',
					type: ApplicationCommandOptionType.Integer,
					required: true,
					description: 'The year to calculate.',
					minValue: 1,
				},
			],
		});
	}

	async run({ interaction }: InteractionContext) {
		const year = interaction.options.getInteger('year', true);
		const thisYear = new Date().getFullYear();

		await interaction.reply({
			ephemeral: true,
			content: `Someone born in ${year} would be ${thisYear - year} year(s) old.`,
		});
	}
}
