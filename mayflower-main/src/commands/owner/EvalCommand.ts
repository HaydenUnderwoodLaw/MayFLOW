import { inspect } from 'node:util';
/* eslint-disable no-eval */
import { InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js';
import { CommandCategory } from '../../utils/constants';
const { create } = require('sourcebin');

export default class EvalCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'eval',
			description: 'Execute a given piece of code.',
			category: CommandCategory.Developer,
			ownerOnly: true,
			type: ApplicationCommandType.ChatInput,
			options: [
				{
					name: 'to-eval',
					type: ApplicationCommandOptionType.String,
					required: true,
					description: 'The expression to eval.',
				},
				{
					name: 'depth',
					type: ApplicationCommandOptionType.Integer,
					required: false,
					description: 'The depth of the response.',
					maxValue: 6,
				},
				{
					name: 'sensitive',
					type: ApplicationCommandOptionType.Boolean,
					required: false,
					description: 'Whether the response should be ephemeral.',
				},
			],
		});
	}

	async run({ interaction }: InteractionContext) {
		const toEval = interaction.options.getString('to-eval', true);
		const depth = interaction.options.getInteger('depth', false) ?? 0;
		const ephemeral = interaction.options.getBoolean('sensitive', false) ?? false;

		await interaction.deferReply({ ephemeral });

		try {
			const hrStart = process.hrtime();

			// biome-ignore lint:
			const evaluated = inspect(await eval(toEval), { depth });

			const hrDiff = process.hrtime(hrStart);

			if (!toEval) return interaction.editReply('Error while evaluating: `air`');

			if (evaluated && evaluated.toString().length <= 2000) {
				await interaction.editReply(
					`Executed in ${hrDiff[0] > 0 ? `${hrDiff[0]}s ` : ''}${hrDiff[1] / 1000000}ms.\`\`\`ts\n${evaluated}\`\`\``,
				);
			} else if (evaluated && evaluated.toString().length > 2000) {
				const obj = await create({
					files: [
						{
							name: 'Eval output',
							content: evaluated.toString(),
							language: 'typescript',
						},
					],
				});

				await interaction.editReply(
					`Executed in ${hrDiff[0] > 0 ? `${hrDiff[0]}s ` : ''}${hrDiff[1] / 1000000}ms.\n${obj.shortUrl}`,
				);
			}
		} catch (e) {
			await interaction.editReply(`Error while evaluating: \`${e}\``);
		}
	}
}
