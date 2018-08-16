"use strict";

console.log("LOADING LIBRARIES...");

const Discord = require("discord.js");
const client = new Discord.Client();

client.login("<SECRET_BOT_TOKEN>");

client.on("ready", function() {
	client.user.setActivity("on " + client.guilds.size + " servers").catch(console.error);
	console.log("READY FOR ACTION!");
});

async function send(content, channel, reactions) {
	const sent = await channel.send(content).catch(console.error);
	if (reactions.size) {
		for (const reaction of reactions.values()) {
			const emoji = reaction.emoji;
			if (client.emojis.has(emoji.id) || emoji.id === null) {
				await sent.react(emoji).catch(console.error);
			}
		}
	}
}

function richEmbed(embed) {
	const rich = new Discord.RichEmbed();
	if (embed.author) {
		rich.setAuthor(embed.author.name, embed.author.iconURL, embed.author.url);
	}
	rich.setColor(embed.color);
	if (embed.description) {
		rich.setDescription(embed.description);
	}
	for (let i = 0; i < embed.fields.length; i++) {
		const field = embed.fields[i];
		rich.addField(field.name, field.value, field.inline);
	}
	if (embed.footer) {
		rich.setFooter(embed.footer.text, embed.footer.iconURL);
	}
	if (embed.image) {
		rich.setImage(embed.image.url);
	}
	if (embed.thumbnail) {
		rich.setThumbnail(embed.thumbnail.url);
	}
	rich.setTimestamp(embed.timestamp);
	if (embed.title) {
		rich.setTitle(embed.title);
	}
	rich.setURL(embed.url);
	return rich;
}

const replacements = {};

function toggleReplacement(channel, find, replace) {
	replacements[channel.id] = replacements[channel.id] || new Map();
	if (find && replace) {
		replacements[channel.id].set(find, replace);
		channel.send("**Replacing `" + find + "` with `" + replace + "`!**").catch(console.error);
	} else if (find) {
		const replacement = replacements[channel.id].get(find);
		if (replacement) {
			channel.send("**`" + find + "` is replaced with `" + replacement + "`**").catch(console.error);
		} else {
			channel.send("**Missing `replace` argument! `/repost replace " + find + " <REPLACE>`**").catch(console.error);
		}
	} else {
		channel.send("**Missing `find` and `replace` arguments! `/repost replace <FIND> <REPLACE>`**").catch(console.error);
	}
}

async function awaitReaction(message, author, emoji, func) {
	await message.react(emoji).catch(console.error);
	const collector = message.createReactionCollector(function(reaction, user) {
		return user.id === author && reaction.emoji.name === emoji;
	}, { max: 1 });
	collector.on("collect", function() {
		collector.stop();
		func();
	});
}

async function sendReplacements(channel, id) {
	const data = replacements[channel.id];
	if (data) {
		const count = await channel.send("**This channel has " + data.size + " replacement" + (data.size === 1 ? "" : "s") + "!**").catch(console.error);
		for (const replace of data.entries()) {
			const message = await channel.send("`" + replace[0] + "` is replaced with `" + replace[1] + "`").catch(console.error);
			awaitReaction(message, id, "❌", function() {
				data.delete(replace[0]);
				message.delete().catch(console.error);
				count.edit("**This channel has " + data.size + " replacement" + (data.size === 1 ? "" : "s") + "!**").catch(console.error);
			});
		}
	} else {
		channel.send("**This channel has no replacements!**").catch(console.error);
	}
}

function replaceAll(str, channel) {
	const data = replacements[channel.id];
	if (data) {
		let replaced = str;
		for (const replace of data.entries()) {
			const regex = new RegExp(replace[0], "g");
			replaced = replaced.replace(regex, replace[1]);
		}
		return replaced;
	} else {
		return str;
	}
}

const systemMessages = {
	RECIPIENT_ADD: " added someone to the group.",
	RECIPIENT_REMOVE: " removed someone from the group.",
	CALL: " started a call.",
	CHANNEL_NAME_CHANGE: " changed the name of this channel.",
	CHANNEL_ICON_CHANGE: " changed the icon of this channel.",
	PINS_ADD: " pinned a message to this channel.",
	GUILD_MEMBER_JOIN: " just joined."
};

async function sendMessage(message, channel, webhook, author) {
	if (message.type !== "DEFAULT") {
		await channel.send("**" + replaceAll(message.author.tag, channel) + systemMessages[message.type] + "**").catch(console.error);
	} else if (message.author.id !== author) {
		if (webhook) {
			await webhook.edit(replaceAll(message.author.username, channel), message.author.displayAvatarURL).catch(console.error);
		} else {
			await channel.send("**" + replaceAll(message.author.tag, channel) + "**").catch(console.error);
		}
	}
	if (message.content) {
		await send(replaceAll(message.content, channel), webhook ? webhook : channel, message.reactions);
	}
	if (message.attachments.size) {
		for (const attachment of message.attachments.values()) {
			await send(attachment.filesize > 8000000 ? attachment.url : { files: [attachment.url] }, webhook ? webhook : channel, message.reactions);
		}
	}
	if (message.embeds.length) {
		for (let i = 0; i < message.embeds.length; i++) {
			const embed = message.embeds[i];
			if (embed.type === "rich") {
				await send(richEmbed(embed), webhook ? webhook : channel, message.reactions);
			}
		}
	}
}

