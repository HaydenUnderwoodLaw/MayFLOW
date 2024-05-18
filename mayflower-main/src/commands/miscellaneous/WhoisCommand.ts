import { CommandChannelType, Constants, InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
import axios from 'axios';
import { ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder } from 'discord.js';
import { getGroups, getIdFromUsername, getPlayerInfo, getPlayerThumbnail } from 'noblox.js';
import { CommandCategory, RoverDiscordResponse, RoverRobloxResponse } from '../../utils/constants';

const mainGroups = [
	33246624, 33229125, 33222538, 33163681, 33141892, 33141882, 33141864, 33141858, 33034853, 13320417, 32985457,
	32985378, 32949780, 32949752, 32914814, 32914800, 32914789, 32914781, 32914771, 32879683, 32879677, 32879632,
	32879615, 32879582, 32879569, 32879560, 32916399,
];

const getGroupsUserIn = async (userId: number) => {
	const groups = await getGroups(userId).catch(() => null);

	if (!groups || !groups.length) return null;

	const filterMainGroups = groups.filter((c) => mainGroups.includes(c.Id));

	if (!filterMainGroups.length) return null;

	return filterMainGroups;
};

export default class WhoisCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'whois',
			category: CommandCategory.Miscellaneous,
			description: 'Retrieve information on a user.',
			type: ApplicationCommandType.ChatInput,
			channel: CommandChannelType.Guild,
			options: [
				{
					name: 'roblox_user',
					type: ApplicationCommandOptionType.Subcommand,
					description: 'Retrieve a user by their roblox username.',
					options: [
						{
							name: 'username',
							type: ApplicationCommandOptionType.String,
							required: true,
							description: 'The roblox username to search.',
						},
					],
				},
				{
					name: 'discord_user',
					type: ApplicationCommandOptionType.Subcommand,
					description: 'Retrieve a user by their Discord handle.',
					options: [
						{
							name: 'user',
							type: ApplicationCommandOptionType.User,
							required: true,
							description: 'The user to retrieve.',
						},
					],
				},
			],
		});
	}

	async run({ interaction, client }: InteractionContext) {
		if (!interaction.inCachedGuild()) return;

		const subcommand = interaction.options.getSubcommand(true);

		if (subcommand === 'roblox_user') {
			const embeds = [];
			const username = interaction.options.getString('username', true);
			const userId = await getIdFromUsername(username).catch(() => null);

			if (!userId)
				return interaction.reply({ ephemeral: true, content: "There isn't a Roblox user with that username." });

			await interaction.reply({ content: 'Retrieving information...' });

			const playerInfo = await getPlayerInfo(userId);
			const thumbnail = await getPlayerThumbnail(userId, 720, 'png', false, 'headshot').then((d) => d[0].imageUrl);
			const roverDiscordData = await axios
				.get<RoverDiscordResponse>(
					`https://registry.rover.link/api/guilds/${interaction.guildId}/roblox-to-discord/${userId}`,
					{
						headers: {
							Authorization: `Bearer ${process.env.ROVER_API_KEY}`,
						},
					},
				)
				.catch(() => null);

			const embed = new EmbedBuilder()
				.setTitle(
					`Roblox Information | ${playerInfo.username} (${playerInfo.displayName}) ${
						playerInfo.isBanned ? '[Banned]' : ''
					}`,
				)
				.setDescription(playerInfo.blurb)
				.setTimestamp()
				.setThumbnail(thumbnail ?? null)
				.setColor(Constants.COLOR_TYPES.INFO)
				.setFooter({ text: `User ID: ${userId}` })
				.addFields([
					{
						name: 'Account Created',
						value: `<t:${Math.floor(playerInfo.joinDate.getTime() / 1000)}> (${playerInfo.age} days old)`,
						inline: true,
					},
					{ name: 'Friend Count', value: playerInfo.friendCount?.toString() ?? '0', inline: true },
					{ name: 'Verified with Rover', value: roverDiscordData?.status === 200 ? 'Yes' : 'No', inline: true },
					{ name: 'Past Usernames', value: playerInfo.oldNames?.join(', ') || 'None.' },
				]);

			embeds.push(embed);

			const groups = await getGroupsUserIn(userId);

			if (!groups) {
				embeds.push(
					new EmbedBuilder()
						.setTitle('Project Amerika Groups | User is not in any groups.')
						.setColor(Constants.COLOR_TYPES.DANGER),
				);
			} else {
				const groupsEmbed = new EmbedBuilder()
					.setTitle(`Project Amerika Groups | ${playerInfo.username} (${playerInfo.displayName})`)
					.setColor('DarkPurple')
					.setTimestamp()
					.addFields(
						groups.slice(0, 25).map((c) => ({ name: `${c.Name} [${c.Id}]`, value: `${c.Role}`, inline: true })),
					);

				embeds.push(groupsEmbed);
			}

			if (roverDiscordData?.status === 200) {
				const user = await client.users.fetch(roverDiscordData.data.discordUsers[0].user.id);

				const discordEmbed = new EmbedBuilder()
					.setTitle(`Discord Information | ${user.username}`)
					.setThumbnail(user.displayAvatarURL())
					.setFooter({ text: `User ID: ${user.id}` })
					.setColor('Blurple')
					.setTimestamp()
					.addFields([
						{ name: 'Discord ID', value: user.id, inline: true },
						{ name: 'Discord Username', value: user.username, inline: true },
						{ name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}>`, inline: true },
					]);

				embeds.push(discordEmbed);
			} else {
				const discordEmbed = new EmbedBuilder()
					.setTitle('Discord Information | User is not verified with RoVer.')
					.setColor('Blurple');

				embeds.push(discordEmbed);
			}

			await interaction.editReply({ embeds, content: null });
		} else if (subcommand === 'discord_user') {
			const embeds = [];
			const user = interaction.options.getUser('user', true);

			await interaction.reply({ content: 'Retrieving information...' });

			const robloxData = await axios
				.get<RoverRobloxResponse>(
					`https://registry.rover.link/api/guilds/${interaction.guildId}/discord-to-roblox/${user.id}`,
					{
						headers: {
							Authorization: `Bearer ${process.env.ROVER_API_KEY}`,
						},
					},
				)
				.catch(() => null);

			if (robloxData?.status === 200 && robloxData.data.robloxId) {
				const playerInfo = await getPlayerInfo(robloxData.data.robloxId);
				const thumbnail = await getPlayerThumbnail(robloxData.data.robloxId, 720, 'png', false, 'headshot').then(
					(d) => d[0].imageUrl,
				);

				const embed = new EmbedBuilder()
					.setTitle(
						`Roblox Information | ${playerInfo.username} (${playerInfo.displayName}) ${
							playerInfo.isBanned ? '[Banned]' : ''
						}`,
					)
					.setDescription(playerInfo.blurb)
					.setTimestamp()
					.setThumbnail(thumbnail ?? null)
					.setColor(Constants.COLOR_TYPES.INFO)
					.setFooter({ text: `User ID: ${robloxData.data.robloxId}` })
					.addFields([
						{
							name: 'Account Created',
							value: `<t:${Math.floor(playerInfo.joinDate.getTime() / 1000)}> (${playerInfo.age} days old)`,
							inline: true,
						},
						{ name: 'Friend Count', value: playerInfo.friendCount?.toString() ?? '0', inline: true },
						{ name: 'Verified with Rover', value: robloxData ? 'Yes' : 'No', inline: true },
						{ name: 'Past Usernames', value: playerInfo.oldNames?.join(', ') || 'None.' },
					]);

				embeds.push(embed);

				const groups = await getGroupsUserIn(robloxData.data.robloxId);

				if (!groups) {
					embeds.push(
						new EmbedBuilder()
							.setTitle('Project Amerika Groups | User is not in any groups.')
							.setColor(Constants.COLOR_TYPES.DANGER),
					);
				} else {
					const groupsEmbed = new EmbedBuilder()
						.setTitle(`Project Amerika Groups | ${playerInfo.username} (${playerInfo.displayName})`)
						.setColor('DarkPurple')
						.setTimestamp()
						.addFields(
							groups.slice(0, 25).map((c) => ({ name: `${c.Name} [${c.Id}]`, value: `${c.Role}`, inline: true })),
						);

					embeds.push(groupsEmbed);
				}
			} else {
				const embed = new EmbedBuilder()
					.setTitle('Roblox Information | User is not verified with RoVer.')
					.setColor(Constants.COLOR_TYPES.WARN);

				embeds.push(embed);
				embeds.push(
					new EmbedBuilder()
						.setTitle('Project Amerika Groups | User is not in any group.')
						.setColor(Constants.COLOR_TYPES.DANGER),
				);
			}

			const discordEmbed = new EmbedBuilder()
				.setTitle(`Discord Information | ${user.username}`)
				.setThumbnail(user.displayAvatarURL())
				.setFooter({ text: `User ID: ${user.id}` })
				.setColor('Blurple')
				.setTimestamp()
				.addFields([
					{ name: 'Discord ID', value: user.id, inline: true },
					{ name: 'Discord Username', value: user.username, inline: true },
					{ name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}>`, inline: true },
				]);

			embeds.push(discordEmbed);

			await interaction.editReply({ embeds, content: null });
		}
	}
}
