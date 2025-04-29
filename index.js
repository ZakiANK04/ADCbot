require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');

// Environment variables: TOKEN, CLIENT_ID, GUILD_ID, END_TIME
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
// Submission deadline (UTC)
const END_TIME = new Date(process.env.END_TIME || '2025-05-10T23:59:00Z');

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('agenda')
    .setDescription('Discover the ADC agenda'),

  new SlashCommandBuilder()
    .setName('activites')
    .setDescription('Explore the available activities to freshen up the mood'),

  new SlashCommandBuilder()
    .setName('call')
    .setDescription('Call an organizer or a mentor for your team')
    .addStringOption(option =>
      option
        .setName('role')
        .setDescription('Choose Organizer or Mentor')
        .setRequired(true)
        .addChoices(
          { name: 'Organizer', value: 'organizer' },
          { name: 'Mentor', value: 'mentor' }
        )
    )
    .addStringOption(option =>
      option
        .setName('team')
        .setDescription('Your team name')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('faq')
    .setDescription('Frequently asked questions about ADC 4.0 and the problematics'),

  new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create a dedicated voice and text channel for your team')
    .addStringOption(option =>
      option
        .setName('team')
        .setDescription('Your team name')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('members')
        .setDescription('Mention all team members separated by spaces')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('timer')
    .setDescription('Show time left for submissions')
].map(cmd => cmd.toJSON());

// Register slash commands on startup
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    console.log('Refreshing application commands...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('Commands registered successfully.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
})();

// Initialize Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, options, guild } = interaction;

  if (commandName === 'agenda') {
    await interaction.reply({
      content:
        '📅 **Hackathon Agenda**\n' +
        '- 09:00 Opening Ceremony\n' +
        '- 10:00 Team Formation\n' +
        '- 11:00 Hacking Begins\n' +
        '- 12:30 Lunch Break\n' +
        '- 18:00 Check-in & Mentoring\n' +
        '- 20:00 Dinner\n' +
        '- 00:00 Submissions Close\n' +
        '- 01:00 Awards & Closing'
    });

  } else if (commandName === 'activites') {
    await interaction.reply({
      content:
        '🎉 **Hackathon Activities**\n' +
        '- Networking Games\n' +
        '- Family feud\n' +
        '- Musical Chairs\n' +
        '- Musical pause\n' +
        '- Card games/Consoles\n'
    });

  } else if (commandName === 'call') {
    await interaction.deferReply({ flags: 64 }); // Quick defer
    const roleName = options.getString('role');
    const team = options.getString('team');
    const role = guild.roles.cache.find(r => r.name.toLowerCase() === roleName);
    if (!role) {
      return interaction.editReply({ content: `Role "${roleName}" not found.` });
    }
    const member = role.members.first();
    if (!member) {
      return interaction.editReply({ content: `No ${roleName} is currently available.` });
    }
    return interaction.editReply({
      content: `${member}, you have been called by team **${team}**.`
    });

  } else if (commandName === 'faq') {
    await interaction.reply({
      content:
        '❓ **FAQ**\n' +
        '1. **When does the hackathon end?** Submissions close at 10pm on Saturday.\n' +
        '2. **Where can I find resources?** See the #resources channel and if you need help ask the mentors and organizers.\n' +
        '2.18. **Is dahlia the best chway ?** ofc she is currently in contention with chway za3im along with  her aprentice adnane.\n' +
        '3. **Is staying in the place mandatory??** Yes due to the nature of the hackathon and the policy of the institute.\n' +
        '4. **What tech stack?** Any stack is allowed as long as it is open source and doesn’t manipulate the data in hand.\n' +
        '5. **Who do I contact for help?** Use `/call` to reach out to organizers or mentors.',
      flags: 64
    });

  } else if (commandName === 'create') {
    await interaction.deferReply({ flags: 64 }); // Takes time to create channels
    const team = options.getString('team');
    const membersString = options.getString('members');
    const mentionIds = [...membersString.matchAll(/<@!?(\d+)>/g)].map(m => m[1]);

    if (!mentionIds.length) {
      return interaction.editReply({ content: 'Please mention at least one team member using @username.' });
    }

    const overwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      ...mentionIds.map(id => ({
        id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak
        ]
      }))
    ];

    const textChannel = await guild.channels.create({
      name: `team-${team.toLowerCase()}-text`,
      type: ChannelType.GuildText,
      permissionOverwrites: overwrites
    });

    const voiceChannel = await guild.channels.create({
      name: `team-${team.toLowerCase()}-voice`,
      type: ChannelType.GuildVoice,
      permissionOverwrites: overwrites
    });

    const thread = await textChannel.threads.create({
      name: `🏷️ ${team}`,
      autoArchiveDuration: 1440,
      type: ChannelType.PublicThread,
      reason: `Thread for team ${team}`
    });

    return interaction.editReply({
      content: `✅ Channels created for team **${team}**:\n• Text: ${textChannel}\n• Voice: ${voiceChannel}\n• Thread: ${thread}`
    });

  } else if (commandName === 'timer') {
    const now = new Date();
    const diff = END_TIME - now;
    if (diff <= 0) {
      return interaction.reply({ content: '⚠️ The submission deadline has passed.' });
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return interaction.reply({
      content: `⏳ Time left for submissions: **${days}d ${hours}h ${minutes}m ${seconds}s**`
    });
  }
});

// Login to Discord
client.login(TOKEN);