async function sendMessages(messages, channel, webhook, author) {
	let last;
	if (messages && messages.size) {
		const backward = messages.array().reverse();
		for (let i = 0; i < backward.length; i++) {
			await sendMessage(backward[i], channel, webhook, last ? last.author.id : author);
			last = backward[i];
		}
	}
}

async function fetchMessages(message, channel, webhook, author) {
	const messages = await message.channel.fetchMessages({ limit: 100, after: message.id }).catch(function() {
		channel.send("**Couldn't fetch messages!**").catch(console.error);
	});
	if (messages && messages.size) {
		await sendMessages(messages, channel, webhook, author);
		const last = messages.last();
		fetchMessages(last, channel, webhook, last.author.id);
	} else {
		channel.send("**Repost Complete!**").catch(console.error);
	}
}

function capitalizeFirst(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

async function fetchWebhook(channel) {
	const webhooks = await channel.fetchWebhooks().catch(function() {
		channel.send("**Can't read webhooks!**").catch(console.error);
	});
	if (webhooks) {
		for (const webhook of webhooks.values()) {
			if (webhook.owner.id === client.user.id) {
				return webhook;
			}
		}
		return channel.createWebhook("Reposter", client.user.displayAvatarURL).catch(console.error);
	}
}

async function sendInfo(from, to, hook) {
	const rich = new Discord.RichEmbed();
	rich.setTitle(from.name || from.id);
	rich.setDescription(from.topic || "No topic");
	rich.setFooter("Reposting from " + from.id, client.user.displayAvatarURL);
	if (from.guild) {
		rich.setAuthor(from.guild.name, from.guild.iconURL);
		rich.setThumbnail(from.guild.iconURL);
	} else if (from.recipient) {
		rich.setAuthor(from.recipient.username, from.recipient.displayAvatarURL);
		rich.setThumbnail(from.recipient.displayAvatarURL);
	} else {
		rich.setAuthor(from.owner.username, from.iconURL);
		rich.setThumbnail(from.iconURL);
	}
	rich.setTimestamp();
	if (from.parent) {
		rich.addField("Channel Category", from.parent.name, true);
	}
	rich.addField("NSFW Channel", from.nsfw || "false", true);
	rich.addField("Channel ID", from.id, true);
	rich.addField("Channel Type", from.type, true);
	rich.addField("Channel Creation Date", from.createdAt, true);
	rich.addField("Channel Creation Time", from.createdTimestamp, true);
	if (from.guild) {
		rich.addField("Server ID", from.guild.id, true);
		rich.addField("Server Owner", from.guild.owner.user.tag, true);
		rich.addField("Server Region", from.guild.region, true);
		const channels = new Map();
		for (const channel of from.guild.channels.values()) {
			channels.set(channel.type, (channels.get(channel.type) || 0) + 1);
		}
		for (const channel of channels.entries()) {
			rich.addField(capitalizeFirst(channel[0]) + " Channels", channel[1], true);
		}
		let bots = 0;
		for (const member of from.guild.members.values()) {
			if (member.user.bot) {
				bots++;
			}
		}
		rich.addField("Server Humans", from.guild.members.size - bots, true);
		rich.addField("Server Bots", bots, true);
		rich.addField("Server Roles", from.guild.roles.size, true);
		rich.addField("Server Emojis", from.guild.emojis.size, true);
		rich.addField("Server Verification", from.guild.verificationLevel, true);
		rich.addField("Default Role", from.guild.defaultRole.name, true);
		rich.addField("Default Role ID", from.guild.defaultRole.id, true);
		if (from.guild.systemChannel) {
			rich.addField("Default Channel", from.guild.systemChannel.name, true);
			rich.addField("Default Channel ID", from.guild.systemChannelID, true);
		}
		rich.addField("Server Creation Date", from.guild.createdAt, true);
		rich.addField("Server Creation Time", from.guild.createdTimestamp, true);
	} else if (from.recipients) {
		rich.addField("Channel Owner", from.owner.tag, true);
		rich.addField("Channel Members", from.recipients.size, true);
	}
	await to.send(rich).catch(console.error);
	const webhook = hook && await fetchWebhook(to);
	await to.send("__**Pins**__").catch(console.error);
	const pins = await from.fetchPinnedMessages().catch(function() {
		to.send("**Can't read pins!**").catch(console.error);
	});
	await sendMessages(pins, to, webhook);
	await to.send("__**Messages**__").catch(console.error);
	const messages = await from.fetchMessages({ limit: 1, after: "0" }).catch(function() {
		to.send("**Can't read messages!**").catch(console.error);
	});
	const first = messages && messages.first();
	if (first) {
		await sendMessage(first, to, webhook);
		fetchMessages(first, to, webhook, first.author.id);
	} else {
		to.send("**Repost Complete!**").catch(console.error);
	}
}

const whitelist = { text: true, group: true, dm: true };

async function repost(id, message, webhook, direction) {
	const channel = (id && id.id) ? id : client.channels.get(id);
	const dir = direction ? "from" : "to";
	if (!channel) {
		if (message.mentions.channels.size) {
			repost(message.mentions.channels.first(), message, webhook, direction);
		} else {
			const matches = [];
			for (const match of client.channels.values()) {
				if (id.toLowerCase() === match.name) {
					matches.push(match);
				}
			}
			if (matches.length) {
				if (matches.length === 1) {
					repost(matches[0], message, webhook, direction);
				} else {
					await message.channel.send("**Found " + matches.length + " channels!**").catch(console.error);
					for (let i = 0; i < matches.length; i++) {
						const match = matches[i];
						const rich = new Discord.RichEmbed();
						rich.setFooter(capitalizeFirst(match.type) + " Channel", client.user.displayAvatarURL);
						if (match.guild) {
							rich.setAuthor(match.name, match.guild.iconURL);
						} else if (match.recipient) {
							rich.setAuthor(match.recipient.username, match.recipient.displayAvatarURL);
						} else {
							rich.setAuthor(match.name, match.iconURL);
						}
						rich.setTimestamp(match.createdAt);
						rich.addField("Channel ID", "`" + match.id + "`", false);
						const embed = await message.channel.send(rich).catch(console.error);
						awaitReaction(embed, message.author.id, "✅", function() {
							repost(match, message, webhook, direction);
						});
					}
				}
			} else {
				message.channel.send("**Couldn't repost " + dir + " `" + id + "`!**").catch(console.error);
			}
		}
	} else if (channel.id === message.channel.id) {
		message.channel.send("**Can't repost " + dir + " the same channel!**").catch(console.error);
	} else if (!whitelist[channel.type]) {
		message.channel.send("**Can't repost " + dir + " " + channel.type + " channels!**").catch(console.error);
	} else if (webhook && (direction ? message.channel.type : channel.type) === "dm") {
		message.channel.send("**Can't create webhooks on DM channels!**").catch(console.error);
	} else if (channel.type === "text" && !direction && !channel.permissionsFor(client.user).has("SEND_MESSAGES")) {
		message.channel.send("**Can't repost to `" + (channel.name || id) + "` without permission!**").catch(console.error);
	} else {
		await message.channel.send("**Reposting " + dir + " `" + (channel.name || id) + "`!**").catch(console.error);
		sendInfo(direction ? channel : message.channel, direction ? message.channel : channel, webhook);
	}
}

function sendCommands(channel) {
	const rich = new Discord.RichEmbed();
	rich.setTitle("Reposter Commands");
	rich.setDescription("By MysteryPancake");
	rich.setFooter(client.user.id, client.user.displayAvatarURL);
	rich.setAuthor(client.user.username, client.user.displayAvatarURL, "https://github.com/MysteryPancake/Discord-Reposter");
	rich.setThumbnail(client.user.displayAvatarURL);
	rich.setTimestamp();
	rich.setURL("https://github.com/MysteryPancake/Discord-Reposter#commands");
	rich.addField("Repost To", "*Reposts to a channel.*```/repost to <CHANNEL>\n/repost <CHANNEL>```", false);
	rich.addField("Repost From", "*Reposts from a channel.*```/repost from <CHANNEL>```", false);
	rich.addField("Repost Webhook", "*Reposts through a webhook.*```/repostwebhook\n/reposthook```Instead of:```/repost```", false);
	rich.addField("Repost Commands", "*Posts the command list.*```/repost commands\n/repost help```", false);
	rich.addField("Repost Replace", "*Replaces text when reposting.*```/repost replace <FIND> <REPLACE>```", false);
	rich.addField("Repost Replacements", "*Posts the replacement list.*```/repost replacements```", false);
	rich.addField("Channel ID", "```" + channel.id + "```", false);
	channel.send(rich).catch(console.error);
}

client.on("message", function(message) {
	if (message.author.bot) return;
	const args = message.content.split(" ");
	if (args[0].startsWith("/repost")) {
		if (args[1] === "help" || args[1] === "commands") {
			sendCommands(message.channel);
		} else if (args[1] === "replacements") {
			sendReplacements(message.channel, message.author.id);
		} else if (args[1] === "replace") {
			toggleReplacement(message.channel, args[2], args[3]);
		} else {
			const last = args[2];
			if (last) {
				repost(last, message, args[0].endsWith("hook"), args[1] === "from");
			} else {
				repost(args[1], message, args[0].endsWith("hook"), false);
			}
		}
	}
});