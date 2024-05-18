import { CommandChannelType, InteractionCommand, InteractionContext } from '@a-djs-handler/framework';
import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js';
import { CommandCategory } from '../../utils/constants';

export default class RoleCommand extends InteractionCommand {
	constructor() {
		super({
			name: 'role',
			category: CommandCategory.Administrator,
			description: 'Add or remove a role to/from a user.',
			type: ApplicationCommandType.ChatInput,
			userPermissions: ['ManageRoles'],
			botPermissions: ['ManageRoles'],
			channel: CommandChannelType.Guild,
			options: [
				{
					name: 'add',
					type: ApplicationCommandOptionType.Subcommand,
					description: 'Add a role.',
					options: [
						{
							name: 'user',
							type: ApplicationCommandOptionType.User,
							description: 'The user to add the role to.',
							required: true,
						},
						{
							name: 'role',
							type: ApplicationCommandOptionType.Role,
							description: 'The role to add.',
							required: true,
						},
					],
				},
				{
					name: 'remove',
					type: ApplicationCommandOptionType.Subcommand,
					description: 'Remove a role.',
					options: [
						{
							name: 'user',
							type: ApplicationCommandOptionType.User,
							description: 'The user to remove the role from.',
							required: true,
						},
						{
							name: 'role',
							type: ApplicationCommandOptionType.Role,
							description: 'The role to remove.',
							required: true,
						},
					],
				},
			],
		});
	}

	async run({ interaction }: InteractionContext) {
		if (!interaction.inCachedGuild()) return;

		const member = interaction.options.getMember('user');
		if (!member) return interaction.reply({ ephemeral: true, content: 'The user must be in the server.' });

		if (!member.manageable)
			return interaction.reply({ ephemeral: true, content: "I do not have permissions to manage that user's roles." });

		if (interaction.member.roles.highest.comparePositionTo(member.roles.highest) <= 0)
			return interaction.reply({ ephemeral: true, content: 'You do not have permission to manage that user.' });

		const subcommand = interaction.options.getSubcommand(true);
		const role = interaction.options.getRole('role', true);

		try {
			if (subcommand === 'add') {
				if (member.roles.cache.has(role.id))
					return interaction.reply({ ephemeral: true, content: 'That user already has the role.' });

				await member.roles.add(role);
			} else {
				if (!member.roles.cache.has(role.id))
					return interaction.reply({ ephemeral: true, content: "That user doesn't have the role already." });

				await member.roles.remove(role);
			}
		} catch (e) {
			console.error(e);
			if (interaction.deferred || interaction.replied)
				return interaction.followUp({ content: `There was an error while running that command: \`${e}\`` });

			return interaction.reply({ ephemeral: true, content: `There was an error while running that command: \`${e}\`` });
		}
	}
}
