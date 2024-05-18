import { Constants, InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
import { ApplicationCommandType, EmbedBuilder } from 'discord.js';
import ms from 'ms';
import { CommandCategory } from '../../utils/constants';

export default class PingCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'ping',
			category: CommandCategory.Miscellaneous,
			description: 'Check the gateway and API latency.',
			type: ApplicationCommandType.ChatInput,
		});
	}

	async run({ interaction, client }: InteractionContext) {
		const embed = new EmbedBuilder()
			.setTitle('Connection Statistics')
			.setColor(Constants.COLOR_TYPES.INFO)
			.setTimestamp()
			.addFields([
				{ name: 'Ping', value: `${client.ws.ping}ms` },
				{ name: 'Uptime', value: ms(client.uptime!, { long: true }) },
			]);

		await interaction.reply({ embeds: [embed] });
	}
}
