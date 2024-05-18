import { Constants, InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
import { ApplicationCommandType, EmbedBuilder } from 'discord.js';
import { CommandCategory } from '../../utils/constants';

export default class LinksCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'links',
			category: CommandCategory.Miscellaneous,
			description: 'Informational links including Discord, Roblox Group, Game, and RoVer Website..',
			type: ApplicationCommandType.ChatInput,
		});
	}

	async run({ interaction }: InteractionContext) {
		const embed = new EmbedBuilder()
			.setTitle('Informational Links')
			.setColor(Constants.COLOR_TYPES.INFO)
			.setDescription('The following will provide a list of all current links relating to Project America')
			.addFields([{ name: '**Discord Name**', value: interaction.guild?.name ?? 'N/A', inline: true }]);

		if (interaction.inCachedGuild()) {
			const invite =
				interaction.guild.invites.cache.first() ??
				(await interaction.guild.invites
					.create(interaction.guild.rulesChannel ?? interaction.channelId)
					.catch(() => null));

			if (invite) {
				embed.addFields([{ name: '**Server Invite', value: `[Discord Invite](${invite.url})`, inline: true }]);
			}
		}

		embed.addFields([
			{
				name: 'United States Of Amerika Group',
				value: '[Roblox Link](https://www.roblox.com/groups/32879677/United-St-tes-of-Amerik#!/about)',
				inline: true,
			},
			{
				name: 'Capital Of The United States Of Amerika',
				value: '[ROBLOX](https://www.roblox.com/games/14641622689/Alexandria-District-of-Liberty)',
				inline: true,
			},
			{
				name: 'RoVer Website',
				value: '[RoVer Website](https://rover.link)',
				inline: true,
			},
			{
				name: 'Capital Of The United States Of Amerika',
				value: '[Discord Link](https://discord.gg/usamerika)',
				inline: true,
			},
		]);

		await interaction.reply({ embeds: [embed] });
	}
}
